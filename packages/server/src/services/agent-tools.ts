/**
 * Agent Tool Definitions
 *
 * Defines the tools available to the AI agent via Vercel AI SDK.
 * Each tool is scoped to a specific project and user.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { projects, reports, research, interviews } from '../db/schema';
import { searchProjectEmbeddings, getProjectEmbeddingStats } from '../lib/vector-search';
import { getProductKnowledge } from './agent-knowledge';

export function createAgentTools(projectId: string, userId: string) {
  return {
    queryProjectData: tool({
      description:
        'Search the project knowledge base for relevant information. ' +
        'Searches across research data, reports, interview transcripts, and notes ' +
        'using semantic similarity. Use when user asks about their project data.',
      parameters: z.object({
        query: z.string().describe('Natural language search query'),
        sourceTypes: z
          .array(z.enum(['REPORT', 'RESEARCH', 'INTERVIEW', 'NOTES', 'SERPAPI']))
          .optional()
          .describe('Filter to specific data sources'),
      }),
      execute: async ({ query, sourceTypes }) => {
        const results = await searchProjectEmbeddings({
          projectId,
          query,
          limit: 8,
          threshold: 0.7,
          sourceTypes,
        });
        return results.map((r) => ({
          content: r.content,
          source: r.sourceType,
          relevance: Math.round(r.similarity * 100) + '%',
        }));
      },
    }),

    addReportInsight: tool({
      description:
        'Generate a content block to add to the report Agent Insights section. ' +
        'Use when user asks you to write analysis, summaries, or new content ' +
        'for their report. Returns a preview — user must confirm before saving.',
      parameters: z.object({
        title: z.string().describe('Short title for the insight block'),
        content: z.string().describe('Full content in Markdown format'),
        reportId: z.string().optional().describe('Target report ID'),
      }),
      execute: async ({ title, content, reportId }) => {
        return {
          preview: true,
          title,
          content,
          reportId,
          action: 'CONFIRM_INSIGHT' as const,
        };
      },
    }),

    getProjectContext: tool({
      description:
        'Get the current project metadata, status, and available reports/research. ' +
        'Use to understand what data is available before answering questions.',
      parameters: z.object({}),
      execute: async () => {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
          with: {
            reports: {
              columns: { id: true, type: true, tier: true, status: true, title: true },
            },
            research: {
              columns: { id: true, status: true, currentPhase: true },
            },
            interviews: {
              columns: { id: true, mode: true, status: true },
            },
          },
        });

        if (!project) return { error: 'Project not found' };

        // Include embedding stats so the agent knows what data is searchable
        const embeddingStats = await getProjectEmbeddingStats(projectId);

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          notes: project.notes ? `${project.notes.slice(0, 500)}${project.notes.length > 500 ? '...' : ''}` : null,
          reports: project.reports,
          research: project.research,
          interviews: project.interviews,
          embeddedData: embeddingStats,
        };
      },
    }),

    explainFeature: tool({
      description:
        'Explain a Forge product feature or concept. Use when users ask about ' +
        'interview modes, report types, research phases, or general product guidance.',
      parameters: z.object({
        topic: z.string().describe('Feature or concept to explain'),
      }),
      execute: async ({ topic }) => {
        return getProductKnowledge(topic);
      },
    }),
  };
}
