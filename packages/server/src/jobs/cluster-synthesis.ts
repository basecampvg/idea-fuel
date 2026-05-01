/**
 * Cluster Synthesis Queue
 *
 * Background queue for auto-running cluster synthesis (summarize, identifyGaps,
 * findContradictions, generateBrief) when milestones are hit:
 *   - 5 thoughts in cluster → summarize + identifyGaps
 *   - 8 thoughts → findContradictions
 *   - 12+ thoughts (every +5 after) → re-run summarize
 *   - readiness crosses 0.5 → generateBrief
 *   - readiness crosses 0.7 → re-run all four
 *
 * Debounced ~5 minutes per (clusterId, trigger) so rapid thought adds don't
 * spam the AI.
 */

import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';

export const CLUSTER_SYNTHESIS_QUEUE_NAME = 'cluster-synthesis';

export type ClusterSynthesisTrigger =
  | 'thoughts:5'
  | 'thoughts:8'
  | 'thoughts:12+'
  | 'readiness:0.5'
  | 'readiness:0.7';

export interface ClusterSynthesisJobData {
  clusterId: string;
  userId: string;
  trigger: ClusterSynthesisTrigger;
}

let _clusterSynthesisQueue: Queue<ClusterSynthesisJobData> | null = null;

export function getClusterSynthesisQueue(): Queue<ClusterSynthesisJobData> {
  if (!_clusterSynthesisQueue) {
    _clusterSynthesisQueue = new Queue<ClusterSynthesisJobData>(CLUSTER_SYNTHESIS_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 100, age: 24 * 60 * 60 },
        removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
      },
    });
  }
  return _clusterSynthesisQueue;
}

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Add a cluster synthesis job to the queue. Debounced 5 minutes per
 * (clusterId, trigger) so rapid bursts of activity coalesce into a single run.
 *
 * Uses a deterministic jobId (no timestamp) so re-enqueues within the
 * debounce window are no-ops; combined with `delay`, jobs that have already
 * been scheduled in the past 5 minutes are kept and not duplicated.
 */
export async function enqueueClusterSynthesis(
  data: ClusterSynthesisJobData,
): Promise<string> {
  const jobId = `cluster-synth-${data.clusterId}-${data.trigger}`;
  const queue = getClusterSynthesisQueue();

  // If a job with this id is already waiting/delayed, skip to avoid duplicates.
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'waiting' || state === 'delayed' || state === 'active') {
      return jobId;
    }
  }

  const job = await queue.add(`cluster-synth-${data.clusterId}`, data, {
    jobId,
    delay: DEBOUNCE_MS,
  });
  return job.id || '';
}

/**
 * Map a thought-count milestone to the matching cluster-synthesis trigger.
 * Returns null if the count isn't a milestone:
 *   - exactly 5  -> 'thoughts:5'
 *   - exactly 8  -> 'thoughts:8'
 *   - 12, 17, 22, 27, ... -> 'thoughts:12+'
 */
export function getThoughtCountTrigger(count: number): ClusterSynthesisTrigger | null {
  if (count === 5) return 'thoughts:5';
  if (count === 8) return 'thoughts:8';
  if (count >= 12 && (count - 12) % 5 === 0) return 'thoughts:12+';
  return null;
}

/**
 * Convenience: enqueue if the new thought count crosses a milestone.
 * Safe to call after any addToCluster / removeFromCluster mutation.
 */
export async function maybeEnqueueClusterSynthesisForCount(
  clusterId: string,
  userId: string,
  thoughtCount: number,
): Promise<void> {
  const trigger = getThoughtCountTrigger(thoughtCount);
  if (!trigger) return;
  try {
    await enqueueClusterSynthesis({ clusterId, userId, trigger });
  } catch (err) {
    console.error('[ClusterSynthesis] enqueue failed:', err);
  }
}
