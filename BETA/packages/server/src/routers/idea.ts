import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createIdeaSchema, updateIdeaSchema, paginationSchema } from '@forge/shared';
import { TRPCError } from '@trpc/server';

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
              documents: true,
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
   * Get a single idea by ID
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
        },
        documents: {
          orderBy: { createdAt: 'desc' },
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
   * Delete an idea
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
   * Start the interview process for an idea
   */
  startInterview: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    // Verify ownership
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    // Create a new interview
    const interview = await ctx.prisma.interview.create({
      data: {
        ideaId: input.id,
        userId: ctx.userId,
        messages: [],
        status: 'IN_PROGRESS',
      },
    });

    // Update idea status
    await ctx.prisma.idea.update({
      where: { id: input.id },
      data: { status: 'INTERVIEWING' },
    });

    return interview;
  }),
});
