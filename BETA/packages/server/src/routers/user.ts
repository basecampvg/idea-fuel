import type { IdeaStatus } from '@prisma/client';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { updateUserSchema } from '@forge/shared';

export const userRouter = router({
  /**
   * Get current authenticated user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });

    return user;
  }),

  /**
   * Update current user profile
   */
  update: protectedProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.update({
      where: { id: ctx.userId },
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        updatedAt: true,
      },
    });

    return user;
  }),

  /**
   * Get user statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [ideasCount, interviewsCount, documentsCount] = await Promise.all([
      ctx.prisma.idea.count({ where: { userId: ctx.userId } }),
      ctx.prisma.interview.count({ where: { userId: ctx.userId } }),
      ctx.prisma.document.count({ where: { userId: ctx.userId } }),
    ]);

    const ideasByStatus = await ctx.prisma.idea.groupBy({
      by: ['status'],
      where: { userId: ctx.userId },
      _count: true,
    });

    return {
      totalIdeas: ideasCount,
      totalInterviews: interviewsCount,
      totalDocuments: documentsCount,
      ideasByStatus: Object.fromEntries(
        ideasByStatus.map((s: { status: IdeaStatus; _count: number }) => [s.status, s._count])
      ),
    };
  }),
});
