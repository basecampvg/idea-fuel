/**
 * Worker Entry Point
 * Starts all BullMQ workers for background job processing.
 * Run this as a separate long-running process (e.g., on Railway).
 *
 * Usage: tsx --env-file=../../.env src/worker.ts
 */

import { isRedisConnected, closeRedisConnections } from './lib/redis';
import {
  createResearchPipelineWorker,
  createResearchCancelWorker,
  createSparkPipelineWorker,
  createReportGenerationWorker,
} from './jobs/workers';

async function main() {
  console.log('[Worker] Starting BullMQ workers...');

  // Verify Redis connection
  const connected = await isRedisConnected();
  if (!connected) {
    console.error('[Worker] Cannot connect to Redis. Exiting.');
    process.exit(1);
  }
  console.log('[Worker] Redis connected');

  // Start workers
  const researchWorker = createResearchPipelineWorker();
  const sparkWorker = createSparkPipelineWorker();
  const cancelWorker = createResearchCancelWorker();
  const reportWorker = createReportGenerationWorker();

  console.log('[Worker] All workers started:');
  console.log('  - Research Pipeline (concurrency: 1)');
  console.log('  - Spark Pipeline (concurrency: 2)');
  console.log('  - Research Cancel (concurrency: 5)');
  console.log('  - Report Generation (concurrency: 3)');
  console.log('[Worker] Waiting for jobs...');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Worker] ${signal} received, shutting down...`);
    await Promise.all([
      researchWorker.close(),
      sparkWorker.close(),
      cancelWorker.close(),
      reportWorker.close(),
    ]);
    await closeRedisConnections();
    console.log('[Worker] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
