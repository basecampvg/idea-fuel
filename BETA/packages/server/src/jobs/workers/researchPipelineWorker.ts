import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { prisma } from '../../db';
import { QUEUE_NAMES, ResearchPipelineJobData } from '../queues';

/**
 * Research Pipeline Worker
 * Processes the multi-phase research pipeline in the background
 *
 * Pipeline Phases:
 * 1. DEEP_RESEARCH - o3-deep-research with web search
 * 2. SYNTHESIS - GPT-5.2 extracts structured data
 * 3. SOCIAL_RESEARCH - Domain-filtered social proof
 * 4. REPORT_GENERATION - Generate creative content
 * 5. BUSINESS_PLAN_GENERATION - Comprehensive business plan
 */
export function createResearchPipelineWorker() {
  const worker = new Worker<ResearchPipelineJobData>(
    QUEUE_NAMES.RESEARCH_PIPELINE,
    async (job: Job<ResearchPipelineJobData>) => {
      const { researchId, ideaId, userId, mode } = job.data;

      console.log(`[ResearchWorker] Processing research ${researchId} (mode: ${mode || 'LIGHT'})`);

      try {
        // Update status to in-progress
        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'IN_PROGRESS',
            currentPhase: 'DEEP_RESEARCH',
            progress: 0,
            startedAt: new Date(),
          },
        });

        // Get idea data
        const idea = await prisma.idea.findUnique({
          where: { id: ideaId },
          include: {
            interviews: {
              where: { status: 'COMPLETE' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!idea) {
          throw new Error(`Idea ${ideaId} not found`);
        }

        // Phase 1: Deep Research (0-40%)
        await job.updateProgress(5);
        await prisma.research.update({
          where: { id: researchId },
          data: { currentPhase: 'DEEP_RESEARCH', progress: 5 },
        });

        // TODO: Call actual deep research service
        // const deepResearchResult = await runDeepResearch(idea, interview);
        await simulatePhase('DEEP_RESEARCH', 3000);
        await job.updateProgress(40);

        // Phase 2: Synthesis (40-65%)
        await prisma.research.update({
          where: { id: researchId },
          data: { currentPhase: 'SYNTHESIS', progress: 40 },
        });

        // TODO: Call synthesis service
        // const synthesisResult = await synthesizeInsights(deepResearchResult);
        await simulatePhase('SYNTHESIS', 2000);
        await job.updateProgress(65);

        // Phase 3: Social Research (65-80%)
        await prisma.research.update({
          where: { id: researchId },
          data: { currentPhase: 'SOCIAL_RESEARCH', progress: 65 },
        });

        // TODO: Call social research service
        // const socialProof = await collectSocialProof(idea, synthesisResult);
        await simulatePhase('SOCIAL_RESEARCH', 2000);
        await job.updateProgress(80);

        // Phase 4: Report Generation (80-90%)
        await prisma.research.update({
          where: { id: researchId },
          data: { currentPhase: 'REPORT_GENERATION', progress: 80 },
        });

        // TODO: Generate action prompts, user story, etc.
        await simulatePhase('REPORT_GENERATION', 1500);
        await job.updateProgress(90);

        // Phase 5: Business Plan Generation (90-100%)
        await prisma.research.update({
          where: { id: researchId },
          data: { currentPhase: 'BUSINESS_PLAN_GENERATION', progress: 90 },
        });

        // TODO: Generate comprehensive business plan
        await simulatePhase('BUSINESS_PLAN_GENERATION', 2000);
        await job.updateProgress(100);

        // Mark as complete
        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'COMPLETE',
            currentPhase: 'COMPLETE',
            progress: 100,
            completedAt: new Date(),
            // Placeholder data - replace with actual AI results
            marketAnalysis: { summary: 'Market analysis placeholder' },
            competitors: { list: [] },
            painPoints: { items: [] },
            positioning: { statement: idea.title },
            opportunityScore: 75,
            problemScore: 70,
            feasibilityScore: 80,
            whyNowScore: 65,
          },
        });

        // Update idea status
        await prisma.idea.update({
          where: { id: ideaId },
          data: { status: 'COMPLETE' },
        });

        console.log(`[ResearchWorker] Completed research ${researchId}`);

        return {
          success: true,
          researchId,
          ideaId,
        };
      } catch (error) {
        console.error(`[ResearchWorker] Failed research ${researchId}:`, error);

        // Determine which phase failed
        const currentResearch = await prisma.research.findUnique({
          where: { id: researchId },
          select: { currentPhase: true },
        });

        // Mark research as failed
        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorPhase: currentResearch?.currentPhase,
            retryCount: {
              increment: 1,
            },
          },
        });

        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 2, // Limit concurrent research jobs (expensive API calls)
      limiter: {
        max: 5, // Max 5 jobs per minute
        duration: 60000,
      },
    }
  );

  // Event handlers
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
 * Simulate a research phase (placeholder for actual AI calls)
 */
async function simulatePhase(phaseName: string, durationMs: number): Promise<void> {
  console.log(`[ResearchWorker] Running phase: ${phaseName}`);
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  console.log(`[ResearchWorker] Completed phase: ${phaseName}`);
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
      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: 'FAILED',
          errorMessage: 'Cancelled by user',
        },
      });

      // TODO: Actually cancel any in-flight API calls
      // This would require tracking active job IDs and having
      // a mechanism to abort them

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
