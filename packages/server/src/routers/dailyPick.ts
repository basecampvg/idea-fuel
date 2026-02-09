import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { runDailyTrendPick, getRunStatus } from '../jobs/dailyTrendPickJob';
import { formatInTimeZone } from 'date-fns-tz';

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

    const pick = await ctx.prisma.dailyPick.findFirst({
      where: {
        dateLocal: today,
        status: 'ACTIVE',
      },
      include: {
        winnerCluster: true,
      },
    });

    if (!pick) {
      return null;
    }

    // Get the winner report
    const winnerReport = await ctx.prisma.aIClassification.findFirst({
      where: {
        targetType: 'WINNER_REPORT',
        targetId: pick.winnerClusterId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get trend series for the canonical query
    const trendSeries = await ctx.prisma.trendSeries.findFirst({
      where: {
        query: pick.winnerCluster.canonicalQuery.toLowerCase(),
      },
      orderBy: { fetchedAt: 'desc' },
    });

    return {
      pick,
      cluster: pick.winnerCluster,
      report: winnerReport?.outputJson || null,
      trendPoints: trendSeries?.points || [],
    };
  }),

  /**
   * Get Daily Pick by date
   */
  getByDate: publicProcedure
    .input(z.object({ dateLocal: z.string() }))
    .query(async ({ ctx, input }) => {
      const pick = await ctx.prisma.dailyPick.findFirst({
        where: {
          dateLocal: input.dateLocal,
          status: 'ACTIVE',
        },
        include: {
          winnerCluster: true,
        },
      });

      if (!pick) {
        return null;
      }

      // Get the winner report
      const winnerReport = await ctx.prisma.aIClassification.findFirst({
        where: {
          targetType: 'WINNER_REPORT',
          targetId: pick.winnerClusterId,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get trend series for the canonical query
      const trendSeries = await ctx.prisma.trendSeries.findFirst({
        where: {
          query: pick.winnerCluster.canonicalQuery.toLowerCase(),
        },
        orderBy: { fetchedAt: 'desc' },
      });

      return {
        pick,
        cluster: pick.winnerCluster,
        report: winnerReport?.outputJson || null,
        trendPoints: trendSeries?.points || [],
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

      const picks = await ctx.prisma.dailyPick.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { dateLocal: 'desc' },
        take: limit,
        skip: offset,
        include: {
          winnerCluster: {
            select: {
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

      const total = await ctx.prisma.dailyPick.count({
        where: { status: 'ACTIVE' },
      });

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

      const runs = await ctx.prisma.dailyRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: limit,
        include: {
          _count: {
            select: {
              candidates: true,
              clusters: true,
            },
          },
        },
      });

      return runs;
    }),

  /**
   * Get stats for a specific run
   */
  getRunDetails: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.prisma.dailyRun.findUnique({
        where: { id: input.runId },
        include: {
          candidates: {
            where: { filterPassed: true },
            take: 50,
          },
          clusters: {
            orderBy: { combinedScore: 'desc' },
          },
        },
      });

      if (!run) {
        return null;
      }

      // Get daily pick for this run (if any)
      const pick = await ctx.prisma.dailyPick.findFirst({
        where: { dateLocal: run.dateLocal, status: 'ACTIVE' },
      });

      return {
        run,
        pick,
      };
    }),
});
