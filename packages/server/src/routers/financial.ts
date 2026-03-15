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
  modelModules,
} from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import { getTemplate, listTemplates } from '../services/financial-templates';
import { assumptionsToMap } from '../services/hyperformula-engine';
import { buildWorkbook, readStatements, enrichStatements } from '../services/hyperformula-engine';
import type { AssumptionRow } from '../services/hyperformula-engine';
import { listAllModules, getModulesForTemplate, getModule } from '../services/modules';
import type { ModuleDefinition } from '../services/modules';
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
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        columns: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
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
          projectId: input.projectId,
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
                projectId: input.projectId,
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

        // Auto-enable default modules for this template and seed their inputs
        const templateSlug = input.templateSlug ?? 'general';
        const defaultModules = getModulesForTemplate(templateSlug);

        if (defaultModules.length > 0) {
          // Get existing assumption keys (just seeded from template)
          const existingKeys = new Set(
            (await tx
              .select({ key: assumptions.key })
              .from(assumptions)
              .where(eq(assumptions.projectId, input.projectId))
            ).map((r) => r.key),
          );

          const now = new Date();
          const moduleInputCategory: Record<string, string> = {
            marketing_funnel: 'ACQUISITION',
            ltv_cohort: 'PRICING',
            payroll: 'COSTS',
            cogs_variable: 'COSTS',
            debt_schedule: 'FUNDING',
          };

          for (let i = 0; i < defaultModules.length; i++) {
            const mod = defaultModules[i];

            // Enable the module
            await tx.insert(modelModules).values({
              modelId: model.id,
              moduleKey: mod.key,
              isEnabled: true,
              displayOrder: i,
            });

            // Seed its inputs (skip keys that already exist from template)
            const toSeed = mod.inputs
              .filter((inp) => !existingKeys.has(inp.key))
              .map((inp, idx) => ({
                projectId: input.projectId,
                scenarioId: baseScenario.id,
                category: (moduleInputCategory[mod.key] ?? 'COSTS') as 'PRICING' | 'ACQUISITION' | 'RETENTION' | 'MARKET' | 'COSTS' | 'FUNDING' | 'TIMELINE',
                name: inp.name,
                key: inp.key,
                value: String(inp.default),
                numericValue: String(inp.default),
                valueType: inp.valueType as 'NUMBER' | 'PERCENTAGE' | 'CURRENCY' | 'TEXT' | 'DATE' | 'SELECT',
                unit: inp.unit ?? null,
                confidence: 'AI_ESTIMATE' as const,
                source: `Module: ${mod.name}`,
                formula: null,
                dependsOn: [],
                displayOrder: 1000 + i * 100 + idx,
                updatedByActor: 'system',
                updatedAt: now,
              }));

            if (toSeed.length > 0) {
              await tx.insert(assumptions).values(toSeed);
              for (const s of toSeed) existingKeys.add(s.key);
            }
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
            modulesEnabled: defaultModules.map(m => m.key),
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
   * List user's financial models for a project with pagination.
   */
  list: protectedProcedure
    .input(z.object({ projectId: entityId }).merge(paginationSchema).partial({ page: true, limit: true }))
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const limit = input.limit ?? 50;
      const offset = (page - 1) * limit;

      const models = await ctx.db.query.financialModels.findMany({
        where: and(
          eq(financialModels.userId, ctx.userId),
          eq(financialModels.projectId, input.projectId),
          ne(financialModels.status, 'ARCHIVED'),
        ),
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

      // Load active modules for this model
      const enabledModuleRows = await ctx.db
        .select()
        .from(modelModules)
        .where(and(eq(modelModules.modelId, model.id), eq(modelModules.isEnabled, true)));

      const activeModules = enabledModuleRows
        .map(r => getModule(r.moduleKey))
        .filter((m): m is NonNullable<typeof m> => m !== null);

      // Build HyperFormula workbook and compute statements
      const assumptionRows: AssumptionRow[] = rows.map(r => ({
        key: r.key,
        value: r.value,
        numericValue: r.numericValue,
        formula: r.formula,
      }));

      const hf = buildWorkbook({
        assumptions: assumptionRows,
        template,
        forecastYears: model.forecastYears,
        activeModules,
      });

      const rawStatements = readStatements(hf, model.forecastYears);
      const statements = enrichStatements(rawStatements, template);

      hf.destroy();

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

  // =========================================================================
  // Calculation Modules
  // =========================================================================

  /** List all available calculation modules. */
  listAvailableModules: protectedProcedure
    .query(() => {
      return listAllModules().map(m => ({
        key: m.key,
        name: m.name,
        category: m.category,
        defaultTemplates: m.defaultTemplates,
        inputCount: m.inputs.length,
        outputCount: m.calculations.filter(c => c.isOutput).length,
      }));
    }),

  /** List active modules for a financial model. */
  listModelModules: protectedProcedure
    .input(z.object({ modelId: entityId }))
    .query(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      const rows = await ctx.db
        .select()
        .from(modelModules)
        .where(eq(modelModules.modelId, input.modelId))
        .orderBy(modelModules.displayOrder);

      return rows.map(r => ({
        ...r,
        module: getModule(r.moduleKey),
      }));
    }),

  /** Auto-sync default modules for an existing model that has none configured. */
  syncModules: protectedProcedure
    .input(z.object({ modelId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const model = await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      // Check if any modules already configured
      const existing = await ctx.db
        .select({ id: modelModules.id })
        .from(modelModules)
        .where(eq(modelModules.modelId, input.modelId))
        .limit(1);

      if (existing.length > 0) return { synced: false, count: 0 };

      // Get template and its default modules
      const templateSlug = (model.settings as Record<string, unknown>)?.templateSlug as string ?? 'general';
      const defaultMods = getModulesForTemplate(templateSlug);
      if (defaultMods.length === 0) return { synced: false, count: 0 };

      // Find base scenario for assumption seeding
      const baseScenario = await ctx.db.query.scenarios.findFirst({
        where: and(eq(scenarios.modelId, input.modelId), eq(scenarios.isBase, true)),
      });

      // Get existing assumption keys
      const existingKeys = model.projectId
        ? new Set((await ctx.db.select({ key: assumptions.key }).from(assumptions).where(eq(assumptions.projectId, model.projectId))).map(r => r.key))
        : new Set<string>();

      const now = new Date();
      const moduleInputCategory: Record<string, string> = {
        marketing_funnel: 'ACQUISITION', ltv_cohort: 'PRICING', payroll: 'COSTS', cogs_variable: 'COSTS', debt_schedule: 'FUNDING',
      };

      for (let i = 0; i < defaultMods.length; i++) {
        const mod = defaultMods[i];
        await ctx.db.insert(modelModules).values({
          modelId: input.modelId, moduleKey: mod.key, isEnabled: true, displayOrder: i,
        });

        if (model.projectId && baseScenario) {
          const toSeed = mod.inputs
            .filter(inp => !existingKeys.has(inp.key))
            .map((inp, idx) => ({
              projectId: model.projectId!,
              scenarioId: baseScenario.id,
              category: (moduleInputCategory[mod.key] ?? 'COSTS') as 'PRICING' | 'ACQUISITION' | 'RETENTION' | 'MARKET' | 'COSTS' | 'FUNDING' | 'TIMELINE',
              name: inp.name, key: inp.key,
              value: String(inp.default), numericValue: String(inp.default),
              valueType: inp.valueType as 'NUMBER' | 'PERCENTAGE' | 'CURRENCY' | 'TEXT' | 'DATE' | 'SELECT',
              unit: inp.unit ?? null, confidence: 'AI_ESTIMATE' as const,
              source: `Module: ${mod.name}`, formula: null, dependsOn: [],
              displayOrder: 1000 + i * 100 + idx,
              updatedByActor: 'system', updatedAt: now,
            }));
          if (toSeed.length > 0) {
            await ctx.db.insert(assumptions).values(toSeed);
            for (const s of toSeed) existingKeys.add(s.key);
          }
        }
      }

      return { synced: true, count: defaultMods.length };
    }),

  /** Enable or disable a module for a financial model. */
  toggleModule: protectedProcedure
    .input(z.object({
      modelId: entityId,
      moduleKey: z.string().min(1).max(64),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      // Verify module exists
      const mod = getModule(input.moduleKey);
      if (!mod) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Module "${input.moduleKey}" not found` });
      }

      // Upsert the model-module record
      const existing = await ctx.db
        .select()
        .from(modelModules)
        .where(and(
          eq(modelModules.modelId, input.modelId),
          eq(modelModules.moduleKey, input.moduleKey),
        ))
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .update(modelModules)
          .set({ isEnabled: input.enabled })
          .where(eq(modelModules.id, existing[0].id));
      } else {
        // Get next display order
        const countResult = await ctx.db
          .select({ cnt: count() })
          .from(modelModules)
          .where(eq(modelModules.modelId, input.modelId));

        await ctx.db.insert(modelModules).values({
          modelId: input.modelId,
          moduleKey: input.moduleKey,
          isEnabled: input.enabled,
          displayOrder: (countResult[0]?.cnt ?? 0),
        });
      }

      // When enabling a module, seed its input assumptions with defaults
      if (input.enabled) {
        // Find the model's project and base scenario
        const model = await ctx.db.query.financialModels.findFirst({
          where: eq(financialModels.id, input.modelId),
        });
        if (model?.projectId) {
          const baseScenario = await ctx.db.query.scenarios.findFirst({
            where: and(eq(scenarios.modelId, input.modelId), eq(scenarios.isBase, true)),
          });
          const scenarioId = baseScenario?.id ?? null;

          // Get existing assumption keys for this project
          const existingKeys = new Set(
            (await ctx.db
              .select({ key: assumptions.key })
              .from(assumptions)
              .where(eq(assumptions.projectId, model.projectId))
            ).map((r) => r.key),
          );

          // Seed missing module inputs
          const now = new Date();
          const moduleInputCategory: Record<string, string> = {
            marketing_funnel: 'ACQUISITION',
            ltv_cohort: 'PRICING',
            payroll: 'COSTS',
            cogs_variable: 'COSTS',
            debt_schedule: 'FUNDING',
          };

          const toSeed = mod.inputs
            .filter((inp) => !existingKeys.has(inp.key))
            .map((inp, idx) => ({
              projectId: model.projectId!,
              scenarioId,
              category: (moduleInputCategory[input.moduleKey] ?? 'COSTS') as 'PRICING' | 'ACQUISITION' | 'RETENTION' | 'MARKET' | 'COSTS' | 'FUNDING' | 'TIMELINE',
              name: inp.name,
              key: inp.key,
              value: String(inp.default),
              numericValue: String(inp.default),
              valueType: inp.valueType as 'NUMBER' | 'PERCENTAGE' | 'CURRENCY' | 'TEXT' | 'DATE' | 'SELECT',
              unit: inp.unit ?? null,
              confidence: 'AI_ESTIMATE' as const,
              source: `Module: ${mod.name}`,
              formula: null,
              dependsOn: [],
              displayOrder: 1000 + idx, // high order so they appear after template defaults
              updatedByActor: 'system',
              updatedByUserId: ctx.userId,
              updatedAt: now,
            }));

          if (toSeed.length > 0) {
            await ctx.db.insert(assumptions).values(toSeed);
          }
        }
      }

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('financial_model', input.modelId),
        metadata: { action: 'toggle_module', moduleKey: input.moduleKey, enabled: input.enabled, seeded: input.enabled },
      });

      return { moduleKey: input.moduleKey, enabled: input.enabled };
    }),
});
