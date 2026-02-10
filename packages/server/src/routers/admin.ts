import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { configService, DEFAULT_CONFIGS } from '../services/config';
import { eq, and, gte, desc, count, sum, sql, inArray, like } from 'drizzle-orm';
import { auditLogs, users, tokenUsages, adminIPWhitelists } from '../db/schema';

export const adminRouter = router({
  /**
   * List all configs grouped by category
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Initialize config service if needed
    if (!configService.isInitialized()) {
      await configService.init(ctx.db);
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
        await configService.init(ctx.db);
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
        await configService.init(ctx.db);
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
        await configService.init(ctx.db);
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
        await configService.init(ctx.db);
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
        await configService.init(ctx.db);
      }

      const count = await configService.resetCategory(input.category, ctx.userId);

      return { success: true, reset: count };
    }),

  /**
   * Refresh server config cache from database
   */
  refreshCache: protectedProcedure.mutation(async ({ ctx }) => {
    if (!configService.isInitialized()) {
      await configService.init(ctx.db);
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
      await configService.init(ctx.db);
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
        await configService.init(ctx.db);
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
      const conditions = [];
      if (input.userId) conditions.push(eq(auditLogs.userId, input.userId));
      if (input.action) conditions.push(eq(auditLogs.action, input.action));
      if (input.resource) conditions.push(like(auditLogs.resource, `%${input.resource}%`));

      const logs = await ctx.db.query.auditLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: input.limit + 1,
        offset: input.cursor ? 1 : 0,
        orderBy: desc(auditLogs.createdAt),
        with: {
          user: {
            columns: {
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

      const byAction = await ctx.db
        .select({ action: auditLogs.action, count: count() })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, since))
        .groupBy(auditLogs.action)
        .orderBy(desc(count()));

      const byUser = await ctx.db
        .select({ userId: auditLogs.userId, count: count() })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, since))
        .groupBy(auditLogs.userId)
        .orderBy(desc(count()))
        .limit(10);

      // Get user details for the top users
      const userIds = byUser.map((u) => u.userId);
      const userDetails = userIds.length > 0
        ? await ctx.db.query.users.findMany({
            where: inArray(users.id, userIds),
            columns: { id: true, email: true, name: true },
          })
        : [];
      const userMap = new Map(userDetails.map((u) => [u.id, u]));

      return {
        period: { days: input.days, since: since.toISOString() },
        byAction: byAction.map((a) => ({
          action: a.action,
          count: a.count,
        })),
        byUser: byUser.map((u) => ({
          userId: u.userId,
          user: userMap.get(u.userId) ?? null,
          count: u.count,
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
      since.setHours(0, 0, 0, 0);

      // Total usage
      const [totals] = await ctx.db
        .select({
          inputTokens: sum(tokenUsages.inputTokens),
          outputTokens: sum(tokenUsages.outputTokens),
          totalTokens: sum(tokenUsages.totalTokens),
          costEstimate: sum(tokenUsages.costEstimate),
          callCount: count(),
        })
        .from(tokenUsages)
        .where(gte(tokenUsages.createdAt, since));

      // By model
      const byModel = await ctx.db
        .select({
          model: tokenUsages.model,
          totalTokens: sum(tokenUsages.totalTokens),
          costEstimate: sum(tokenUsages.costEstimate),
          callCount: count(),
        })
        .from(tokenUsages)
        .where(gte(tokenUsages.createdAt, since))
        .groupBy(tokenUsages.model)
        .orderBy(desc(sum(tokenUsages.totalTokens)));

      // By function
      const byFunction = await ctx.db
        .select({
          functionName: tokenUsages.functionName,
          totalTokens: sum(tokenUsages.totalTokens),
          costEstimate: sum(tokenUsages.costEstimate),
          callCount: count(),
        })
        .from(tokenUsages)
        .where(gte(tokenUsages.createdAt, since))
        .groupBy(tokenUsages.functionName)
        .orderBy(desc(sum(tokenUsages.totalTokens)));

      return {
        period: { days: input.days, since: since.toISOString() },
        totals: {
          inputTokens: Number(totals.inputTokens ?? 0),
          outputTokens: Number(totals.outputTokens ?? 0),
          totalTokens: Number(totals.totalTokens ?? 0),
          costEstimate: Number(totals.costEstimate ?? 0),
          callCount: totals.callCount,
        },
        byModel: byModel.map((m) => ({
          model: m.model,
          totalTokens: Number(m.totalTokens ?? 0),
          costEstimate: Number(m.costEstimate ?? 0),
          callCount: m.callCount,
        })),
        byFunction: byFunction.map((f) => ({
          functionName: f.functionName,
          totalTokens: Number(f.totalTokens ?? 0),
          costEstimate: Number(f.costEstimate ?? 0),
          callCount: f.callCount,
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

      const raw = await ctx.db.execute(sql`
        SELECT
          DATE("createdAt") as date,
          SUM("totalTokens") as "totalTokens",
          SUM("costEstimate") as "costEstimate",
          COUNT(*) as "callCount"
        FROM "TokenUsage"
        WHERE "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `);

      return (raw as unknown as { date: Date; totalTokens: string; costEstimate: string | null; callCount: string }[]).map((r) => ({
        date: new Date(r.date).toISOString().split('T')[0],
        totalTokens: Number(r.totalTokens),
        costEstimate: Number(r.costEstimate ?? 0),
        callCount: Number(r.callCount),
      }));
    }),

  // ==========================================================================
  // IP WHITELIST MANAGEMENT (SUPER_ADMIN only)
  // ==========================================================================

  /**
   * List all whitelisted IPs
   */
  ipWhitelist: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { role: true },
    });

    if (user?.role !== 'SUPER_ADMIN') {
      throw new Error('Access denied. SUPER_ADMIN role required.');
    }

    return ctx.db.query.adminIPWhitelists.findMany({
      orderBy: desc(adminIPWhitelists.createdAt),
    });
  }),

  /**
   * Add an IP to the whitelist
   */
  addIPToWhitelist: protectedProcedure
    .input(
      z.object({
        ipAddress: z.string().min(7).max(45),
        label: z.string().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { role: true, email: true },
      });

      if (user?.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. SUPER_ADMIN role required.');
      }

      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

      if (!ipv4Regex.test(input.ipAddress) && !ipv6Regex.test(input.ipAddress)) {
        throw new Error('Invalid IP address format');
      }

      const [entry] = await ctx.db.insert(adminIPWhitelists).values({
        ipAddress: input.ipAddress,
        label: input.label,
        addedBy: ctx.userId,
        expiresAt: input.expiresAt,
      }).returning();

      // Log the action
      await ctx.db.insert(auditLogs).values({
        userId: ctx.userId,
        action: 'IP_WHITELIST_ADD',
        resource: `ip:${input.ipAddress}`,
        metadata: {
          label: input.label,
          expiresAt: input.expiresAt?.toISOString(),
        },
      });

      return entry;
    }),

  /**
   * Remove an IP from the whitelist
   */
  removeIPFromWhitelist: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { role: true },
      });

      if (user?.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. SUPER_ADMIN role required.');
      }

      const entry = await ctx.db.query.adminIPWhitelists.findFirst({
        where: eq(adminIPWhitelists.id, input.id),
      });

      if (!entry) {
        throw new Error('IP whitelist entry not found');
      }

      await ctx.db.delete(adminIPWhitelists).where(eq(adminIPWhitelists.id, input.id));

      // Log the action
      await ctx.db.insert(auditLogs).values({
        userId: ctx.userId,
        action: 'IP_WHITELIST_REMOVE',
        resource: `ip:${entry.ipAddress}`,
        metadata: { label: entry.label },
      });

      return { success: true, removed: entry.ipAddress };
    }),

  /**
   * Update an IP whitelist entry
   */
  updateIPWhitelist: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        label: z.string().optional(),
        expiresAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { role: true },
      });

      if (user?.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. SUPER_ADMIN role required.');
      }

      const [entry] = await ctx.db
        .update(adminIPWhitelists)
        .set({
          label: input.label,
          expiresAt: input.expiresAt,
        })
        .where(eq(adminIPWhitelists.id, input.id))
        .returning();

      return entry;
    }),

  /**
   * Get current user's IP (for self-whitelisting)
   */
  getCurrentIP: protectedProcedure.query(() => {
    return { note: 'Use /api/admin/current-ip endpoint to get your IP' };
  }),
});
