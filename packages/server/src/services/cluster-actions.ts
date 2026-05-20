/**
 * Cluster Actions Service
 *
 * Extracts the cluster AI synthesis steps into plain functions so both the
 * tRPC procedures and the BullMQ cluster-synthesis worker can call them
 * without going through tRPC. Each runner:
 *   - validates the cluster exists + ownership (when userId provided)
 *   - validates min thoughts/chars
 *   - calls the underlying AI service
 *   - persists the result to cluster row
 *   - calls recomputeClusterReadiness
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { thoughtClusters, thoughts } from '../db/schema';
import {
  CLUSTER_MIN_THOUGHTS_FOR_AI,
  CLUSTER_MIN_CHARS_FOR_AI,
} from '@forge/shared';
import {
  summarizeSandbox,
  identifyGaps,
  findContradictions,
  generateBrief,
} from './sandbox-ai';
import { recomputeClusterReadiness } from './cluster-readiness';
import {
  generateClusterQuestions,
  detectStage,
  type GeneratedQuestion,
  type DimensionCoverageInput,
} from './cluster-questions';

export class ClusterActionError extends Error {
  constructor(
    public code: 'CLUSTER_NOT_FOUND' | 'INSUFFICIENT_THOUGHTS' | 'INSUFFICIENT_CONTENT',
    message: string,
  ) {
    super(message);
    this.name = 'ClusterActionError';
  }
}

/**
 * Fetch + validate cluster thoughts for AI actions. If userId is provided,
 * also enforces ownership. Returns concatenated content list.
 */
async function loadClusterContents(
  clusterId: string,
  userId?: string,
): Promise<string[]> {
  const where = userId
    ? and(eq(thoughtClusters.id, clusterId), eq(thoughtClusters.userId, userId))
    : eq(thoughtClusters.id, clusterId);

  const cluster = await db.query.thoughtClusters.findFirst({
    where,
    columns: { id: true },
  });

  if (!cluster) {
    throw new ClusterActionError('CLUSTER_NOT_FOUND', 'Cluster not found');
  }

  const clusterThoughts = await db
    .select({ content: thoughts.content, tags: thoughts.tags })
    .from(thoughts)
    .where(and(eq(thoughts.clusterId, clusterId), eq(thoughts.kind, 'thought')));

  const contents = clusterThoughts
    .map((n) => {
      if (n.content.length === 0) return '';
      const meta: string[] = [];
      if (n.tags?.length) meta.push(`Labels: ${n.tags.join(', ')}`);
      const prefix = meta.length > 0 ? `[${meta.join(' | ')}]\n` : '';
      return `${prefix}${n.content}`;
    })
    .filter((c) => c.length > 0);

  if (contents.length < CLUSTER_MIN_THOUGHTS_FOR_AI) {
    throw new ClusterActionError(
      'INSUFFICIENT_THOUGHTS',
      `Need at least ${CLUSTER_MIN_THOUGHTS_FOR_AI} thoughts with content`,
    );
  }

  const totalChars = contents.reduce((sum, c) => sum + c.length, 0);
  if (totalChars < CLUSTER_MIN_CHARS_FOR_AI) {
    throw new ClusterActionError(
      'INSUFFICIENT_CONTENT',
      `Need at least ${CLUSTER_MIN_CHARS_FOR_AI} total characters`,
    );
  }

  return contents;
}

/**
 * Run summarize: persists summary + dimensionCoverage, recomputes readiness.
 */
export async function runSummarize(
  clusterId: string,
  userId?: string,
): Promise<{ summary: string; dimensionCoverage: Record<string, boolean> }> {
  const contents = await loadClusterContents(clusterId, userId);
  const { summary, dimensionCoverage } = await summarizeSandbox(contents);

  await db
    .update(thoughtClusters)
    .set({ synthesis: summary, dimensionCoverage })
    .where(eq(thoughtClusters.id, clusterId));

  await recomputeClusterReadiness(db, clusterId);

  return { summary, dimensionCoverage };
}

/**
 * Run identify gaps: persists gaps as JSONB array, recomputes readiness.
 */
export async function runIdentifyGaps(
  clusterId: string,
  userId?: string,
): Promise<{ gaps: { id: string; text: string }[] }> {
  const contents = await loadClusterContents(clusterId, userId);

  // Stage-aware tone: early clusters get curious nudges, ready clusters
  // get more pointed pressure-tests. Same `detectStage` helper used by
  // the questions generator so the two stay in sync.
  const [cluster] = await db
    .select({
      readinessScore: thoughtClusters.readinessScore,
    })
    .from(thoughtClusters)
    .where(eq(thoughtClusters.id, clusterId))
    .limit(1);
  const stage = detectStage({
    thoughtCount: contents.length,
    readinessScore: cluster?.readinessScore ?? 0,
  });

  const rawGaps = await identifyGaps(contents, { stage });
  const gapRecords = rawGaps.map((text) => ({ id: crypto.randomUUID(), text }));

  await db
    .update(thoughtClusters)
    .set({ gaps: gapRecords })
    .where(eq(thoughtClusters.id, clusterId));

  await recomputeClusterReadiness(db, clusterId);

  return { gaps: gapRecords };
}

/**
 * Run find contradictions: persists tensions as JSONB array, recomputes readiness.
 */
export async function runFindContradictions(
  clusterId: string,
  userId?: string,
): Promise<{ tensions: { id: string; text: string; resolvedAt: Date | null }[] }> {
  const contents = await loadClusterContents(clusterId, userId);
  const rawContradictions = await findContradictions(contents);
  const tensionRecords = rawContradictions.map((text) => ({
    id: crypto.randomUUID(),
    text,
    resolvedAt: null,
  }));

  await db
    .update(thoughtClusters)
    .set({ tensions: tensionRecords })
    .where(eq(thoughtClusters.id, clusterId));

  await recomputeClusterReadiness(db, clusterId);

  return { tensions: tensionRecords };
}

/**
 * Run generate brief: persists brief markdown, recomputes readiness.
 */
export async function runGenerateBrief(
  clusterId: string,
  userId?: string,
): Promise<{ brief: string }> {
  const contents = await loadClusterContents(clusterId, userId);
  const brief = await generateBrief(contents);

  await db
    .update(thoughtClusters)
    .set({ brief })
    .where(eq(thoughtClusters.id, clusterId));

  await recomputeClusterReadiness(db, clusterId);

  return { brief };
}

/**
 * Run generate questions: persists 4-6 stage-aware, research-grounded
 * questions to cluster.questions. Does NOT recompute readiness — questions
 * are prompts for new thoughts, not direct readiness signals (the answers
 * become thoughts, and those drive readiness).
 *
 * Unlike the other runners, this one validates ownership and existence
 * directly (without the min-thoughts/min-chars gate from loadClusterContents)
 * because the worker can call it on small clusters too — generation will
 * still produce sensible early-stage questions.
 */
export async function runGenerateQuestions(
  clusterId: string,
  userId?: string,
): Promise<GeneratedQuestion[]> {
  const where = userId
    ? and(eq(thoughtClusters.id, clusterId), eq(thoughtClusters.userId, userId))
    : eq(thoughtClusters.id, clusterId);

  const cluster = await db.query.thoughtClusters.findFirst({
    where,
    columns: {
      id: true,
      readinessScore: true,
      dimensionCoverage: true,
      tensions: true,
    },
  });

  if (!cluster) {
    throw new ClusterActionError('CLUSTER_NOT_FOUND', 'Cluster not found');
  }

  const clusterThoughts = await db
    .select({
      content: thoughts.content,
      thoughtType: thoughts.thoughtType,
    })
    .from(thoughts)
    .where(and(eq(thoughts.clusterId, clusterId), eq(thoughts.kind, 'thought')));

  const filledThoughts = clusterThoughts.filter((t) => t.content && t.content.trim().length > 0);

  if (filledThoughts.length === 0) {
    throw new ClusterActionError(
      'INSUFFICIENT_THOUGHTS',
      'Need at least one thought with content',
    );
  }

  const stage = detectStage({
    thoughtCount: filledThoughts.length,
    readinessScore: (cluster.readinessScore as number | null) ?? null,
  });

  const tensions = ((cluster.tensions as { text: string; resolvedAt: Date | string | null }[] | null) ?? [])
    .filter((t) => !t.resolvedAt)
    .map((t) => t.text);

  const dimensionCoverage =
    (cluster.dimensionCoverage as DimensionCoverageInput | null) ?? null;

  const questions = await generateClusterQuestions({
    thoughts: filledThoughts.map((t) => ({
      content: t.content,
      thoughtType: t.thoughtType ?? null,
    })),
    dimensionCoverage,
    unresolvedTensions: tensions,
    stage,
  });

  await db
    .update(thoughtClusters)
    .set({ questions })
    .where(eq(thoughtClusters.id, clusterId));

  return questions;
}
