import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';

/**
 * Queue Names - centralized constants for all job queues
 */
export const QUEUE_NAMES = {
  REPORT_GENERATION: 'report-generation',
  RESEARCH_PIPELINE: 'research-pipeline',
  RESEARCH_CANCEL: 'research-cancel',
  SPARK_PIPELINE: 'spark-pipeline',
  EMAIL_SYNC: 'email-sync',
  EMBEDDING_GENERATION: 'embedding-generation',
  SECTION_REGEN: 'section-regen',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ============================================================================
// JOB DATA TYPES
// ============================================================================

/**
 * Report Generation Job Data
 */
export interface ReportGenerationJobData {
  reportId: string;
  projectId: string;
  userId: string;
  reportType: string;
  tier: string;
}

/**
 * Research Pipeline Job Data
 */
export interface ResearchPipelineJobData {
  researchId: string;
  projectId: string;
  userId: string;
  interviewId?: string;
  mode?: 'LIGHT' | 'IN_DEPTH' | 'SPARK';
  engine?: 'OPENAI' | 'PERPLEXITY';
}

/**
 * Spark Pipeline Job Data
 */
export interface SparkPipelineJobData {
  researchId: string;
  projectId: string;
  userId: string;
  description: string;
  includeTrends: boolean;
}

/**
 * Research Cancel Job Data
 */
export interface ResearchCancelJobData {
  researchId: string;
}

/**
 * Email Sync Job Data (for Beehiiv batch sync)
 */
export interface EmailSyncJobData {
  emailCaptureId: string;
  email: string;
  source: string;
}

/**
 * Embedding Generation Job Data
 */
export interface EmbeddingGenerationJobData {
  projectId: string;
  sources: Array<{
    type: 'REPORT' | 'RESEARCH' | 'INTERVIEW' | 'NOTES' | 'SERPAPI';
    id: string;
  }>;
}

/**
 * Section Regeneration Job Data
 */
export interface SectionRegenJobData {
  projectId: string;
  userId: string;
  sectionKeys: string[];
  reportId: string;
}

// ============================================================================
// QUEUE INSTANCES (lazy-initialized to avoid Redis connections at import time)
// ============================================================================

let _reportGenerationQueue: Queue<ReportGenerationJobData> | null = null;
let _researchPipelineQueue: Queue<ResearchPipelineJobData> | null = null;
let _researchCancelQueue: Queue<ResearchCancelJobData> | null = null;
let _sparkPipelineQueue: Queue<SparkPipelineJobData> | null = null;
let _emailSyncQueue: Queue<EmailSyncJobData> | null = null;
let _embeddingGenerationQueue: Queue<EmbeddingGenerationJobData> | null = null;
let _sectionRegenQueue: Queue<SectionRegenJobData> | null = null;

export function getReportGenerationQueue(): Queue<ReportGenerationJobData> {
  if (!_reportGenerationQueue) {
    _reportGenerationQueue = new Queue<ReportGenerationJobData>(
      QUEUE_NAMES.REPORT_GENERATION,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100, age: 24 * 60 * 60 },
          removeOnFail: { count: 500, age: 7 * 24 * 60 * 60 },
        },
      }
    );
  }
  return _reportGenerationQueue;
}

export function getResearchPipelineQueue(): Queue<ResearchPipelineJobData> {
  if (!_researchPipelineQueue) {
    _researchPipelineQueue = new Queue<ResearchPipelineJobData>(
      QUEUE_NAMES.RESEARCH_PIPELINE,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: { count: 50, age: 24 * 60 * 60 },
          removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
        },
      }
    );
  }
  return _researchPipelineQueue;
}

export function getResearchCancelQueue(): Queue<ResearchCancelJobData> {
  if (!_researchCancelQueue) {
    _researchCancelQueue = new Queue<ResearchCancelJobData>(
      QUEUE_NAMES.RESEARCH_CANCEL,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: { count: 100, age: 60 * 60 },
        },
      }
    );
  }
  return _researchCancelQueue;
}

export function getSparkPipelineQueue(): Queue<SparkPipelineJobData> {
  if (!_sparkPipelineQueue) {
    _sparkPipelineQueue = new Queue<SparkPipelineJobData>(
      QUEUE_NAMES.SPARK_PIPELINE,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: { count: 50, age: 24 * 60 * 60 },
          removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
        },
      }
    );
  }
  return _sparkPipelineQueue;
}

export function getEmailSyncQueue(): Queue<EmailSyncJobData> {
  if (!_emailSyncQueue) {
    _emailSyncQueue = new Queue<EmailSyncJobData>(
      QUEUE_NAMES.EMAIL_SYNC,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 500, age: 24 * 60 * 60 },
          removeOnFail: { count: 200 },
        },
      }
    );
  }
  return _emailSyncQueue;
}

export function getEmbeddingGenerationQueue(): Queue<EmbeddingGenerationJobData> {
  if (!_embeddingGenerationQueue) {
    _embeddingGenerationQueue = new Queue<EmbeddingGenerationJobData>(
      QUEUE_NAMES.EMBEDDING_GENERATION,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 200, age: 24 * 60 * 60 },
          removeOnFail: { count: 500, age: 7 * 24 * 60 * 60 },
        },
      }
    );
  }
  return _embeddingGenerationQueue;
}

export function getSectionRegenQueue(): Queue<SectionRegenJobData> {
  if (!_sectionRegenQueue) {
    _sectionRegenQueue = new Queue<SectionRegenJobData>(
      QUEUE_NAMES.SECTION_REGEN,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100, age: 24 * 60 * 60 },
          removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
        },
      }
    );
  }
  return _sectionRegenQueue;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add a report generation job to the queue
 */
export async function enqueueReportGeneration(
  data: ReportGenerationJobData
): Promise<string> {
  const jobId = `report-${data.reportId}-${Date.now()}`;
  const job = await getReportGenerationQueue().add(
    `report-${data.reportId}`,
    data,
    { jobId }
  );
  return job.id || '';
}

/**
 * Add a research pipeline job to the queue
 */
export async function enqueueResearchPipeline(
  data: ResearchPipelineJobData
): Promise<string> {
  const jobId = `research-${data.researchId}-${Date.now()}`;
  const job = await getResearchPipelineQueue().add(
    `research-${data.researchId}`,
    data,
    { jobId }
  );
  return job.id || '';
}

/**
 * Add a research cancellation job to the queue
 */
export async function enqueueResearchCancel(
  data: ResearchCancelJobData
): Promise<string> {
  const jobId = `cancel-${data.researchId}-${Date.now()}`;
  const job = await getResearchCancelQueue().add(
    `cancel-${data.researchId}`,
    data,
    { jobId }
  );
  return job.id || '';
}

/**
 * Add a Spark pipeline job to the queue
 */
export async function enqueueSparkPipeline(
  data: SparkPipelineJobData
): Promise<string> {
  const jobId = `spark-${data.researchId}-${Date.now()}`;
  const job = await getSparkPipelineQueue().add(
    `spark-${data.researchId}`,
    data,
    { jobId }
  );
  return job.id || '';
}

/**
 * Add an embedding generation job to the queue
 */
export async function enqueueEmbeddingGeneration(
  data: EmbeddingGenerationJobData
): Promise<string> {
  const jobId = `embed-${data.projectId}-${Date.now()}`;
  const job = await getEmbeddingGenerationQueue().add(
    `embed-${data.projectId}`,
    data,
    { jobId }
  );
  return job.id || '';
}

/**
 * Add a section regeneration job to the queue
 */
export async function enqueueSectionRegen(
  data: SectionRegenJobData
): Promise<string> {
  const jobId = `section-regen-${data.reportId}-${Date.now()}`;
  const job = await getSectionRegenQueue().add(
    `section-regen-${data.reportId}`,
    data,
    { jobId }
  );
  return job.id || '';
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats(queueName: QueueName) {
  const getters: Record<QueueName, () => Queue> = {
    [QUEUE_NAMES.REPORT_GENERATION]: getReportGenerationQueue,
    [QUEUE_NAMES.RESEARCH_PIPELINE]: getResearchPipelineQueue,
    [QUEUE_NAMES.RESEARCH_CANCEL]: getResearchCancelQueue,
    [QUEUE_NAMES.SPARK_PIPELINE]: getSparkPipelineQueue,
    [QUEUE_NAMES.EMAIL_SYNC]: getEmailSyncQueue,
    [QUEUE_NAMES.EMBEDDING_GENERATION]: getEmbeddingGenerationQueue,
    [QUEUE_NAMES.SECTION_REGEN]: getSectionRegenQueue,
  };

  const getQueue = getters[queueName];
  if (!getQueue) return null;

  const queue = getQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get all queue stats for dashboard
 */
export async function getAllQueueStats() {
  const names = Object.values(QUEUE_NAMES);
  const stats = await Promise.all(
    names.map(async (name) => ({
      name,
      stats: await getQueueStats(name),
    }))
  );
  return stats;
}
