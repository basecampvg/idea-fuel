/**
 * Jobs Module
 * BullMQ queues and workers for background job processing
 */

// Queue exports
export {
  QUEUE_NAMES,
  getReportGenerationQueue,
  getResearchPipelineQueue,
  getResearchCancelQueue,
  getEmailSyncQueue,
  enqueueReportGeneration,
  enqueueResearchPipeline,
  enqueueResearchCancel,
  getQueueStats,
  getAllQueueStats,
} from './queues';

// Types
export type {
  QueueName,
  ReportGenerationJobData,
  ResearchPipelineJobData,
  ResearchCancelJobData,
  EmailSyncJobData,
} from './queues';

// Worker exports (import in worker process)
export {
  createReportGenerationWorker,
  createResearchPipelineWorker,
  createResearchCancelWorker,
} from './workers';
