/**
 * Expand Mode: Assumption Seeder
 *
 * Seeds vertical-specific financial assumptions from the AI classification result.
 * Called after classification completes during project creation.
 *
 * Uses the same DEFAULT_ASSUMPTIONS catalog as Launch Mode, but overrides values
 * with the classification's seedAssumptions (vertical-specific AI estimates).
 */

import { eq } from 'drizzle-orm';
import type { ClassificationResult } from '@forge/shared';
import { assumptions } from '../db/schema';
import { DEFAULT_ASSUMPTIONS, type AssumptionSeed } from './assumption-defaults';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Seed assumptions for an Expand Mode project using classification-derived values.
 *
 * - Starts with the standard 24 assumption seeds
 * - Overrides values with classification.seedAssumptions where keys match
 * - All seeded values marked as AI_ESTIMATE confidence
 * - Idempotent: skips if assumptions already exist for this project
 */
export async function seedExpandAssumptions(
  db: NodePgDatabase<any>,
  projectId: string,
  classification: ClassificationResult
): Promise<{ seeded: boolean; count: number; overriddenKeys: string[] }> {
  // Check if assumptions already exist
  const existing = await db
    .select({ id: assumptions.id })
    .from(assumptions)
    .where(eq(assumptions.projectId, projectId))
    .limit(1);

  if (existing.length > 0) {
    return { seeded: false, count: 0, overriddenKeys: [] };
  }

  const now = new Date();
  const overriddenKeys: string[] = [];

  const rows = DEFAULT_ASSUMPTIONS.map((seed: AssumptionSeed) => {
    const override = classification.seedAssumptions[seed.key];
    let value: string | null = null;
    let numericValue: string | null = null;
    let confidence = seed.defaultConfidence;

    if (override) {
      value = String(override.value);
      numericValue = String(override.value);
      confidence = 'AI_ESTIMATE';
      overriddenKeys.push(seed.key);
    }

    return {
      projectId,
      category: seed.category,
      name: seed.name,
      key: seed.key,
      value,
      numericValue,
      valueType: seed.valueType,
      unit: seed.unit,
      confidence,
      source: override ? 'Expand Mode classification' : 'System default',
      sourceUrl: null as string | null,
      formula: seed.formula,
      dependsOn: seed.dependsOn,
      tier: seed.tier,
      isSensitive: seed.isSensitive,
      isRequired: seed.isRequired,
      updatedByActor: 'system',
      updatedByUserId: null as string | null,
      updatedAt: now,
    };
  });

  await db.insert(assumptions).values(rows);

  return { seeded: true, count: rows.length, overriddenKeys };
}
