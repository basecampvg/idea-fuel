import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { INTERVIEW_SESSION, INTERVIEW_RESUME_MESSAGES } from '@forge/shared';
import type { ChatMessage } from '@forge/shared';

export const interviewRouter = router({
  /**
   * Get an interview by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    return interview;
  }),

  /**
   * List interviews for an idea
   */
  listByIdea: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const interviews = await ctx.prisma.interview.findMany({
      where: {
        ideaId: input.ideaId,
        userId: ctx.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return interviews;
  }),

  /**
   * Get active (in-progress) interviews for the user
   * Useful for showing "Continue Interview" prompts
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const interviews = await ctx.prisma.interview.findMany({
      where: {
        userId: ctx.userId,
        status: 'IN_PROGRESS',
        isExpired: false,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return interviews;
  }),

  /**
   * Resume an interview - returns resume state with appropriate greeting
   */
  resume: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const now = Date.now();
    const lastActive = interview.lastActiveAt.getTime();
    const timeSinceLastActive = now - lastActive;

    // Check if interview can be resumed
    const canResume =
      interview.status === 'IN_PROGRESS' &&
      !interview.isExpired &&
      timeSinceLastActive < INTERVIEW_SESSION.resumeWindowMs;

    // Determine appropriate resume message
    let resumeMessage: string;
    if (timeSinceLastActive < 60 * 60 * 1000) {
      // < 1 hour
      resumeMessage = INTERVIEW_RESUME_MESSAGES.short;
    } else if (timeSinceLastActive < 24 * 60 * 60 * 1000) {
      // < 24 hours
      resumeMessage = INTERVIEW_RESUME_MESSAGES.medium;
    } else {
      resumeMessage = INTERVIEW_RESUME_MESSAGES.long;
    }

    return {
      interview,
      timeSinceLastActive,
      canResume,
      resumeMessage,
    };
  }),

  /**
   * Add a user message to the interview
   * Updates lastActiveAt for auto-save tracking
   */
  addMessage: protectedProcedure
    .input(
      z.object({
        interviewId: z.string().cuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findFirst({
        where: {
          id: input.interviewId,
          userId: ctx.userId,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }

      if (interview.status !== 'IN_PROGRESS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview is not in progress',
        });
      }

      if (interview.isExpired) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview has expired',
        });
      }

      const messages = (interview.messages as unknown as ChatMessage[]) || [];
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: input.content,
        timestamp: new Date().toISOString(),
      };

      const now = new Date();
      const updatedInterview = await ctx.prisma.interview.update({
        where: { id: input.interviewId },
        data: {
          messages: [...messages, newMessage] as unknown as Parameters<
            typeof ctx.prisma.interview.update
          >[0]['data']['messages'],
          lastActiveAt: now,
          lastMessageAt: now,
          currentTurn: interview.currentTurn + 1,
        },
      });

      return {
        interview: updatedInterview,
        message: newMessage,
      };
    }),

  /**
   * Add an AI assistant message to the interview
   * Called after AI generates a response
   */
  addAssistantMessage: protectedProcedure
    .input(
      z.object({
        interviewId: z.string().cuid(),
        content: z.string().min(1),
        collectedData: z.record(z.any()).optional(),
        resumeContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findFirst({
        where: {
          id: input.interviewId,
          userId: ctx.userId,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }

      const messages = (interview.messages as unknown as ChatMessage[]) || [];
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: input.content,
        timestamp: new Date().toISOString(),
      };

      // Merge new collected data with existing
      const existingData = (interview.collectedData as Record<string, unknown>) || {};
      const mergedData = input.collectedData ? { ...existingData, ...input.collectedData } : existingData;

      const updatedInterview = await ctx.prisma.interview.update({
        where: { id: input.interviewId },
        data: {
          messages: [...messages, newMessage] as unknown as Parameters<
            typeof ctx.prisma.interview.update
          >[0]['data']['messages'],
          collectedData: mergedData as unknown as Parameters<
            typeof ctx.prisma.interview.update
          >[0]['data']['collectedData'],
          ...(input.resumeContext && { resumeContext: input.resumeContext }),
        },
      });

      return {
        interview: updatedInterview,
        message: newMessage,
      };
    }),

  /**
   * Complete an interview and generate summary
   */
  complete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        idea: true,
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    // Calculate confidence score based on collected data
    const collectedData = (interview.collectedData as Record<string, unknown>) || {};
    const filledFields = Object.values(collectedData).filter((v) => v !== null && v !== undefined).length;
    const confidenceScore = Math.min(100, Math.round((filledFields / 31) * 100));

    // TODO: Generate AI summary of the interview
    const summary = `Interview completed with ${interview.currentTurn} turns. ${filledFields}/31 data points collected.`;

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: {
        status: 'COMPLETE',
        summary,
        confidenceScore,
      },
    });

    // Update idea status to researching (ready for next phase)
    await ctx.prisma.idea.update({
      where: { id: interview.ideaId },
      data: { status: 'RESEARCHING' },
    });

    return updatedInterview;
  }),

  /**
   * Abandon an interview
   */
  abandon: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: { status: 'ABANDONED' },
    });

    // Revert idea status to captured
    await ctx.prisma.idea.update({
      where: { id: interview.ideaId },
      data: { status: 'CAPTURED' },
    });

    return updatedInterview;
  }),

  /**
   * Mark interview as expired (called by background job)
   */
  markExpired: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: { isExpired: true },
    });

    return updatedInterview;
  }),

  /**
   * Update interview activity (heartbeat for idle detection)
   */
  heartbeat: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
        status: 'IN_PROGRESS',
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Active interview not found',
      });
    }

    await ctx.prisma.interview.update({
      where: { id: input.id },
      data: { lastActiveAt: new Date() },
    });

    return { success: true };
  }),
});
