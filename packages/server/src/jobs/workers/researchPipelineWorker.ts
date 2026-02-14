import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq, sql } from 'drizzle-orm';
import { research, projects, users, interviews } from '../../db/schema';
import type { SubscriptionTier } from '../../db/schema';
import { QUEUE_NAMES, ResearchPipelineJobData } from '../queues';
import type { ChatMessage, InterviewDataPoints } from '@forge/shared';
import {
  runResearchPipeline,
  classifyResearchError,
  logResearchError,
  SlaTracker,
  type ResearchInput,
  type ExistingResearchData,
  type IntermediateResearchData,
  type ChunkedResearchData,
  type ResearchPhase,
} from '../../services/research-ai';

/**
 * Research Pipeline Worker
 * Processes the multi-phase research pipeline in a long-running worker process.
 * This replaces the fire-and-forget IIFE that was killed by Vercel's 60s timeout.
 */
export function createResearchPipelineWorker() {
  const worker = new Worker<ResearchPipelineJobData>(
    QUEUE_NAMES.RESEARCH_PIPELINE,
    async (job: Job<ResearchPipelineJobData>) => {
      const { researchId, projectId, userId } = job.data;

      console.log(`[ResearchWorker] Processing research ${researchId} for project ${projectId}`);

      let currentPhase: string = 'DEEP_RESEARCH';
      const startTime = Date.now();

      try {
        // 1. Load project with interview data
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

        // 2. Get user subscription tier for AI parameters
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { subscription: true },
        });
        const userTier: SubscriptionTier = (user?.subscription as SubscriptionTier) ?? 'FREE';

        // 3. Build ResearchInput
        const notesContext = project.notes ? `## FOUNDER'S NOTES\n${project.notes}` : undefined;
        const researchInput: ResearchInput = {
          ideaTitle: project.title,
          ideaDescription: project.description,
          interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
          interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
          canvasContext: notesContext,
        };

        // 4. Build existing research data for resume capability
        const researchRecord = project.research;
        const existingResearchData: ExistingResearchData | undefined = researchRecord ? {
          rawDeepResearch: researchRecord.rawDeepResearch as ExistingResearchData['rawDeepResearch'],
          researchChunks: researchRecord.researchChunks as ChunkedResearchData | null,
          socialProof: researchRecord.socialProof as ExistingResearchData['socialProof'],
          synthesizedInsights: researchRecord.synthesizedInsights as ExistingResearchData['synthesizedInsights'],
          opportunityScore: researchRecord.opportunityScore,
          problemScore: researchRecord.problemScore,
          feasibilityScore: researchRecord.feasibilityScore,
          whyNowScore: researchRecord.whyNowScore,
          scoreJustifications: researchRecord.scoreJustifications as ExistingResearchData['scoreJustifications'],
          scoreMetadata: researchRecord.scoreMetadata as ExistingResearchData['scoreMetadata'],
          revenuePotential: researchRecord.revenuePotential as ExistingResearchData['revenuePotential'],
          executionDifficulty: researchRecord.executionDifficulty as ExistingResearchData['executionDifficulty'],
          gtmClarity: researchRecord.gtmClarity as ExistingResearchData['gtmClarity'],
          founderFit: researchRecord.founderFit as ExistingResearchData['founderFit'],
          marketSizing: researchRecord.marketSizing as ExistingResearchData['marketSizing'],
          userStory: researchRecord.userStory as ExistingResearchData['userStory'],
          valueLadder: researchRecord.valueLadder as ExistingResearchData['valueLadder'],
          actionPrompts: researchRecord.actionPrompts as ExistingResearchData['actionPrompts'],
          keywordTrends: researchRecord.keywordTrends as ExistingResearchData['keywordTrends'],
          techStack: researchRecord.techStack as ExistingResearchData['techStack'],
          businessPlan: researchRecord.businessPlan,
        } : undefined;

        // 5. Initialize SLA tracker
        const slaTracker = new SlaTracker();

        // 6. Run the actual pipeline
        const result = await runResearchPipeline(researchInput, async (phase, progress, intermediateData?: IntermediateResearchData) => {
          currentPhase = phase;

          // Check for cancellation before processing
          // Only abort if explicitly cancelled by user (errorMessage contains 'Cancelled')
          // Don't abort on FAILED from previous worker errors (BullMQ retries)
          const current = await db.query.research.findFirst({
            where: eq(research.id, researchId),
            columns: { status: true, errorMessage: true },
          });
          if (current?.status === 'FAILED' && current.errorMessage?.includes('Cancelled by user')) {
            throw new Error('Research cancelled by user');
          }

          // Update SLA tracking
          const researchPhase = phase as ResearchPhase;
          if (['DEEP_RESEARCH', 'SOCIAL_RESEARCH', 'SYNTHESIS', 'REPORT_GENERATION'].includes(researchPhase)) {
            slaTracker.endPhase();
            slaTracker.startPhase(researchPhase);
          }
          slaTracker.checkTotalSla();

          // Build DB update
          const updateData: Record<string, unknown> = {
            currentPhase: phase as 'QUEUED' | 'DEEP_RESEARCH' | 'SYNTHESIS' | 'SOCIAL_RESEARCH' | 'REPORT_GENERATION' | 'COMPLETE',
            progress,
          };

          // Save intermediate data for resume capability
          if (intermediateData) {
            if (intermediateData.deepResearch) {
              updateData.rawDeepResearch = intermediateData.deepResearch as object;

              // Extract chunk data for granular resume
              const rawReport = intermediateData.deepResearch.rawReport;
              const chunkResults: Record<string, string> = {};

              const marketMatch = rawReport.match(/## Market Analysis\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (marketMatch) chunkResults.market = marketMatch[1].trim();
              const competitorMatch = rawReport.match(/## Competitor Analysis\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (competitorMatch) chunkResults.competitors = competitorMatch[1].trim();
              const painpointsMatch = rawReport.match(/## Customer Pain Points\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (painpointsMatch) chunkResults.painpoints = painpointsMatch[1].trim();
              const timingMatch = rawReport.match(/## Timing & Validation\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (timingMatch) chunkResults.timing = timingMatch[1].trim();

              if (Object.keys(chunkResults).length > 0) {
                updateData.researchChunks = {
                  chunkResults,
                  citations: intermediateData.deepResearch.citations,
                  sources: intermediateData.deepResearch.sources,
                } as object;
              }
            }
            if (intermediateData.socialProof) {
              updateData.socialProof = intermediateData.socialProof as object;
            }
            if (intermediateData.insights) {
              updateData.synthesizedInsights = intermediateData.insights as object;
            }
            if (intermediateData.scores) {
              updateData.opportunityScore = intermediateData.scores.opportunityScore;
              updateData.problemScore = intermediateData.scores.problemScore;
              updateData.feasibilityScore = intermediateData.scores.feasibilityScore;
              updateData.whyNowScore = intermediateData.scores.whyNowScore;
              updateData.scoreJustifications = intermediateData.scores.justifications as object;
              updateData.scoreMetadata = intermediateData.scores.metadata as object;
            }
            if (intermediateData.metrics) {
              updateData.revenuePotential = intermediateData.metrics.revenuePotential as object;
              updateData.executionDifficulty = intermediateData.metrics.executionDifficulty as object;
              updateData.gtmClarity = intermediateData.metrics.gtmClarity as object;
              updateData.founderFit = intermediateData.metrics.founderFit as object;
            }
            if (intermediateData.marketSizing) {
              updateData.marketSizing = intermediateData.marketSizing as object;
            }
          }

          await db.update(research).set(updateData as typeof research.$inferInsert).where(eq(research.id, researchId));

          // Also update BullMQ job progress for monitoring
          await job.updateProgress(progress);
        }, userTier, existingResearchData);

        // 7. Save final results
        await db.update(research).set({
          status: 'COMPLETE',
          currentPhase: 'COMPLETE',
          progress: 100,
          completedAt: new Date(),
          generatedQueries: result.queries as object,
          synthesizedInsights: result.insights as object,
          marketAnalysis: result.insights.marketAnalysis as object,
          competitors: result.insights.competitors as object[],
          painPoints: result.insights.painPoints as object[],
          positioning: result.insights.positioning as object,
          whyNow: result.insights.whyNow as object,
          proofSignals: result.insights.proofSignals as object,
          keywords: result.insights.keywords as object,
          ...(result.scores ? {
            opportunityScore: result.scores.opportunityScore,
            problemScore: result.scores.problemScore,
            feasibilityScore: result.scores.feasibilityScore,
            whyNowScore: result.scores.whyNowScore,
            scoreJustifications: result.scores.justifications as object,
            scoreMetadata: result.scores.metadata as object,
          } : {}),
          ...(result.metrics ? {
            revenuePotential: result.metrics.revenuePotential as object,
            executionDifficulty: result.metrics.executionDifficulty as object,
            gtmClarity: result.metrics.gtmClarity as object,
            founderFit: result.metrics.founderFit as object,
          } : {}),
          ...(result.marketSizing ? { marketSizing: result.marketSizing as object } : {}),
          ...(result.userStory ? { userStory: result.userStory as object } : {}),
          keywordTrends: result.keywordTrends as object[],
          ...(result.valueLadder ? { valueLadder: result.valueLadder as object[] } : {}),
          ...(result.actionPrompts ? { actionPrompts: result.actionPrompts as object[] } : {}),
          socialProof: result.socialProof as object,
          ...(result.techStack ? { techStack: result.techStack as object } : {}),
          ...(result.businessPlan ? { businessPlan: result.businessPlan } : {}),
          rawDeepResearch: result.deepResearch as object,
        }).where(eq(research.id, researchId));

        // Update project status to complete
        await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, projectId));

        console.log(`[ResearchWorker] Completed research ${researchId} in ${Math.round((Date.now() - startTime) / 1000)}s`);

        return { success: true, researchId, projectId };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ResearchWorker] Failed research ${researchId} after ${Math.round(duration / 1000)}s:`, error);

        // Classify and log the error
        const classifiedError = classifyResearchError(error, currentPhase, duration);
        logResearchError(classifiedError);

        // Mark research as failed
        await db.update(research).set({
          status: 'FAILED',
          errorMessage: `[${classifiedError.type}] ${classifiedError.message}`,
          errorPhase: currentPhase as 'QUEUED' | 'DEEP_RESEARCH' | 'SYNTHESIS' | 'SOCIAL_RESEARCH' | 'REPORT_GENERATION' | 'COMPLETE',
          retryCount: sql`${research.retryCount} + 1`,
        }).where(eq(research.id, researchId));

        // Reset project status so user isn't stuck
        await db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, projectId)).catch(() => {});

        throw error; // Re-throw so BullMQ can handle retries
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,          // Only 1 concurrent research job (expensive API calls)
      lockDuration: 300000,     // 5 min lock duration (long-running jobs)
      lockRenewTime: 150000,    // Renew lock every 2.5 min
      stalledInterval: 600000,  // Check for stalled jobs every 10 min
    }
  );

  worker.on('completed', (job) => {
    console.log(`[ResearchWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ResearchWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ResearchWorker] Worker error:', err);
  });

  return worker;
}

/**
 * Research Cancel Worker
 * Handles cancellation of in-progress research jobs
 */
export function createResearchCancelWorker() {
  const worker = new Worker(
    QUEUE_NAMES.RESEARCH_CANCEL,
    async (job) => {
      const { researchId } = job.data as { researchId: string };

      console.log(`[ResearchCancelWorker] Cancelling research ${researchId}`);

      // Mark research as failed/cancelled
      await db.update(research).set({
        status: 'FAILED',
        errorMessage: 'Cancelled by user',
      }).where(eq(research.id, researchId));

      return { success: true, cancelled: researchId };
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[ResearchCancelWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ResearchCancelWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
