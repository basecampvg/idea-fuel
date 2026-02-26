import { z } from 'zod';
import { eq, and, desc, ne, count } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import {
  entityId,
  createFinancialModelSchema,
  updateFinancialModelSchema,
  paginationSchema,
  SUBSCRIPTION_FEATURES,
} from '@forge/shared';
import { TRPCError } from '@trpc/server';
import {
  financialModels,
  scenarios,
  assumptions,
  projects,
  users,
} from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import { getTemplate, listTemplates } from '../services/financial-templates';
import { calculateStatements, assumptionsToMap } from '../services/financial-calculator';
import { calculateBreakEven } from '../services/break-even-calculator';
import type { RevenueModel } from '../services/break-even-calculator';
import type { Context } from '../context';

/**
 * Verify that the requesting user owns the financial model.
 */
async function verifyModelOwnership(
  db: Context['db'],
  modelId: string,
  userId: string,
) {
  const model = await db.query.financialModels.findFirst({
    where: and(eq(financialModels.id, modelId), eq(financialModels.userId, userId)),
  });
  if (!model) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Financial model not found' });
  }
  return model;
}

export const financialRouter = router({
  /**
   * List all available industry templates.
   */
  listTemplates: protectedProcedure
    .query(() => {
      return listTemplates().map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        category: t.category,
        assumptionCounts: {
          beginner: t.assumptions.beginner.length,
          standard: t.assumptions.standard.length,
          expert: t.assumptions.expert.length,
        },
        wizardQuestionCount: t.wizardQuestions.length,
      }));
    }),

  /**
   * Create a new financial model, optionally from a template.
   */
  create: protectedProcedure
    .input(createFinancialModelSchema)
    .mutation(async ({ ctx, input }) => {
      // If projectId is provided, verify ownership
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
          columns: { id: true },
        });
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        }
      }

      // Enforce model limit per subscription tier
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { subscription: true },
      });
      const tier = (user?.subscription ?? 'FREE') as keyof typeof SUBSCRIPTION_FEATURES;
      const limit = SUBSCRIPTION_FEATURES[tier]?.financialModelLimit ?? 1;

      const [{ value: currentCount }] = await ctx.db
        .select({ value: count() })
        .from(financialModels)
        .where(and(eq(financialModels.userId, ctx.userId), ne(financialModels.status, 'ARCHIVED')));

      if (currentCount >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You've reached the limit of ${limit} financial model${limit !== 1 ? 's' : ''} on your ${tier} plan. Upgrade to create more.`,
        });
      }

      // Resolve template if provided
      const template = input.templateSlug ? getTemplate(input.templateSlug) : null;
      if (input.templateSlug && !template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Template "${input.templateSlug}" not found` });
      }

      return ctx.db.transaction(async (tx) => {
        // Create the financial model
        const [model] = await tx.insert(financialModels).values({
          userId: ctx.userId,
          projectId: input.projectId ?? null,
          name: input.name,
          knowledgeLevel: input.knowledgeLevel,
          forecastYears: input.forecastYears,
          settings: { ...(input.settings ?? {}), templateSlug: input.templateSlug ?? 'general' },
          updatedAt: new Date(),
        }).returning();

        // Create the base scenario
        const [baseScenario] = await tx.insert(scenarios).values({
          modelId: model.id,
          name: 'Base Case',
          isBase: true,
          description: 'Default base scenario',
          displayOrder: 0,
          updatedAt: new Date(),
        }).returning();

        // Seed assumptions from template if provided
        if (template) {
          const level = input.knowledgeLevel ?? 'BEGINNER';
          const templateAssumptions = template.assumptions[level.toLowerCase() as 'beginner' | 'standard' | 'expert'];

          if (templateAssumptions.length > 0) {
            const now = new Date();
            await tx.insert(assumptions).values(
              templateAssumptions.map((a, idx) => ({
                projectId: input.projectId ?? null,
                scenarioId: baseScenario.id,
                category: a.category ?? ('COSTS' as const),
                name: a.name,
                key: a.key,
                value: String(a.default),
                numericValue: typeof a.default === 'number' ? String(a.default) : null,
                valueType: a.valueType,
                unit: a.unit ?? null,
                confidence: 'AI_ESTIMATE' as const,
                source: `Template: ${template.name}`,
                formula: a.formula ?? null,
                dependsOn: a.dependsOn ?? [],
                displayOrder: idx,
                updatedByActor: 'system',
                updatedAt: now,
              })),
            );
          }
        }

        logAuditAsync({
          userId: ctx.userId,
          action: 'FINANCIAL_MODEL_CREATE',
          resource: formatResource('financial_model', model.id),
          metadata: {
            templateSlug: input.templateSlug,
            knowledgeLevel: input.knowledgeLevel,
            projectId: input.projectId,
          },
        });

        return { model, baseScenarioId: baseScenario.id };
      });
    }),

  /**
   * Get a financial model with its scenarios and assumption count.
   */
  get: protectedProcedure
    .input(z.object({ id: entityId }))
    .query(async ({ ctx, input }) => {
      const model = await verifyModelOwnership(ctx.db, input.id, ctx.userId);

      const modelScenarios = await ctx.db.query.scenarios.findMany({
        where: eq(scenarios.modelId, input.id),
        orderBy: [desc(scenarios.isBase), scenarios.displayOrder],
      });

      return {
        ...model,
        scenarios: modelScenarios,
      };
    }),

  /**
   * List user's financial models with pagination.
   */
  list: protectedProcedure
    .input(paginationSchema.optional().default({}))
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const models = await ctx.db.query.financialModels.findMany({
        where: and(eq(financialModels.userId, ctx.userId), ne(financialModels.status, 'ARCHIVED')),
        orderBy: desc(financialModels.updatedAt),
        limit,
        offset,
      });

      return { models, page, limit };
    }),

  /**
   * Get current model count and limit for the user's tier.
   */
  usage: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { subscription: true },
      });
      const tier = (user?.subscription ?? 'FREE') as keyof typeof SUBSCRIPTION_FEATURES;
      const limit = SUBSCRIPTION_FEATURES[tier]?.financialModelLimit ?? 1;

      const [{ value: currentCount }] = await ctx.db
        .select({ value: count() })
        .from(financialModels)
        .where(and(eq(financialModels.userId, ctx.userId), ne(financialModels.status, 'ARCHIVED')));

      return { currentCount, limit, tier };
    }),

  /**
   * Update model settings.
   */
  update: protectedProcedure
    .input(updateFinancialModelSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.id, ctx.userId);

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.knowledgeLevel !== undefined) updates.knowledgeLevel = input.knowledgeLevel;
      if (input.forecastYears !== undefined) updates.forecastYears = input.forecastYears;
      if (input.status !== undefined) updates.status = input.status;
      if (input.settings !== undefined) updates.settings = input.settings;

      const [updated] = await ctx.db
        .update(financialModels)
        .set(updates)
        .where(eq(financialModels.id, input.id))
        .returning();

      logAuditAsync({
        userId: ctx.userId,
        action: 'FINANCIAL_MODEL_UPDATE',
        resource: formatResource('financial_model', input.id),
        metadata: { updates: Object.keys(updates) },
      });

      return updated;
    }),

  /**
   * Soft-delete (archive) a model.
   */
  delete: protectedProcedure
    .input(z.object({ id: entityId }))
    .mutation(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.id, ctx.userId);

      await ctx.db
        .update(financialModels)
        .set({ status: 'ARCHIVED' })
        .where(eq(financialModels.id, input.id));

      logAuditAsync({
        userId: ctx.userId,
        action: 'FINANCIAL_MODEL_DELETE',
        resource: formatResource('financial_model', input.id),
      });

      return { success: true };
    }),

  /**
   * Compute financial statements (P&L, Balance Sheet, Cash Flow) for a scenario.
   */
  computeStatements: protectedProcedure
    .input(z.object({ scenarioId: entityId }))
    .query(async ({ ctx, input }) => {
      // Find scenario → model
      const scenario = await ctx.db.query.scenarios.findFirst({
        where: eq(scenarios.id, input.scenarioId),
        with: { model: true },
      });
      if (!scenario || scenario.model.userId !== ctx.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Scenario not found' });
      }

      const model = scenario.model;
      const templateSlug = (model.settings as Record<string, unknown>)?.templateSlug as string ?? 'general';
      const template = getTemplate(templateSlug);
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Template "${templateSlug}" not found` });
      }

      // Fetch assumptions for this scenario
      const rows = await ctx.db
        .select()
        .from(assumptions)
        .where(eq(assumptions.scenarioId, input.scenarioId));

      const assumptionMap = assumptionsToMap(rows);
      const statements = calculateStatements(assumptionMap, template, model.forecastYears);

      return statements;
    }),

  /**
   * Compute break-even analysis for a scenario.
   */
  computeBreakEven: protectedProcedure
    .input(z.object({ scenarioId: entityId }))
    .query(async ({ ctx, input }) => {
      const scenario = await ctx.db.query.scenarios.findFirst({
        where: eq(scenarios.id, input.scenarioId),
        with: { model: true },
      });
      if (!scenario || scenario.model.userId !== ctx.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Scenario not found' });
      }

      // Fetch assumptions
      const rows = await ctx.db
        .select()
        .from(assumptions)
        .where(eq(assumptions.scenarioId, input.scenarioId));

      const map = assumptionsToMap(rows);

      // Detect revenue model from assumptions
      let revenueModel: RevenueModel = 'unit';
      if (map.arpu || map.monthly_churn || map.new_customers_per_month) {
        revenueModel = 'subscription';
      } else if (map.hourly_rate || map.billable_hours) {
        revenueModel = 'services';
      }

      // Compute total monthly fixed costs from available assumptions
      const fixedCostsMonthly = (map.rent ?? 0)
        + (map.salaries ?? 0)
        + (map.infrastructure_costs ?? 0)
        + (map.marketing_budget ?? 0)
        + (map.other_fixed_costs ?? 0)
        + (map.total_opex ?? map.operating_expenses ?? 0);

      return calculateBreakEven({
        revenueModel,
        fixedCostsMonthly: fixedCostsMonthly || map.fixed_costs_monthly || 10000,
        pricePerUnit: map.unit_price ?? map.price_per_unit,
        variableCostPerUnit: map.variable_cost ?? map.cogs_per_unit,
        unitsPerMonth: map.units_per_month,
        arpu: map.arpu,
        monthlyChurnRate: map.monthly_churn,
        newCustomersPerMonth: map.new_customers_per_month,
        startingCustomers: map.starting_customers ?? 0,
        hourlyRate: map.hourly_rate,
        variableCostPerHour: map.variable_cost_per_hour,
        billableHoursPerMonth: map.billable_hours,
      });
    }),
});
