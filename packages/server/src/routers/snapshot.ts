import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { entityId, createSnapshotSchema } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import {
  financialModels,
  scenarios,
  assumptions,
  modelSnapshots,
} from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import type { Context } from '../context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Transaction type extracted from Drizzle's db.transaction() callback. */
type DbTransaction = Parameters<Parameters<Context['db']['transaction']>[0]>[0];

/** Snapshot assumption data shape for serialization/deserialization. */
interface SnapshotScenarioData {
  name: string;
  isBase: boolean;
  assumptions: Array<{
    key: string;
    name: string;
    value: string | null;
    numericValue: string | null;
    category: string;
    valueType: string;
    formula: string | null;
    confidence: string;
  }>;
}

type SnapshotAssumptionData = Record<string, SnapshotScenarioData>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify model ownership.
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
 * Capture the current state of all scenario assumptions for a model.
 * Accepts a Drizzle transaction (used within db.transaction callbacks).
 */
async function captureAssumptionData(tx: DbTransaction, modelId: string): Promise<SnapshotAssumptionData> {
  const modelScenarios = await tx.query.scenarios.findMany({
    where: eq(scenarios.modelId, modelId),
    columns: { id: true, name: true, isBase: true },
  });

  const data: SnapshotAssumptionData = {};
  for (const scenario of modelScenarios) {
    const rows = await tx
      .select()
      .from(assumptions)
      .where(eq(assumptions.scenarioId, scenario.id));
    data[scenario.id] = {
      name: scenario.name,
      isBase: scenario.isBase,
      assumptions: rows.map((a) => ({
        key: a.key,
        name: a.name ?? '',
        value: a.value,
        numericValue: a.numericValue,
        category: a.category,
        valueType: a.valueType,
        formula: a.formula,
        confidence: a.confidence,
      })),
    };
  }
  return data;
}

export const snapshotRouter = router({
  /**
   * Create a named snapshot of the current model state.
   */
  create: protectedProcedure
    .input(createSnapshotSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      // Wrap in transaction to ensure snapshot is a consistent point-in-time
      const snapshot = await ctx.db.transaction(async (tx) => {
        const assumptionData = await captureAssumptionData(tx, input.modelId);

        const [snap] = await tx.insert(modelSnapshots).values({
          modelId: input.modelId,
          name: input.name,
          assumptionData,
          createdByAction: 'MANUAL',
        }).returning();

        return snap;
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'SNAPSHOT_CREATE',
        resource: formatResource('snapshot', snapshot.id),
        metadata: { modelId: input.modelId, name: input.name },
      });

      return snapshot;
    }),

  /**
   * List snapshots for a model.
   */
  list: protectedProcedure
    .input(z.object({ modelId: entityId }))
    .query(async ({ ctx, input }) => {
      await verifyModelOwnership(ctx.db, input.modelId, ctx.userId);

      return ctx.db.query.modelSnapshots.findMany({
        where: eq(modelSnapshots.modelId, input.modelId),
        orderBy: desc(modelSnapshots.createdAt),
      });
    }),

  /**
   * Compare two snapshots — returns assumption deltas.
   */
  compare: protectedProcedure
    .input(z.object({
      snapshotId1: entityId,
      snapshotId2: entityId,
    }))
    .query(async ({ ctx, input }) => {
      const [snap1, snap2] = await Promise.all([
        ctx.db.query.modelSnapshots.findFirst({ where: eq(modelSnapshots.id, input.snapshotId1) }),
        ctx.db.query.modelSnapshots.findFirst({ where: eq(modelSnapshots.id, input.snapshotId2) }),
      ]);

      if (!snap1 || !snap2) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Snapshot not found' });
      }

      // Verify ownership first, then check same model
      await verifyModelOwnership(ctx.db, snap1.modelId, ctx.userId);
      if (snap1.modelId !== snap2.modelId) {
        // Also verify the second model (prevents info leak about other models)
        await verifyModelOwnership(ctx.db, snap2.modelId, ctx.userId);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Snapshots must belong to the same model' });
      }

      return {
        snapshot1: { id: snap1.id, name: snap1.name, createdAt: snap1.createdAt },
        snapshot2: { id: snap2.id, name: snap2.name, createdAt: snap2.createdAt },
        data1: snap1.assumptionData,
        data2: snap2.assumptionData,
      };
    }),

  /**
   * Restore a model to a snapshot state.
   * Creates a new snapshot of the current state before restoring.
   */
  restore: protectedProcedure
    .input(z.object({ snapshotId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const snapshot = await ctx.db.query.modelSnapshots.findFirst({
        where: eq(modelSnapshots.id, input.snapshotId),
      });
      if (!snapshot) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Snapshot not found' });
      }

      await verifyModelOwnership(ctx.db, snapshot.modelId, ctx.userId);

      return ctx.db.transaction(async (tx) => {
        // Save current state as auto-save snapshot before restoring
        const currentData = await captureAssumptionData(tx, snapshot.modelId);
        await tx.insert(modelSnapshots).values({
          modelId: snapshot.modelId,
          name: `Auto-save before restore to "${snapshot.name}"`,
          assumptionData: currentData,
          createdByAction: 'AUTO_SAVE',
        });

        // Validate and restore assumptions from snapshot data
        const snapshotData = snapshot.assumptionData as SnapshotAssumptionData | null;
        if (!snapshotData || typeof snapshotData !== 'object') {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Snapshot data is corrupted' });
        }

        for (const [scenarioId, scenarioData] of Object.entries(snapshotData)) {
          if (!scenarioData?.assumptions || !Array.isArray(scenarioData.assumptions)) continue;
          for (const a of scenarioData.assumptions) {
            await tx
              .update(assumptions)
              .set({
                value: a.value,
                numericValue: a.numericValue,
                formula: a.formula,
                updatedByActor: 'system',
              })
              .where(
                and(
                  eq(assumptions.scenarioId, scenarioId),
                  eq(assumptions.key, a.key),
                ),
              );
          }
        }

        logAuditAsync({
          userId: ctx.userId,
          action: 'SNAPSHOT_RESTORE',
          resource: formatResource('snapshot', input.snapshotId),
          metadata: { modelId: snapshot.modelId, snapshotName: snapshot.name },
        });

        return { success: true, restoredFrom: snapshot.name };
      });
    }),
});
