import { router, protectedProcedure } from '../trpc';
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
        subscription: true,
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
        subscription: true,
        updatedAt: true,
      },
    });

    return user;
  }),

  /**
   * Get user statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [projectsCount, interviewsCount, reportsCount, activeResearch] = await Promise.all([
      ctx.prisma.project.count({ where: { userId: ctx.userId } }),
      ctx.prisma.interview.count({ where: { userId: ctx.userId } }),
      ctx.prisma.report.count({ where: { userId: ctx.userId } }),
      ctx.prisma.research.count({
        where: {
          project: { userId: ctx.userId },
          status: 'IN_PROGRESS',
        },
      }),
    ]);

    const projectsByStatus = await ctx.prisma.project.groupBy({
      by: ['status'],
      where: { userId: ctx.userId },
      _count: true,
    });

    const reportsByType = await ctx.prisma.report.groupBy({
      by: ['type'],
      where: { userId: ctx.userId },
      _count: true,
    });

    return {
      totalProjects: projectsCount,
      totalInterviews: interviewsCount,
      totalReports: reportsCount,
      activeResearch,
      projectsByStatus: Object.fromEntries(projectsByStatus.map((s) => [s.status, s._count])),
      reportsByType: Object.fromEntries(reportsByType.map((r) => [r.type, r._count])),
    };
  }),

  /**
   * Get user subscription details
   */
  subscription: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        subscription: true,
      },
    });

    if (!user) {
      return null;
    }

    // Return subscription info with feature flags
    const features = {
      FREE: {
        maxIdeas: 3,
        maxReportsPerIdea: 5,
        reportTierAccess: ['BASIC'] as const,
        interviewModes: ['SPARK', 'LIGHT'] as const,
        prioritySupport: false,
      },
      PRO: {
        maxIdeas: 20,
        maxReportsPerIdea: 10,
        reportTierAccess: ['BASIC', 'PRO'] as const,
        interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
        prioritySupport: true,
      },
      ENTERPRISE: {
        maxIdeas: -1, // Unlimited
        maxReportsPerIdea: 10,
        reportTierAccess: ['BASIC', 'PRO', 'FULL'] as const,
        interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'] as const,
        prioritySupport: true,
      },
    };

    return {
      tier: user.subscription,
      features: features[user.subscription],
    };
  }),
});
