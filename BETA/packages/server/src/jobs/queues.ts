import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';

/**
 * Queue Names - centralized constants for all job queues
 */
export const QUEUE_NAMES = {
  REPORT_GENERATION: 'report-generation',
  RESEARCH_PIPELINE: 'research-pipeline',
  RESEARCH_CANCEL: 'research-cancel',
  EMAIL_SYNC: 'email-sync',
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
  ideaId: string;
  userId: string;
  reportType: string;
  tier: string;
}

/**
 * Research Pipeline Job Data
 */
export interface ResearchPipelineJobData {
  researchId: string;
  ideaId: string;
  userId: string;
  interviewId?: string;
  mode?: 'LIGHT' | 'IN_DEPTH' | 'SPARK';
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

// ============================================================================
// QUEUE INSTANCES
// ============================================================================

/**
 * Report Generation Queue
 * Handles AI-powered report generation with retry logic
 */
export const reportGenerationQueue = new Queue<ReportGenerationJobData>(
  QUEUE_NAMES.REPORT_GENERATION,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 60 * 60, // Remove after 24 hours
      },
      removeOnFail: {
        count: 500, // Keep more failed jobs for debugging
        age: 7 * 24 * 60 * 60, // Remove after 7 days
      },
    },
  }
);

/**
 * Research Pipeline Queue
 * Handles the multi-phase research pipeline (deep research, synthesis, etc.)
 */
export const researchPipelineQueue = new Queue<ResearchPipelineJobData>(
  QUEUE_NAMES.RESEARCH_PIPELINE,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2, // Fewer retries for expensive operations
      backoff: {
        type: 'exponential',
        delay: 10000, // Start with 10 seconds
      },
      removeOnComplete: {
        count: 50,
        age: 24 * 60 * 60,
      },
      removeOnFail: {
        count: 200,
        age: 7 * 24 * 60 * 60,
      },
    },
  }
);

/**
 * Research Cancel Queue
 * Handles cancellation of in-progress research jobs
 */
export const researchCancelQueue = new Queue<ResearchCancelJobData>(
  QUEUE_NAMES.RESEARCH_CANCEL,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 1, // No retry for cancel operations
      removeOnComplete: {
        count: 100,
        age: 60 * 60, // Remove after 1 hour
      },
    },
  }
);

/**
 * Email Sync Queue
 * Handles batch synchronization of emails to Beehiiv
 */
export const emailSyncQueue = new Queue<EmailSyncJobData>(
  QUEUE_NAMES.EMAIL_SYNC,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 500,
        age: 24 * 60 * 60,
      },
      removeOnFail: {
        count: 200,
      },
    },
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add a report generation job to the queue
 */
export async function enqueueReportGeneration(
  data: ReportGenerationJobData
): Promise<string> {
  const job = await reportGenerationQueue.add(
    `report-${data.reportId}`,
    data,
    {
      jobId: `report-${data.reportId}`,
    }
  );
  return job.id || '';
}

/**
 * Add a research pipeline job to the queue
 */
export async function enqueueResearchPipeline(
  data: ResearchPipelineJobData
): Promise<string> {
  const job = await researchPipelineQueue.add(
    `research-${data.researchId}`,
    data,
    {
      jobId: `research-${data.researchId}`,
    }
  );
  return job.id || '';
}

/**
 * Add a research cancellation job to the queue
 */
export async function enqueueResearchCancel(
  data: ResearchCancelJobData
): Promise<string> {
  const job = await researchCancelQueue.add(
    `cancel-${data.researchId}`,
    data,
    {
      jobId: `cancel-${data.researchId}`,
    }
  );
  return job.id || '';
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats(queueName: QueueName) {
  const queues: Record<QueueName, Queue> = {
    [QUEUE_NAMES.REPORT_GENERATION]: reportGenerationQueue,
    [QUEUE_NAMES.RESEARCH_PIPELINE]: researchPipelineQueue,
    [QUEUE_NAMES.RESEARCH_CANCEL]: researchCancelQueue,
    [QUEUE_NAMES.EMAIL_SYNC]: emailSyncQueue,
  };

  const queue = queues[queueName];
  if (!queue) return null;

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
