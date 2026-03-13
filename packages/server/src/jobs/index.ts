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
  getSparkPipelineQueue,
  getEmailSyncQueue,
  getSectionRegenQueue,
  enqueueReportGeneration,
  enqueueResearchPipeline,
  enqueueResearchCancel,
  enqueueSparkPipeline,
  enqueueSectionRegen,
  enqueueBusinessPlan,
  getQueueStats,
  getAllQueueStats,
} from './queues';

// Types
export type {
  QueueName,
  ReportGenerationJobData,
  ResearchPipelineJobData,
  SparkPipelineJobData,
  ResearchCancelJobData,
  EmailSyncJobData,
  SectionRegenJobData,
  BusinessPlanJobData,
} from './queues';

// Worker exports (import in worker process)
export {
  createReportGenerationWorker,
  createResearchPipelineWorker,
  createResearchCancelWorker,
  createSparkPipelineWorker,
} from './workers';
