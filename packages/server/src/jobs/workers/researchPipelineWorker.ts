import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq, sql } from 'drizzle-orm';
import { research, projects, interviews } from '../../db/schema';
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
      const { researchId, projectId, userId, mode } = job.data;

      console.log(`[ResearchWorker] Processing research ${researchId} (mode: ${mode || 'LIGHT'})`);

      try {
        // Update status to in-progress
        await db.update(research)
          .set({
            status: 'IN_PROGRESS',
            currentPhase: 'DEEP_RESEARCH',
            progress: 0,
            startedAt: new Date(),
          })
          .where(eq(research.id, researchId));

        // Get project data
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
          with: {
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

        // Phase 1: Deep Research (0-40%)
        await job.updateProgress(5);
        await db.update(research).set({ currentPhase: 'DEEP_RESEARCH', progress: 5 }).where(eq(research.id, researchId));

        // TODO: Call actual deep research service
        await simulatePhase('DEEP_RESEARCH', 3000);
        await job.updateProgress(40);

        // Phase 2: Synthesis (40-65%)
        await db.update(research).set({ currentPhase: 'SYNTHESIS', progress: 40 }).where(eq(research.id, researchId));

        // TODO: Call synthesis service
        await simulatePhase('SYNTHESIS', 2000);
        await job.updateProgress(65);

        // Phase 3: Social Research (65-80%)
        await db.update(research).set({ currentPhase: 'SOCIAL_RESEARCH', progress: 65 }).where(eq(research.id, researchId));

        // TODO: Call social research service
        await simulatePhase('SOCIAL_RESEARCH', 2000);
        await job.updateProgress(80);

        // Phase 4: Report Generation (80-90%)
        await db.update(research).set({ currentPhase: 'REPORT_GENERATION', progress: 80 }).where(eq(research.id, researchId));

        // TODO: Generate action prompts, user story, etc.
        await simulatePhase('REPORT_GENERATION', 1500);
        await job.updateProgress(90);

        // Phase 5: Business Plan Generation (90-100%)
        await db.update(research).set({ currentPhase: 'BUSINESS_PLAN_GENERATION', progress: 90 }).where(eq(research.id, researchId));

        // TODO: Generate comprehensive business plan
        await simulatePhase('BUSINESS_PLAN_GENERATION', 2000);
        await job.updateProgress(100);

        // Mark as complete
        await db.update(research).set({
          status: 'COMPLETE',
          currentPhase: 'COMPLETE',
          progress: 100,
          completedAt: new Date(),
          // Placeholder data - replace with actual AI results
          marketAnalysis: { summary: 'Market analysis placeholder' },
          competitors: { list: [] },
          painPoints: { items: [] },
          positioning: { statement: project.title },
          opportunityScore: 75,
          problemScore: 70,
          feasibilityScore: 80,
          whyNowScore: 65,
        }).where(eq(research.id, researchId));

        // Update project status
        await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, projectId));

        console.log(`[ResearchWorker] Completed research ${researchId}`);

        return {
          success: true,
          researchId,
          projectId,
        };
      } catch (error) {
        console.error(`[ResearchWorker] Failed research ${researchId}:`, error);

        // Determine which phase failed
        const currentResearch = await db.query.research.findFirst({
          where: eq(research.id, researchId),
          columns: { currentPhase: true },
        });

        // Mark research as failed
        await db.update(research).set({
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorPhase: currentResearch?.currentPhase,
          retryCount: sql`${research.retryCount} + 1`,
        }).where(eq(research.id, researchId));

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
