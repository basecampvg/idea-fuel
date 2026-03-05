import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import {
  entityId,
  updateAssumptionSchema,
  batchUpdateAssumptionSchema,
  assumptionKeySchema,
} from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { assumptions, assumptionHistory, projects, reports, scenarios, financialModels } from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import { DEFAULT_ASSUMPTIONS } from '../services/assumption-defaults';
import { getTemplate } from '../services/financial-templates';
import { executeCascade, executeBatchCascade, detectCycles } from '../lib/cascade-engine';
import { validateFormula, extractDependencies } from '../lib/formula-engine';
import { getEffectiveConfidence, getStalenessInfo } from '../lib/confidence-engine';
import { enqueueSectionRegen } from '../jobs/queues';
import type { Assumption } from '@forge/shared';
import type { Context } from '../context';

/**
 * Verify that the requesting user owns the project.
 */
async function verifyProjectOwnership(
  db: Context['db'],
  projectId: string,
  userId: string,
) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    columns: { id: true },
  });
  if (!project) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
  }
  return project;
}

/**
 * Verify scenario ownership through its parent financial model.
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

export const assumptionRouter = router({
  /**
   * List all assumptions for a project.
   * Includes effective confidence and staleness info.
   */
  list: protectedProcedure
    .input(z.object({ projectId: entityId }))
    .query(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      const rows = await ctx.db
        .select()
        .from(assumptions)
        .where(eq(assumptions.projectId, input.projectId))
        .orderBy(assumptions.category, assumptions.key);

      const allAssumptions = rows as unknown as Assumption[];

      return allAssumptions.map((a) => ({
        ...a,
        effectiveConfidence: getEffectiveConfidence(a, allAssumptions),
        staleness: getStalenessInfo(a),
      }));
    }),

  /**
   * Get a single assumption by ID.
   */
  get: protectedProcedure
    .input(z.object({ id: entityId }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db
        .select()
        .from(assumptions)
        .innerJoin(projects, eq(assumptions.projectId, projects.id))
        .where(and(eq(assumptions.id, input.id), eq(projects.userId, ctx.userId)))
        .limit(1);

      if (row.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assumption not found' });
      }

      return row[0].Assumption;
    }),

  /**
   * Get cascade preview — shows what would change if an assumption's value were updated.
   * Does NOT persist any changes.
   */
  getCascadePreview: protectedProcedure
    .input(z.object({ projectId: entityId, key: assumptionKeySchema, newValue: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      const rows = await ctx.db
        .select()
        .from(assumptions)
        .where(eq(assumptions.projectId, input.projectId));

      return executeCascade(rows as unknown as Assumption[], input.key, input.newValue);
    }),

  /**
   * Get history for an assumption.
   */
  getHistory: protectedProcedure
    .input(z.object({ assumptionId: entityId, limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      // Verify ownership through assumption -> project -> user
      const row = await ctx.db
        .select({ projectId: assumptions.projectId })
        .from(assumptions)
        .innerJoin(projects, eq(assumptions.projectId, projects.id))
        .where(and(eq(assumptions.id, input.assumptionId), eq(projects.userId, ctx.userId)))
        .limit(1);

      if (row.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assumption not found' });
      }

      return ctx.db
        .select()
        .from(assumptionHistory)
        .where(eq(assumptionHistory.assumptionId, input.assumptionId))
        .orderBy(desc(assumptionHistory.createdAt))
        .limit(input.limit);
    }),

  /**
   * Seed default assumptions for a project.
   * Idempotent — skips if assumptions already exist.
   */
  seedDefaults: protectedProcedure
    .input(z.object({ projectId: entityId }))
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      // Check if assumptions already exist for this project
      const existing = await ctx.db
        .select({ id: assumptions.id })
        .from(assumptions)
        .where(eq(assumptions.projectId, input.projectId))
        .limit(1);

      if (existing.length > 0) {
        return { seeded: false, count: 0 };
      }

      const now = new Date();
      const rows = DEFAULT_ASSUMPTIONS.map((seed) => ({
        projectId: input.projectId,
        category: seed.category,
        name: seed.name,
        key: seed.key,
        value: null as string | null,
        valueType: seed.valueType,
        unit: seed.unit,
        confidence: seed.defaultConfidence,
        source: 'System default',
        sourceUrl: null as string | null,
        formula: seed.formula,
        dependsOn: seed.dependsOn,
        tier: seed.tier,
        isSensitive: seed.isSensitive,
        isRequired: seed.isRequired,
        updatedByActor: 'system',
        updatedByUserId: null as string | null,
        updatedAt: now,
      }));

      await ctx.db.insert(assumptions).values(rows);

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', input.projectId),
        metadata: { action: 'seed_assumptions', count: rows.length },
      });

      return { seeded: true, count: rows.length };
    }),

  /**
   * Sync assumptions from the financial model's template.
   * Adds any missing assumptions (base or calculated) for the current
   * knowledge level and fixes categories/formulas on existing rows.
   * Idempotent — safe to call on every page load.
   */
  syncFromTemplate: protectedProcedure
    .input(z.object({ projectId: entityId, modelId: entityId }))
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      // Look up the financial model to find its template
      const model = await ctx.db
        .select()
        .from(financialModels)
        .where(and(eq(financialModels.id, input.modelId), eq(financialModels.userId, ctx.userId)))
        .limit(1);

      if (model.length === 0) {
        return { synced: false, added: 0, updated: 0 };
      }

      const fm = model[0];
      const templateSlug = (fm.settings as Record<string, unknown>)?.templateSlug as string | undefined;
      if (!templateSlug) return { synced: false, added: 0, updated: 0 };

      const template = getTemplate(templateSlug);
      if (!template) return { synced: false, added: 0, updated: 0 };

      const level = (fm.knowledgeLevel ?? 'BEGINNER').toLowerCase() as 'beginner' | 'standard' | 'expert';
      const templateAssumptions = template.assumptions[level];
      if (!templateAssumptions || templateAssumptions.length === 0) return { synced: false, added: 0, updated: 0 };

      // Get existing assumptions for this project
      const existing = await ctx.db
        .select()
        .from(assumptions)
        .where(eq(assumptions.projectId, input.projectId));

      const existingKeyMap = new Map(existing.map((a) => [a.key, a]));

      // Find the scenarioId from existing assumptions (they were seeded with one)
      const scenarioId = existing.find((a) => a.scenarioId)?.scenarioId ?? null;

      let added = 0;
      let updated = 0;
      const now = new Date();

      // 1. Add ALL missing assumptions (base + calculated) for this level
      const missing = templateAssumptions.filter((ta) => !existingKeyMap.has(ta.key));

      if (missing.length > 0) {
        const baseIdx = existing.length;
        await ctx.db.insert(assumptions).values(
          missing.map((a, idx) => ({
            projectId: input.projectId,
            scenarioId,
            category: a.category ?? ('COSTS' as const),
            name: a.name,
            key: a.key,
            value: String(a.default),
            numericValue: typeof a.default === 'number' ? String(a.default) : null,
            valueType: a.valueType,
            unit: a.unit ?? null,
            confidence: (a.formula ? 'CALCULATED' : 'AI_ESTIMATE') as 'CALCULATED' | 'AI_ESTIMATE',
            source: `Template: ${template.name}`,
            formula: a.formula ?? null,
            dependsOn: a.dependsOn ?? [],
            displayOrder: baseIdx + idx,
            updatedByActor: 'system',
            updatedAt: now,
          })),
        );
        added = missing.length;
      }

      // 2. Fix categories + add dependsOn/formula on existing assumptions
      for (const ta of templateAssumptions) {
        const existingRow = existingKeyMap.get(ta.key);
        if (!existingRow) continue;

        const updates: Record<string, unknown> = {};
        // Fix category if it was defaulted to COSTS but template specifies something else
        if (ta.category && existingRow.category !== ta.category) {
          updates.category = ta.category;
        }
        // Add formula if missing
        if (ta.formula && !existingRow.formula) {
          updates.formula = ta.formula;
          updates.confidence = 'CALCULATED';
        }
        // Add dependsOn if missing
        if (ta.dependsOn && ta.dependsOn.length > 0 && (!existingRow.dependsOn || existingRow.dependsOn.length === 0)) {
          updates.dependsOn = ta.dependsOn;
        }

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(assumptions)
            .set(updates)
            .where(eq(assumptions.id, existingRow.id));
          updated++;
        }
      }

      // 3. Remove stale assumptions that don't belong to this template level.
      //    Only delete rows that share the same scenarioId (template-originated),
      //    so we never touch project-level assumptions (scenarioId = null).
      let removed = 0;
      if (scenarioId) {
        const templateKeys = new Set(templateAssumptions.map((ta) => ta.key));
        const stale = existing.filter(
          (a) => a.scenarioId === scenarioId && !templateKeys.has(a.key),
        );
        for (const row of stale) {
          await ctx.db.delete(assumptions).where(eq(assumptions.id, row.id));
          removed++;
        }
      }

      return { synced: true, added, updated, removed };
    }),

  /**
   * Update a single assumption's value.
   * Executes cascade recalculation within a transaction.
   */
  update: protectedProcedure
    .input(updateAssumptionSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      // Get the assumption to update
      const target = await ctx.db
        .select()
        .from(assumptions)
        .where(and(eq(assumptions.id, input.id), eq(assumptions.projectId, input.projectId)))
        .limit(1);

      if (target.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assumption not found' });
      }

      const assumption = target[0];

      // If formula is being updated, validate it
      if (input.formula !== undefined) {
        const allRows = await ctx.db
          .select()
          .from(assumptions)
          .where(eq(assumptions.projectId, input.projectId));
        const availableKeys = allRows.map((a) => a.key);

        if (input.formula !== null) {
          const validation = validateFormula(input.formula, availableKeys);
          if (!validation.valid) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid formula: ${validation.error}` });
          }

          // Auto-extract dependencies from formula
          const deps = extractDependencies(input.formula);

          // Check for circular dependencies with the new formula
          const testAssumptions = allRows.map((a) =>
            a.id === input.id
              ? { ...a, formula: input.formula!, dependsOn: deps }
              : a,
          ) as unknown as Assumption[];

          const cycles = detectCycles(testAssumptions);
          if (cycles) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Circular dependency detected: ${cycles.join(' -> ')}`,
            });
          }
        }
      }

      // Execute update + cascade in a transaction
      return ctx.db.transaction(async (tx) => {
        // Lock all project assumptions for cascade
        const allAssumptions = await tx
          .select()
          .from(assumptions)
          .where(eq(assumptions.projectId, input.projectId))
          .for('update');

        // Build update object
        const updates: Record<string, unknown> = {};
        if (input.value !== undefined) updates.value = input.value;
        if (input.confidence !== undefined) updates.confidence = input.confidence;
        if (input.source !== undefined) updates.source = input.source;
        if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl;
        if (input.formula !== undefined) {
          updates.formula = input.formula;
          if (input.formula !== null) {
            updates.dependsOn = extractDependencies(input.formula);
            updates.confidence = 'CALCULATED';
          } else {
            updates.dependsOn = [];
          }
        }
        updates.updatedByActor = 'user';
        updates.updatedByUserId = ctx.userId;

        // Apply the direct update
        await tx
          .update(assumptions)
          .set(updates)
          .where(eq(assumptions.id, input.id));

        // Log history for the direct change
        await tx.insert(assumptionHistory).values({
          assumptionId: input.id,
          oldValue: assumption.value,
          newValue: input.value ?? assumption.value,
          oldConfidence: assumption.confidence,
          newConfidence: (input.confidence ?? assumption.confidence) as typeof assumption.confidence,
          changedByActor: 'user',
          changedByUserId: ctx.userId,
          reason: null,
        });

        // Execute cascade if value changed
        let cascadeResult = null;
        if (input.value !== undefined && input.value !== assumption.value) {
          // Refresh assumptions after update
          const refreshed = allAssumptions.map((a) =>
            a.id === input.id ? { ...a, ...updates } : a,
          ) as unknown as Assumption[];

          cascadeResult = executeCascade(refreshed, assumption.key, input.value ?? '');

          if (cascadeResult.status === 'success') {
            // Apply cascade changes (skip the direct change, already applied)
            for (const change of cascadeResult.updatedAssumptions) {
              if (change.key === assumption.key) continue;

              const cascadedAssumption = allAssumptions.find((a) => a.key === change.key);
              if (!cascadedAssumption) continue;

              await tx
                .update(assumptions)
                .set({
                  value: change.newValue === 'null' ? null : change.newValue,
                  updatedByActor: 'system',
                  updatedByUserId: ctx.userId,
                })
                .where(and(
                  eq(assumptions.projectId, input.projectId),
                  eq(assumptions.key, change.key),
                ));

              await tx.insert(assumptionHistory).values({
                assumptionId: cascadedAssumption.id,
                oldValue: change.oldValue,
                newValue: change.newValue === 'null' ? null : change.newValue,
                changedByActor: 'system',
                changedByUserId: ctx.userId,
                reason: `Cascade from ${assumption.key} change`,
              });
            }
          }
        }

        logAuditAsync({
          userId: ctx.userId,
          action: 'PROJECT_UPDATE',
          resource: formatResource('project', input.projectId),
          metadata: {
            action: 'update_assumption',
            key: assumption.key,
            oldValue: assumption.value,
            newValue: input.value,
            cascadeChanges: cascadeResult?.status === 'success'
              ? cascadeResult.updatedAssumptions.length - 1
              : 0,
          },
        });

        return {
          assumption: { ...assumption, ...updates },
          cascade: cascadeResult,
        };
      });
    }),

  /**
   * Batch update multiple assumptions at once.
   */
  batchUpdate: protectedProcedure
    .input(batchUpdateAssumptionSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      return ctx.db.transaction(async (tx) => {
        const allAssumptions = await tx
          .select()
          .from(assumptions)
          .where(eq(assumptions.projectId, input.projectId))
          .for('update');

        const results: Array<{ key: string; success: boolean }> = [];

        for (const update of input.updates) {
          const target = allAssumptions.find((a) => a.key === update.key);
          if (!target) {
            results.push({ key: update.key, success: false });
            continue;
          }

          const updates: Record<string, unknown> = {
            updatedByActor: 'user',
            updatedByUserId: ctx.userId,
          };
          if (update.value !== undefined) updates.value = update.value;
          if (update.confidence !== undefined) updates.confidence = update.confidence;
          if (update.source !== undefined) updates.source = update.source;

          await tx
            .update(assumptions)
            .set(updates)
            .where(and(
              eq(assumptions.projectId, input.projectId),
              eq(assumptions.key, update.key),
            ));

          await tx.insert(assumptionHistory).values({
            assumptionId: target.id,
            oldValue: target.value,
            newValue: update.value ?? target.value,
            oldConfidence: target.confidence,
            newConfidence: update.confidence ?? target.confidence,
            changedByActor: 'user',
            changedByUserId: ctx.userId,
            reason: 'Batch update',
          });

          results.push({ key: update.key, success: true });
        }

        // Cascade: collect value changes and run batch cascade in a single pass
        const valueUpdates = input.updates
          .filter((u) => u.value !== undefined)
          .map((u) => ({ key: u.key, value: u.value! }));

        let cascadeResult = null;
        if (valueUpdates.length > 0) {
          // Refresh assumptions with direct updates applied
          const refreshed = allAssumptions.map((a) => {
            const update = input.updates.find((u) => u.key === a.key);
            if (!update) return a;
            return {
              ...a,
              ...(update.value !== undefined ? { value: update.value } : {}),
              ...(update.confidence !== undefined ? { confidence: update.confidence } : {}),
            };
          }) as unknown as Assumption[];

          cascadeResult = executeBatchCascade(refreshed, valueUpdates);

          if (cascadeResult.status === 'success') {
            const directKeys = new Set(valueUpdates.map((u) => u.key));
            for (const change of cascadeResult.updatedAssumptions) {
              if (directKeys.has(change.key)) continue; // skip direct updates, already persisted
              await tx
                .update(assumptions)
                .set({
                  value: change.newValue === 'null' ? null : change.newValue,
                  updatedByActor: 'system',
                  updatedByUserId: ctx.userId,
                })
                .where(and(
                  eq(assumptions.projectId, input.projectId),
                  eq(assumptions.key, change.key),
                ));
            }
          }
        }

        logAuditAsync({
          userId: ctx.userId,
          action: 'PROJECT_UPDATE',
          resource: formatResource('project', input.projectId),
          metadata: {
            action: 'batch_update_assumptions',
            count: results.filter((r) => r.success).length,
            cascaded: cascadeResult?.status === 'success'
              ? cascadeResult.updatedAssumptions.length
              : 0,
          },
        });

        return { results, cascade: cascadeResult };
      });
    }),

  /**
   * Queue section regeneration for impacted report sections.
   * Finds the latest BUSINESS_PLAN report and queues a BullMQ job.
   */
  regenerateSections: protectedProcedure
    .input(z.object({
      projectId: entityId,
      sectionKeys: z.array(z.string().min(1)).min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(ctx.db, input.projectId, ctx.userId);

      // Find the latest BUSINESS_PLAN report for this project
      const report = await ctx.db.query.reports.findFirst({
        where: and(
          eq(reports.projectId, input.projectId),
          eq(reports.type, 'BUSINESS_PLAN'),
        ),
        orderBy: (r, { desc }) => desc(r.createdAt),
        columns: { id: true },
      });

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No business plan report found. Generate a report first.',
        });
      }

      const jobId = await enqueueSectionRegen({
        projectId: input.projectId,
        userId: ctx.userId,
        sectionKeys: input.sectionKeys,
        reportId: report.id,
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', input.projectId),
        metadata: {
          action: 'regenerate_sections',
          sectionKeys: input.sectionKeys,
          reportId: report.id,
          jobId,
        },
      });

      return { jobId, reportId: report.id, sectionCount: input.sectionKeys.length };
    }),

  // =========================================================================
  // Scenario-based endpoints (for Financial Models)
  // =========================================================================

  /**
   * List assumptions for a specific scenario (financial model context).
   */
  listByScenario: protectedProcedure
    .input(z.object({ scenarioId: entityId }))
    .query(async ({ ctx, input }) => {
      await verifyScenarioOwnership(ctx.db, input.scenarioId, ctx.userId);

      const rows = await ctx.db
        .select()
        .from(assumptions)
        .where(eq(assumptions.scenarioId, input.scenarioId))
        .orderBy(assumptions.category, assumptions.displayOrder);

      const allAssumptions = rows as unknown as Assumption[];

      return allAssumptions.map((a) => ({
        ...a,
        effectiveConfidence: getEffectiveConfidence(a, allAssumptions),
        staleness: getStalenessInfo(a),
      }));
    }),

  /**
   * Update a single assumption's value within a scenario.
   */
  updateByScenario: protectedProcedure
    .input(z.object({
      scenarioId: entityId,
      assumptionId: entityId,
      value: z.string().nullable().optional(),
      confidence: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyScenarioOwnership(ctx.db, input.scenarioId, ctx.userId);

      const target = await ctx.db
        .select()
        .from(assumptions)
        .where(and(eq(assumptions.id, input.assumptionId), eq(assumptions.scenarioId, input.scenarioId)))
        .limit(1);

      if (target.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assumption not found' });
      }

      const assumption = target[0];

      return ctx.db.transaction(async (tx) => {
        const allAssumptions = await tx
          .select()
          .from(assumptions)
          .where(eq(assumptions.scenarioId, input.scenarioId));

        const updates: Record<string, unknown> = {
          updatedByActor: 'user',
          updatedByUserId: ctx.userId,
        };
        if (input.value !== undefined) {
          updates.value = input.value;
          // Parse numeric value
          if (input.value != null) {
            const num = parseFloat(input.value);
            if (!isNaN(num)) {
              updates.numericValue = String(num);
            }
          } else {
            updates.numericValue = null;
          }
          // Mark as user confidence when user edits directly
          updates.confidence = 'USER';
        }
        if (input.confidence !== undefined) updates.confidence = input.confidence;

        await tx
          .update(assumptions)
          .set(updates)
          .where(eq(assumptions.id, input.assumptionId));

        // Log history
        await tx.insert(assumptionHistory).values({
          assumptionId: input.assumptionId,
          oldValue: assumption.value,
          newValue: input.value ?? assumption.value,
          oldConfidence: assumption.confidence,
          newConfidence: (updates.confidence ?? assumption.confidence) as typeof assumption.confidence,
          changedByActor: 'user',
          changedByUserId: ctx.userId,
          reason: null,
        });

        // Execute cascade if value changed
        let cascadeResult = null;
        if (input.value !== undefined && input.value !== assumption.value) {
          const refreshed = allAssumptions.map((a) =>
            a.id === input.assumptionId ? { ...a, ...updates } : a,
          ) as unknown as Assumption[];

          cascadeResult = executeCascade(refreshed, assumption.key, input.value ?? '');

          if (cascadeResult.status === 'success') {
            for (const change of cascadeResult.updatedAssumptions) {
              if (change.key === assumption.key) continue;

              await tx
                .update(assumptions)
                .set({
                  value: change.newValue === 'null' ? null : change.newValue,
                  updatedByActor: 'system',
                  updatedByUserId: ctx.userId,
                })
                .where(and(
                  eq(assumptions.scenarioId, input.scenarioId),
                  eq(assumptions.key, change.key),
                ));
            }
          }
        }

        return {
          assumption: { ...assumption, ...updates },
          cascade: cascadeResult,
        };
      });
    }),
});
