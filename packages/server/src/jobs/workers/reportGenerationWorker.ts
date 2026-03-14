import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq } from 'drizzle-orm';
import { reports, projects, interviews } from '../../db/schema';
import { QUEUE_NAMES, ReportGenerationJobData } from '../queues';
import { extractCitations } from '../../services/citation-extractor';
import { generatePositioningReport } from '../../services/positioning-ai';
import { summarizeRawResearch } from '../../services/business-plan-ai';

/**
 * Report Generation Worker
 * Processes report generation jobs in the background
 *
 * This worker handles the AI-powered generation of business reports.
 * Currently using placeholder content - will integrate full AI generation in Phase 2.
 */
export function createReportGenerationWorker() {
  const worker = new Worker<ReportGenerationJobData>(
    QUEUE_NAMES.REPORT_GENERATION,
    async (job: Job<ReportGenerationJobData>) => {
      const { reportId, projectId, userId, reportType, tier } = job.data;

      console.log(`[ReportWorker] Processing report ${reportId} (type: ${reportType})`);

      try {
        // Update status to generating
        await db.update(reports).set({ status: 'GENERATING' }).where(eq(reports.id, reportId));

        // Get project and research data for context
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

        // Update progress
        await job.updateProgress(20);

        // Generate report content — dispatch by type
        let content: string;
        let reportSections: { included: string[]; locked: string[] };

        if (reportType === 'POSITIONING' && project.research) {
          // Positioning report: use the dedicated AI service
          console.log(`[ReportWorker] Generating POSITIONING report with AI service`);

          // Summarize raw research if available
          const deepResearch = project.research.rawDeepResearch as { rawReport?: string } | null;
          const rawReport = deepResearch?.rawReport ?? '';
          const rawResearchSummary = rawReport ? await summarizeRawResearch(rawReport) : '';

          await job.updateProgress(40);

          const positioningResult = await generatePositioningReport({
            ideaTitle: project.title,
            ideaDescription: project.description,
            rawResearchSummary,
            positioning: project.research.positioning,
            competitors: project.research.competitors,
            painPoints: project.research.painPoints,
            marketAnalysis: project.research.marketAnalysis,
            whyNow: project.research.whyNow,
            proofSignals: project.research.proofSignals,
          }, tier as 'BASIC' | 'PRO' | 'FULL');

          content = JSON.stringify(positioningResult);

          const isPro = tier === 'PRO' || tier === 'FULL';
          const isFull = tier === 'FULL';
          const coreSections = [
            'competitiveAlternatives', 'uniqueAttributes', 'valuePillars',
            'targetAudience', 'customerPersona', 'marketCategory',
            'positioningStatement', 'competitivePositioning',
            'tagline', 'keyMessages', 'messagingFramework',
            'brandVoice', 'brandPersonality', 'trendLayer',
          ];
          const proSections = ['visualStyle', 'toneGuidelines', 'brandColors'];
          const fullSections = ['channelMessaging'];

          reportSections = {
            included: [
              ...coreSections,
              ...(isPro ? proSections : []),
              ...(isFull ? fullSections : []),
            ],
            locked: [
              ...(!isPro ? [...proSections, ...fullSections] : []),
              ...(isPro && !isFull ? fullSections : []),
            ],
          };
        } else {
          // All other report types: placeholder
          content = await generateReportContent({
            project,
            research: project.research,
            interview: project.interviews[0],
            reportType,
            tier,
          });
          reportSections = {
            included: ['summary', 'analysis', 'recommendations'],
            locked: tier === 'FULL' ? [] : ['advanced-analytics', 'appendix'],
          };
        }

        await job.updateProgress(70);

        // Extract citations from generated content matched against research sources
        let citationIndex = null;
        if (project.research) {
          try {
            citationIndex = extractCitations({
              content,
              research: {
                marketSizing: project.research.marketSizing as never,
                marketAnalysis: project.research.marketAnalysis as never,
                sparkResult: project.research.sparkResult as never,
                competitors: project.research.competitors as never,
                proofSignals: project.research.proofSignals as never,
                whyNow: project.research.whyNow as never,
              },
            });
            console.log(`[ReportWorker] Extracted ${citationIndex.citations.length} citations for report ${reportId}`);
          } catch (citationError) {
            console.warn(`[ReportWorker] Citation extraction failed for report ${reportId}:`, citationError);
            // Non-fatal: report still completes without citations
          }
        }

        await job.updateProgress(80);

        // Update report with generated content and citations
        const [updatedReport] = await db.update(reports).set({
          content,
          status: 'COMPLETE',
          citations: citationIndex,
          sections: reportSections,
        }).where(eq(reports.id, reportId)).returning();

        await job.updateProgress(100);

        console.log(`[ReportWorker] Completed report ${reportId}`);

        return {
          success: true,
          reportId: updatedReport.id,
          reportType,
        };
      } catch (error) {
        console.error(`[ReportWorker] Failed report ${reportId}:`, error);

        // Mark report as failed
        await db.update(reports).set({
          status: 'FAILED',
          content: `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }).where(eq(reports.id, reportId));

        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3, // Process up to 3 reports in parallel
      limiter: {
        max: 10, // Max 10 jobs per minute to avoid rate limits
        duration: 60000,
      },
      stalledInterval: 1800000, // Check stalled every 30 min
      drainDelay: 60000,        // Wait 60s between polls when idle (saves Upstash requests)
    }
  );

  // Event handlers for monitoring
  worker.on('completed', (job) => {
    console.log(`[ReportWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ReportWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ReportWorker] Worker error:', err);
  });

  return worker;
}

/**
 * Generate report content
 * Placeholder implementation - will be replaced with AI generation
 */
async function generateReportContent(params: {
  project: {
    id: string;
    title: string;
    description: string;
    research?: {
      marketAnalysis?: unknown;
      competitors?: unknown;
      painPoints?: unknown;
      positioning?: unknown;
    } | null;
  };
  research?: unknown;
  interview?: { mode: string } | null;
  reportType: string;
  tier: string;
}): Promise<string> {
  const { project, reportType, tier, interview } = params;

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Generate placeholder content based on report type
  const content = `# ${reportType.replace(/_/g, ' ')}\n\n` +
    `**Business Idea:** ${project.title}\n\n` +
    `**Report Tier:** ${tier}\n\n` +
    `**Interview Mode:** ${interview?.mode || 'N/A'}\n\n` +
    `## Executive Summary\n\n${project.description}\n\n` +
    `## Analysis\n\n` +
    `This ${reportType.toLowerCase().replace(/_/g, ' ')} report provides ` +
    `${tier === 'FULL' ? 'comprehensive' : tier === 'PRO' ? 'detailed' : 'essential'} ` +
    `insights for "${project.title}".\n\n` +
    `## Recommendations\n\n` +
    `1. Validate core assumptions with target customers\n` +
    `2. Build a minimum viable product to test demand\n` +
    `3. Establish metrics for tracking progress\n\n` +
    `---\n\n` +
    `*This report was generated by ideationLab AI.*`;

  return content;
}

// Export for testing
export { generateReportContent };
