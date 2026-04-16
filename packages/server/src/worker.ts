/**
 * Worker Entry Point
 * Starts all BullMQ workers for background job processing.
 * Run this as a separate long-running process (e.g., on Railway).
 *
 * Usage: tsx --env-file=../../.env src/worker.ts
 */

import { createServer } from 'http';
import { isRedisConnected, closeRedisConnections } from './lib/redis';
import {
  createResearchPipelineWorker,
  createResearchCancelWorker,
  createSparkPipelineWorker,
  createReportGenerationWorker,
  createBusinessPlanWorker,
  createThoughtCollisionWorker,
} from './jobs/workers';
import { createThoughtClassifyWorker } from './jobs/thought-classify';

/** Track rate-limit hits to pause workers instead of hammering Redis */
let rateLimitPauseUntil = 0;
const RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

export function isRateLimited(): boolean {
  return Date.now() < rateLimitPauseUntil;
}

function handleRateLimitError(err: Error & { message?: string }) {
  if (err.message?.includes('max requests limit exceeded')) {
    if (!isRateLimited()) {
      rateLimitPauseUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      console.warn(`[Worker] Upstash rate limit hit — pausing workers for ${RATE_LIMIT_BACKOFF_MS / 1000}s`);
    }
  }
}

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
  const businessPlanWorker = createBusinessPlanWorker();
  const classifyWorker = createThoughtClassifyWorker();
  const collisionWorker = createThoughtCollisionWorker();
  const allWorkers = [researchWorker, sparkWorker, cancelWorker, reportWorker, businessPlanWorker, classifyWorker, collisionWorker];

  // Attach rate-limit detection to all workers
  for (const w of allWorkers) {
    w.on('error', handleRateLimitError);
  }

  const researchConcurrency = process.env.RESEARCH_WORKER_CONCURRENCY || '3';
  const sparkConcurrency = process.env.SPARK_WORKER_CONCURRENCY || '2';
  console.log('[Worker] All workers started:');
  console.log(`  - Research Pipeline (concurrency: ${researchConcurrency}, drainDelay: 60s)`);
  console.log(`  - Spark Pipeline (concurrency: ${sparkConcurrency}, drainDelay: 60s)`);
  console.log('  - Research Cancel (concurrency: 5, drainDelay: 60s)');
  console.log('  - Report Generation (concurrency: 3, drainDelay: 60s)');
  console.log('  - Business Plan (concurrency: 2, drainDelay: 60s)');
  console.log('  - Thought Classify (concurrency: 5)');
  console.log('  - Thought Collision (concurrency: 5)');
  console.log('[Worker] Waiting for jobs...');

  // Health check server for Railway
  const PORT = process.env.PORT || 3001;
  createServer((_req, res) => {
    const paused = isRateLimited();
    res.writeHead(paused ? 503 : 200);
    res.end(paused ? 'RATE_LIMITED' : 'OK');
  }).listen(PORT, () => {
    console.log(`[Worker] Health check listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Worker] ${signal} received, shutting down...`);
    await Promise.all(allWorkers.map((w) => w.close()));
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
