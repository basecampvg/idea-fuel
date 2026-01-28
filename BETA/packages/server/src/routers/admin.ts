import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { configService, DEFAULT_CONFIGS } from '../services/config';

export const adminRouter = router({
  /**
   * List all configs grouped by category
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Initialize config service if needed
    if (!configService.isInitialized()) {
      await configService.init(ctx.prisma);
    }

    return configService.getAllByCategory();
  }),

  /**
   * Get a single config value
   */
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!configService.isInitialized()) {
        await configService.init(ctx.prisma);
      }

      const defaultConfig = DEFAULT_CONFIGS.find((c) => c.key === input.key);
      const value = configService.get(input.key, defaultConfig?.value ?? null);

      return {
        key: input.key,
        value,
        type: defaultConfig?.type ?? 'STRING',
        label: defaultConfig?.label ?? input.key,
        description: defaultConfig?.description,
        options: defaultConfig?.options,
      };
    }),

  /**
   * Update a single config value
   */
  set: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.unknown(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!configService.isInitialized()) {
        await configService.init(ctx.prisma);
      }

      await configService.set(input.key, input.value, ctx.userId, input.reason);

      return { success: true, key: input.key, value: input.value };
    }),

  /**
   * Bulk update multiple configs
   */
  bulkSet: protectedProcedure
    .input(
      z.array(
        z.object({
          key: z.string(),
          value: z.unknown(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      if (!configService.isInitialized()) {
        await configService.init(ctx.prisma);
      }

      for (const item of input) {
        await configService.set(item.key, item.value, ctx.userId, 'Bulk update');
      }

      return { success: true, updated: input.length };
    }),

  /**
   * Get audit log (config change history)
   */
  auditLog: protectedProcedure
    .input(
      z.object({
        key: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!configService.isInitialized()) {
        await configService.init(ctx.prisma);
      }

      return configService.getAuditLog({
        key: input.key,
        limit: input.limit,
      });
    }),

  /**
   * Reset a category to default values
   */
  resetCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!configService.isInitialized()) {
        await configService.init(ctx.prisma);
      }

      const count = await configService.resetCategory(input.category, ctx.userId);

      return { success: true, reset: count };
    }),

  /**
   * Refresh server config cache from database
   */
  refreshCache: protectedProcedure.mutation(async ({ ctx }) => {
    if (!configService.isInitialized()) {
      await configService.init(ctx.prisma);
    } else {
      await configService.refresh();
    }

    return {
      success: true,
      lastRefresh: configService.getLastRefresh(),
    };
  }),

  /**
   * Seed default configs if they don't exist
   */
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    if (!configService.isInitialized()) {
      await configService.init(ctx.prisma);
    }

    const seeded = await configService.seedDefaults();

    return { success: true, seeded };
  }),

  /**
   * Get available categories
   */
  categories: protectedProcedure.query(() => {
    const categories = new Set(DEFAULT_CONFIGS.map((c) => c.category));
    return Array.from(categories).map((category) => ({
      id: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      count: DEFAULT_CONFIGS.filter((c) => c.category === category).length,
    }));
  }),

  /**
   * Quick toggle for common feature flags
   */
  toggleFeature: protectedProcedure
    .input(
      z.object({
        feature: z.enum(['testMode', 'mockAI', 'socialProof', 'serpApi', 'deepResearch.enabled']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!configService.isInitialized()) {
        await configService.init(ctx.prisma);
      }

      const key = input.feature === 'deepResearch.enabled'
        ? 'ai.deepResearch.enabled'
        : `features.${input.feature}`;

      const currentValue = configService.getBoolean(key, false);
      await configService.set(key, !currentValue, ctx.userId, `Toggled via admin`);

      return { success: true, key, value: !currentValue };
    }),

  // ==========================================================================
  // USER AUDIT LOGS
  // ==========================================================================

  /**
   * Get user action audit logs (access control, compliance)
   */
  userAuditLogs: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await ctx.prisma.auditLog.findMany({
        where: {
          ...(input.userId && { userId: input.userId }),
          ...(input.action && { action: input.action }),
          ...(input.resource && { resource: { contains: input.resource } }),
        },
        take: input.limit + 1, // Fetch one extra to determine if there's more
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (logs.length > input.limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: logs,
        nextCursor,
      };
    }),

  /**
   * Get audit log summary by action type
   */
  auditLogSummary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      since.setHours(0, 0, 0, 0);

      const byAction = await ctx.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      });

      const byUser = await ctx.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10, // Top 10 most active users
      });

      // Get user details for the top users
      const userIds = byUser.map((u) => u.userId);
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      return {
        period: { days: input.days, since: since.toISOString() },
        byAction: byAction.map((a) => ({
          action: a.action,
          count: a._count,
        })),
        byUser: byUser.map((u) => ({
          userId: u.userId,
          user: userMap.get(u.userId) ?? null,
          count: u._count,
        })),
      };
    }),

  // ==========================================================================
  // TOKEN USAGE ANALYTICS
  // ==========================================================================

  /**
   * Get token usage summary for dashboard
   */
  tokenUsageSummary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      since.setHours(0, 0, 0, 0); // Start of day

      // Total usage
      const totals = await ctx.prisma.tokenUsage.aggregate({
        where: { createdAt: { gte: since } },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          costEstimate: true,
        },
        _count: true,
      });

      // By model
      const byModel = await ctx.prisma.tokenUsage.groupBy({
        by: ['model'],
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, costEstimate: true },
        _count: true,
        orderBy: { _sum: { totalTokens: 'desc' } },
      });

      // By function
      const byFunction = await ctx.prisma.tokenUsage.groupBy({
        by: ['functionName'],
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true, costEstimate: true },
        _count: true,
        orderBy: { _sum: { totalTokens: 'desc' } },
      });

      return {
        period: { days: input.days, since: since.toISOString() },
        totals: {
          inputTokens: totals._sum.inputTokens ?? 0,
          outputTokens: totals._sum.outputTokens ?? 0,
          totalTokens: totals._sum.totalTokens ?? 0,
          costEstimate: totals._sum.costEstimate ?? 0,
          callCount: totals._count,
        },
        byModel: byModel.map((m) => ({
          model: m.model,
          totalTokens: m._sum.totalTokens ?? 0,
          costEstimate: m._sum.costEstimate ?? 0,
          callCount: m._count,
        })),
        byFunction: byFunction.map((f) => ({
          functionName: f.functionName,
          totalTokens: f._sum.totalTokens ?? 0,
          costEstimate: f._sum.costEstimate ?? 0,
          callCount: f._count,
        })),
      };
    }),

  /**
   * Get daily token usage for chart display
   */
  tokenUsageChart: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      since.setHours(0, 0, 0, 0);

      // Raw data grouped by date using Prisma raw query
      const raw = await ctx.prisma.$queryRaw<
        Array<{
          date: Date;
          totalTokens: bigint;
          costEstimate: number | null;
          callCount: bigint;
        }>
      >`
        SELECT
          DATE("createdAt") as date,
          SUM("totalTokens") as "totalTokens",
          SUM("costEstimate") as "costEstimate",
          COUNT(*) as "callCount"
        FROM "TokenUsage"
        WHERE "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      return raw.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        totalTokens: Number(r.totalTokens),
        costEstimate: r.costEstimate ?? 0,
        callCount: Number(r.callCount),
      }));
    }),
});
