/**
 * Cluster Readiness Service
 *
 * Computes a readiness score (0..1) and maturity bucket ('exploring' | 'forming' | 'ready')
 * for thought clusters, based on:
 *   - thought-type diversity (30%)
 *   - dimension coverage (25%)
 *   - synthesis depth (20%)
 *   - tension resolution (15%)
 *   - connection density (10%)
 *
 * Persists computed values back to the cluster row, and triggers auto-synthesis
 * jobs when readiness crosses the 0.5 / 0.7 thresholds.
 */

import { eq, and, or, inArray } from 'drizzle-orm';
import { thoughts, thoughtClusters, thoughtConnections } from '../db/schema';

export type DimensionCoverage = {
  problem: boolean;
  audience: boolean;
  solution: boolean;
  angle: boolean;
  pricing: boolean;
};

export type Tension = {
  id: string;
  text: string;
  resolvedAt: Date | null;
};

export type ReadinessInputs = {
  thoughts: { thoughtType: string | null }[];
  dimensionCoverage: DimensionCoverage | null;
  synthesisRunCount: number;
  tensions: Tension[];
  collisionCount: number;
};

export type ClusterMaturity = 'exploring' | 'forming' | 'ready';

const TYPES = ['problem', 'solution', 'what_if', 'observation', 'question'];

export function computeReadinessScore(inputs: ReadinessInputs): number {
  if (inputs.thoughts.length === 0) return 0;

  const distinctTypes = new Set(
    inputs.thoughts.map((t) => t.thoughtType).filter((t): t is string => Boolean(t)),
  );
  const thoughtDiversityScore = distinctTypes.size / TYPES.length;

  const dims = inputs.dimensionCoverage;
  const dimensionCoverageScore = dims ? Object.values(dims).filter(Boolean).length / 5 : 0;

  const synthesisDepthScore = Math.min(inputs.synthesisRunCount / 4, 1);

  const total = inputs.tensions.length;
  const resolved = inputs.tensions.filter((t) => t.resolvedAt !== null).length;
  const tensionResolutionScore = total === 0 ? 0 : resolved / total;

  const connectionDensityScore = Math.min(
    inputs.collisionCount / Math.max(inputs.thoughts.length, 1),
    1,
  );

  return (
    0.30 * thoughtDiversityScore +
    0.25 * dimensionCoverageScore +
    0.20 * synthesisDepthScore +
    0.15 * tensionResolutionScore +
    0.10 * connectionDensityScore
  );
}

export function computeClusterMaturity(inputs: {
  thoughtCount: number;
  synthesisRunCount: number;
  readinessScore: number;
}): ClusterMaturity {
  if (inputs.readinessScore > 0.7) return 'ready';
  if (inputs.thoughtCount >= 5 && inputs.synthesisRunCount >= 1) return 'forming';
  return 'exploring';
}

/**
 * Recompute readiness + maturity for a cluster, persist them, and fire any
 * threshold-crossing auto-synthesis jobs (readiness 0.5 and 0.7).
 *
 * `database: any` is an intentional escape hatch — drizzle's typed db is hard
 * to thread through helpers cleanly. Acceptable in service code.
 */
export async function recomputeClusterReadiness(
  database: any,
  clusterId: string,
): Promise<void> {
  const [cluster] = await database
    .select()
    .from(thoughtClusters)
    .where(eq(thoughtClusters.id, clusterId));
  if (!cluster) return;

  const previousScore = cluster.readinessScore ?? 0;

  const clusterThoughts = await database
    .select({ thoughtType: thoughts.thoughtType, id: thoughts.id })
    .from(thoughts)
    .where(and(eq(thoughts.clusterId, clusterId), eq(thoughts.kind, 'thought')));

  const thoughtIds = clusterThoughts.map((t: { id: string }) => t.id);
  const collisions =
    thoughtIds.length === 0
      ? []
      : await database
          .select()
          .from(thoughtConnections)
          .where(
            or(
              inArray(thoughtConnections.thoughtAId, thoughtIds),
              inArray(thoughtConnections.thoughtBId, thoughtIds),
            ),
          );

  const synthesisRunCount =
    (cluster.synthesis ? 1 : 0) +
    ((cluster.gaps as any[] ?? []).length > 0 ? 1 : 0) +
    ((cluster.tensions as any[] ?? []).length > 0 ? 1 : 0) +
    (cluster.brief ? 1 : 0);

  const score = computeReadinessScore({
    thoughts: clusterThoughts,
    dimensionCoverage: cluster.dimensionCoverage as DimensionCoverage | null,
    synthesisRunCount,
    tensions: (cluster.tensions as Tension[]) ?? [],
    collisionCount: collisions.length,
  });

  const maturity = computeClusterMaturity({
    thoughtCount: clusterThoughts.length,
    synthesisRunCount,
    readinessScore: score,
  });

  await database
    .update(thoughtClusters)
    .set({ readinessScore: score, clusterMaturity: maturity })
    .where(eq(thoughtClusters.id, clusterId));

  // Trigger threshold-crossing auto-syntheses (Task 4.5 hook).
  // Dynamic import breaks the cluster-synthesis -> cluster-actions -> cluster-readiness cycle.
  if (previousScore < 0.5 && score >= 0.5) {
    try {
      const { enqueueClusterSynthesis } = await import('../jobs/cluster-synthesis');
      await enqueueClusterSynthesis({
        clusterId,
        userId: cluster.userId,
        trigger: 'readiness:0.5',
      });
    } catch (err) {
      console.error('[ClusterReadiness] Failed to enqueue 0.5 synthesis:', err);
    }
  }
  if (previousScore < 0.7 && score >= 0.7) {
    try {
      const { enqueueClusterSynthesis } = await import('../jobs/cluster-synthesis');
      await enqueueClusterSynthesis({
        clusterId,
        userId: cluster.userId,
        trigger: 'readiness:0.7',
      });
    } catch (err) {
      console.error('[ClusterReadiness] Failed to enqueue 0.7 synthesis:', err);
    }
  }
}
