import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createProjectSchema, updateProjectSchema, startInterviewSchema } from '@forge/shared';
import type { ChatMessage, InterviewMode } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { generateOpeningQuestion } from '../services/interview-ai';
import { logAuditAsync, formatResource } from '../lib/audit';
import { enqueueResearchPipeline } from '../jobs';

// Default max turns by interview mode
const MAX_TURNS_BY_MODE = {
  SPARK: 0,      // Quick validation - no interview, triggers Spark pipeline
  LIGHT: 10,     // 6 scripted + 2-3 dynamic + close
  IN_DEPTH: 18,  // 10 scripted + 5-7 dynamic + close
} as const;

// Phase filter maps status values to sidebar sections
const PHASE_STATUS_MAP = {
  draft: ['CAPTURED'] as const,
  active: ['INTERVIEWING', 'RESEARCHING', 'COMPLETE'] as const,
} as const;

export const projectRouter = router({
  /**
   * List all projects for the current user
   * Supports phase filter: 'draft' (CAPTURED) or 'active' (INTERVIEWING+RESEARCHING+COMPLETE)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          phase: z.enum(['draft', 'active']).optional(),
          limit: z.number().min(1).max(100).optional(),
          page: z.number().min(1).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { phase, page = 1, limit = 20 } = input ?? {};
      const skip = (page - 1) * limit;

      const statusFilter = phase ? { status: { in: PHASE_STATUS_MAP[phase] as unknown as Prisma.EnumProjectStatusFilter['in'] } } : {};

      const [projects, total] = await Promise.all([
        ctx.prisma.project.findMany({
          where: { userId: ctx.userId, ...statusFilter },
          orderBy: { updatedAt: 'desc' },
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
        ctx.prisma.project.count({ where: { userId: ctx.userId, ...statusFilter } }),
      ]);

      return {
        items: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get a single project by ID with all related data
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
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
        research: {
          select: {
            id: true,
            status: true,
            currentPhase: true,
            progress: true,
            sparkStatus: true,
            sparkResult: true,
            sparkKeywords: true,
            sparkError: true,
            sparkStartedAt: true,
            sparkCompletedAt: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true,
            errorPhase: true,
            opportunityScore: true,
            problemScore: true,
            feasibilityScore: true,
            whyNowScore: true,
            scoreJustifications: true,
            scoreMetadata: true,
            synthesizedInsights: true,
            marketAnalysis: true,
            competitors: true,
            painPoints: true,
            positioning: true,
            whyNow: true,
            proofSignals: true,
            keywords: true,
            revenuePotential: true,
            executionDifficulty: true,
            gtmClarity: true,
            founderFit: true,
            marketSizing: true,
            userStory: true,
            valueLadder: true,
            actionPrompts: true,
            keywordTrends: true,
            techStack: true,
            socialProof: true,
            businessPlan: true,
            notesSnapshot: true,
            retryCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return project;
  }),

  /**
   * Create a new project (starts as a draft idea with status CAPTURED)
   */
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.create({
      data: {
        title: input.title,
        description: input.description,
        userId: ctx.userId,
      },
    });

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_CREATE',
      resource: formatResource('project', project.id),
      metadata: { title: project.title },
    });

    return project;
  }),

  /**
   * Update project title, description, or notes
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateProjectSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const project = await ctx.prisma.project.update({
        where: { id: input.id },
        data: input.data,
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', project.id),
        metadata: { changes: input.data },
      });

      return project;
    }),

  /**
   * Delete a project (cascades to interviews, reports, research)
   */
  delete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.project.findFirst({
      where: { id: input.id, userId: ctx.userId },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_DELETE',
      resource: formatResource('project', input.id),
      metadata: { title: existing.title },
    });

    await ctx.prisma.project.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  /**
   * Start an interview for a project
   * Supports SPARK, LIGHT, and IN_DEPTH modes
   * SPARK: Skips interview, triggers quick validation pipeline
   * LIGHT/IN_DEPTH: Creates interactive interview with AI-generated opening question
   */
  startInterview: protectedProcedure.input(startInterviewSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
      where: {
        id: input.projectId,
        userId: ctx.userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        notes: true,
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const mode = input.mode ?? 'LIGHT';
    const maxTurns = MAX_TURNS_BY_MODE[mode];

    // For SPARK mode, skip interview and trigger Spark quick validation
    if (mode === 'SPARK') {
      const [interview] = await ctx.prisma.$transaction([
        ctx.prisma.interview.create({
          data: {
            projectId: input.projectId,
            userId: ctx.userId,
            mode: 'SPARK',
            status: 'COMPLETE',
            currentTurn: 0,
            maxTurns: 0,
            messages: [],
            collectedData: Prisma.JsonNull,
            confidenceScore: 0,
            summary: 'Spark mode - quick validation from project description.',
          },
        }),
        ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: 'RESEARCHING' },
        }),
      ]);

      logAuditAsync({
        userId: ctx.userId,
        action: 'INTERVIEW_START',
        resource: formatResource('interview', interview.id),
        metadata: { projectId: input.projectId, mode: 'SPARK' },
      });

      return {
        interview,
        skipToResearch: true,
        mode: 'SPARK',
      };
    }

    // For LIGHT and IN_DEPTH modes, create an active interview with opening question
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { subscription: true },
    });
    const tier = user?.subscription ?? 'FREE';

    const openingQuestion = await generateOpeningQuestion(project.title, project.description, mode as InterviewMode, tier);

    const openingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: openingQuestion,
      timestamp: new Date().toISOString(),
    };

    const [interview] = await ctx.prisma.$transaction([
      ctx.prisma.interview.create({
        data: {
          projectId: input.projectId,
          userId: ctx.userId,
          mode,
          status: 'IN_PROGRESS',
          currentTurn: 0,
          maxTurns,
          messages: [openingMessage] as unknown as Prisma.InputJsonValue,
          lastActiveAt: new Date(),
        },
      }),
      ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: 'INTERVIEWING' },
      }),
    ]);

    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_START',
      resource: formatResource('interview', interview.id),
      metadata: { projectId: input.projectId, mode },
    });

    return {
      interview,
      skipToResearch: false,
    };
  }),

  /**
   * Start research for a project (after interview completion)
   * Creates a Research record, snapshots notes, and queues the pipeline
   */
  startResearch: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
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

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    if (project.research) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this project',
      });
    }

    if (project.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    // Create research record and update project status atomically
    const [research] = await ctx.prisma.$transaction([
      ctx.prisma.research.create({
        data: {
          projectId: input.id,
          status: 'PENDING',
          currentPhase: 'QUEUED',
          progress: 0,
          notesSnapshot: project.notes,
        },
      }),
      ctx.prisma.project.update({
        where: { id: input.id },
        data: { status: 'RESEARCHING' },
      }),
    ]);

    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_START',
      resource: formatResource('research', research.id),
      metadata: { projectId: input.id },
    });

    // Queue research pipeline job
    const latestInterview = project.interviews[0];
    try {
      await enqueueResearchPipeline({
        researchId: research.id,
        projectId: input.id,
        userId: ctx.userId,
        interviewId: latestInterview?.id,
        mode: latestInterview?.mode as 'LIGHT' | 'IN_DEPTH' | 'SPARK' | undefined,
      });
    } catch (queueError) {
      console.error('[Research] Failed to queue pipeline:', queueError);
      // Mark research as failed so it doesn't stay stuck in PENDING
      await ctx.prisma.research.update({
        where: { id: research.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Failed to queue research pipeline',
          errorPhase: 'QUEUED',
        },
      });
    }

    return research;
  }),
});
