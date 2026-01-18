import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createIdeaSchema, updateIdeaSchema, paginationSchema, startInterviewSchema } from '@forge/shared';
import type { ChatMessage, InterviewMode } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { generateOpeningQuestion } from '../services/interview-ai';

// Default max turns by interview mode
const MAX_TURNS_BY_MODE = {
  LIGHTNING: 0,  // No interview - skip to research
  LIGHT: 10,     // 10 must-have questions
  IN_DEPTH: 65,  // 60-70 comprehensive questions
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

    return idea;
  }),

  /**
   * Create a new idea
   */
  create: protectedProcedure.input(createIdeaSchema).mutation(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.create({
      data: {
        ...input,
        userId: ctx.userId,
      },
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

    await ctx.prisma.idea.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  /**
   * Start an interview for an idea
   * Supports LIGHTNING, LIGHT, and IN_DEPTH modes
   */
  startInterview: protectedProcedure.input(startInterviewSchema).mutation(async ({ ctx, input }) => {
    console.log('[Idea Router] startInterview called with:', { ideaId: input.ideaId, mode: input.mode });

    // Verify ownership
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
    });

    if (!idea) {
      console.log('[Idea Router] Idea not found:', input.ideaId);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    console.log('[Idea Router] Found idea:', idea.title);
    const mode = input.mode ?? 'LIGHT';
    const maxTurns = MAX_TURNS_BY_MODE[mode];
    console.log('[Idea Router] Mode:', mode, 'MaxTurns:', maxTurns);

    // For LIGHTNING mode, skip interview and go straight to research
    if (mode === 'LIGHTNING') {
      // Create a completed interview with no messages
      const interview = await ctx.prisma.interview.create({
        data: {
          ideaId: input.ideaId,
          userId: ctx.userId,
          mode: 'LIGHTNING',
          status: 'COMPLETE',
          currentTurn: 0,
          maxTurns: 0,
          messages: [],
          collectedData: Prisma.JsonNull, // AI will infer from idea description
          confidenceScore: 0,
          summary: 'Lightning mode - insights generated from idea description only.',
        },
      });

      // Update idea status to researching
      await ctx.prisma.idea.update({
        where: { id: input.ideaId },
        data: { status: 'RESEARCHING' },
      });

      return {
        interview,
        skipToResearch: true,
      };
    }

    // For LIGHT and IN_DEPTH modes, create an active interview with opening question
    // Generate AI opening question
    console.log('[Idea Router] Generating opening question...');
    const openingQuestion = await generateOpeningQuestion(idea.title, idea.description, mode as InterviewMode);
    console.log('[Idea Router] Opening question generated:', openingQuestion.substring(0, 100) + '...');

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

    // Require at least one completed interview (or LIGHTNING mode)
    if (idea.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    // Create research record
    const research = await ctx.prisma.research.create({
      data: {
        ideaId: input.id,
        status: 'PENDING',
        currentPhase: 'QUEUED',
        progress: 0,
      },
    });

    // Update idea status
    await ctx.prisma.idea.update({
      where: { id: input.id },
      data: { status: 'RESEARCHING' },
    });

    // TODO: Trigger BullMQ job to start research pipeline

    return research;
  }),
});
