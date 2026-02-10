import { router, protectedProcedure } from '../trpc';
import { updateUserSchema } from '@forge/shared';
import { eq, count, sql, and } from 'drizzle-orm';
import { users, projects, interviews, reports, research } from '../db/schema';

export const userRouter = router({
  /**
   * Get current authenticated user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        image: true,
        subscription: true,
        role: true,
        createdAt: true,
      },
    });

    return user ?? null;
  }),

  /**
   * Update current user profile
   */
  update: protectedProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
    const [user] = await ctx.db
      .update(users)
      .set(input)
      .where(eq(users.id, ctx.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        subscription: users.subscription,
        updatedAt: users.updatedAt,
      });

    return user;
  }),

  /**
   * Get user statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [
      [{ value: projectsCount }],
      [{ value: interviewsCount }],
      [{ value: reportsCount }],
      [{ value: activeResearch }],
    ] = await Promise.all([
      ctx.db.select({ value: count() }).from(projects).where(eq(projects.userId, ctx.userId)),
      ctx.db.select({ value: count() }).from(interviews).where(eq(interviews.userId, ctx.userId)),
      ctx.db.select({ value: count() }).from(reports).where(eq(reports.userId, ctx.userId)),
      ctx.db
        .select({ value: count() })
        .from(research)
        .innerJoin(projects, eq(research.projectId, projects.id))
        .where(and(eq(projects.userId, ctx.userId), eq(research.status, 'IN_PROGRESS'))),
    ]);

    const projectsByStatus = await ctx.db
      .select({ status: projects.status, count: count() })
      .from(projects)
      .where(eq(projects.userId, ctx.userId))
      .groupBy(projects.status);

    const reportsByType = await ctx.db
      .select({ type: reports.type, count: count() })
      .from(reports)
      .where(eq(reports.userId, ctx.userId))
      .groupBy(reports.type);

    return {
      totalProjects: projectsCount,
      totalInterviews: interviewsCount,
      totalReports: reportsCount,
      activeResearch,
      projectsByStatus: Object.fromEntries(projectsByStatus.map((s) => [s.status, s.count])),
      reportsByType: Object.fromEntries(reportsByType.map((r) => [r.type, r.count])),
    };
  }),

  /**
   * Get user subscription details
   */
  subscription: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: {
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
