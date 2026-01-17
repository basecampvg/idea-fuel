import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { RESEARCH_PHASE_PROGRESS } from '@forge/shared';

export const researchRouter = router({
  /**
   * Get research by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const research = await ctx.prisma.research.findFirst({
      where: {
        id: input.id,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });

    if (!research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    // Verify ownership through idea
    if (research.idea.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    return research;
  }),

  /**
   * Get research by idea ID
   */
  getByIdea: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      include: {
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    return idea.research;
  }),

  /**
   * Get research progress/status for polling
   */
  getProgress: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const research = await ctx.prisma.research.findFirst({
      where: {
        id: input.id,
      },
      include: {
        idea: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    if (research.idea.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Calculate estimated completion based on phase
    const phaseProgress = RESEARCH_PHASE_PROGRESS[research.currentPhase];

    return {
      id: research.id,
      status: research.status,
      currentPhase: research.currentPhase,
      progress: research.progress,
      phaseProgress,
      estimatedCompletion: research.estimatedCompletion,
      startedAt: research.startedAt,
      completedAt: research.completedAt,
      errorMessage: research.errorMessage,
      errorPhase: research.errorPhase,
    };
  }),

  /**
   * Start research for an idea
   * Called after interview is complete
   */
  start: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      include: {
        research: true,
        interviews: {
          where: { status: 'COMPLETE' },
          take: 1,
        },
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
      // If failed, allow restart
      if (idea.research.status === 'FAILED') {
        const research = await ctx.prisma.research.update({
          where: { id: idea.research.id },
          data: {
            status: 'PENDING',
            currentPhase: 'QUEUED',
            progress: 0,
            errorMessage: null,
            errorPhase: null,
            retryCount: idea.research.retryCount + 1,
            startedAt: null,
            completedAt: null,
          },
        });

        // TODO: Trigger BullMQ job to restart research pipeline

        return research;
      }

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this idea',
      });
    }

    // Require at least one completed interview
    if (idea.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    // Create research record
    const research = await ctx.prisma.research.create({
      data: {
        ideaId: input.ideaId,
        status: 'PENDING',
        currentPhase: 'QUEUED',
        progress: 0,
      },
    });

    // Update idea status
    await ctx.prisma.idea.update({
      where: { id: input.ideaId },
      data: { status: 'RESEARCHING' },
    });

    // TODO: Trigger BullMQ job to start research pipeline

    return research;
  }),

  /**
   * Cancel ongoing research
   */
  cancel: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const research = await ctx.prisma.research.findFirst({
      where: {
        id: input.id,
      },
      include: {
        idea: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    if (research.idea.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    if (research.status === 'COMPLETE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot cancel completed research',
      });
    }

    // TODO: Cancel BullMQ job

    const updatedResearch = await ctx.prisma.research.update({
      where: { id: input.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Research cancelled by user',
        errorPhase: research.currentPhase,
      },
    });

    return updatedResearch;
  }),

  /**
   * Update research phase (called by BullMQ workers)
   * This is an internal endpoint, but protected for safety
   */
  updatePhase: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        phase: z.enum([
          'QUEUED',
          'QUERY_GENERATION',
          'DATA_COLLECTION',
          'SYNTHESIS',
          'REPORT_GENERATION',
          'COMPLETE',
        ]),
        progress: z.number().min(0).max(100),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findFirst({
        where: {
          id: input.id,
        },
        include: {
          idea: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!research) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      // Build update data based on phase
      const updateData: Record<string, unknown> = {
        currentPhase: input.phase,
        progress: input.progress,
      };

      // Set timestamps
      if (input.phase !== 'QUEUED' && !research.startedAt) {
        updateData.startedAt = new Date();
        updateData.status = 'IN_PROGRESS';
      }

      if (input.phase === 'COMPLETE') {
        updateData.completedAt = new Date();
        updateData.status = 'COMPLETE';
      }

      // Store phase-specific data
      if (input.data) {
        switch (input.phase) {
          case 'QUERY_GENERATION':
            updateData.generatedQueries = input.data;
            break;
          case 'DATA_COLLECTION':
            updateData.rawData = input.data;
            break;
          case 'SYNTHESIS':
            updateData.synthesizedInsights = input.data;
            // Also update consolidated fields
            if (input.data.marketAnalysis) updateData.marketAnalysis = input.data.marketAnalysis;
            if (input.data.competitors) updateData.competitors = input.data.competitors;
            if (input.data.painPoints) updateData.painPoints = input.data.painPoints;
            if (input.data.positioning) updateData.positioning = input.data.positioning;
            if (input.data.whyNow) updateData.whyNow = input.data.whyNow;
            if (input.data.proofSignals) updateData.proofSignals = input.data.proofSignals;
            if (input.data.keywords) updateData.keywords = input.data.keywords;
            break;
        }
      }

      const updatedResearch = await ctx.prisma.research.update({
        where: { id: input.id },
        data: updateData as Parameters<typeof ctx.prisma.research.update>[0]['data'],
      });

      // If complete, update idea status
      if (input.phase === 'COMPLETE') {
        await ctx.prisma.idea.update({
          where: { id: research.ideaId },
          data: { status: 'COMPLETE' },
        });
      }

      return updatedResearch;
    }),

  /**
   * Mark research as failed (called by BullMQ workers on error)
   */
  markFailed: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        errorMessage: z.string(),
        errorPhase: z.enum([
          'QUEUED',
          'QUERY_GENERATION',
          'DATA_COLLECTION',
          'SYNTHESIS',
          'REPORT_GENERATION',
          'COMPLETE',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findFirst({
        where: {
          id: input.id,
        },
      });

      if (!research) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      const updatedResearch = await ctx.prisma.research.update({
        where: { id: input.id },
        data: {
          status: 'FAILED',
          errorMessage: input.errorMessage,
          errorPhase: input.errorPhase,
        },
      });

      return updatedResearch;
    }),
});
