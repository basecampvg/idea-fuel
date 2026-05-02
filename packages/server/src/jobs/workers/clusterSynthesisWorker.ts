/**
 * Cluster Synthesis Worker
 *
 * Auto-runs cluster AI synthesis on milestone triggers:
 *   - thoughts:5      -> summarize + identifyGaps + generateQuestions
 *   - thoughts:8      -> findContradictions
 *   - thoughts:12+    -> re-run summarize
 *   - readiness:0.5   -> generateBrief + generateQuestions
 *   - readiness:0.7   -> re-run summarize/identifyGaps/findContradictions/
 *                        generateBrief AND refresh generateQuestions for the
 *                        convergent stage
 *
 * Jobs are debounced ~5min by deterministic jobId + delay; see
 * `enqueueClusterSynthesis` in jobs/cluster-synthesis.ts.
 */

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import {
  CLUSTER_SYNTHESIS_QUEUE_NAME,
  type ClusterSynthesisJobData,
} from '../cluster-synthesis';
import {
  runSummarize,
  runIdentifyGaps,
  runFindContradictions,
  runGenerateBrief,
  runGenerateQuestions,
  ClusterActionError,
} from '../../services/cluster-actions';

async function runForTrigger(data: ClusterSynthesisJobData): Promise<string[]> {
  const { clusterId, trigger } = data;
  const ran: string[] = [];

  switch (trigger) {
    case 'thoughts:5':
      await runSummarize(clusterId);
      ran.push('summarize');
      await runIdentifyGaps(clusterId);
      ran.push('identifyGaps');
      await runGenerateQuestions(clusterId);
      ran.push('generateQuestions');
      break;

    case 'thoughts:8':
      await runFindContradictions(clusterId);
      ran.push('findContradictions');
      break;

    case 'thoughts:12+':
      await runSummarize(clusterId);
      ran.push('summarize');
      break;

    case 'readiness:0.5':
      await runGenerateBrief(clusterId);
      ran.push('generateBrief');
      await runGenerateQuestions(clusterId);
      ran.push('generateQuestions');
      break;

    case 'readiness:0.7':
      await runSummarize(clusterId);
      ran.push('summarize');
      await runIdentifyGaps(clusterId);
      ran.push('identifyGaps');
      await runFindContradictions(clusterId);
      ran.push('findContradictions');
      await runGenerateBrief(clusterId);
      ran.push('generateBrief');
      await runGenerateQuestions(clusterId);
      ran.push('generateQuestions');
      break;

    default: {
      const _exhaustive: never = trigger;
      void _exhaustive;
      throw new Error(`Unknown cluster synthesis trigger: ${trigger}`);
    }
  }

  return ran;
}

export function createClusterSynthesisWorker() {
  const worker = new Worker<ClusterSynthesisJobData>(
    CLUSTER_SYNTHESIS_QUEUE_NAME,
    async (job: Job<ClusterSynthesisJobData>) => {
      const { clusterId, trigger } = job.data;
      console.log(
        `[ClusterSynthesisWorker] Running trigger=${trigger} cluster=${clusterId}`,
      );

      try {
        const ran = await runForTrigger(job.data);
        console.log(
          `[ClusterSynthesisWorker] Completed cluster=${clusterId} ran=${ran.join(',')}`,
        );
        return { success: true, ran };
      } catch (err) {
        if (err instanceof ClusterActionError) {
          // Don't retry user-data errors (e.g. cluster deleted, too few thoughts).
          console.warn(
            `[ClusterSynthesisWorker] Skipping cluster=${clusterId} trigger=${trigger}: ${err.code}`,
          );
          return { success: false, reason: err.code };
        }
        throw err;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
      limiter: {
        max: 10,
        duration: 60_000, // Max 10 AI synthesis jobs per minute
      },
    },
  );

  worker.on('failed', (job, err) => {
    console.error(
      `[ClusterSynthesisWorker] Job ${job?.id} failed:`,
      err.message,
    );
  });

  return worker;
}
