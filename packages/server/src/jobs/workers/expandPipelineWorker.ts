import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq } from 'drizzle-orm';
import { research, projects, users, interviews } from '../../db/schema';
import type { SubscriptionTier } from '../../db/schema';
import { QUEUE_NAMES, type ExpandPipelineJobData } from '../queues';
import type {
  BusinessContext,
  ClassificationResult,
  ExpandDataPoints,
  ExpandResearchInput,
  ChatMessage,
  FounderProfile,
  ExpandResearchPhase,
} from '@forge/shared';
import {
  runExpandResearchPipeline,
} from '../../services/expand-research-ai';
import {
  runOpportunityEngine,
} from '../../services/opportunity-engine';

/**
 * Expand Research Pipeline Worker
 * Processes the 4-module Expand research pipeline in a background worker.
 */
export function createExpandPipelineWorker() {
  const worker = new Worker<ExpandPipelineJobData>(
    QUEUE_NAMES.EXPAND_PIPELINE,
    async (job: Job<ExpandPipelineJobData>) => {
      const { researchId, projectId, userId } = job.data;

      console.log(`[ExpandWorker] Processing expand research ${researchId} for project ${projectId}`);

      const startTime = Date.now();
      let currentPhase: string = 'ADJACENCY_SCAN';

      try {
        // 1. Load project with interview data and business context
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
          with: {
            research: true,
            interviews: {
              where: eq(interviews.status, 'COMPLETE'),
              orderBy: (interviews, { desc }) => desc(interviews.createdAt),
              limit: 1,
            },
          },
        });

        if (!project) {
          throw new Error(`Project ${projectId} not found`);
        }

        const interview = project.interviews[0];
        if (!interview) {
          throw new Error(`No completed interview found for project ${projectId}`);
        }

        // 2. Extract business context and classification from project
        const businessContext = project.businessContext as unknown as BusinessContext | null;
        if (!businessContext) {
          throw new Error(`Project ${projectId} has no business context`);
        }

        const classification = businessContext.classification as unknown as ClassificationResult | undefined;
        if (!classification) {
          throw new Error(`Project ${projectId} has no classification result`);
        }

        // 3. Get user subscription tier
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { subscription: true, founderProfile: true },
        });
        const userTier: SubscriptionTier = (user?.subscription as SubscriptionTier) ?? 'FREE';

        // 4. Build ExpandResearchInput
        const expandInput: ExpandResearchInput = {
          projectId,
          researchId,
          businessContext,
          classification,
          expandInterviewData: (interview.collectedData as unknown as ExpandDataPoints) || {},
          interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
          founderProfile: user?.founderProfile as FounderProfile | undefined,
        };

        // 5. Run the pipeline with progress tracking
        const result = await runExpandResearchPipeline(
          expandInput,
          userTier,
          async (phase: ExpandResearchPhase, progress: number, data) => {
            currentPhase = phase;

            // Check for cancellation
            const current = await db.query.research.findFirst({
              where: eq(research.id, researchId),
              columns: { status: true, errorMessage: true },
            });
            if (current?.status === 'FAILED' && current.errorMessage?.includes('Cancelled by user')) {
              throw new Error('Research cancelled by user');
            }

            // Update progress in DB
            const updateData: Record<string, unknown> = {
              currentPhase: phase,
              progress,
            };

            // Save intermediate module outputs as they complete
            if (data?.moduleOutputs) {
              updateData.expandResearchData = data.moduleOutputs as object;
            }

            await db.update(research)
              .set(updateData as typeof research.$inferInsert)
              .where(eq(research.id, researchId));

            // Update BullMQ job progress for monitoring
            await job.updateProgress(progress);
          },
        );

        // 6. Save research module outputs
        await db.update(research).set({
          expandResearchData: result.moduleOutputs as object,
          progress: 90,
        }).where(eq(research.id, researchId));
        await job.updateProgress(90);

        // 7. Run Opportunity Engine inline (Moat Audit + Scoring)
        console.log(`[ExpandWorker] Running Opportunity Engine for ${researchId}...`);
        currentPhase = 'SYNTHESIS'; // Reuse existing phase enum for error tracking

        const engineInput = {
          businessContext,
          classification,
          expandInterviewData: expandInput.expandInterviewData,
          moduleOutputs: result.moduleOutputs,
          synthesis: result.synthesis,
        };

        const { engineResult, moatAudit } = await runOpportunityEngine(engineInput, userTier);

        // 8. Save final results (research + engine + moat)
        await db.update(research).set({
          status: 'COMPLETE',
          currentPhase: 'COMPLETE',
          progress: 100,
          completedAt: new Date(),
          expandResearchData: result.moduleOutputs as object,
          expandOpportunityEngine: engineResult as object,
          expandMoatAudit: moatAudit as object,
        }).where(eq(research.id, researchId));

        // Update project status
        await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, projectId));

        console.log(`[ExpandWorker] Completed expand research ${researchId} in ${Math.round((Date.now() - startTime) / 1000)}s`);

        return { success: true, researchId, projectId };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ExpandWorker] Failed expand research ${researchId} after ${Math.round(duration / 1000)}s:`, error);

        // Mark research as failed
        await db.update(research).set({
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error in expand research pipeline',
          errorPhase: currentPhase as 'QUEUED' | 'DEEP_RESEARCH' | 'SYNTHESIS' | 'SOCIAL_RESEARCH' | 'REPORT_GENERATION' | 'COMPLETE',
        }).where(eq(research.id, researchId));

        throw error; // Re-throw so BullMQ can handle retries
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: parseInt(process.env.EXPAND_WORKER_CONCURRENCY || '2', 10),
      lockDuration: 600000,     // 10 min lock (expand modules are faster than deep research)
      lockRenewTime: 300000,    // Renew every 5 min
      stalledInterval: 600000,  // Check stalled every 10 min
      drainDelay: 60000,        // Wait 60s between polls when idle
    },
  );

  worker.on('completed', (job) => {
    console.log(`[ExpandWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ExpandWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ExpandWorker] Worker error:', err);
  });

  return worker;
}
