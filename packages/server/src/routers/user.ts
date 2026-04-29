import { router, protectedProcedure } from '../trpc';
import { updateUserSchema } from '@forge/shared';
import { eq, count, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { users, projects, interviews, reports, research, tokenUsages } from '../db/schema';
import { getStripeClient } from '../lib/stripe';

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
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
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
        role: true,
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
      isSuperAdmin: user.role === 'SUPER_ADMIN',
    };
  }),

  /**
   * Self-serve delete account. Required by App Store Guideline 5.1.1(v),
   * Play Data Deletion policy, GDPR Art. 17, and CCPA.
   *
   * User must type their email address as a confirmation. The mutation:
   *   1. Cancels the user's Stripe subscription (if any) and deletes the
   *      Stripe customer for GDPR-compliant upstream erasure.
   *   2. Explicitly deletes TokenUsage rows (the table has no FK to users,
   *      so CASCADE won't clean them).
   *   3. Deletes the users row, which cascades to every user-owned table.
   *      BlogPost.authorId becomes null instead of blocking (set-null FK
   *      added in migration 0023).
   *
   * The caller is signed in at the time of the call. It is the client's
   * responsibility to sign the user out immediately after a successful
   * response.
   */
  delete: protectedProcedure
    .input(
      z.object({
        emailConfirmation: z
          .string()
          .min(1, 'Email confirmation is required')
          .max(320),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: {
          id: true,
          email: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const expected = user.email.trim().toLowerCase();
      const provided = input.emailConfirmation.trim().toLowerCase();

      if (expected !== provided) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email confirmation does not match the account email',
        });
      }

      // Upstream erasure — best-effort. A Stripe outage or a stale
      // customer/subscription id should not block the user's right to
      // delete. Log and continue.
      if (user.stripeCustomerId) {
        try {
          const stripe = getStripeClient();
          if (user.stripeSubscriptionId) {
            await stripe.subscriptions
              .cancel(user.stripeSubscriptionId)
              .catch((e: unknown) => {
                console.error(
                  '[user.delete] Stripe subscription cancel failed (ignored):',
                  e,
                );
                return null;
              });
          }
          await stripe.customers.del(user.stripeCustomerId).catch((e: unknown) => {
            console.error(
              '[user.delete] Stripe customer delete failed (ignored):',
              e,
            );
            return null;
          });
        } catch (err) {
          console.error('[user.delete] Stripe client unavailable:', err);
        }
      }

      // Explicit delete: TokenUsage.userId has no FK, so CASCADE skips it.
      // GDPR erasure requires us to actually clean it up.
      await ctx.db.delete(tokenUsages).where(eq(tokenUsages.userId, user.id));

      // Primary delete. CASCADE handles: Account, Session, Project,
      // ProjectAttachment, Interview, Research, Report, Thought*,
      // Cluster*, CreditTransaction, AuditLog, FinancialModel,
      // ERPConnection, CrystallizedIdea, UserLabel, Embedding, Assumption,
      // AgentConversation, AgentMessage, AgentInsight, CustomerInterview,
      // InterviewResponse, NdaSignature.
      // Non-cascading: BlogPost.authorId -> NULL (published posts retained).
      await ctx.db.delete(users).where(eq(users.id, user.id));

      return {
        success: true as const,
        deletedAt: new Date().toISOString(),
      };
    }),
});
