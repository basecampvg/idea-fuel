import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
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
   * Add a user message to the interview
   * Note: AI responses are handled via Socket.io for real-time streaming
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

      const messages = (interview.messages as unknown as ChatMessage[]) || [];
      const newMessage = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: input.content,
        timestamp: new Date().toISOString(),
      };

      const updatedInterview = await ctx.prisma.interview.update({
        where: { id: input.interviewId },
        data: {
          messages: [...messages, newMessage] as unknown as Parameters<typeof ctx.prisma.interview.update>[0]['data']['messages'],
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

    // TODO: Generate AI summary of the interview
    const summary = 'Interview completed. Summary generation will be implemented with AI integration.';

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: {
        status: 'COMPLETE',
        summary,
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

    return updatedInterview;
  }),
});
