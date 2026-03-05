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
        founderProfile: true,
        createdAt: true,
      },
    });

    return user ?? null;
  }),

  /**
   * Update current user profile
   */
  update: protectedProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
    // Inject updatedAt timestamp into founderProfile if present
    const setData = input.founderProfile
      ? { ...input, founderProfile: { ...input.founderProfile, updatedAt: new Date().toISOString() } }
      : input;

    const [user] = await ctx.db
      .update(users)
      .set(setData)
      .where(eq(users.id, ctx.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        subscription: users.subscription,
        founderProfile: users.founderProfile,
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

    // Use the centralized subscription features from @forge/shared
    const { SUBSCRIPTION_FEATURES } = await import('@forge/shared');

    return {
      tier: user.subscription,
      features: SUBSCRIPTION_FEATURES[user.subscription],
    };
  }),
});
