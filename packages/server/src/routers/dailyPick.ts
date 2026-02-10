import { z } from 'zod';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { runDailyTrendPick, getRunStatus } from '../jobs/dailyTrendPickJob';
import { formatInTimeZone } from 'date-fns-tz';
import { dailyPicks, clusters, aiClassifications, trendSeries, dailyRuns, queryCandidates } from '../db/schema';

const TZ = process.env.TZ || 'America/Denver';

function getTodayLocal(): string {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
}

export const dailyPickRouter = router({
  /**
   * Manually trigger the Daily Pick job (admin only)
   */
  runJob: protectedProcedure
    .input(
      z
        .object({
          dateLocal: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const dateLocal = input?.dateLocal || getTodayLocal();
      const result = await runDailyTrendPick(dateLocal);
      return result;
    }),

  /**
   * Get the run status for a specific run ID
   */
  getRunStatus: publicProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input }) => {
      const status = await getRunStatus(input.runId);
      return status;
    }),

  /**
   * Get today's active Daily Pick
   */
  getToday: publicProcedure.query(async ({ ctx }) => {
    const today = getTodayLocal();

    const pick = await ctx.db.query.dailyPicks.findFirst({
      where: and(eq(dailyPicks.dateLocal, today), eq(dailyPicks.status, 'ACTIVE')),
      with: { winnerCluster: true },
    });

    if (!pick) {
      return null;
    }

    // Get the winner report
    const winnerReport = await ctx.db.query.aiClassifications.findFirst({
      where: and(
        eq(aiClassifications.targetType, 'WINNER_REPORT'),
        eq(aiClassifications.targetId, pick.winnerClusterId),
      ),
      orderBy: desc(aiClassifications.createdAt),
    });

    // Get trend series for the canonical query
    const trendData = await ctx.db.query.trendSeries.findFirst({
      where: eq(trendSeries.query, pick.winnerCluster.canonicalQuery.toLowerCase()),
      orderBy: desc(trendSeries.fetchedAt),
    });

    return {
      pick,
      cluster: pick.winnerCluster,
      report: winnerReport?.outputJson || null,
      trendPoints: trendData?.points || [],
    };
  }),

  /**
   * Get Daily Pick by date
   */
  getByDate: publicProcedure
    .input(z.object({ dateLocal: z.string() }))
    .query(async ({ ctx, input }) => {
      const pick = await ctx.db.query.dailyPicks.findFirst({
        where: and(eq(dailyPicks.dateLocal, input.dateLocal), eq(dailyPicks.status, 'ACTIVE')),
        with: { winnerCluster: true },
      });

      if (!pick) {
        return null;
      }

      // Get the winner report
      const winnerReport = await ctx.db.query.aiClassifications.findFirst({
        where: and(
          eq(aiClassifications.targetType, 'WINNER_REPORT'),
          eq(aiClassifications.targetId, pick.winnerClusterId),
        ),
        orderBy: desc(aiClassifications.createdAt),
      });

      // Get trend series for the canonical query
      const trendData = await ctx.db.query.trendSeries.findFirst({
        where: eq(trendSeries.query, pick.winnerCluster.canonicalQuery.toLowerCase()),
        orderBy: desc(trendSeries.fetchedAt),
      });

      return {
        pick,
        cluster: pick.winnerCluster,
        report: winnerReport?.outputJson || null,
        trendPoints: trendData?.points || [],
      };
    }),

  /**
   * List Daily Pick history
   */
  listHistory: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(30),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 30;
      const offset = input?.offset || 0;

      const picks = await ctx.db.query.dailyPicks.findMany({
        where: eq(dailyPicks.status, 'ACTIVE'),
        orderBy: desc(dailyPicks.dateLocal),
        limit,
        offset,
        with: {
          winnerCluster: {
            columns: {
              id: true,
              title: true,
              canonicalQuery: true,
              combinedScore: true,
              growthScore: true,
              purchaseProofScore: true,
            },
          },
        },
      });

      const [{ value: total }] = await ctx.db
        .select({ value: count() })
        .from(dailyPicks)
        .where(eq(dailyPicks.status, 'ACTIVE'));

      return {
        picks,
        total,
        hasMore: offset + picks.length < total,
      };
    }),

  /**
   * Get recent runs (for admin monitoring)
   */
  listRuns: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10;

      const runs = await ctx.db
        .select({
          id: dailyRuns.id,
          dateLocal: dailyRuns.dateLocal,
          startedAt: dailyRuns.startedAt,
          finishedAt: dailyRuns.finishedAt,
          status: dailyRuns.status,
          metrics: dailyRuns.metrics,
          logsRef: dailyRuns.logsRef,
          createdAt: dailyRuns.createdAt,
          updatedAt: dailyRuns.updatedAt,
          _count: {
            candidates: sql<number>`(SELECT count(*) FROM "QueryCandidate" WHERE "runId" = ${dailyRuns.id})`.mapWith(Number),
            clusters: sql<number>`(SELECT count(*) FROM "Cluster" WHERE "runId" = ${dailyRuns.id})`.mapWith(Number),
          },
        })
        .from(dailyRuns)
        .orderBy(desc(dailyRuns.startedAt))
        .limit(limit);

      return runs;
    }),

  /**
   * Get stats for a specific run
   */
  getRunDetails: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.dailyRuns.findFirst({
        where: eq(dailyRuns.id, input.runId),
        with: {
          candidates: {
            where: eq(queryCandidates.filterPassed, true),
            limit: 50,
          },
          clusters: {
            orderBy: desc(clusters.combinedScore),
          },
        },
      });

      if (!run) {
        return null;
      }

      // Get daily pick for this run (if any)
      const pick = await ctx.db.query.dailyPicks.findFirst({
        where: and(eq(dailyPicks.dateLocal, run.dateLocal), eq(dailyPicks.status, 'ACTIVE')),
      });

      return {
        run,
        pick,
      };
    }),
});
