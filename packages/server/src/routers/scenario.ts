import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import {
  entityId,
  createScenarioSchema,
  updateScenarioSchema,
} from '@forge/shared';
import { TRPCError } from '@trpc/server';
import {
  financialModels,
  scenarios,
  assumptions,
} from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import type { Context } from '../context';

/**
 * Verify model ownership and return the model.
 */
async function verifyModelOwnership(
  db: Context['db'],
  modelId: string,
  userId: string,
) {
  const model = await db.query.financialModels.findFirst({
    where: and(eq(financialModels.id, modelId), eq(financialModels.userId, userId)),
    columns: { id: true },
  });
  if (!model) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Financial model not found' });
  }
  return model;
}

/**
 * Verify scenario ownership through its parent model.
 */
async function verifyScenarioOwnership(
  db: Context['db'],
  scenarioId: string,
  userId: string,
) {
  const scenario = await db.query.scenarios.findFirst({
    where: eq(scenarios.id, scenarioId),
    with: { model: { columns: { userId: true } } },
  });
  if (!scenario || scenario.model.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Scenario not found' });
  }
  return scenario;
}

export const scenarioRouter = router({
  /**
   * Create a new scenario for a model.
   * Optionally clones assumptions from an existing scenario.
   */
  create: protectedProcedure
    .input(createScenarioSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      return ctx.db.transaction(async (tx) => {
        // Get max display order
        const existing = await tx.query.scenarios.findMany({
          where: eq(scenarios.modelId, input.modelId),
          columns: { displayOrder: true },
        });
        const maxOrder = existing.reduce((max, s) => Math.max(max, s.displayOrder), 0);

        // Create the scenario
        const [scenario] = await tx.insert(scenarios).values({
          modelId: input.modelId,
          name: input.name,
          isBase: false,
          displayOrder: maxOrder + 1,
          updatedAt: new Date(),
        }).returning();

        // Clone assumptions if requested
        if (input.cloneFromScenarioId) {
          // Verify source scenario belongs to the same model
          const sourceScenario = await tx.query.scenarios.findFirst({
            where: and(
              eq(scenarios.id, input.cloneFromScenarioId),
              eq(scenarios.modelId, input.modelId),
            ),
          });
          if (!sourceScenario) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Source scenario not found in this model' });
          }

          const sourceAssumptions = await tx
            .select()
            .from(assumptions)
            .where(eq(assumptions.scenarioId, input.cloneFromScenarioId));

          if (sourceAssumptions.length > 0) {
            const now = new Date();
            await tx.insert(assumptions).values(
              sourceAssumptions.map((a) => ({
                projectId: a.projectId,
                scenarioId: scenario.id,
                parentId: a.parentId,
                category: a.category,
                name: a.name,
                key: a.key,
                value: a.value,
                numericValue: a.numericValue,
                timeSeries: a.timeSeries,
                valueType: a.valueType,
                unit: a.unit,
                confidence: a.confidence,
                source: a.source,
                sourceUrl: a.sourceUrl,
                formula: a.formula,
                dependsOn: a.dependsOn,
                tier: a.tier,
                isSensitive: a.isSensitive,
                isRequired: a.isRequired,
                displayOrder: a.displayOrder,
                updatedByActor: 'system',
                updatedAt: now,
              })),
            );
          }
        }

        logAuditAsync({
          userId: ctx.userId,
          action: 'SCENARIO_CREATE',
          resource: formatResource('scenario', scenario.id),
          metadata: { modelId: input.modelId, clonedFrom: input.cloneFromScenarioId },
        });

        return scenario;
      });
    }),

  /**
   * List scenarios for a model.
   */
  list: protectedProcedure
    .input(z.object({ modelId: entityId }))
    .query(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      return ctx.db.query.scenarios.findMany({
        where: eq(scenarios.modelId, input.modelId),
        orderBy: [desc(scenarios.isBase), scenarios.displayOrder],
      });
    }),

  /**
   * Update a scenario's name or description.
   */
  update: protectedProcedure
    .input(updateScenarioSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyScenarioOwnership(ctx.db, input.id, ctx.userId);

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;

      const [updated] = await ctx.db
        .update(scenarios)
        .set(updates)
        .where(eq(scenarios.id, input.id))
        .returning();

      logAuditAsync({
        userId: ctx.userId,
        action: 'SCENARIO_UPDATE',
        resource: formatResource('scenario', input.id),
        metadata: { updates: Object.keys(updates) },
      });

      return updated;
    }),

  /**
   * Delete a scenario. Cannot delete the base scenario.
   */
  delete: protectedProcedure
    .input(z.object({ id: entityId }))
    .mutation(async ({ ctx, input }) => {
      const scenario = await verifyScenarioOwnership(ctx.db, input.id, ctx.userId);

      if (scenario.isBase) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete the base scenario',
        });
      }

      return ctx.db.transaction(async (tx) => {
        // Delete assumptions for this scenario
        await tx.delete(assumptions).where(eq(assumptions.scenarioId, input.id));
        // Delete the scenario
        await tx.delete(scenarios).where(eq(scenarios.id, input.id));

        logAuditAsync({
          userId: ctx.userId,
          action: 'SCENARIO_DELETE',
          resource: formatResource('scenario', input.id),
        });

        return { success: true };
      });
    }),

  /**
   * Compare two or more scenarios — returns assumption deltas.
   */
  compare: protectedProcedure
    .input(z.object({ scenarioIds: z.array(entityId).min(2).max(5) }))
    .query(async ({ ctx, input }) => {
      // Load all scenarios and verify ownership
      const scenarioList = await Promise.all(
        input.scenarioIds.map((id) => verifyScenarioOwnership(ctx.db, id, ctx.userId)),
      );

      // Load assumptions for each scenario
      const scenarioAssumptions = await Promise.all(
        input.scenarioIds.map(async (scenarioId) => {
          const rows = await ctx.db
            .select()
            .from(assumptions)
            .where(eq(assumptions.scenarioId, scenarioId));
          return { scenarioId, assumptions: rows };
        }),
      );

      // Build comparison: for each assumption key, show values across scenarios
      const allKeys = new Set<string>();
      for (const sa of scenarioAssumptions) {
        for (const a of sa.assumptions) {
          allKeys.add(a.key);
        }
      }

      const comparison = Array.from(allKeys).map((key) => {
        const values: Record<string, { value: string | null; name: string }> = {};
        for (const sa of scenarioAssumptions) {
          const a = sa.assumptions.find((row) => row.key === key);
          const scenario = scenarioList.find((s) => s.id === sa.scenarioId);
          values[sa.scenarioId] = {
            value: a?.value ?? null,
            name: scenario?.name ?? sa.scenarioId,
          };
        }
        const firstAssumption = scenarioAssumptions
          .flatMap((sa) => sa.assumptions)
          .find((a) => a.key === key);
        return {
          key,
          name: firstAssumption?.name ?? key,
          category: firstAssumption?.category,
          values,
        };
      });

      return { scenarios: scenarioList, comparison };
    }),
});
