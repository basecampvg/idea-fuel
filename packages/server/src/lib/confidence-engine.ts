/**
 * Confidence Engine — inheritance rules and staleness detection.
 *
 * Confidence hierarchy (highest to lowest):
 *   USER > RESEARCHED > AI_ESTIMATE > CALCULATED
 *
 * For calculated assumptions, effective confidence = lowest of all inputs.
 * Staleness thresholds:
 *   - RESEARCHED: 30 days
 *   - AI_ESTIMATE: 7 days or upstream change
 *
 * All exports are plain functions — no classes.
 */

import type { Assumption, AssumptionConfidence, StalenessInfo } from '@forge/shared';

const CONFIDENCE_RANK: Record<AssumptionConfidence, number> = {
  USER: 4,
  RESEARCHED: 3,
  AI_ESTIMATE: 2,
  CALCULATED: 1,
};

const STALENESS_THRESHOLDS_DAYS: Partial<Record<AssumptionConfidence, number>> = {
  RESEARCHED: 30,
  AI_ESTIMATE: 7,
};

/**
 * Get the effective confidence for a calculated assumption.
 * For non-calculated assumptions, returns the assumption's own confidence.
 * For calculated assumptions, returns the lowest confidence of all inputs.
 */
export function getEffectiveConfidence(
  assumption: Assumption,
  allAssumptions: Assumption[],
): AssumptionConfidence {
  if (assumption.confidence !== 'CALCULATED' || (assumption.dependsOn ?? []).length === 0) {
    return assumption.confidence;
  }

  const assumptionMap = new Map(allAssumptions.map((a) => [a.key, a]));
  let lowestRank = Infinity;
  let lowestConfidence: AssumptionConfidence = 'USER';

  for (const depKey of (assumption.dependsOn ?? [])) {
    const dep = assumptionMap.get(depKey);
    if (!dep) continue;

    // Recursively get effective confidence of the dependency
    const depConfidence = getEffectiveConfidence(dep, allAssumptions);
    const rank = CONFIDENCE_RANK[depConfidence];
    if (rank < lowestRank) {
      lowestRank = rank;
      lowestConfidence = depConfidence;
    }
  }

  return lowestConfidence;
}

/**
 * Check if an assumption is stale based on confidence level and age.
 */
export function isStale(assumption: Assumption): boolean {
  return getStalenessInfo(assumption).isStale;
}

/**
 * Get staleness information for an assumption.
 * Includes the reason and days since last update.
 */
export function getStalenessInfo(assumption: Assumption): StalenessInfo {
  const thresholdDays = STALENESS_THRESHOLDS_DAYS[assumption.confidence];
  if (!thresholdDays) {
    return { isStale: false };
  }

  const now = new Date();
  const updatedAt = assumption.updatedAt instanceof Date
    ? assumption.updatedAt
    : new Date(assumption.updatedAt);
  const daysSinceUpdate = Math.floor(
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceUpdate >= thresholdDays) {
    const sourceLabel = assumption.confidence === 'RESEARCHED' ? 'Research data' : 'AI estimate';
    return {
      isStale: true,
      reason: `${sourceLabel} is ${daysSinceUpdate} days old (threshold: ${thresholdDays} days)`,
      daysSinceUpdate,
    };
  }

  return { isStale: false, daysSinceUpdate };
}
