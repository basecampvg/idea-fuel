import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq } from 'drizzle-orm';
import { projects, research, reports, interviews } from '../../db/schema';
import { QUEUE_NAMES, type EmbeddingGenerationJobData } from '../queues';
import {
  generateAndStoreEmbeddings,
  type EmbeddingInput,
} from '../../lib/embeddings';
import type { EmbeddingSourceType } from '../../db/schema';

/**
 * Embedding Generation Worker
 *
 * Processes embedding jobs in the background after research/report/interview completes.
 * Extracts text content from each source, chunks it, generates embeddings via OpenAI,
 * and stores them in the Embedding table for RAG search.
 */
export function createEmbeddingWorker() {
  const worker = new Worker<EmbeddingGenerationJobData>(
    QUEUE_NAMES.EMBEDDING_GENERATION,
    async (job: Job<EmbeddingGenerationJobData>) => {
      const { projectId, sources } = job.data;

      console.log(
        `[EmbeddingWorker] Processing ${sources.length} sources for project ${projectId}`
      );

      const results: Array<{ type: string; id: string; chunks: number }> = [];
      const totalSources = sources.length;

      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        try {
          const input = await buildEmbeddingInput(projectId, source.type, source.id);
          if (!input) {
            console.log(`[EmbeddingWorker] Skipping ${source.type}:${source.id} — no content`);
            results.push({ type: source.type, id: source.id, chunks: 0 });
            continue;
          }

          const result = await generateAndStoreEmbeddings(input);
          results.push({ type: source.type, id: source.id, chunks: result.chunksCreated });

          await job.updateProgress(Math.round(((i + 1) / totalSources) * 100));
        } catch (error) {
          console.error(
            `[EmbeddingWorker] Failed to embed ${source.type}:${source.id}:`,
            error instanceof Error ? error.message : error
          );
          results.push({ type: source.type, id: source.id, chunks: 0 });
        }
      }

      const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);
      console.log(
        `[EmbeddingWorker] Completed project ${projectId}: ${totalChunks} total chunks from ${results.length} sources`
      );

      return { success: true, projectId, results, totalChunks };
    },
    {
      connection: createRedisConnection(),
      concurrency: 2, // Process 2 jobs at a time (embedding is IO-bound)
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute to respect OpenAI rate limits
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(
      `[EmbeddingWorker] Job ${job?.id} failed:`,
      err.message
    );
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Content extraction per source type
// ---------------------------------------------------------------------------

async function buildEmbeddingInput(
  projectId: string,
  sourceType: EmbeddingSourceType,
  sourceId: string
): Promise<EmbeddingInput | null> {
  switch (sourceType) {
    case 'RESEARCH':
      return buildResearchInput(projectId, sourceId);
    case 'REPORT':
      return buildReportInput(projectId, sourceId);
    case 'INTERVIEW':
      return buildInterviewInput(projectId, sourceId);
    case 'NOTES':
      return buildNotesInput(projectId, sourceId);
    case 'SERPAPI':
      return buildSerpapiInput(projectId, sourceId);
    default:
      return null;
  }
}

async function buildResearchInput(
  projectId: string,
  researchId: string
): Promise<EmbeddingInput | null> {
  const record = await db.query.research.findFirst({
    where: eq(research.id, researchId),
  });

  if (!record) return null;

  // Combine synthesized insights into a single document
  const sections: string[] = [];

  if (record.synthesizedInsights) {
    sections.push(`## Synthesized Research Insights\n${formatJsonContent(record.synthesizedInsights)}`);
  }
  if (record.marketAnalysis) {
    sections.push(`## Market Analysis\n${formatJsonContent(record.marketAnalysis)}`);
  }
  if (record.competitors) {
    sections.push(`## Competitive Landscape\n${formatJsonContent(record.competitors)}`);
  }
  if (record.painPoints) {
    sections.push(`## Pain Points & Problems\n${formatJsonContent(record.painPoints)}`);
  }
  if (record.positioning) {
    sections.push(`## Positioning & Differentiation\n${formatJsonContent(record.positioning)}`);
  }
  if (record.whyNow) {
    sections.push(`## Why Now — Timing Analysis\n${formatJsonContent(record.whyNow)}`);
  }
  if (record.proofSignals) {
    sections.push(`## Proof Signals & Social Proof\n${formatJsonContent(record.proofSignals)}`);
  }
  if (record.marketSizing) {
    sections.push(`## Market Sizing (TAM/SAM/SOM)\n${formatJsonContent(record.marketSizing)}`);
  }
  if (record.businessPlan) {
    sections.push(`## Business Plan\n${record.businessPlan}`);
  }

  const content = sections.join('\n\n---\n\n');
  if (!content.trim()) return null;

  return {
    projectId,
    sourceType: 'RESEARCH',
    sourceId: researchId,
    content,
    contentType: 'markdown',
    metadata: { researchStatus: record.status },
  };
}

async function buildReportInput(
  projectId: string,
  reportId: string
): Promise<EmbeddingInput | null> {
  const record = await db.query.reports.findFirst({
    where: eq(reports.id, reportId),
  });

  if (!record || !record.content?.trim()) return null;

  return {
    projectId,
    sourceType: 'REPORT',
    sourceId: reportId,
    content: record.content,
    contentType: 'markdown',
    metadata: { reportType: record.type, reportTier: record.tier },
  };
}

async function buildInterviewInput(
  projectId: string,
  interviewId: string
): Promise<EmbeddingInput | null> {
  const record = await db.query.interviews.findFirst({
    where: eq(interviews.id, interviewId),
  });

  if (!record) return null;

  const messages = record.messages as Array<{ role: string; content: string }> | null;
  if (!messages?.length) return null;

  // Build plain text fallback for the content field
  const content = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  return {
    projectId,
    sourceType: 'INTERVIEW',
    sourceId: interviewId,
    content,
    contentType: 'interview',
    messages,
    metadata: { interviewMode: record.mode, interviewStatus: record.status },
  };
}

async function buildNotesInput(
  projectId: string,
  _sourceId: string // sourceId is the projectId for notes
): Promise<EmbeddingInput | null> {
  const record = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!record?.notes?.trim()) return null;

  return {
    projectId,
    sourceType: 'NOTES',
    sourceId: projectId,
    content: record.notes,
    contentType: 'plain',
    metadata: { projectTitle: record.title },
  };
}

async function buildSerpapiInput(
  projectId: string,
  researchId: string
): Promise<EmbeddingInput | null> {
  const record = await db.query.research.findFirst({
    where: eq(research.id, researchId),
  });

  if (!record) return null;

  // Format SerpAPI data as natural language for better embedding quality
  const sections: string[] = [];

  if (record.keywords) {
    const keywords = record.keywords as Record<string, unknown>;
    sections.push(`## Keywords & Search Volume\n${formatJsonContent(keywords)}`);
  }
  if (record.keywordTrends) {
    const trends = record.keywordTrends as Record<string, unknown>;
    sections.push(`## Keyword Trends\n${formatJsonContent(trends)}`);
  }

  const content = sections.join('\n\n');
  if (!content.trim()) return null;

  return {
    projectId,
    sourceType: 'SERPAPI',
    sourceId: researchId,
    content,
    contentType: 'markdown',
    metadata: { dataSource: 'serpapi' },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format JSON content as readable text for embedding.
 * Converts objects/arrays to a human-readable string.
 */
function formatJsonContent(data: unknown): string {
  if (typeof data === 'string') return data;
  if (!data) return '';

  try {
    if (Array.isArray(data)) {
      return data
        .map((item, i) => {
          if (typeof item === 'string') return `- ${item}`;
          if (typeof item === 'object' && item !== null) {
            return Object.entries(item)
              .map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join('\n');
          }
          return `- ${String(item)}`;
        })
        .join('\n');
    }

    if (typeof data === 'object') {
      return Object.entries(data as Record<string, unknown>)
        .map(([key, value]) => {
          if (typeof value === 'string') return `**${key}:** ${value}`;
          if (Array.isArray(value)) return `**${key}:**\n${formatJsonContent(value)}`;
          if (typeof value === 'object') return `**${key}:**\n${JSON.stringify(value, null, 2)}`;
          return `**${key}:** ${String(value)}`;
        })
        .join('\n\n');
    }

    return String(data);
  } catch {
    return JSON.stringify(data, null, 2);
  }
}
