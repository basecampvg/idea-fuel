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
});
