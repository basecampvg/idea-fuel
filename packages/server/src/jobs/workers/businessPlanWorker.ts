import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq } from 'drizzle-orm';
import { research, projects } from '../../db/schema';
import { QUEUE_NAMES, BusinessPlanJobData } from '../queues';
import { generateBusinessPlanProse, summarizeRawResearch } from '../../services/business-plan-ai';
import { loadFinancialDataForProject } from '../../services/financial-model-loader';

/**
 * Business Plan Generation Worker
 *
 * Loads research data, summarizes raw research if needed,
 * generates structured business plan prose via Sonnet 4.5,
 * and saves the result to the research record.
 */
export function createBusinessPlanWorker() {
  const worker = new Worker<BusinessPlanJobData>(
    QUEUE_NAMES.BUSINESS_PLAN,
    async (job: Job<BusinessPlanJobData>) => {
      const { researchId, projectId } = job.data;

      console.log(`[BusinessPlanWorker] Starting generation for research ${researchId}`);

      try {
        // Mark as generating
        await db.update(research).set({
          businessPlanStatus: 'GENERATING',
          businessPlanSubStatus: 'LOADING_DATA',
          businessPlanError: null,
        }).where(eq(research.id, researchId));

        await job.updateProgress(10);

        // Load research + project data
        const researchRecord = await db.query.research.findFirst({
          where: eq(research.id, researchId),
          with: {
            project: {
              columns: { id: true, title: true, description: true },
            },
          },
        });

        if (!researchRecord) {
          throw new Error(`Research ${researchId} not found`);
        }

        // Load financial model data if available for this project
        const financialData = await loadFinancialDataForProject(projectId);
        console.log(`[BusinessPlanWorker] Financial model: ${financialData ? financialData.modelId : 'none'}`);

        await job.updateProgress(20);

        // Update sub-status: summarizing
        await db.update(research).set({
          businessPlanSubStatus: 'SUMMARIZING',
        }).where(eq(research.id, researchId));

        // Summarize raw research if large
        const deepResearch = researchRecord.rawDeepResearch as { rawReport?: string } | null;
        const rawReport = deepResearch?.rawReport ?? '';

        console.log(`[BusinessPlanWorker] Raw report length: ${rawReport.length} chars`);
        const rawResearchSummary = await summarizeRawResearch(rawReport);
        console.log(`[BusinessPlanWorker] Summary length: ${rawResearchSummary.length} chars`);

        await job.updateProgress(40);

        // Update sub-status: writing
        await db.update(research).set({
          businessPlanSubStatus: 'WRITING',
        }).where(eq(research.id, researchId));

        // Generate the business plan prose
        const prose = await generateBusinessPlanProse({
          ideaTitle: researchRecord.project.title,
          ideaDescription: researchRecord.project.description,
          rawResearchSummary,
          marketAnalysis: researchRecord.marketAnalysis,
          competitors: researchRecord.competitors,
          painPoints: researchRecord.painPoints,
          positioning: researchRecord.positioning,
          whyNow: researchRecord.whyNow,
          proofSignals: researchRecord.proofSignals,
          keywords: researchRecord.keywords,
          scores: {
            opportunity: researchRecord.opportunityScore,
            problem: researchRecord.problemScore,
            feasibility: researchRecord.feasibilityScore,
            whyNow: researchRecord.whyNowScore,
          },
          scoreJustifications: researchRecord.scoreJustifications,
          metrics: {
            revenuePotential: researchRecord.revenuePotential,
            executionDifficulty: researchRecord.executionDifficulty,
            gtmClarity: researchRecord.gtmClarity,
            founderFit: researchRecord.founderFit,
          },
          marketSizing: researchRecord.marketSizing,
          socialProof: researchRecord.socialProof,
          userStory: researchRecord.userStory,
          valueLadder: researchRecord.valueLadder,
          techStack: researchRecord.techStack,
          financialModelData: financialData,
        });

        await job.updateProgress(90);

        // Update sub-status: saving
        await db.update(research).set({
          businessPlanSubStatus: 'SAVING',
        }).where(eq(research.id, researchId));

        // Save to DB
        await db.update(research).set({
          businessPlan: JSON.stringify(prose),
          businessPlanStatus: 'COMPLETE',
          businessPlanSubStatus: null,
          businessPlanError: null,
        }).where(eq(research.id, researchId));

        await job.updateProgress(100);

        console.log(`[BusinessPlanWorker] Completed for research ${researchId}`);

        return { success: true, researchId };
      } catch (error) {
        console.error(`[BusinessPlanWorker] Failed for research ${researchId}:`, error);

        // Mark as failed
        await db.update(research).set({
          businessPlanStatus: 'FAILED',
          businessPlanSubStatus: null,
          businessPlanError: error instanceof Error ? error.message : 'Unknown error',
        }).where(eq(research.id, researchId));

        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
      stalledInterval: 600000, // 10 min — generation can take a while
      lockDuration: 900000,    // 15 min lock
      lockRenewTime: 450000,   // Renew lock every 7.5 min
      drainDelay: 60000,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BusinessPlanWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BusinessPlanWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[BusinessPlanWorker] Worker error:', err);
  });

  return worker;
}
