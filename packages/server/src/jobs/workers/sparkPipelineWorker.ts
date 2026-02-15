import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq } from 'drizzle-orm';
import { research, projects } from '../../db/schema';
import { QUEUE_NAMES, SparkPipelineJobData } from '../queues';
import { SPARK_STATUS_PROGRESS } from '@forge/shared';
import type { SparkJobStatus } from '@forge/shared';
import { runSparkPipeline } from '../../services/spark-ai';

/**
 * Spark Pipeline Worker
 * Processes rapid Spark validation jobs in the background.
 * Spark is lighter/faster than full research (5-15 min vs 30-60+ min).
 */
export function createSparkPipelineWorker() {
  const worker = new Worker<SparkPipelineJobData>(
    QUEUE_NAMES.SPARK_PIPELINE,
    async (job: Job<SparkPipelineJobData>) => {
      const { researchId, projectId, description, includeTrends } = job.data;

      console.log(`[SparkWorker] Processing Spark for research ${researchId}`);
      const startTime = Date.now();

      try {
        const result = await runSparkPipeline(description, {
          onStatusChange: async (status: SparkJobStatus) => {
            // Check for cancellation
            const current = await db.query.research.findFirst({
              where: eq(research.id, researchId),
              columns: { status: true, sparkStatus: true },
            });
            if (current?.status === 'FAILED' || current?.sparkStatus === 'FAILED') {
              throw new Error('Spark cancelled by user');
            }

            await db.update(research).set({
              sparkStatus: status,
              progress: SPARK_STATUS_PROGRESS[status]?.start || 0,
            }).where(eq(research.id, researchId));

            await job.updateProgress(SPARK_STATUS_PROGRESS[status]?.start || 0);
          },
          includeTrends,
        });

        // Fetch current status (pipeline may have set PARTIAL_COMPLETE)
        const currentResearch = await db.query.research.findFirst({
          where: eq(research.id, researchId),
          columns: { sparkStatus: true },
        });

        // Save successful result
        await db.update(research).set({
          sparkStatus: currentResearch?.sparkStatus || 'COMPLETE',
          sparkResult: result as object,
          sparkKeywords: result.keywords as object,
          sparkCompletedAt: new Date(),
          progress: currentResearch?.sparkStatus === 'PARTIAL_COMPLETE' ? 90 : 100,
          status: 'COMPLETE',
        }).where(eq(research.id, researchId));

        // Update project status
        await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, projectId));

        console.log(`[SparkWorker] Completed Spark ${researchId} in ${Math.round((Date.now() - startTime) / 1000)}s`);

        return { success: true, researchId, projectId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[SparkWorker] Failed Spark ${researchId}:`, errorMessage);

        await db.update(research).set({
          sparkStatus: 'FAILED',
          sparkError: errorMessage,
          status: 'FAILED',
          errorMessage: `Spark validation failed: ${errorMessage}`,
        }).where(eq(research.id, researchId));

        // Reset project status so user isn't stuck
        await db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, projectId)).catch(() => {});

        throw error; // Re-throw for BullMQ retry
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,          // Spark is lighter, can run 2 concurrent
      lockDuration: 120000,     // 2 min lock (Spark is faster)
      lockRenewTime: 60000,     // Renew every 1 min
      stalledInterval: 1800000, // Check stalled every 30 min (Spark runs 5-15 min)
      drainDelay: 60000,        // Wait 60s between polls when idle (saves Upstash requests)
    }
  );

  worker.on('completed', (job) => {
    console.log(`[SparkWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SparkWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[SparkWorker] Worker error:', err);
  });

  return worker;
}
