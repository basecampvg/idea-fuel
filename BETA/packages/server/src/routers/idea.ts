import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createIdeaSchema, updateIdeaSchema, paginationSchema, startInterviewSchema } from '@forge/shared';
import type { ChatMessage, InterviewMode } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { generateOpeningQuestion } from '../services/interview-ai';
import { logAuditAsync, formatResource } from '../lib/audit';
import { createCanvasSnapshot } from '../lib/canvas-snapshot';
import { enqueueResearchPipeline } from '../jobs';

// Default max turns by interview mode
const MAX_TURNS_BY_MODE = {
  SPARK: 0,      // Quick validation - no interview, triggers Spark pipeline
  LIGHT: 10,     // 6 scripted + 2-3 dynamic + close
  IN_DEPTH: 18,  // 10 scripted + 5-7 dynamic + close
} as const;

export const ideaRouter = router({
  /**
   * List all ideas for the current user
   */
  list: protectedProcedure.input(paginationSchema.optional()).query(async ({ ctx, input }) => {
    const { page = 1, limit = 20 } = input ?? {};
    const skip = (page - 1) * limit;

    const [ideas, total] = await Promise.all([
      ctx.prisma.idea.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              interviews: true,
              reports: true,
            },
          },
          research: {
            select: {
              status: true,
              currentPhase: true,
              progress: true,
            },
          },
        },
      }),
      ctx.prisma.idea.count({ where: { userId: ctx.userId } }),
    ]);

    return {
      items: ideas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  /**
   * Get a single idea by ID with all related data
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        interviews: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            mode: true,
            status: true,
            currentTurn: true,
            maxTurns: true,
            confidenceScore: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            tier: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    // Audit log - view idea
    logAuditAsync({
      userId: ctx.userId,
      action: 'IDEA_VIEW',
      resource: formatResource('idea', idea.id),
    });

    return idea;
  }),

  /**
   * Create a new idea
   */
  create: protectedProcedure.input(createIdeaSchema).mutation(async ({ ctx, input }) => {
    // If projectId provided, verify ownership and enforce one-idea-per-project
    if (input.projectId) {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
        include: {
          _count: { select: { ideas: true } },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (project._count.ideas > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project already has an idea. Only one idea per project is currently supported.',
        });
      }
    }

    const idea = await ctx.prisma.idea.create({
      data: {
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        userId: ctx.userId,
      },
    });

    // Audit log - create idea
    logAuditAsync({
      userId: ctx.userId,
      action: 'IDEA_CREATE',
      resource: formatResource('idea', idea.id),
      metadata: { title: idea.title, projectId: input.projectId },
    });

    return idea;
  }),

  /**
   * Update an existing idea
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateIdeaSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.idea.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Idea not found',
        });
      }

      const idea = await ctx.prisma.idea.update({
        where: { id: input.id },
        data: input.data,
      });

      // Audit log - update idea
      logAuditAsync({
        userId: ctx.userId,
        action: 'IDEA_UPDATE',
        resource: formatResource('idea', idea.id),
        metadata: { changes: input.data },
      });

      return idea;
    }),

  /**
   * Delete an idea (cascades to interviews, reports, research)
   */
  delete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    // Verify ownership
    const existing = await ctx.prisma.idea.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    // Audit log - delete idea (log before deletion)
    logAuditAsync({
      userId: ctx.userId,
      action: 'IDEA_DELETE',
      resource: formatResource('idea', input.id),
      metadata: { title: existing.title },
    });

    await ctx.prisma.idea.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  /**
   * Start an interview for an idea
   * Supports SPARK, LIGHT, and IN_DEPTH modes
   */
  startInterview: protectedProcedure.input(startInterviewSchema).mutation(async ({ ctx, input }) => {
    // Verify ownership (include project relation for canvas snapshot)
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    const mode = input.mode ?? 'LIGHT';
    const maxTurns = MAX_TURNS_BY_MODE[mode];

    // For SPARK mode, skip interview and trigger Spark quick validation
    if (mode === 'SPARK') {
      // Create a completed interview with no messages (for record keeping)
      const interview = await ctx.prisma.interview.create({
        data: {
          ideaId: input.ideaId,
          userId: ctx.userId,
          mode: 'SPARK',
          status: 'COMPLETE',
          currentTurn: 0,
          maxTurns: 0,
          messages: [],
          collectedData: Prisma.JsonNull, // Spark validates from idea description
          confidenceScore: 0,
          summary: 'Spark mode - quick validation from idea description.',
        },
      });

      // Update idea status to researching
      await ctx.prisma.idea.update({
        where: { id: input.ideaId },
        data: { status: 'RESEARCHING' },
      });

      // Audit log - start Spark interview
      logAuditAsync({
        userId: ctx.userId,
        action: 'INTERVIEW_START',
        resource: formatResource('interview', interview.id),
        metadata: { ideaId: input.ideaId, mode: 'SPARK' },
      });

      return {
        interview,
        skipToResearch: true,
        mode: 'SPARK', // Signal to frontend to use Spark pipeline
      };
    }

    // For LIGHT and IN_DEPTH modes, create an active interview with opening question
    // Get user's subscription tier for AI parameters
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { subscription: true },
    });
    const tier = user?.subscription ?? 'FREE';

    // Generate AI opening question
    const openingQuestion = await generateOpeningQuestion(idea.title, idea.description, mode as InterviewMode, tier);

    // Create opening message
    const openingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: openingQuestion,
      timestamp: new Date().toISOString(),
    };

    const interview = await ctx.prisma.interview.create({
      data: {
        ideaId: input.ideaId,
        userId: ctx.userId,
        mode,
        status: 'IN_PROGRESS',
        currentTurn: 0,
        maxTurns,
        messages: [openingMessage] as unknown as Prisma.InputJsonValue,
        lastActiveAt: new Date(),
      },
    });

    // Update idea status
    await ctx.prisma.idea.update({
      where: { id: input.ideaId },
      data: { status: 'INTERVIEWING' },
    });

    // Audit log - start interview
    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_START',
      resource: formatResource('interview', interview.id),
      metadata: { ideaId: input.ideaId, mode },
    });

    return {
      interview,
      skipToResearch: false,
    };
  }),

  /**
   * Start research for an idea (after interview completion)
   */
  startResearch: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        interviews: {
          where: { status: 'COMPLETE' },
          take: 1,
        },
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    // Check if research already exists
    if (idea.research) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this idea',
      });
    }

    // Require at least one completed interview (or SPARK mode)
    if (idea.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    // Create canvas snapshot if idea belongs to a project
    let canvasSnapshotId: string | undefined;
    if (idea.projectId) {
      canvasSnapshotId = await createCanvasSnapshot(ctx.prisma, idea.projectId);

      logAuditAsync({
        userId: ctx.userId,
        action: 'CANVAS_SNAPSHOT',
        resource: formatResource('project', idea.projectId),
        metadata: { snapshotId: canvasSnapshotId, trigger: 'research_start' },
      });
    }

    // Create research record (linked to canvas snapshot if available)
    const research = await ctx.prisma.research.create({
      data: {
        ideaId: input.id,
        status: 'PENDING',
        currentPhase: 'QUEUED',
        progress: 0,
        ...(canvasSnapshotId ? { canvasSnapshotId } : {}),
      },
    });

    // Update idea status
    await ctx.prisma.idea.update({
      where: { id: input.id },
      data: { status: 'RESEARCHING' },
    });

    // Audit log - start research
    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_START',
      resource: formatResource('research', research.id),
      metadata: { ideaId: input.id },
    });

    // Queue research pipeline job
    const latestInterview = idea.interviews[0];
    try {
      await enqueueResearchPipeline({
        researchId: research.id,
        ideaId: input.id,
        userId: ctx.userId,
        interviewId: latestInterview?.id,
        mode: latestInterview?.mode as 'LIGHT' | 'IN_DEPTH' | 'SPARK' | undefined,
      });
    } catch (queueError) {
      console.error('[Research] Failed to queue pipeline:', queueError);
      // Don't fail - research is created, can be retried
    }

    return research;
  }),
});
