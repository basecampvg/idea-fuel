import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import {
  entityId,
  createFinancialModelSchema,
  updateFinancialModelSchema,
  paginationSchema,
} from '@forge/shared';
import { TRPCError } from '@trpc/server';
import {
  financialModels,
  scenarios,
  assumptions,
  projects,
} from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import { getTemplate, listTemplates } from '../services/financial-templates';
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
          settings: input.settings ?? {},
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
                projectId: input.projectId ?? model.id, // Use model ID as pseudo-project if standalone
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
        where: eq(financialModels.userId, ctx.userId),
        orderBy: desc(financialModels.updatedAt),
        limit,
        offset,
      });

      return { models, page, limit };
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
});
