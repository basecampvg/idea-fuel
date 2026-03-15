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
  getExpandPipelineQueue,
  enqueueReportGeneration,
  enqueueResearchPipeline,
  enqueueResearchCancel,
  enqueueSparkPipeline,
  enqueueSectionRegen,
  enqueueBusinessPlan,
  enqueueExpandPipeline,
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
  ExpandPipelineJobData,
} from './queues';

// Worker exports (import in worker process)
export {
  createReportGenerationWorker,
  createResearchPipelineWorker,
  createResearchCancelWorker,
  createSparkPipelineWorker,
  createExpandPipelineWorker,
} from './workers';
