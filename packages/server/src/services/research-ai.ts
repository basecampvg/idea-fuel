import { openai, getAIParams, createResponsesParams, createResponsesParamsWithWebSearch, withExponentialBackoff, type ReasoningEffort, type AIParams } from '../lib/openai';
import { configService } from './config';
import type { SubscriptionTier } from '../db/schema';
import { getResearchKnowledge, KNOWLEDGE } from '../lib/knowledge';
import type { InterviewDataPoints, MarketSizingData, MarketMetric, MarketSegmentBreakdown, MarketAssumption, MarketSource, TechStackData, TechRecommendation, CostBreakdown, BusinessType } from '@forge/shared';
import { trackUsageFromResponse } from '../lib/token-tracker';
import {
  batchGetTrendData,
  isSerpApiConfigured,
  type TrendData,
} from '../lib/serpapi';
import {
  expandQueries,
  getExpandedQueryStrings,
  formatQueriesForPrompt,
} from '../lib/query-expansion';
import {
  deepResearchClient,
  DEEP_RESEARCH_MODEL,
  DEEP_RESEARCH_MODEL_MINI,
  SEARCH_DOMAINS,
  createDeepResearchParams,
  parseDeepResearchResponse,
  runDeepResearchWithPolling,
  startBackgroundResearch,
  pollForCompletion,
  type DeepResearchResult,
  type PollOptions,
  type ResponseStatus,
} from '../lib/deep-research';
import {
  getSearchProvider,
  getResearchProvider,
  getExtractionProvider,
  getGenerationProvider,
  getBusinessPlanProvider,
} from '../providers';
import { z } from 'zod';

// Model for post-processing tasks (interpreting research, generating reports)
const REPORT_MODEL = 'gpt-5.2';

// Types for research pipeline
export interface ResearchInput {
  ideaTitle: string;
  ideaDescription: string;
  interviewData: Partial<InterviewDataPoints> | null;
  interviewMessages: Array<{ role: string; content: string }>;
  canvasContext?: string; // now receives notes text (not canvas blocks)
}

export interface GeneratedQueries {
  marketQueries: string[];
  competitorQueries: string[];
  customerQueries: string[];
  trendQueries: string[];
}

export interface SynthesizedInsights {
  marketAnalysis: {
    size: string;
    growth: string;
    trends: string[];
    opportunities: string[];
    threats: string[];
  };
  competitors: Array<{
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    positioning: string;
  }>;
  painPoints: Array<{
    problem: string;
    severity: 'high' | 'medium' | 'low';
    currentSolutions: string[];
    gaps: string[];
  }>;
  positioning: {
    uniqueValueProposition: string;
    targetAudience: string;
    differentiators: string[];
    messagingPillars: string[];
  };
  whyNow: {
    marketTriggers: string[];
    timingFactors: string[];
    urgencyScore: number;
  };
  proofSignals: {
    demandIndicators: string[];
    validationOpportunities: string[];
    riskFactors: string[];
  };
  keywords: {
    primary: string[];
    secondary: string[];
    longTail: string[];
  };
}

// Individual score with justification
export interface ScoreWithJustification {
  score: number;
  justification: string;
  confidence: 'high' | 'medium' | 'low';
}

// Raw scores from a single AI pass (internal)
interface RawScorePass {
  opportunityScore: number;
  opportunityJustification: string;
  problemScore: number;
  problemJustification: string;
  feasibilityScore: number;
  feasibilityJustification: string;
  whyNowScore: number;
  whyNowJustification: string;
}

// Final validated scores with justifications and metadata
export interface ResearchScores {
  opportunityScore: number;
  problemScore: number;
  feasibilityScore: number;
  whyNowScore: number;
  // Justifications explaining WHY each score was given
  justifications: {
    opportunity: ScoreWithJustification;
    problem: ScoreWithJustification;
    feasibility: ScoreWithJustification;
    whyNow: ScoreWithJustification;
  };
  // Metadata about scoring reliability
  metadata: {
    passCount: number;           // Number of scoring passes run
    maxDeviation: number;        // Largest deviation between passes
    averageConfidence: number;   // 0-100, based on pass consistency
    flagged: boolean;            // True if scores had high variance
    flagReason?: string;         // Explanation if flagged
  };
}

export interface BusinessMetrics {
  revenuePotential: {
    rating: 'high' | 'medium' | 'low';
    estimate: string;
    confidence: number;
  };
  executionDifficulty: {
    rating: 'easy' | 'moderate' | 'hard';
    factors: string[];
    soloFriendly: boolean;
  };
  gtmClarity: {
    rating: 'clear' | 'moderate' | 'unclear';
    channels: string[];
    confidence: number;
  };
  founderFit: {
    percentage: number;
    strengths: string[];
    gaps: string[];
  };
}

// User Story - AI-generated narrative about the problem/solution
export interface UserStory {
  scenario: string;
  protagonist: string;
  problem: string;
  solution: string;
  outcome: string;
}

// Keyword Trends - for the chart display
export interface KeywordTrend {
  keyword: string;
  volume: number;
  growth: number;
  trend: number[];
}

// Value Ladder - offer tiers
export interface OfferTier {
  tier: 'lead_magnet' | 'frontend' | 'core' | 'backend';
  label: string;
  title: string;
  price: string;
  description: string;
}

// Action Prompts - copyable prompts for users
export interface ActionPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
}

// Social Proof - from real web search
export interface SocialProofPost {
  platform: 'reddit' | 'facebook' | 'twitter' | 'hackernews' | 'indiehackers' | 'producthunt' | 'linkedin';
  author: string;
  content: string;
  url: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    upvotes?: number;
  };
  date: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
}

export interface SocialProof {
  posts: SocialProofPost[];
  summary: string;
  painPointsValidated: string[];
  demandSignals: string[];
  sources: string[]; // Real URLs from web search
}

// Deep Research Output - raw research from o3-deep-research
export interface DeepResearchOutput {
  rawReport: string;
  citations: Array<{ title: string; url: string; snippet?: string }>;
  sources: string[];
  searchQueriesUsed: string[];
}

// =============================================================================
// PHASE 1: DEEP RESEARCH (o3-deep-research with web_search)
// =============================================================================

/**
 * Run deep market research using o3-deep-research model with real web search.
 * This replaces the old query generation + synthesis phases with a single
 * comprehensive research call that searches the web for real market data.
 *
 * @param input Research input with idea and interview data
 * @param tier Subscription tier (FREE uses mini model, PRO/ENTERPRISE use full)
 * @returns Deep research output with raw report and citations
 */
export async function runDeepResearch(
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<DeepResearchOutput> {
  const { ideaTitle, ideaDescription, interviewData, interviewMessages, canvasContext } = input;

  console.log('[Deep Research] Starting comprehensive market research...');
  console.log('[Deep Research] Tier:', tier);

  // Select model based on tier (FREE uses cheaper mini model)
  const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
  console.log('[Deep Research] Using model:', model);

  // Build interview context
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  // Get knowledge-based research guidelines
  const researchKnowledge = getResearchKnowledge();

  // System prompt for the research analyst
  const systemPrompt = `${researchKnowledge}

---

You are a senior market research analyst conducting comprehensive research for a business idea validation.
Your task is to research the market opportunity, competitive landscape, customer pain points, and timing factors.

## RESEARCH OBJECTIVES
1. **Market Analysis** - Size the market, identify growth trends, key players, and market dynamics
2. **Competitive Landscape** - Find direct and indirect competitors, analyze their positioning, strengths, weaknesses
3. **Customer Pain Points** - Validate the problems being solved, find evidence of real customer frustration
4. **Why Now** - Identify market triggers, timing factors, and urgency indicators
5. **Proof Signals** - Find demand indicators, validation opportunities, and risk factors

## OUTPUT REQUIREMENTS
Provide a comprehensive research report with:
- Specific data points and statistics with sources
- Named competitors with their positioning and market share estimates
- Real examples of customer pain points from forums, reviews, or articles
- Market timing analysis with supporting evidence
- Actionable insights for a startup entering this market

Be thorough but focus on actionable intelligence. Cite your sources.`;

  // User query with all context
  const canvasSection = canvasContext ? `\n## FOUNDER'S CANVAS (structured research notes)\n${canvasContext}\n` : '';

  const userQuery = `## BUSINESS IDEA
**Title:** ${ideaTitle}
**Description:** ${ideaDescription}
${canvasSection}
## INTERVIEW INSIGHTS
The founder has provided the following information through an AI interview:

${JSON.stringify(interviewData, null, 2)}

## INTERVIEW TRANSCRIPT
${interviewContext}

---

Please conduct comprehensive market research for this business idea. Search for:
1. Market size and growth data for this industry/niche
2. Existing competitors and alternatives (both direct and indirect)
3. Evidence of customer pain points (forum posts, reviews, complaints)
4. Market timing factors (recent changes, emerging trends, regulatory shifts)
5. Validation signals (demand indicators, successful similar products)

Provide specific, actionable insights with citations to help validate this business opportunity.`;

  // Create deep research request
  const researchDomains = [...SEARCH_DOMAINS.market, ...SEARCH_DOMAINS.competitor];

  const startTime = Date.now();

  try {
    const params = createDeepResearchParams({
      model,
      systemPrompt,
      userQuery,
      domains: researchDomains,
      background: true, // Use background mode per best practices
    });

    console.log('[Deep Research] Starting background research request...');
    console.log('[Deep Research] Domains:', researchDomains.length, 'market + competitor domains');

    // Use background mode with polling (recommended for deep research)
    // This avoids long-lived connections that can timeout
    // Note: o3-deep-research can take 30-60+ minutes for comprehensive research
    const result = await withExponentialBackoff(
      () => runDeepResearchWithPolling(params, {
        pollIntervalMs: 15000, // Poll every 15 seconds
        maxWaitMs: 3600000, // 60 minute timeout for single research (o3 can be slow)
        onProgress: (status: ResponseStatus, elapsed: number) => {
          console.log(`[Deep Research] Status: ${status} (${Math.round(elapsed/1000)}s elapsed)`);
        },
        onLog: (msg: string) => console.log(msg),
      }),
      {
        maxAttempts: 3, // Retry the whole background+polling process
        initialDelayMs: 10000,
        maxDelayMs: 120000,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Deep Research] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
        }
      }
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Deep Research] Research complete after ${elapsed}s`);
    console.log('[Deep Research] Report length:', result.content.length, 'chars');
    console.log('[Deep Research] Citations found:', result.citations.length);
    console.log('[Deep Research] Sources:', result.sources.length);

    return {
      rawReport: result.content,
      citations: result.citations,
      sources: result.sources,
      searchQueriesUsed: result.searchQueries || [],
    };
  } catch (error) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[Deep Research] Error after ${elapsed}s:`, error);
    throw error;
  }
}

// =============================================================================
// CHUNKED DEEP RESEARCH (Avoids rate limits by breaking into smaller calls)
// =============================================================================

// Chunk configuration for sequential research
const RESEARCH_CHUNKS = [
  {
    id: 'market',
    name: 'Market Analysis',
    progressStart: 5,
    progressEnd: 10,
    focus: 'Market size, growth rate, trends, dynamics, and industry analysis',
    getDomains: () => [...SEARCH_DOMAINS.market],
  },
  {
    id: 'competitors',
    name: 'Competitor Research',
    progressStart: 10,
    progressEnd: 15,
    focus: 'Direct and indirect competitors, their positioning, strengths, weaknesses, and market share',
    getDomains: () => [...SEARCH_DOMAINS.competitor, ...SEARCH_DOMAINS.startup],
  },
  {
    id: 'painpoints',
    name: 'Customer Pain Points',
    progressStart: 15,
    progressEnd: 20,
    focus: 'Evidence of customer pain points from forums, reviews, social media, and discussions',
    getDomains: () => [...SEARCH_DOMAINS.social],
  },
  {
    id: 'timing',
    name: 'Timing & Validation',
    progressStart: 20,
    progressEnd: 25,
    focus: 'Market timing factors, why now indicators, recent changes, and validation signals',
    getDomains: () => [...SEARCH_DOMAINS.market],
  },
  {
    id: 'marketsizing',
    name: 'Market Sizing (TAM/SAM/SOM)',
    progressStart: 25,
    progressEnd: 30,
    focus: 'TAM (Total Addressable Market), SAM (Serviceable Available Market), SOM (Serviceable Obtainable Market) with specific dollar figures, growth rates (CAGR), industry analyst reports, market research firm data, and comparable company market shares for benchmarking',
    getDomains: () => [...SEARCH_DOMAINS.market, 'statista.com', 'ibisworld.com', 'grandviewresearch.com', 'marketsandmarkets.com', 'fortunebusinessinsights.com', 'mordorintelligence.com', 'precedenceresearch.com'],
  },
] as const;

// Delay between chunks to allow rate limit recovery (2 minutes)
const INTER_CHUNK_DELAY_MS = 120000;

// Type for chunk results stored in database
export interface ChunkedResearchData {
  chunkResults: Record<string, string>;
  citations: Array<{ title: string; url: string; snippet?: string }>;
  sources: string[];
}

// Progress callback type for chunked research (matches IntermediateResearchData)
export type ChunkedProgressCallback = (
  phase: string,
  progress: number,
  intermediateData?: IntermediateResearchData
) => Promise<void>;

/**
 * Run chunked deep research - breaks large research into smaller sequential calls.
 * This avoids the 200k TPM rate limit by making 4 focused calls with delays between them.
 *
 * @param input Research input with idea and interview data
 * @param tier Subscription tier (FREE uses mini model, PRO/ENTERPRISE use full)
 * @param onProgress Progress callback for UI updates and intermediate saves
 * @param existingChunks Previously completed chunks for resume support
 * @returns Deep research output with raw report and citations
 */
export async function runChunkedDeepResearch(
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE',
  onProgress?: ChunkedProgressCallback,
  existingChunks?: ChunkedResearchData
): Promise<DeepResearchOutput> {
  const { ideaTitle, ideaDescription, interviewData, interviewMessages, canvasContext } = input;

  console.log('[Chunked Research] Starting chunked market research...');
  console.log('[Chunked Research] Tier:', tier);
  console.log('[Chunked Research] Chunks:', RESEARCH_CHUNKS.length);

  // Select model based on tier (FREE uses cheaper mini model)
  const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
  console.log('[Chunked Research] Using model:', model);

  // Initialize results from existing data or empty
  const results: Record<string, string> = existingChunks?.chunkResults ? { ...existingChunks.chunkResults } : {};
  const allCitations: Array<{ title: string; url: string; snippet?: string }> = existingChunks?.citations ? [...existingChunks.citations] : [];
  const allSources: string[] = existingChunks?.sources ? [...existingChunks.sources] : [];

  // Check for existing chunks to resume from
  const completedChunks = Object.keys(results);
  if (completedChunks.length > 0) {
    console.log('[Chunked Research] RESUME MODE - Found', completedChunks.length, 'completed chunks:', completedChunks.join(', '));
  }

  // Build interview context once (shared across chunks)
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  // Fire off query expansion concurrently — don't block the first research chunk.
  // The expansion result will enrich chunks 2+ while chunk 1 starts immediately.
  const keyPhrases = extractKeyPhrases(ideaTitle, ideaDescription);
  let expansionContext = '';
  const expansionPromise = expandQueries(keyPhrases, [], {
    maxTemplateQueries: 20,
    maxSerpApiQueries: 8,
    serpApiEnabled: true,
  }).then((expansion) => {
    if (expansion.totalUnique > 0) {
      const expandedStrings = getExpandedQueryStrings(expansion);
      expansionContext = formatQueriesForPrompt(expandedStrings, 'ADDITIONAL SEARCH ANGLES');
      console.log(`[Chunked Research] Query expansion: ${expansion.totalUnique} queries (${expansion.templateCount} template, ${expansion.serpApiCount} SerpAPI) in ${expansion.elapsedMs}ms`);
    }
  }).catch((err) => {
    console.warn('[Chunked Research] Query expansion failed (non-fatal):', err instanceof Error ? err.message : err);
  });

  // Process each chunk sequentially
  for (let i = 0; i < RESEARCH_CHUNKS.length; i++) {
    const chunk = RESEARCH_CHUNKS[i];

    // Skip if chunk already completed (resume support)
    if (results[chunk.id]) {
      console.log(`[Chunked Research] Skipping ${chunk.name} (already completed)`);
      await onProgress?.('DEEP_RESEARCH', chunk.progressEnd);
      continue;
    }

    // Wait for expansion before chunk 2+ (chunk 1 proceeds without it)
    if (i === 1) {
      await expansionPromise;
    }

    console.log(`[Chunked Research] === Starting: ${chunk.name} ===`);
    await onProgress?.('DEEP_RESEARCH', chunk.progressStart);

    // Run focused research for this chunk
    const startTime = Date.now();
    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Chunked Research] [${chunk.name}] Still researching... (${elapsed}s elapsed)`);
    }, 15000);

    try {
      const chunkResult = await runSingleResearchChunk(
        ideaTitle,
        ideaDescription,
        interviewData,
        interviewContext,
        chunk,
        model,
        expansionContext,
        canvasContext
      );

      clearInterval(heartbeat);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Chunked Research] [${chunk.name}] Complete after ${elapsed}s - ${chunkResult.content.length} chars`);

      // Accumulate results
      results[chunk.id] = chunkResult.content;
      allCitations.push(...chunkResult.citations);
      allSources.push(...chunkResult.sources);

      // Save intermediate progress for resume (passes combined results so far)
      // Format as IntermediateResearchData with deepResearch field
      await onProgress?.('DEEP_RESEARCH', chunk.progressEnd, {
        deepResearch: {
          rawReport: combineChunkResults(results),
          citations: allCitations,
          sources: [...new Set(allSources)],
          searchQueriesUsed: [],
        },
      });

      // Delay before next chunk (skip after last chunk)
      if (i < RESEARCH_CHUNKS.length - 1) {
        console.log(`[Chunked Research] Waiting ${INTER_CHUNK_DELAY_MS / 1000}s before next chunk (rate limit recovery)...`);
        await sleep(INTER_CHUNK_DELAY_MS);
      }
    } catch (error) {
      clearInterval(heartbeat);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.error(`[Chunked Research] [${chunk.name}] Error after ${elapsed}s:`, error);
      throw error;
    }
  }

  console.log('[Chunked Research] === All chunks complete ===');
  console.log('[Chunked Research] Total citations:', allCitations.length);
  console.log('[Chunked Research] Unique sources:', [...new Set(allSources)].length);

  return {
    rawReport: combineChunkResults(results),
    citations: allCitations,
    sources: [...new Set(allSources)],
    searchQueriesUsed: [],
  };
}

/**
 * Run a single focused research chunk
 */
async function runSingleResearchChunk(
  ideaTitle: string,
  ideaDescription: string,
  interviewData: Partial<InterviewDataPoints> | null,
  interviewContext: string,
  chunk: typeof RESEARCH_CHUNKS[number],
  model: string,
  expansionContext: string = '',
  canvasContext?: string
): Promise<DeepResearchResult> {
  const systemPrompt = `You are a market research analyst conducting focused research.

## YOUR SPECIFIC TASK
Research ONLY: ${chunk.focus}

## GUIDELINES
- Be thorough but focused on this specific research area
- Cite your sources with URLs
- Provide specific data points, statistics, and named examples
- Keep your response focused and under 2000 words
- Do not cover other research areas - stay focused on your assigned task`;

  const canvasSection = canvasContext ? `\n## FOUNDER'S CANVAS\n${canvasContext}\n` : '';

  const userQuery = `## BUSINESS IDEA
**Title:** ${ideaTitle}
**Description:** ${ideaDescription}
${canvasSection}
## FOUNDER CONTEXT
${interviewData ? JSON.stringify(interviewData, null, 2) : 'No additional context provided.'}

## INTERVIEW CONTEXT
${interviewContext || 'No interview transcript available.'}

---

## RESEARCH FOCUS: ${chunk.name.toUpperCase()}
${chunk.focus}

Provide specific, actionable insights with citations. Focus only on this research area.
${expansionContext}`;

  const params = createDeepResearchParams({
    model,
    systemPrompt,
    userQuery,
    domains: chunk.getDomains(),
    background: true, // Use background mode per best practices
    reasoningSummary: 'auto',
  });

  console.log(`[Chunked Research] [${chunk.name}] Starting background request with ${chunk.getDomains().length} domains...`);

  // Use background mode with polling for chunked research
  // Note: o3-deep-research can take 30-60+ minutes even for focused chunks
  const result = await withExponentialBackoff(
    () => runDeepResearchWithPolling(params, {
      pollIntervalMs: 15000, // Poll every 15 seconds
      maxWaitMs: 3600000, // 60 minute timeout per chunk (o3 can be slow)
      onProgress: (status: ResponseStatus, elapsed: number) => {
        console.log(`[Chunked Research] [${chunk.name}] Status: ${status} (${Math.round(elapsed/1000)}s elapsed)`);
      },
      onLog: (msg: string) => console.log(msg.replace('[', `[Chunked Research] [${chunk.name}] [`)),
    }),
    {
      maxAttempts: 3,
      initialDelayMs: 5000,
      maxDelayMs: 120000,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Chunked Research] [${chunk.name}] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );
  return result;
}

/**
 * Combine chunk results into a single formatted report
 */
function combineChunkResults(results: Record<string, string>): string {
  const sections: string[] = [];

  if (results.market) {
    sections.push(`## Market Analysis\n\n${results.market}`);
  }
  if (results.competitors) {
    sections.push(`## Competitor Analysis\n\n${results.competitors}`);
  }
  if (results.painpoints) {
    sections.push(`## Customer Pain Points\n\n${results.painpoints}`);
  }
  if (results.timing) {
    sections.push(`## Timing & Validation\n\n${results.timing}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Sleep helper for delays between chunks
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// RESPONSE PARSING UTILITIES
// =============================================================================

/**
 * Unified response content extractor for OpenAI Responses API.
 * Handles both standard Responses API format (output_text) and
 * deep research format (output[] array with message objects).
 *
 * @param response - The raw API response object
 * @returns The extracted text content, or null if not found
 */
export function extractResponseContent(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    console.warn('[extractResponseContent] Response is null or not an object');
    return null;
  }

  const resp = response as Record<string, unknown>;

  // Try output_text first (standard Responses API format)
  if (resp.output_text && typeof resp.output_text === 'string') {
    return resp.output_text;
  }

  // Try output array (deep research / background mode format)
  if (Array.isArray(resp.output)) {
    const textParts: string[] = [];

    for (const item of resp.output) {
      if (!item || typeof item !== 'object') continue;
      const outputItem = item as Record<string, unknown>;

      // Handle type: 'message' with content array
      if (outputItem.type === 'message' && Array.isArray(outputItem.content)) {
        for (const contentItem of outputItem.content) {
          if (contentItem && typeof contentItem === 'object') {
            const ci = contentItem as Record<string, unknown>;
            // Handle type: 'output_text' content items
            if (ci.type === 'output_text' && typeof ci.text === 'string') {
              textParts.push(ci.text);
            }
            // Handle plain text content items (no type field, just text)
            else if (ci.text && typeof ci.text === 'string') {
              textParts.push(ci.text);
            }
          }
        }
      }

      // Handle direct text field on output items
      if (outputItem.text && typeof outputItem.text === 'string') {
        textParts.push(outputItem.text);
      }
    }

    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  // Try choices array (legacy Chat Completions format, just in case)
  if (Array.isArray(resp.choices) && resp.choices.length > 0) {
    const choice = resp.choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown> | undefined;
    if (message?.content && typeof message.content === 'string') {
      return message.content;
    }
  }

  // Log the response structure for debugging if nothing matched
  console.error('[extractResponseContent] Failed to extract content. Response structure:');
  console.error('  Keys:', Object.keys(resp));
  console.error('  status:', resp.status);
  console.error('  Has output_text:', !!resp.output_text);
  console.error('  Has output array:', Array.isArray(resp.output));
  if (Array.isArray(resp.output)) {
    console.error('  Output array length:', resp.output.length);
    console.error('  Output item types:', resp.output.map((item: unknown) =>
      item && typeof item === 'object' ? (item as Record<string, unknown>).type : typeof item
    ));
  }

  return null;
}

// =============================================================================
// RESILIENT RESPONSE PARSING (for handling status: incomplete)
// =============================================================================

/**
 * Token usage structure from OpenAI API
 */
interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/**
 * Parsed response payload with all relevant metadata
 */
interface ParsedResponsePayload {
  rawText: string | null;
  status: string;
  usage: TokenUsage | null;
  incompleteDetails: unknown | null;
  responseId: string | null;
}

/**
 * Resilient response parser that extracts text from all possible locations
 * in a Responses API payload. Handles incomplete responses gracefully.
 *
 * Traverses:
 * 1. output_text (standard Responses API)
 * 2. output[] array with message/text items (deep research/background mode)
 * 3. choices[] array (legacy Chat Completions fallback)
 *
 * @param response - Raw API response
 * @returns Parsed payload with rawText, status, usage, and incompleteDetails
 */
function parseResponsesAPIPayload(response: unknown): ParsedResponsePayload {
  if (!response || typeof response !== 'object') {
    return { rawText: null, status: 'invalid', usage: null, incompleteDetails: null, responseId: null };
  }

  const resp = response as Record<string, unknown>;
  const status = typeof resp.status === 'string' ? resp.status : 'unknown';
  const usage = resp.usage as TokenUsage | null;
  const incompleteDetails = resp.incomplete_details ?? null;
  const responseId = typeof resp.id === 'string' ? resp.id : null;

  // Collect all text from possible locations
  const textParts: string[] = [];

  // 1. Try output_text (standard Responses API format)
  if (resp.output_text && typeof resp.output_text === 'string') {
    textParts.push(resp.output_text);
  }

  // 2. Try output array (iterate ALL items for resilience)
  if (Array.isArray(resp.output)) {
    for (const item of resp.output) {
      if (!item || typeof item !== 'object') continue;
      const outputItem = item as Record<string, unknown>;

      // Message-type items with content array
      if (outputItem.type === 'message' && Array.isArray(outputItem.content)) {
        for (const contentItem of outputItem.content) {
          if (contentItem && typeof contentItem === 'object') {
            const ci = contentItem as Record<string, unknown>;
            if (ci.text && typeof ci.text === 'string') {
              textParts.push(ci.text);
            }
          }
        }
      }

      // Direct text field on output items
      if (outputItem.text && typeof outputItem.text === 'string') {
        textParts.push(outputItem.text);
      }
    }
  }

  // 3. Fallback: choices array (legacy Chat Completions format)
  if (textParts.length === 0 && Array.isArray(resp.choices)) {
    for (const choice of resp.choices) {
      const c = choice as Record<string, unknown>;
      const message = c.message as Record<string, unknown> | undefined;
      if (message?.content && typeof message.content === 'string') {
        textParts.push(message.content);
      }
    }
  }

  const rawText = textParts.length > 0 ? textParts.join('\n') : null;
  return { rawText, status, usage, incompleteDetails, responseId };
}

/**
 * Attempt to isolate JSON from text that may have preamble/postamble.
 * Uses bracket-balanced parsing to find the first complete JSON object.
 *
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - Preamble text before JSON
 * - Trailing text after JSON (e.g., model explanations)
 * - Properly ignores braces inside string values
 *
 * @param text - Raw text that may contain JSON
 * @returns Isolated JSON string or null if no valid JSON object found
 */
export function isolateJson(text: string): string | null {
  // Strip common markdown wrappers first
  let cleaned = text.trim();

  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Find first opening brace
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return null;

  // Use bracket counting to find matching closing brace
  // This correctly handles nested objects and braces inside strings
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = firstBrace; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) {
        // Found the matching closing brace for the first JSON object
        return cleaned.slice(firstBrace, i + 1);
      }
    }
  }

  // No complete JSON object found (unclosed braces)
  // Fall back to old behavior for partial recovery
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    console.warn('[isolateJson] Bracket matching failed, falling back to lastIndexOf');
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

/**
 * Result type for safe JSON parsing
 */
export type SafeJsonResult<T> =
  | { ok: true; data: T; isolated: boolean }
  | { ok: false; reason: string };

/**
 * Safe JSON parse with isolation fallback.
 * First attempts direct parse, then tries JSON isolation if that fails.
 *
 * @param text - Text to parse as JSON
 * @returns Parsed object or error reason
 */
export function safeJsonParse<T>(text: string): SafeJsonResult<T> {
  // First try direct parse
  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data, isolated: false };
  } catch (directError) {
    // Try JSON isolation
    const isolated = isolateJson(text);
    if (isolated) {
      try {
        const data = JSON.parse(isolated) as T;
        console.log('[safeJsonParse] Successfully parsed after JSON isolation');
        return { ok: true, data, isolated: true };
      } catch (isolatedError) {
        return { ok: false, reason: `JSON parse failed after isolation: ${isolatedError instanceof Error ? isolatedError.message : isolatedError}` };
      }
    }
    return { ok: false, reason: `JSON parse failed: ${directError instanceof Error ? directError.message : directError}` };
  }
}

/**
 * Validates that JSON content appears complete (not truncated).
 * Checks that the content ends with a closing brace or bracket.
 * Throws ResponseParseError if truncation is detected.
 */
export function validateJsonCompleteness(content: string, context: string): void {
  const trimmed = content.trim();
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    const lastChars = trimmed.slice(-100);
    console.error(`[${context}] JSON appears truncated. Last 100 chars: ${lastChars}`);
    throw new ResponseParseError(
      `JSON appears truncated in ${context} (ends with: "${trimmed.slice(-50)}")`,
      { truncated: true, lastChars, contentLength: content.length }
    );
  }
}

/**
 * Get response status for logging and error handling.
 */
function getResponseStatus(response: unknown): string {
  if (!response || typeof response !== 'object') {
    return 'unknown';
  }
  const resp = response as Record<string, unknown>;
  return typeof resp.status === 'string' ? resp.status : 'unknown';
}

/**
 * Custom error class for response parsing failures.
 * Includes the raw response for debugging.
 */
export class ResponseParseError extends Error {
  public readonly rawResponse: string;
  public readonly responseStatus: string;

  constructor(message: string, response: unknown) {
    super(message);
    this.name = 'ResponseParseError';
    this.responseStatus = getResponseStatus(response);
    this.rawResponse = JSON.stringify(response, null, 2).substring(0, 3000);
  }
}

// =============================================================================
// DISCRIMINATED ERROR TYPES
// =============================================================================

/**
 * Research error types for discriminated handling
 */
export type ResearchErrorType =
  | 'timeout'
  | 'rate_limit'
  | 'transient'
  | 'api_error'
  | 'parse_error'
  | 'sla_exceeded'
  | 'unknown';

/**
 * Base interface for all research errors
 */
export interface ResearchErrorInfo {
  type: ResearchErrorType;
  message: string;
  phase: string;
  elapsed: number;
  retryable: boolean;
}

/**
 * Timeout error - operation took too long
 */
export interface TimeoutError extends ResearchErrorInfo {
  type: 'timeout';
  timeoutMs: number;
}

/**
 * Rate limit error - hit API rate limits
 */
export interface RateLimitError extends ResearchErrorInfo {
  type: 'rate_limit';
  retryAfterMs: number;
}

/**
 * Transient error - temporary failure (5XX, network issues)
 */
export interface TransientError extends ResearchErrorInfo {
  type: 'transient';
  statusCode: number;
  attempt: number;
  maxAttempts: number;
}

/**
 * API error - explicit error from OpenAI API
 */
export interface ApiError extends ResearchErrorInfo {
  type: 'api_error';
  apiErrorCode?: string;
  apiErrorMessage?: string;
}

/**
 * Parse error - failed to parse response content
 */
export interface ParseError extends ResearchErrorInfo {
  type: 'parse_error';
  rawResponse: string;
}

/**
 * SLA exceeded error - phase or total SLA timeout
 */
export interface SlaExceededError extends ResearchErrorInfo {
  type: 'sla_exceeded';
  slaMs: number;
  actualMs: number;
}

/**
 * Union type of all specific error types
 */
export type ResearchError =
  | TimeoutError
  | RateLimitError
  | TransientError
  | ApiError
  | ParseError
  | SlaExceededError
  | (ResearchErrorInfo & { type: 'unknown' });

/**
 * Classify an error into a discriminated error type.
 *
 * @param error - The raw error to classify
 * @param phase - Current research phase
 * @param elapsed - Time elapsed in milliseconds
 * @returns Classified error info
 */
export function classifyResearchError(
  error: unknown,
  phase: string,
  elapsed: number
): ResearchError {
  const baseInfo = {
    phase,
    elapsed,
    message: error instanceof Error ? error.message : String(error),
  };

  // Check for timeout errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('timeout') || msg.includes('timed out')) {
      return {
        ...baseInfo,
        type: 'timeout',
        timeoutMs: elapsed,
        retryable: true,
      };
    }

    if (msg.includes('polling timeout')) {
      return {
        ...baseInfo,
        type: 'sla_exceeded',
        slaMs: elapsed,
        actualMs: elapsed,
        retryable: true,
      };
    }

    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      // Try to extract retry-after
      const match = msg.match(/(\d+)\s*(seconds?|ms)/i);
      const retryAfterMs = match
        ? parseInt(match[1]) * (match[2].toLowerCase().startsWith('s') ? 1000 : 1)
        : 60000;

      return {
        ...baseInfo,
        type: 'rate_limit',
        retryAfterMs,
        retryable: true,
      };
    }
  }

  // Check for OpenAI API errors with status codes
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const status = (err.status || err.statusCode) as number | undefined;

    if (status) {
      // Rate limit (429)
      if (status === 429) {
        const retryAfter = err.headers
          ? ((err.headers as Record<string, unknown>)['retry-after'] as string)
          : null;

        return {
          ...baseInfo,
          type: 'rate_limit',
          retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : 60000,
          retryable: true,
        };
      }

      // Transient errors (5XX)
      if (status >= 500 && status < 600) {
        return {
          ...baseInfo,
          type: 'transient',
          statusCode: status,
          attempt: 1,
          maxAttempts: 3,
          retryable: true,
        };
      }

      // Client errors (4XX except 429)
      if (status >= 400 && status < 500) {
        return {
          ...baseInfo,
          type: 'api_error',
          apiErrorCode: err.code as string | undefined,
          apiErrorMessage: err.message as string | undefined,
          retryable: false,
        };
      }
    }

    // Check for error field in response
    if (err.error && typeof err.error === 'object') {
      const apiErr = err.error as Record<string, unknown>;
      return {
        ...baseInfo,
        type: 'api_error',
        apiErrorCode: apiErr.code as string | undefined,
        apiErrorMessage: apiErr.message as string | undefined,
        retryable: false,
      };
    }
  }

  // Check for parse errors
  if (error instanceof ResponseParseError) {
    return {
      ...baseInfo,
      type: 'parse_error',
      rawResponse: error.rawResponse,
      retryable: false,
    };
  }

  // Unknown error
  return {
    ...baseInfo,
    type: 'unknown',
    retryable: false,
  };
}

/**
 * Log a classified research error with appropriate severity
 */
export function logResearchError(error: ResearchError): void {
  const prefix = `[Research Error] [${error.phase}]`;

  switch (error.type) {
    case 'timeout':
      console.error(`${prefix} Timeout after ${Math.round(error.elapsed/1000)}s (limit: ${Math.round(error.timeoutMs/1000)}s)`);
      break;
    case 'rate_limit':
      console.warn(`${prefix} Rate limited. Retry after ${Math.round(error.retryAfterMs/1000)}s`);
      break;
    case 'transient':
      console.warn(`${prefix} Transient error (${error.statusCode}). Attempt ${error.attempt}/${error.maxAttempts}`);
      break;
    case 'api_error':
      console.error(`${prefix} API error: ${error.apiErrorMessage || error.message}`);
      break;
    case 'parse_error':
      console.error(`${prefix} Parse error: ${error.message}`);
      console.debug(`${prefix} Raw response: ${error.rawResponse.substring(0, 500)}...`);
      break;
    case 'sla_exceeded':
      console.error(`${prefix} SLA exceeded: ${Math.round(error.actualMs/1000)}s > ${Math.round(error.slaMs/1000)}s`);
      break;
    default:
      console.error(`${prefix} Unknown error: ${error.message}`);
  }
}

// =============================================================================
// SLA MANAGEMENT
// =============================================================================

/**
 * Research phase names
 */
export type ResearchPhase =
  | 'DEEP_RESEARCH'
  | 'SOCIAL_RESEARCH'
  | 'SYNTHESIS'
  | 'REPORT_GENERATION';

/**
 * SLA configuration for each phase
 */
export interface SlaConfig {
  deepResearch: number;
  socialResearch: number;
  synthesis: number;
  reportGeneration: number;
  total: number;
}

/**
 * Get SLA configuration from config service or defaults
 */
export function getSlaConfig(): SlaConfig {
  if (configService.isInitialized()) {
    return {
      deepResearch: configService.getNumber('research.sla.deepResearch', 1800000),
      socialResearch: configService.getNumber('research.sla.socialResearch', 900000),
      synthesis: configService.getNumber('research.sla.synthesis', 300000),
      reportGeneration: configService.getNumber('research.sla.reportGeneration', 300000),
      total: configService.getNumber('research.sla.total', 2700000),
    };
  }

  // Default SLAs per best practices (45 minutes total)
  return {
    deepResearch: 1800000,    // 30 minutes
    socialResearch: 900000,   // 15 minutes
    synthesis: 300000,        // 5 minutes
    reportGeneration: 300000, // 5 minutes
    total: 2700000,           // 45 minutes total
  };
}

/**
 * Get SLA for a specific phase
 */
export function getPhaseSla(phase: ResearchPhase): number {
  const config = getSlaConfig();
  switch (phase) {
    case 'DEEP_RESEARCH':
      return config.deepResearch;
    case 'SOCIAL_RESEARCH':
      return config.socialResearch;
    case 'SYNTHESIS':
      return config.synthesis;
    case 'REPORT_GENERATION':
      return config.reportGeneration;
    default:
      return config.total;
  }
}

/**
 * SLA tracker for monitoring phase and total execution times
 */
export class SlaTracker {
  private readonly startTime: number;
  private readonly slaConfig: SlaConfig;
  private readonly phaseStartTimes: Map<ResearchPhase, number> = new Map();
  private currentPhase: ResearchPhase | null = null;

  constructor() {
    this.startTime = Date.now();
    this.slaConfig = getSlaConfig();
  }

  /**
   * Start tracking a new phase
   */
  startPhase(phase: ResearchPhase): void {
    this.currentPhase = phase;
    this.phaseStartTimes.set(phase, Date.now());
    console.log(`[SLA] Starting phase: ${phase} (limit: ${Math.round(this.slaConfig[this.getConfigKey(phase)]/60000)} min)`);
  }

  /**
   * Check if current phase is within SLA
   */
  checkPhaseSla(): { ok: boolean; elapsed: number; limit: number; remaining: number } {
    if (!this.currentPhase) {
      return { ok: true, elapsed: 0, limit: 0, remaining: 0 };
    }

    const phaseStart = this.phaseStartTimes.get(this.currentPhase) || this.startTime;
    const elapsed = Date.now() - phaseStart;
    const limit = this.slaConfig[this.getConfigKey(this.currentPhase)];
    const remaining = Math.max(0, limit - elapsed);

    return {
      ok: elapsed <= limit,
      elapsed,
      limit,
      remaining,
    };
  }

  /**
   * Check if total execution is within SLA
   */
  checkTotalSla(): { ok: boolean; elapsed: number; limit: number; remaining: number } {
    const elapsed = Date.now() - this.startTime;
    const limit = this.slaConfig.total;
    const remaining = Math.max(0, limit - elapsed);

    return {
      ok: elapsed <= limit,
      elapsed,
      limit,
      remaining,
    };
  }

  /**
   * Get total elapsed time
   */
  getTotalElapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get phase elapsed time
   */
  getPhaseElapsed(phase?: ResearchPhase): number {
    const p = phase || this.currentPhase;
    if (!p) return 0;

    const start = this.phaseStartTimes.get(p);
    return start ? Date.now() - start : 0;
  }

  /**
   * End current phase and log timing
   */
  endPhase(): void {
    if (!this.currentPhase) return;

    const elapsed = this.getPhaseElapsed();
    const limit = this.slaConfig[this.getConfigKey(this.currentPhase)];
    const status = elapsed <= limit ? 'OK' : 'EXCEEDED';

    console.log(`[SLA] Completed phase: ${this.currentPhase} in ${Math.round(elapsed/1000)}s (limit: ${Math.round(limit/1000)}s) [${status}]`);
    this.currentPhase = null;
  }

  /**
   * Throw an error if SLA is exceeded
   */
  assertPhaseSla(): void {
    const check = this.checkPhaseSla();
    if (!check.ok && this.currentPhase) {
      throw new Error(
        `Phase SLA exceeded: ${this.currentPhase} took ${Math.round(check.elapsed/1000)}s (limit: ${Math.round(check.limit/1000)}s)`
      );
    }
  }

  /**
   * Throw an error if total SLA is exceeded
   */
  assertTotalSla(): void {
    const check = this.checkTotalSla();
    if (!check.ok) {
      throw new Error(
        `Total SLA exceeded: Pipeline took ${Math.round(check.elapsed/1000)}s (limit: ${Math.round(check.limit/1000)}s)`
      );
    }
  }

  /**
   * Get config key for phase
   */
  private getConfigKey(phase: ResearchPhase): keyof Omit<SlaConfig, 'total'> {
    switch (phase) {
      case 'DEEP_RESEARCH':
        return 'deepResearch';
      case 'SOCIAL_RESEARCH':
        return 'socialResearch';
      case 'SYNTHESIS':
        return 'synthesis';
      case 'REPORT_GENERATION':
        return 'reportGeneration';
    }
  }
}

// =============================================================================
// PHASE 2: STRUCTURE EXTRACTION (GPT-5.2 post-processing)
// =============================================================================

/**
 * Extract structured insights from deep research report.
 * Uses GPT-5.2 to parse the raw research into SynthesizedInsights format.
 */
/**
 * Extract structured insights from deep research report.
 * Uses AIProvider.extract() with Claude Sonnet for structured extraction.
 */
export async function extractInsights(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SynthesizedInsights> {
  console.log('[Extract Insights] Parsing deep research into structured format...');

  const prompt = `You are extracting structured data from a comprehensive market research report.

## ORIGINAL BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## DEEP RESEARCH REPORT
${deepResearch.rawReport}

## SOURCES CITED
${deepResearch.citations.map((c, i) => `[${i + 1}] ${c.title}: ${c.url}`).join('\n')}

---

Extract the key insights and return structured JSON matching the schema exactly. Use ONLY information from the research report. Be specific and cite findings where relevant.`;

  const extractionProvider = getExtractionProvider(tier);
  console.log('[Extract Insights] Using provider:', extractionProvider.name);
  console.log('[Extract Insights] Prompt length:', prompt.length, 'chars');

  const { InsightsSchema } = await import('./research-schemas');

  const insights = await extractionProvider.extract(prompt, InsightsSchema, {
    maxTokens: 25000,
    temperature: 1.0,
  });

  console.log('[Extract Insights] Successfully extracted insights');
  return insights;
}

/**
 * Calculate research scores from deep research report.
 * Uses multi-pass validation for reliability.
 */
export async function extractScores(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<ResearchScores> {
  const { scoringCriteria } = KNOWLEDGE.research;
  const PASS_COUNT = 3;
  const DEVIATION_THRESHOLD = 15;

  // Defensive check for malformed deep research data
  if (!deepResearch?.rawReport) {
    console.error('[Extract Scores] Missing rawReport in deepResearch');
    throw new Error('Failed to extract scores: missing research data (rawReport is empty)');
  }

  console.log(`[Extract Scores] Running ${PASS_COUNT} scoring passes...`);
  console.log('[Extract Scores] Research report length:', deepResearch.rawReport.length);

  // Pre-compute snippet to avoid repeated substring calls
  const researchSnippet = deepResearch.rawReport.substring(0, 4000);

  const extractionProvider = getExtractionProvider(tier);
  const { ScoresPassSchema } = await import('./research-schemas');

  console.log('[Extract Scores] Using provider:', extractionProvider.name);

  // Run scoring pass
  const runPass = async (passNumber: number): Promise<RawScorePass> => {
    const prompt = `You are scoring a business idea based on deep market research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## RESEARCH FINDINGS
${researchSnippet}... [truncated for scoring]

## STRUCTURED INSIGHTS
${JSON.stringify(insights, null, 2)}

## SCORING CRITERIA

**Opportunity Score (0-100):**
${Object.entries(scoringCriteria.opportunityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Problem Score (0-100):**
${Object.entries(scoringCriteria.problemScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Feasibility Score (0-100):**
${Object.entries(scoringCriteria.feasibilityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Why Now Score (0-100):**
${Object.entries(scoringCriteria.whyNowScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

IMPORTANT: Provide justification for each score explaining:
1. What evidence supports this score
2. What factors pulled the score up or down
3. What uncertainties exist

This is pass ${passNumber} - evaluate independently based on the research data.`;

    const scorePass = await extractionProvider.extract(prompt, ScoresPassSchema, {
      maxTokens: 8000,
      temperature: 1.0,
    });

    return scorePass;
  };

  // Run passes in parallel
  const passes = await Promise.all(
    Array.from({ length: PASS_COUNT }, (_, i) => runPass(i + 1))
  );

  // Calculate averages and deviations (reusing existing logic)
  const opportunityScores = passes.map(p => clampScore(p.opportunityScore));
  const problemScores = passes.map(p => clampScore(p.problemScore));
  const feasibilityScores = passes.map(p => clampScore(p.feasibilityScore));
  const whyNowScores = passes.map(p => clampScore(p.whyNowScore));

  const avgOpportunity = Math.round(opportunityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgProblem = Math.round(problemScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgFeasibility = Math.round(feasibilityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgWhyNow = Math.round(whyNowScores.reduce((a, b) => a + b, 0) / PASS_COUNT);

  const deviations = [
    Math.max(...opportunityScores) - Math.min(...opportunityScores),
    Math.max(...problemScores) - Math.min(...problemScores),
    Math.max(...feasibilityScores) - Math.min(...feasibilityScores),
    Math.max(...whyNowScores) - Math.min(...whyNowScores),
  ];
  const maxDeviation = Math.max(...deviations);

  const avgStdDev = (
    standardDeviation(opportunityScores) +
    standardDeviation(problemScores) +
    standardDeviation(feasibilityScores) +
    standardDeviation(whyNowScores)
  ) / 4;

  const averageConfidence = Math.round(Math.max(50, 100 - avgStdDev * 2.5));

  const getConfidenceLevel = (scores: number[]): 'high' | 'medium' | 'low' => {
    const dev = Math.max(...scores) - Math.min(...scores);
    if (dev <= 5) return 'high';
    if (dev <= 12) return 'medium';
    return 'low';
  };

  const flagged = maxDeviation > DEVIATION_THRESHOLD;
  const flagReason = flagged
    ? `Scores varied by up to ${maxDeviation} points between passes.`
    : undefined;

  const findBestJustification = (
    scores: number[],
    avg: number,
    getJustification: (p: RawScorePass) => string
  ): string => {
    let minDiff = Infinity;
    let bestIdx = 0;
    scores.forEach((score, idx) => {
      const diff = Math.abs(score - avg);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    return getJustification(passes[bestIdx]);
  };

  console.log(`[Extract Scores] Final: O=${avgOpportunity}, P=${avgProblem}, F=${avgFeasibility}, W=${avgWhyNow}`);

  return {
    opportunityScore: avgOpportunity,
    problemScore: avgProblem,
    feasibilityScore: avgFeasibility,
    whyNowScore: avgWhyNow,
    justifications: {
      opportunity: {
        score: avgOpportunity,
        justification: findBestJustification(opportunityScores, avgOpportunity, p => p.opportunityJustification),
        confidence: getConfidenceLevel(opportunityScores),
      },
      problem: {
        score: avgProblem,
        justification: findBestJustification(problemScores, avgProblem, p => p.problemJustification),
        confidence: getConfidenceLevel(problemScores),
      },
      feasibility: {
        score: avgFeasibility,
        justification: findBestJustification(feasibilityScores, avgFeasibility, p => p.feasibilityJustification),
        confidence: getConfidenceLevel(feasibilityScores),
      },
      whyNow: {
        score: avgWhyNow,
        justification: findBestJustification(whyNowScores, avgWhyNow, p => p.whyNowJustification),
        confidence: getConfidenceLevel(whyNowScores),
      },
    },
    metadata: {
      passCount: PASS_COUNT,
      maxDeviation,
      averageConfidence,
      flagged,
      flagReason,
    },
  };
}

/**
 * Extract business metrics from deep research report.
 * Uses AIProvider.extract() with Claude Sonnet for structured extraction.
 */
export async function extractBusinessMetrics(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<BusinessMetrics> {
  console.log('[Extract Metrics] Calculating business metrics from research...');

  // Defensive check for malformed deep research data
  if (!deepResearch?.rawReport) {
    console.error('[Extract Metrics] Missing rawReport in deepResearch');
    throw new Error('Failed to extract business metrics: missing research data (rawReport is empty)');
  }

  const researchSnippet = deepResearch.rawReport.substring(0, 3000);
  console.log('[Extract Metrics] Research snippet length:', researchSnippet.length);

  const prompt = `You are evaluating business viability metrics based on deep market research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## RESEARCH FINDINGS
${researchSnippet}...

## RESEARCH SCORES
${JSON.stringify(scores, null, 2)}

## MARKET INSIGHTS
${JSON.stringify(insights.marketAnalysis, null, 2)}

Evaluate business metrics and return JSON matching the schema exactly. Base estimates on actual market data from research.`;

  const extractionProvider = getExtractionProvider(tier);
  console.log('[Extract Metrics] Using provider:', extractionProvider.name);

  const { BusinessMetricsSchema } = await import('./research-schemas');

  const metrics = await extractionProvider.extract(prompt, BusinessMetricsSchema, {
    maxTokens: 8000,
    temperature: 1.0,
  });

  console.log('[Extract Metrics] Successfully calculated metrics');
  return metrics;
}

// =============================================================================
// MARKET SIZING EXTRACTION (with retry handling for status: incomplete)
// =============================================================================

// Token limit constants for market sizing
const MARKET_SIZING_BASE_TOKENS = 12000;  // Base: 12k (up from 8k)
const MARKET_SIZING_MAX_TOKENS = 25000;   // Maximum: 25k cap

// Reasoning effort downgrade map for retries
const REASONING_DOWNGRADE: Record<ReasoningEffort, ReasoningEffort> = {
  'xhigh': 'high',
  'high': 'medium',
  'medium': 'medium',
  'low': 'low',
  'none': 'none',
};

/**
 * Calculate adaptive max_output_tokens based on input size and reasoning effort.
 * Larger inputs and higher reasoning need more output headroom.
 */
function calculateAdaptiveTokenLimit(
  inputLength: number,
  reasoning: ReasoningEffort
): number {
  // Estimate input tokens (rough: 4 chars per token)
  const estimatedInputTokens = Math.ceil(inputLength / 4);

  // Base: 12000 tokens
  let limit = MARKET_SIZING_BASE_TOKENS;

  // If input is large, bump up
  if (estimatedInputTokens > 2500) {
    limit = 16000;
  }

  // If using xhigh reasoning, need even more headroom
  if (reasoning === 'xhigh') {
    limit = Math.max(limit, 18000);
  }

  return Math.min(limit, MARKET_SIZING_MAX_TOKENS);
}

/**
 * Validates MarketSizingData structure and values.
 * Returns array of validation errors (empty if valid).
 *
 * Checks:
 * - Required top-level keys exist
 * - tam/sam/som have required fields with correct types
 * - Confidence values are valid enums
 * - Values are in millions USD (warns if too large)
 * - Arrays are non-empty
 */
function validateMarketSizingData(data: unknown): string[] {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return ['Data is not an object'];
  }

  const d = data as Record<string, unknown>;

  // Required top-level keys
  const requiredKeys = ['tam', 'sam', 'som', 'segments', 'assumptions', 'sources', 'methodology'];
  for (const key of requiredKeys) {
    if (!(key in d)) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  // Validate tam/sam/som structure
  for (const marketKey of ['tam', 'sam', 'som'] as const) {
    const metric = d[marketKey] as Record<string, unknown> | undefined;
    if (metric) {
      if (typeof metric.value !== 'number') {
        errors.push(`${marketKey}.value must be a number`);
      } else if (metric.value > 1000000) {
        // Value should be in millions; >1M millions = trillions (likely error)
        errors.push(`${marketKey}.value=${metric.value} seems too large (should be millions USD, not raw dollars)`);
      }
      if (typeof metric.formattedValue !== 'string') {
        errors.push(`${marketKey}.formattedValue must be a string`);
      }
      if (typeof metric.growthRate !== 'number') {
        errors.push(`${marketKey}.growthRate must be a number`);
      }
      if (!['high', 'medium', 'low'].includes(metric.confidence as string)) {
        errors.push(`${marketKey}.confidence must be high|medium|low`);
      }
      if (typeof metric.timeframe !== 'string') {
        errors.push(`${marketKey}.timeframe must be a string`);
      }
    }
  }

  // Validate arrays
  if (Array.isArray(d.segments)) {
    if (d.segments.length === 0) {
      errors.push('segments array is empty');
    }
  }

  if (Array.isArray(d.assumptions)) {
    if (d.assumptions.length === 0) {
      errors.push('assumptions array is empty');
    }
    for (const assumption of d.assumptions) {
      const a = assumption as Record<string, unknown>;
      if (!['tam', 'sam', 'som'].includes(a.level as string)) {
        errors.push('assumption.level must be tam|sam|som');
        break; // Only report once
      }
    }
  }

  if (Array.isArray(d.sources)) {
    if (d.sources.length === 0) {
      errors.push('sources array is empty');
    }
  }

  if (typeof d.methodology !== 'string' || d.methodology.length === 0) {
    errors.push('methodology must be a non-empty string');
  }

  return errors;
}

/**
 * Log telemetry for market sizing extraction call.
 * Logs all relevant diagnostic info for debugging incomplete responses.
 */
function logMarketSizingTelemetry(
  attempt: number,
  maxAttempts: number,
  responseId: string | null,
  status: string,
  usage: TokenUsage | null,
  maxOutputTokens: number,
  reasoning: ReasoningEffort,
  rawTextLength: number,
  parseSuccess: boolean,
  failureReason?: string,
  incompleteDetails?: unknown
): void {
  console.log('[Extract Market Sizing] === TELEMETRY ===');
  console.log(`  Attempt: ${attempt}/${maxAttempts}`);
  console.log(`  Response ID: ${responseId ?? 'N/A'}`);
  console.log(`  Status: ${status}`);
  if (usage) {
    console.log(`  Usage: input=${usage.input_tokens}, output=${usage.output_tokens}, total=${usage.total_tokens}`);
    if (usage.output_tokens === maxOutputTokens) {
      console.warn('  WARNING: output_tokens equals max_output_tokens (may indicate truncation)');
    }
  }
  console.log(`  Config: max_output_tokens=${maxOutputTokens}, reasoning=${reasoning}`);
  console.log(`  Raw text length: ${rawTextLength}`);
  console.log(`  Parse success: ${parseSuccess}`);
  if (failureReason) {
    console.log(`  Failure reason: ${failureReason}`);
  }
  if (incompleteDetails) {
    console.log(`  Incomplete details: ${JSON.stringify(incompleteDetails)}`);
  }
  console.log('[Extract Market Sizing] === END TELEMETRY ===');
}

/**
 * Build the constrained prompt for market sizing.
 * Enforces exact counts and length limits to prevent unbounded JSON growth.
 * Tightens constraints on retries to reduce output size.
 */
function buildMarketSizingPrompt(
  input: ResearchInput,
  researchSnippet: string,
  marketSizingChunk: string,
  insightsJson: string,
  retryAttempt: number
): string {
  // Tighter constraints on retry 2 (0-indexed: retry 2 = attempt 2)
  const isLastRetry = retryAttempt >= 2;
  const segmentCount = isLastRetry ? 2 : 3;
  const geoCount = isLastRetry ? 2 : 3;
  const assumptionCount = isLastRetry ? 6 : 9;
  const sourceCount = isLastRetry ? 4 : 6;
  const descriptionWords = isLastRetry ? 12 : 20;
  const methodologySentences = isLastRetry ? 1 : 2;

  // On retries, add strict instruction to return only JSON
  const retryNote = retryAttempt > 0
    ? '\n\nCRITICAL: Return ONLY the JSON object. No preamble, no explanation, no markdown code blocks.\n'
    : '';

  // Truncate inputs more aggressively on retries
  const snippetLimit = isLastRetry ? 4000 : 5000;
  const chunkLimit = isLastRetry ? 2000 : 2500;
  const insightsLimit = isLastRetry ? 1500 : 2000;

  return `You are a market analyst calculating TAM/SAM/SOM market sizing.${retryNote}

## DEFINITIONS
- **TAM:** Total market demand globally
- **SAM:** Segment of TAM within your reach
- **SOM:** Portion of SAM you can realistically capture in 3-5 years

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## RESEARCH DATA
${researchSnippet.substring(0, snippetLimit)}
${marketSizingChunk ? `\n## MARKET SIZING DATA\n${marketSizingChunk.substring(0, chunkLimit)}` : ''}

## MARKET INSIGHTS
${insightsJson.substring(0, insightsLimit)}

## OUTPUT REQUIREMENTS (STRICT - FOLLOW EXACTLY)
Return JSON with:
- segments: EXACTLY ${segmentCount} items (description max ${descriptionWords} words each)
- geographicBreakdown: EXACTLY ${geoCount} items (notes max ${descriptionWords} words each)
- assumptions: EXACTLY ${assumptionCount} items (${assumptionCount / 3} per level: tam/sam/som)
- sources: MAX ${sourceCount} items
- methodology: MAX ${methodologySentences} sentence(s)
- All values in millions USD (e.g., 4200 for $4.2B, 850 for $850M)
- You may derive SAM/SOM using stated assumptions; mark as reliability: "estimate"

## JSON FORMAT
{
  "tam": { "value": <millions>, "formattedValue": "$X.XB", "growthRate": <CAGR>, "confidence": "high|medium|low", "timeframe": "YYYY-YYYY" },
  "sam": { "value": <millions>, "formattedValue": "$XM", "growthRate": <CAGR>, "confidence": "high|medium|low", "timeframe": "YYYY-YYYY" },
  "som": { "value": <millions>, "formattedValue": "$XM", "growthRate": <CAGR>, "confidence": "high|medium|low", "timeframe": "YYYY-YYYY" },
  "segments": [{ "name": "", "tamContribution": <pct>, "samContribution": <pct>, "somContribution": <pct>, "description": "" }],
  "geographicBreakdown": [{ "region": "", "percentage": <pct>, "notes": "" }],
  "assumptions": [{ "level": "tam|sam|som", "assumption": "", "impact": "high|medium|low" }],
  "sources": [{ "title": "", "url": "", "date": "", "reliability": "primary|secondary|estimate" }],
  "methodology": ""
}

IMPORTANT:
- Use ONLY data from the research findings. Do not fabricate numbers.
- Be conservative with SOM estimates - most startups capture <1% of SAM in early years.
- If specific data is unavailable, use "estimate" reliability and note assumptions.`;
}

/**
 * Extract TAM/SAM/SOM market sizing from deep research report.
 * Uses GPT-5.2 with retry handling for incomplete responses.
 *
 * Implements:
 * - Adaptive token limits based on input size
 * - Reasoning downgrade for JSON mode (xhigh -> high)
 * - 3 retry attempts with progressive adjustment
 * - JSON isolation fallback for wrapped responses
 * - Structured validation before accepting
 */
export async function extractMarketSizing(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<MarketSizingData> {
  console.log('[Extract Market Sizing] Starting extraction with tier:', tier);

  // Defensive check for malformed deep research data
  if (!deepResearch?.rawReport) {
    console.error('[Extract Market Sizing] Missing rawReport in deepResearch');
    throw new Error('Failed to extract market sizing: missing research data (rawReport is empty)');
  }

  // Prepare inputs
  const researchSnippet = deepResearch.rawReport;
  const marketSizingChunk = (deepResearch as DeepResearchOutput & { chunkResults?: Record<string, string> })
    ?.chunkResults?.marketsizing || '';
  const insightsJson = JSON.stringify(insights.marketAnalysis, null, 2);

  console.log('[Extract Market Sizing] Research snippet length:', researchSnippet.length);
  console.log('[Extract Market Sizing] Has dedicated market sizing chunk:', marketSizingChunk.length > 0);

  // Get base AI params (already downgraded from xhigh in presets)
  const baseAiParams = getAIParams('extractMarketSizing', tier);

  // For JSON mode, ensure we don't use xhigh (extra safety)
  let currentReasoning: ReasoningEffort = baseAiParams.reasoning === 'xhigh' ? 'high' : baseAiParams.reasoning;

  // Calculate prompt length for adaptive tokens
  const promptLength = researchSnippet.length + marketSizingChunk.length + insightsJson.length;
  let currentMaxTokens = calculateAdaptiveTokenLimit(promptLength, currentReasoning);

  // Warn if original params would have been risky
  if (baseAiParams.reasoning === 'xhigh') {
    console.warn('[Extract Market Sizing] WARNING: xhigh reasoning auto-downgraded to high for JSON mode');
  }

  const MAX_RETRIES = 2; // Total 3 attempts (0, 1, 2)
  let lastError: string | null = null;
  let lastRawText: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Build prompt with constraints (tighter on later retries)
    const prompt = buildMarketSizingPrompt(input, researchSnippet, marketSizingChunk, insightsJson, attempt);

    const aiParams: AIParams = {
      reasoning: currentReasoning,
      verbosity: baseAiParams.verbosity,
    };

    console.log(`[Extract Market Sizing] Attempt ${attempt + 1}/${MAX_RETRIES + 1}: max_tokens=${currentMaxTokens}, reasoning=${currentReasoning}`);

    try {
      // API call with exponential backoff for transient errors
      const response = await withExponentialBackoff(
        () => openai.responses.create(
          createResponsesParams({
            model: REPORT_MODEL,
            input: prompt,
            response_format: { type: 'json_object' },
            max_output_tokens: currentMaxTokens,
          }, aiParams)
        ),
        {
          maxAttempts: 2, // Inner retry for transient errors only
          initialDelayMs: 2000,
          onRetry: (retryAttempt, error, delayMs) => {
            console.warn(`[Extract Market Sizing] Transient retry ${retryAttempt}/2 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
          }
        }
      );

      // Track token usage (fire-and-forget)
      trackUsageFromResponse(response, {
        functionName: 'extractMarketSizing',
        model: REPORT_MODEL,
      });

      // Parse response using resilient parser
      const parsed = parseResponsesAPIPayload(response);

      // Log telemetry for every attempt
      logMarketSizingTelemetry(
        attempt + 1,
        MAX_RETRIES + 1,
        parsed.responseId,
        parsed.status,
        parsed.usage,
        currentMaxTokens,
        currentReasoning,
        parsed.rawText?.length ?? 0,
        false, // Will update after parse attempt
        undefined,
        parsed.incompleteDetails
      );

      // Check 1: Incomplete status
      if (parsed.status === 'incomplete') {
        console.warn('[Extract Market Sizing] INCOMPLETE response detected');
        console.warn('[Extract Market Sizing] This usually means output_tokens hit max_output_tokens limit');
        lastError = 'incomplete_response';
        lastRawText = parsed.rawText;

        // Retry with adjusted params
        if (attempt < MAX_RETRIES) {
          currentMaxTokens = Math.min(Math.ceil(currentMaxTokens * 1.5), MARKET_SIZING_MAX_TOKENS);
          currentReasoning = REASONING_DOWNGRADE[currentReasoning];
          console.log(`[Extract Market Sizing] Adjusting for retry: max_tokens=${currentMaxTokens}, reasoning=${currentReasoning}`);
          continue;
        }
      }

      // Check 2: Empty content
      if (!parsed.rawText || parsed.rawText.trim().length === 0) {
        console.warn('[Extract Market Sizing] Empty response content');
        lastError = 'empty_content';
        lastRawText = null;

        if (attempt < MAX_RETRIES) {
          currentMaxTokens = Math.min(Math.ceil(currentMaxTokens * 1.5), MARKET_SIZING_MAX_TOKENS);
          currentReasoning = REASONING_DOWNGRADE[currentReasoning];
          console.log(`[Extract Market Sizing] Adjusting for retry: max_tokens=${currentMaxTokens}, reasoning=${currentReasoning}`);
          continue;
        }
      }

      // Check 3: JSON parse (with isolation fallback)
      const parseResult = safeJsonParse<MarketSizingData>(parsed.rawText!);
      if (parseResult.ok === false) {
        const failReason = parseResult.reason;
        console.warn('[Extract Market Sizing] JSON parse failed:', failReason);

        // Enhanced diagnostic logging to debug parse failures
        console.error('[Extract Market Sizing] === PARSE FAILURE DIAGNOSTICS ===');
        console.error('  Total length:', parsed.rawText?.length);
        console.error('  First 300 chars:', parsed.rawText?.substring(0, 300));
        console.error('  Last 300 chars:', parsed.rawText?.slice(-300));
        // Check for common issues
        const rawText = parsed.rawText || '';
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        console.error('  First { at:', firstBrace);
        console.error('  Last } at:', lastBrace);
        if (lastBrace > 0 && lastBrace < rawText.length - 1) {
          console.error('  Text after last }:', rawText.slice(lastBrace + 1, lastBrace + 101));
        }
        console.error('[Extract Market Sizing] === END DIAGNOSTICS ===');

        lastError = `json_parse_error: ${failReason}`;
        lastRawText = parsed.rawText;

        if (attempt < MAX_RETRIES) {
          currentMaxTokens = Math.min(Math.ceil(currentMaxTokens * 1.5), MARKET_SIZING_MAX_TOKENS);
          currentReasoning = REASONING_DOWNGRADE[currentReasoning];
          console.log(`[Extract Market Sizing] Adjusting for retry: max_tokens=${currentMaxTokens}, reasoning=${currentReasoning}`);
          continue;
        }
      } else {
        // JSON parsed successfully - now validate structure
        if (parseResult.isolated) {
          console.log('[Extract Market Sizing] Note: JSON was isolated from surrounding text');
        }

        const validationErrors = validateMarketSizingData(parseResult.data);
        if (validationErrors.length > 0) {
          console.warn('[Extract Market Sizing] Validation errors:', validationErrors);

          // Only retry on critical errors (missing required keys)
          const criticalErrors = validationErrors.filter(e => e.startsWith('Missing required key'));
          if (criticalErrors.length > 0 && attempt < MAX_RETRIES) {
            lastError = `validation_error: ${criticalErrors.join(', ')}`;
            lastRawText = parsed.rawText;
            currentMaxTokens = Math.min(Math.ceil(currentMaxTokens * 1.5), MARKET_SIZING_MAX_TOKENS);
            currentReasoning = REASONING_DOWNGRADE[currentReasoning];
            console.log(`[Extract Market Sizing] Adjusting for retry: max_tokens=${currentMaxTokens}, reasoning=${currentReasoning}`);
            continue;
          }

          // Non-critical validation warnings: log but proceed
          if (criticalErrors.length === 0) {
            console.warn('[Extract Market Sizing] Proceeding despite non-critical validation warnings');
          }
        }

        // SUCCESS!
        console.log('[Extract Market Sizing] Success on attempt', attempt + 1);
        console.log('[Extract Market Sizing] TAM:', parseResult.data.tam?.formattedValue,
                    'SAM:', parseResult.data.sam?.formattedValue,
                    'SOM:', parseResult.data.som?.formattedValue);

        // Log final success telemetry
        logMarketSizingTelemetry(
          attempt + 1,
          MAX_RETRIES + 1,
          parsed.responseId,
          parsed.status,
          parsed.usage,
          currentMaxTokens,
          currentReasoning,
          parsed.rawText?.length ?? 0,
          true,
          undefined,
          undefined
        );

        return {
          ...parseResult.data,
          lastUpdated: new Date().toISOString(),
        };
      }

    } catch (error) {
      // API-level error (not caught by withExponentialBackoff)
      console.error('[Extract Market Sizing] API error on attempt', attempt + 1, ':', error instanceof Error ? error.message : error);
      lastError = error instanceof Error ? error.message : 'unknown_api_error';

      if (attempt < MAX_RETRIES) {
        currentMaxTokens = Math.min(Math.ceil(currentMaxTokens * 1.5), MARKET_SIZING_MAX_TOKENS);
        currentReasoning = REASONING_DOWNGRADE[currentReasoning];
        console.log(`[Extract Market Sizing] Adjusting for retry after error: max_tokens=${currentMaxTokens}, reasoning=${currentReasoning}`);
        continue;
      }

      // Re-throw on final attempt
      throw error;
    }
  }

  // All retries exhausted - throw descriptive error
  console.error('[Extract Market Sizing] All retries exhausted');
  console.error('[Extract Market Sizing] Last error:', lastError);
  if (lastRawText) {
    console.error('[Extract Market Sizing] Last raw text preview (first 500 chars):', lastRawText.substring(0, 500));
  }

  throw new Error(`Failed to extract market sizing after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}. Check logs for diagnostics.`);
}

// =============================================================================
// PHASE 3: SOCIAL PROOF (o3-deep-research with social domain filtering)
// =============================================================================

/**
 * Fetch real social proof using o3-deep-research with web search filtered to social platforms.
 * Searches Reddit, Twitter, HackerNews, IndieHackers, ProductHunt, LinkedIn
 * for real discussions about the pain points.
 *
 * Uses o3-deep-research (or o4-mini for FREE tier) for comprehensive social proof gathering.
 *
 * NOTE: This function takes raw deepResearch output instead of pre-extracted insights.
 * The o3 model will identify pain points directly from the research report.
 * This allows Phase 2 to be purely o3-based with no GPT-5.2 calls.
 */
export async function fetchSocialProof(
  input: ResearchInput,
  deepResearch: DeepResearchOutput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SocialProof> {
  console.log('[Social Proof] Using multi-provider strategy (Brave Search + Claude Sonnet synthesis)...');
  console.log('[Social Proof] Tier:', tier);

  const startTime = Date.now();

  try {
    // Step 1: Get search provider (defaults to Brave Search)
    const searchProvider = getSearchProvider();
    console.log(`[Social Proof] Using search provider: ${searchProvider.name}`);

    // Step 2: Perform social platform search
    const platforms = ['reddit', 'twitter', 'hackernews', 'indiehackers', 'producthunt', 'linkedin'];
    const searchQuery = `${input.ideaTitle} ${input.ideaDescription.substring(0, 200)}`;

    console.log(`[Social Proof] Searching platforms: ${platforms.join(', ')}`);
    const searchResult = await searchProvider.searchSocial(searchQuery, platforms);

    console.log(`[Social Proof] Search returned ${searchResult.totalResults} posts from ${searchResult.provider}`);

    // Step 3: Validate quality thresholds
    const minPosts = configService.getNumber('search.fallback.minPosts', 5);
    const minWordCount = configService.getNumber('search.fallback.minWordCount', 500);

    const totalWordCount = searchResult.posts.reduce((sum, post) => {
      return sum + (post.content?.split(/\s+/).length || 0);
    }, 0);

    const qualityPassed = searchResult.totalResults >= minPosts && totalWordCount >= minWordCount;

    console.log(`[Social Proof] Quality check: ${searchResult.totalResults} posts, ${totalWordCount} words (need ${minPosts}/${minWordCount})`);
    console.log(`[Social Proof] Quality passed: ${qualityPassed}`);

    // Step 4: If quality passes, synthesize with Claude Sonnet
    if (qualityPassed && searchProvider.name === 'brave') {
      console.log('[Social Proof] Using Claude Sonnet for synthesis...');

      const extractionProvider = getExtractionProvider(tier);
      const researchContext = deepResearch.rawReport.substring(0, 8000);

      // Format posts for synthesis
      const postsContext = searchResult.posts.map((post, i) =>
        `[${i + 1}] Platform: ${post.platform}\nAuthor: ${post.author}\nContent: ${post.content}\nURL: ${post.url}\nEngagement: ${JSON.stringify(post.engagement)}\nDate: ${post.date}\n`
      ).join('\n---\n');

      const synthesisPrompt = `## MARKET RESEARCH CONTEXT
${researchContext}

## SOCIAL PROOF DATA
Found ${searchResult.posts.length} relevant posts from social platforms:

${postsContext}

## YOUR TASK
Analyze these social media posts and synthesize insights about:
1. Which pain points from the research are validated by real discussions
2. What demand signals exist (people asking for solutions, willing to pay, etc.)
3. Overall sentiment and market validation

Return your analysis as JSON:
{
  "posts": [
    {
      "platform": "reddit|twitter|hackernews|indiehackers|producthunt|linkedin",
      "author": "username",
      "content": "post content (100-300 chars)",
      "url": "https://...",
      "engagement": { "upvotes": 0, "comments": 0, "likes": 0 },
      "date": "YYYY-MM-DD",
      "sentiment": "negative|neutral|positive",
      "relevanceScore": 0-100
    }
  ],
  "summary": "2-3 sentence summary of what the social proof reveals",
  "painPointsValidated": ["List of pain points confirmed by real discussions"],
  "demandSignals": ["Specific demand signals found"]
}`;

      const SocialProofSchema = z.object({
        posts: z.array(z.object({
          platform: z.enum(['reddit', 'twitter', 'facebook', 'hackernews', 'indiehackers', 'producthunt', 'linkedin']),
          author: z.string(),
          content: z.string(),
          url: z.string(),
          engagement: z.object({
            upvotes: z.number().optional(),
            comments: z.number().optional(),
            likes: z.number().optional(),
          }).optional(),
          date: z.string(),
          sentiment: z.enum(['negative', 'neutral', 'positive']),
          relevanceScore: z.number(),
        })),
        summary: z.string(),
        painPointsValidated: z.array(z.string()),
        demandSignals: z.array(z.string()),
      });

      const synthesized = await extractionProvider.extract(synthesisPrompt, SocialProofSchema, {
        maxTokens: 16000,
        temperature: 1.0,
      });

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Social Proof] Synthesis complete after ${elapsed}s`);
      console.log(`[Social Proof] Synthesized ${synthesized.posts.length} posts`);

      return {
        ...synthesized,
        sources: searchResult.sources,
      };
    }

    // Step 5: Fallback to OpenAI deep research if quality insufficient or OpenAI provider
    console.log('[Social Proof] Quality insufficient or using OpenAI provider - falling back to deep research...');

    const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
    const researchContext = deepResearch.rawReport.substring(0, 8000);

    const systemPrompt = `You are a social media researcher specializing in finding real discussions about specific pain points.
Your task is to search social platforms and find authentic posts where real people discuss problems, frustrations, or needs related to the given business idea.

## MARKET RESEARCH CONTEXT
The following is a deep market research report. First, identify the key pain points and target audience from this research, then search for social proof validating these pain points.

${researchContext}

## SEARCH FOCUS
- Reddit (r/entrepreneur, r/smallbusiness, r/startups, industry-specific subreddits)
- Twitter/X (relevant hashtags and discussions)
- HackerNews (Show HN, Ask HN, comments)
- IndieHackers (discussions, milestones, problems)
- ProductHunt (discussions, comments on similar products)
- LinkedIn (posts, articles, comments)

## OUTPUT REQUIREMENTS
For each relevant post, capture:
1. Platform and author username
2. Actual post content (verbatim where possible)
3. Direct URL to the post
4. Engagement metrics (upvotes, likes, comments)
5. Date posted
6. Sentiment toward the problem
7. Relevance score (0-100)

Focus on finding posts that:
- Express genuine frustration with a problem
- Ask for solutions or alternatives
- Discuss workarounds they've tried
- Validate that the pain point is real

Be thorough in your search. Find 4-10 highly relevant posts.`;

    const userQuery = `## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

---

Based on the market research context provided, identify the key pain points and target audience, then search social media platforms for real posts where people discuss these pain points.
Find authentic discussions that validate (or invalidate) these problems exist.

Return your findings as JSON:
{
  "posts": [
    {
      "platform": "reddit|twitter|hackernews|indiehackers|producthunt|linkedin",
      "author": "username or handle",
      "content": "The actual post content (100-300 chars, verbatim if possible)",
      "url": "https://actual-url-to-post",
      "engagement": { "upvotes": 123, "comments": 45, "likes": 67 },
      "date": "YYYY-MM-DD",
      "sentiment": "negative|neutral|positive",
      "relevanceScore": 0-100
    }
  ],
  "summary": "2-3 sentence summary of what the social proof reveals",
  "painPointsValidated": ["List of pain points confirmed by real discussions"],
  "demandSignals": ["Specific demand signals found (e.g., 'people asking for X', 'willing to pay for Y')"]
}`;

    const socialDomains = [...SEARCH_DOMAINS.social];

    const params = createDeepResearchParams({
      model,
      systemPrompt,
      userQuery,
      domains: socialDomains,
      background: true,
      reasoningSummary: 'auto',
    });

    const result = await runDeepResearchWithPolling(params, {
      pollIntervalMs: 10000,
      maxWaitMs: 900000,
      onLog: (message) => console.log(`[Social Proof Fallback] ${message}`),
      onProgress: (status, elapsed) => {
        if (elapsed > 0 && elapsed % 30000 < 10000) {
          console.log(`[Social Proof Fallback] Status: ${status} (${Math.round(elapsed/1000)}s elapsed)`);
        }
      },
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Social Proof Fallback] Search complete after ${elapsed}s`);

    // Parse JSON response
    let socialProofData: Omit<SocialProof, 'sources'>;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
      if (!jsonMatch) {
        const greedyMatch = result.content.match(/\{[\s\S]*\}/);
        if (greedyMatch) {
          socialProofData = JSON.parse(greedyMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } else {
        socialProofData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('[Social Proof Fallback] Could not parse JSON:', parseError instanceof Error ? parseError.message : parseError);
      socialProofData = {
        posts: [],
        summary: result.content.substring(0, 500),
        painPointsValidated: [],
        demandSignals: [],
      };
    }

    console.log('[Social Proof Fallback] Found', socialProofData.posts?.length || 0, 'posts');

    return {
      ...socialProofData,
      posts: socialProofData.posts || [],
      summary: socialProofData.summary || 'Social proof search completed.',
      painPointsValidated: socialProofData.painPointsValidated || [],
      demandSignals: socialProofData.demandSignals || [],
      sources: result.sources,
    };
  } catch (error) {
    console.error('[Social Proof] Search failed:', error);
    return {
      posts: [],
      summary: 'Social proof search encountered an error. Manual research recommended.',
      painPointsValidated: [],
      demandSignals: [],
      sources: [],
    };
  }
}

// =============================================================================
// PHASE 4: CREATIVE GENERATION (GPT-5.2 report writing)
// =============================================================================

// User Story, Value Ladder, Action Prompts - moved below for organization

// =============================================================================
// LEGACY FUNCTIONS (kept for backward compatibility during migration)
// =============================================================================

// Phase 1: Generate search queries from interview data
// @deprecated Use runDeepResearch instead
export async function generateSearchQueries(
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<GeneratedQueries> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  const prompt = `You are a market research expert. Based on the business idea and interview data, generate targeted search queries for comprehensive market research.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

Generate search queries in these categories:
1. Market queries - to understand market size, trends, and dynamics
2. Competitor queries - to find and analyze competitors
3. Customer queries - to understand target customer behavior and needs
4. Trend queries - to identify market timing and emerging opportunities

Return a JSON object with this structure:
{
  "marketQueries": ["query1", "query2", ...],
  "competitorQueries": ["query1", "query2", ...],
  "customerQueries": ["query1", "query2", ...],
  "trendQueries": ["query1", "query2", ...]
}

Generate 3-5 specific, actionable queries per category.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('searchQueries', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 8000, // Increased from 4000 for buffer
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateSearchQueries] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'generateSearchQueries',
    model: REPORT_MODEL,
  });

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate search queries: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateSearchQueries');

  try {
    const queries = JSON.parse(content) as GeneratedQueries;

    // Expand queries with template patterns for richer coverage
    const allLlmQueries = [
      ...queries.marketQueries,
      ...queries.competitorQueries,
      ...queries.customerQueries,
      ...queries.trendQueries,
    ];
    const keyPhrases = extractKeyPhrases(ideaTitle, ideaDescription);
    const expansion = await expandQueries(keyPhrases, allLlmQueries, {
      maxTemplateQueries: 20,
      maxSerpApiQueries: 10,
      serpApiEnabled: true,
    });

    if (expansion.totalUnique > allLlmQueries.length) {
      const expandedStrings = getExpandedQueryStrings(expansion);
      // Distribute expanded queries across categories proportionally
      const extraPerCategory = Math.ceil((expandedStrings.length - allLlmQueries.length) / 4);
      const extras = expandedStrings.filter(q => !allLlmQueries.includes(q));
      queries.marketQueries.push(...extras.slice(0, extraPerCategory));
      queries.competitorQueries.push(...extras.slice(extraPerCategory, extraPerCategory * 2));
      queries.customerQueries.push(...extras.slice(extraPerCategory * 2, extraPerCategory * 3));
      queries.trendQueries.push(...extras.slice(extraPerCategory * 3));
      console.log(`[generateSearchQueries] Expanded with ${extras.length} additional queries (${expansion.elapsedMs}ms)`);
    }

    return queries;
  } catch (parseError) {
    if (parseError instanceof ResponseParseError) throw parseError;
    throw new ResponseParseError(
      `Failed to parse search queries JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
}

/**
 * Extract key phrases from idea title and description for query expansion.
 * Simple heuristic: use the title as primary phrase, plus significant
 * noun phrases from the description.
 */
function extractKeyPhrases(title: string, description: string): string[] {
  const phrases: string[] = [title.toLowerCase()];

  // Extract meaningful 2-3 word combinations from description
  const words = description.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const stopWords = new Set(['that', 'this', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should', 'their', 'there', 'about', 'which', 'when', 'what', 'more', 'most', 'some', 'very', 'also', 'than', 'them', 'into', 'only', 'other', 'such', 'each']);
  const filtered = words.filter(w => !stopWords.has(w));

  // Take up to 3 meaningful words as additional phrases
  for (let i = 0; i < Math.min(filtered.length - 1, 3); i++) {
    if (filtered[i + 1]) {
      phrases.push(`${filtered[i]} ${filtered[i + 1]}`);
    }
  }

  return phrases.slice(0, 5); // Max 5 phrases
}

// Phase 2: Synthesize insights from interview data (MVP - no external APIs)
export async function synthesizeInsights(
  input: ResearchInput,
  queries: GeneratedQueries,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SynthesizedInsights> {
  console.log('[synthesizeInsights] Starting...');
  const { ideaTitle, ideaDescription, interviewData, interviewMessages } = input;

  // Build context from interview
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  console.log('[synthesizeInsights] Interview context length:', interviewContext.length);

  // Get knowledge-based guardrails
  console.log('[synthesizeInsights] Getting research knowledge...');
  const researchKnowledge = getResearchKnowledge();
  console.log('[synthesizeInsights] Research knowledge length:', researchKnowledge.length);

  const prompt = `${researchKnowledge}

---

You are a senior business analyst conducting market research synthesis. Based on the business idea, interview insights, and research queries, synthesize comprehensive market insights.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

COLLECTED DATA FROM INTERVIEW:
${JSON.stringify(interviewData, null, 2)}

INTERVIEW TRANSCRIPT:
${interviewContext}

RESEARCH QUERIES TO CONSIDER:
${JSON.stringify(queries, null, 2)}

Synthesize insights and return a JSON object with this exact structure:
{
  "marketAnalysis": {
    "size": "Estimated market size description",
    "growth": "Growth trajectory description",
    "trends": ["trend1", "trend2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  },
  "competitors": [
    {
      "name": "Competitor name or type",
      "description": "Brief description",
      "strengths": ["strength1"],
      "weaknesses": ["weakness1"],
      "positioning": "How they position themselves"
    }
  ],
  "painPoints": [
    {
      "problem": "Problem description",
      "severity": "high|medium|low",
      "currentSolutions": ["solution1"],
      "gaps": ["gap1"]
    }
  ],
  "positioning": {
    "uniqueValueProposition": "Clear UVP statement",
    "targetAudience": "Specific target description",
    "differentiators": ["diff1", "diff2"],
    "messagingPillars": ["pillar1", "pillar2"]
  },
  "whyNow": {
    "marketTriggers": ["trigger1"],
    "timingFactors": ["factor1"],
    "urgencyScore": 75
  },
  "proofSignals": {
    "demandIndicators": ["indicator1"],
    "validationOpportunities": ["opportunity1"],
    "riskFactors": ["risk1"]
  },
  "keywords": {
    "primary": ["keyword1"],
    "secondary": ["keyword1"],
    "longTail": ["long tail phrase"]
  }
}

Be specific and actionable. Use the interview data to inform your analysis.`;

  console.log('[synthesizeInsights] Prompt length:', prompt.length);
  console.log('[synthesizeInsights] Calling OpenAI API with model:', REPORT_MODEL);

  // Get tier-based AI parameters
  const aiParams = getAIParams('synthesizeInsights', tier);
  console.log('[synthesizeInsights] Tier:', tier, '| Reasoning:', aiParams.reasoning, '| Verbosity:', aiParams.verbosity);

  // Start a heartbeat to show the API call is in progress
  const startTime = Date.now();
  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[synthesizeInsights] Still waiting for API response... (${elapsed}s elapsed)`);
  }, 10000); // Log every 10 seconds

  try {
    // Use Responses API with exponential backoff for transient errors
    const response = await withExponentialBackoff(
      () => openai.responses.create(
        createResponsesParams({
          model: REPORT_MODEL,
          input: prompt,
          response_format: { type: 'json_object' },
          max_output_tokens: 15000, // Increased from 3000 to prevent truncation
        }, aiParams)
      ),
      {
        maxAttempts: 5,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[synthesizeInsights] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
        }
      }
    );

    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[synthesizeInsights] API response received after ${elapsed}s`);
    console.log('[synthesizeInsights] Usage:', response.usage);

    // Track token usage (fire-and-forget)
    trackUsageFromResponse(response, {
      functionName: 'synthesizeInsights',
      model: REPORT_MODEL,
    });

    // Use unified content extractor for robust response handling
    const content = extractResponseContent(response);
    if (!content) {
      console.error('[synthesizeInsights] No content in response');
      throw new ResponseParseError('Failed to synthesize insights: no content in response', response);
    }

    console.log('[synthesizeInsights] Content length:', content.length);

    // Validate JSON completeness before parsing
    validateJsonCompleteness(content, 'synthesizeInsights');

    try {
      const parsed = JSON.parse(content) as SynthesizedInsights;
      console.log('[synthesizeInsights] Successfully parsed response');
      return parsed;
    } catch (parseError) {
      throw new ResponseParseError(
        `Failed to parse synthesize insights JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        response
      );
    }
  } catch (error) {
    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[synthesizeInsights] Error after ${elapsed}s:`, error);
    throw error;
  }
}

// Helper: Clamp score to valid 0-100 range
function clampScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 50; // Default to middle if invalid
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Helper: Calculate standard deviation
function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n);
}

// Helper: Run a single scoring pass
async function runSingleScoringPass(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier,
  passNumber: number
): Promise<RawScorePass> {
  const { ideaTitle, ideaDescription, interviewData } = input;
  const { scoringCriteria } = KNOWLEDGE.research;

  const prompt = `You are evaluating a business idea based on research insights. Score the following dimensions from 0-100.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

RESEARCH INSIGHTS:
${JSON.stringify(insights, null, 2)}

## SCORING CRITERIA

Use these criteria to determine scores:

**Opportunity Score (0-100):**
${Object.entries(scoringCriteria.opportunityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Problem Score (0-100):**
${Object.entries(scoringCriteria.problemScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Feasibility Score (0-100):**
${Object.entries(scoringCriteria.feasibilityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Why Now Score (0-100):**
${Object.entries(scoringCriteria.whyNowScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

IMPORTANT: For each score, you MUST provide a justification explaining:
1. What specific evidence from the data supports this score
2. What factors pulled the score up or down
3. What uncertainties or gaps exist in the data

Return a JSON object with this EXACT structure:
{
  "opportunityScore": number (0-100),
  "opportunityJustification": "2-3 sentences explaining why this score",
  "problemScore": number (0-100),
  "problemJustification": "2-3 sentences explaining why this score",
  "feasibilityScore": number (0-100),
  "feasibilityJustification": "2-3 sentences explaining why this score",
  "whyNowScore": number (0-100),
  "whyNowJustification": "2-3 sentences explaining why this score"
}

Be realistic and data-driven in your scoring. Don't inflate scores - be honest about limitations.
This is scoring pass ${passNumber} - evaluate independently without bias.`;

  const aiParams = getAIParams('calculateScores', tier);

  // Use exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 8000, // Increased from 4000 for buffer
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[calculateScores] Pass ${passNumber} retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'calculateScores',
    model: REPORT_MODEL,
  });

  // Use unified content extractor
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError(`Failed to calculate scores (pass ${passNumber})`, response);
  }

  // Validate JSON completeness before parsing to catch truncation
  validateJsonCompleteness(content, `calculateScores pass ${passNumber}`);

  return JSON.parse(content) as RawScorePass;
}

// Phase 3: Calculate research scores with multi-pass validation
export async function calculateScores(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<ResearchScores> {
  const PASS_COUNT = 3; // Number of scoring passes
  const DEVIATION_THRESHOLD = 15; // Flag if any score deviates more than this

  console.log(`[calculateScores] Running ${PASS_COUNT} scoring passes for reliability...`);

  // Run multiple passes in parallel for efficiency
  const passPromises = Array.from({ length: PASS_COUNT }, (_, i) =>
    runSingleScoringPass(input, insights, tier, i + 1)
  );

  const passes = await Promise.all(passPromises);
  console.log(`[calculateScores] All ${PASS_COUNT} passes complete`);

  // Extract scores from each pass
  const opportunityScores = passes.map(p => clampScore(p.opportunityScore));
  const problemScores = passes.map(p => clampScore(p.problemScore));
  const feasibilityScores = passes.map(p => clampScore(p.feasibilityScore));
  const whyNowScores = passes.map(p => clampScore(p.whyNowScore));

  // Calculate averages
  const avgOpportunity = Math.round(opportunityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgProblem = Math.round(problemScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgFeasibility = Math.round(feasibilityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgWhyNow = Math.round(whyNowScores.reduce((a, b) => a + b, 0) / PASS_COUNT);

  // Calculate deviations
  const deviations = [
    Math.max(...opportunityScores) - Math.min(...opportunityScores),
    Math.max(...problemScores) - Math.min(...problemScores),
    Math.max(...feasibilityScores) - Math.min(...feasibilityScores),
    Math.max(...whyNowScores) - Math.min(...whyNowScores),
  ];
  const maxDeviation = Math.max(...deviations);

  // Calculate confidence based on consistency
  const avgStdDev = (
    standardDeviation(opportunityScores) +
    standardDeviation(problemScores) +
    standardDeviation(feasibilityScores) +
    standardDeviation(whyNowScores)
  ) / 4;

  // Lower std dev = higher confidence (0-100 scale)
  // stdDev of 0 = 100% confidence, stdDev of 20+ = ~50% confidence
  const averageConfidence = Math.round(Math.max(50, 100 - avgStdDev * 2.5));

  // Determine confidence level for each score based on its specific deviation
  const getConfidenceLevel = (scores: number[]): 'high' | 'medium' | 'low' => {
    const dev = Math.max(...scores) - Math.min(...scores);
    if (dev <= 5) return 'high';
    if (dev <= 12) return 'medium';
    return 'low';
  };

  // Check if flagging is needed
  const flagged = maxDeviation > DEVIATION_THRESHOLD;
  const flagReason = flagged
    ? `Scores varied by up to ${maxDeviation} points between passes, indicating uncertainty. Review justifications carefully.`
    : undefined;

  if (flagged) {
    console.warn(`[calculateScores] WARNING: High variance detected (max deviation: ${maxDeviation})`);
    console.log(`[calculateScores] Opportunity: ${opportunityScores.join(', ')} → avg ${avgOpportunity}`);
    console.log(`[calculateScores] Problem: ${problemScores.join(', ')} → avg ${avgProblem}`);
    console.log(`[calculateScores] Feasibility: ${feasibilityScores.join(', ')} → avg ${avgFeasibility}`);
    console.log(`[calculateScores] WhyNow: ${whyNowScores.join(', ')} → avg ${avgWhyNow}`);
  }

  // Use the justification from the pass closest to the average for each score
  const findBestJustification = (scores: number[], avg: number, getJustification: (p: RawScorePass) => string): string => {
    let minDiff = Infinity;
    let bestIdx = 0;
    scores.forEach((score, idx) => {
      const diff = Math.abs(score - avg);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    return getJustification(passes[bestIdx]);
  };

  const result: ResearchScores = {
    opportunityScore: avgOpportunity,
    problemScore: avgProblem,
    feasibilityScore: avgFeasibility,
    whyNowScore: avgWhyNow,
    justifications: {
      opportunity: {
        score: avgOpportunity,
        justification: findBestJustification(opportunityScores, avgOpportunity, p => p.opportunityJustification),
        confidence: getConfidenceLevel(opportunityScores),
      },
      problem: {
        score: avgProblem,
        justification: findBestJustification(problemScores, avgProblem, p => p.problemJustification),
        confidence: getConfidenceLevel(problemScores),
      },
      feasibility: {
        score: avgFeasibility,
        justification: findBestJustification(feasibilityScores, avgFeasibility, p => p.feasibilityJustification),
        confidence: getConfidenceLevel(feasibilityScores),
      },
      whyNow: {
        score: avgWhyNow,
        justification: findBestJustification(whyNowScores, avgWhyNow, p => p.whyNowJustification),
        confidence: getConfidenceLevel(whyNowScores),
      },
    },
    metadata: {
      passCount: PASS_COUNT,
      maxDeviation,
      averageConfidence,
      flagged,
      flagReason,
    },
  };

  console.log(`[calculateScores] Final scores: O=${avgOpportunity}, P=${avgProblem}, F=${avgFeasibility}, W=${avgWhyNow}`);
  console.log(`[calculateScores] Confidence: ${averageConfidence}%, Flagged: ${flagged}`);

  return result;
}

// Phase 4: Calculate business metrics
export async function calculateBusinessMetrics(
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<BusinessMetrics> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  const prompt = `You are evaluating business viability metrics for a startup idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

RESEARCH INSIGHTS:
${JSON.stringify(insights, null, 2)}

SCORES:
${JSON.stringify(scores, null, 2)}

Evaluate these business metrics and return a JSON object:
{
  "revenuePotential": {
    "rating": "high|medium|low",
    "estimate": "Revenue estimate description (e.g., '$10K-50K MRR potential')",
    "confidence": 0-100
  },
  "executionDifficulty": {
    "rating": "easy|moderate|hard",
    "factors": ["factor1", "factor2"],
    "soloFriendly": true|false
  },
  "gtmClarity": {
    "rating": "clear|moderate|unclear",
    "channels": ["channel1", "channel2"],
    "confidence": 0-100
  },
  "founderFit": {
    "percentage": 0-100,
    "strengths": ["strength1"],
    "gaps": ["gap1"]
  }
}

Be realistic and consider the founder's background if mentioned in the interview data.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('businessMetrics', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 8000, // Increased from 4000 for buffer
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[calculateBusinessMetrics] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'calculateBusinessMetrics',
    model: REPORT_MODEL,
  });

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to calculate business metrics: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'calculateBusinessMetrics');

  try {
    return JSON.parse(content) as BusinessMetrics;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse business metrics JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
}

// Phase 5: Generate user story
/**
 * Generate user story illustrating the problem and solution.
 * Uses AIProvider.extract() with Claude Sonnet for creative generation.
 */
export async function generateUserStory(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<UserStory> {
  const { ideaTitle, ideaDescription } = input;

  // Get content guidelines from knowledge.json
  const userStoryGuidelines = KNOWLEDGE.contentGuidelines.userStory;

  const prompt = `You are a storytelling expert. Create a compelling user story that illustrates the problem and solution for this business idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

TARGET AUDIENCE: ${insights.positioning.targetAudience}
PAIN POINTS: ${JSON.stringify(insights.painPoints, null, 2)}
SOLUTION VALUE: ${insights.positioning.uniqueValueProposition}

## QUALITY GUIDELINES
${userStoryGuidelines.requirements.map(r => `- ${r}`).join('\n')}

GOOD EXAMPLE: "${userStoryGuidelines.example.good}"
BAD EXAMPLE (avoid this): "${userStoryGuidelines.example.bad}"

Create a relatable, specific user story matching the schema. Make the story feel real and emotionally resonant with specific details.`;

  const generationProvider = getGenerationProvider(tier);
  console.log('[Generate User Story] Using provider:', generationProvider.name);

  const { UserStorySchema } = await import('./research-schemas');

  const userStory = await generationProvider.extract(prompt, UserStorySchema, {
    maxTokens: 8000,
    temperature: 1.0,
  });

  return userStory;
}

// Keyword trends configuration
const MIN_KEYWORD_VOLUME = 500;    // Minimum volume threshold for keyword trends
const TARGET_KEYWORD_COUNT = 5;    // Target number of solid results
const MAX_RETRY_BATCHES = 3;       // Maximum batch attempts to prevent infinite loops

// Phase 6: Generate keyword trends with volume/growth data
// Uses SerpAPI for real Google Trends data only - no AI fallback
// Implements retry loop to fetch keywords until TARGET_KEYWORD_COUNT solid results
export async function generateKeywordTrends(
  _input: ResearchInput,
  insights: SynthesizedInsights,
  _tier: SubscriptionTier = 'ENTERPRISE'
): Promise<KeywordTrend[]> {
  if (!isSerpApiConfigured()) {
    console.log('[Research Pipeline] SerpAPI not configured - skipping keyword trends');
    return [];
  }

  // Build full keyword pool in priority order (primary → secondary → longTail)
  const allKeywords = [
    ...insights.keywords.primary,
    ...insights.keywords.secondary,
    ...insights.keywords.longTail,
  ];

  // Remove duplicates while preserving priority order
  const keywordPool = [...new Set(allKeywords)];

  if (keywordPool.length === 0) {
    console.log('[Research Pipeline] No keywords available for trend research');
    return [];
  }

  const solidResults: KeywordTrend[] = [];
  const triedKeywords = new Set<string>();
  let batchCount = 0;

  console.log(
    `[Research Pipeline] Starting keyword trends loop. Pool: ${keywordPool.length} keywords, Target: ${TARGET_KEYWORD_COUNT}`
  );

  // Keep fetching batches until we have enough solid results or exhaust options
  while (solidResults.length < TARGET_KEYWORD_COUNT && batchCount < MAX_RETRY_BATCHES) {
    batchCount++;

    // Get next batch of untried keywords (fetch a few extra to account for filtering)
    const batchSize = Math.min(5, TARGET_KEYWORD_COUNT - solidResults.length + 2);
    const nextBatch = keywordPool.filter((kw) => !triedKeywords.has(kw)).slice(0, batchSize);

    if (nextBatch.length === 0) {
      console.log('[Research Pipeline] Exhausted all available keywords');
      break;
    }

    // Mark keywords as tried
    nextBatch.forEach((kw) => triedKeywords.add(kw));

    console.log(`[Research Pipeline] Batch ${batchCount}: Trying ${nextBatch.length} keywords...`);

    try {
      // 5 minute timeout per batch
      const results = await Promise.race([
        batchGetTrendData(nextBatch, {
          geo: 'US',
          timeRange: 'today 5-y',
          delayMs: 500,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SerpAPI batch timeout')), 300000)
        ),
      ]);

      for (const [keyword, result] of results) {
        if (result instanceof Error) {
          console.warn(`[Research Pipeline] SerpAPI error for "${keyword}":`, result.message);
          continue;
        }

        const trendData = result as TrendData;
        const timelineValues = trendData.interestOverTime.map((p) => p.value);
        const trend = timelineValues.length > 0 ? timelineValues : Array(60).fill(50);

        // Calculate growth: compare first year avg vs last year avg
        const dataLength = trend.length;
        const yearSize = Math.min(12, Math.floor(dataLength / 2));
        const firstYear = trend.slice(0, yearSize);
        const lastYear = trend.slice(-yearSize);
        const firstAvg = firstYear.reduce((a, b) => a + b, 0) / firstYear.length;
        const lastAvg = lastYear.reduce((a, b) => a + b, 0) / lastYear.length;

        let growth: number;
        if (firstAvg > 0) {
          growth = Math.round(((lastAvg - firstAvg) / firstAvg) * 100);
        } else if (lastAvg > 0) {
          growth = 500; // Emerging trend indicator
        } else {
          growth = 0;
        }

        const avgInterest = trendData.averageInterest;
        const estimatedVolume = estimateSearchVolume(avgInterest, keyword);

        // Only add if meets volume threshold
        if (estimatedVolume >= MIN_KEYWORD_VOLUME) {
          solidResults.push({
            keyword,
            volume: estimatedVolume,
            growth,
            trend: trend.map((v) => Math.round((v / 100) * estimatedVolume)),
          });
          console.log(`[Research Pipeline] ✓ "${keyword}" - Volume: ${estimatedVolume}`);

          // Early exit if we've reached our target
          if (solidResults.length >= TARGET_KEYWORD_COUNT) {
            break;
          }
        } else {
          console.log(
            `[Research Pipeline] ✗ "${keyword}" - Volume ${estimatedVolume} below threshold (${MIN_KEYWORD_VOLUME})`
          );
        }
      }
    } catch (error) {
      console.error(`[Research Pipeline] Batch ${batchCount} failed:`, error);
      // Continue to next batch on error
    }
  }

  console.log(
    `[Research Pipeline] Completed with ${solidResults.length} solid results after ${batchCount} batch(es)`
  );
  return solidResults;
}

/**
 * Interpolate an array of values to exactly 12 points
 */
function interpolateTo12Points(values: number[]): number[] {
  if (values.length === 12) return values;
  if (values.length === 0) return Array(12).fill(0);

  const result: number[] = [];
  const step = (values.length - 1) / 11;

  for (let i = 0; i < 12; i++) {
    const index = i * step;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex || upperIndex >= values.length) {
      result.push(values[lowerIndex]);
    } else {
      const fraction = index - lowerIndex;
      result.push(
        Math.round(values[lowerIndex] * (1 - fraction) + values[upperIndex] * fraction)
      );
    }
  }

  return result;
}

/**
 * Estimate monthly search volume from Google Trends interest score (0-100)
 * This is a rough approximation since Google Trends doesn't provide absolute volumes
 */
function estimateSearchVolume(interest: number, keyword: string): number {
  // Base multiplier - higher interest suggests higher volume
  // This is a heuristic based on typical keyword volume ranges
  const wordCount = keyword.split(' ').length;

  // Long-tail keywords (3+ words) typically have lower volume
  let baseMultiplier: number;
  if (wordCount >= 4) {
    baseMultiplier = 100; // Long-tail: 0-10,000
  } else if (wordCount >= 2) {
    baseMultiplier = 500; // Mid-tail: 0-50,000
  } else {
    baseMultiplier = 2000; // Head terms: 0-200,000
  }

  // Scale by interest (0-100 from Google Trends)
  const volume = Math.round((interest / 100) * baseMultiplier * (50 + Math.random() * 50));

  // Ensure minimum volume
  return Math.max(volume, 100);
}

// Phase 7: Generate value ladder (offer tiers)
export async function generateValueLadder(
  input: ResearchInput,
  insights: SynthesizedInsights,
  metrics: BusinessMetrics,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<OfferTier[]> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  const prompt = `You are a business strategist specializing in pricing and offer design. Create a value ladder for this business idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

REVENUE MODEL FROM INTERVIEW:
${JSON.stringify(interviewData?.revenue_model || 'Not specified', null, 2)}

PRICING INFO FROM INTERVIEW:
${JSON.stringify(interviewData?.pricing_strategy || 'Not specified', null, 2)}
${JSON.stringify(interviewData?.price_point || 'Not specified', null, 2)}

REVENUE POTENTIAL: ${metrics.revenuePotential.estimate}
TARGET AUDIENCE: ${insights.positioning.targetAudience}

Create a 3-4 tier value ladder. Return a JSON object:
{
  "tiers": [
    {
      "tier": "lead_magnet",
      "label": "LEAD MAGNET",
      "title": "Free Tool/Resource Name",
      "price": "Free",
      "description": "A compelling free offer that demonstrates value (50-100 chars)"
    },
    {
      "tier": "frontend",
      "label": "FRONTEND",
      "title": "Entry-Level Product Name",
      "price": "$XX/month or $XX one-time",
      "description": "Low-friction entry point (50-100 chars)"
    },
    {
      "tier": "core",
      "label": "CORE",
      "title": "Main Product Name",
      "price": "$XXX/month or $XXX one-time",
      "description": "Your main revenue driver (50-100 chars)"
    },
    {
      "tier": "backend",
      "label": "BACKEND",
      "title": "Premium/Enterprise Offer",
      "price": "$XXXX+ or Custom",
      "description": "High-ticket offer for serious customers (50-100 chars)"
    }
  ]
}

Make prices realistic for the market and value delivered.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('valueLadder', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 8000, // Increased from 2500 - GPT-5.2 reasoning consumes tokens before content
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateValueLadder] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'generateValueLadder',
    model: REPORT_MODEL,
  });

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate value ladder: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateValueLadder');

  try {
    const result = JSON.parse(content) as { tiers: OfferTier[] };
    return result.tiers;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse value ladder JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
}

// Phase 8: Generate action prompts
export async function generateActionPrompts(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<ActionPrompt[]> {
  const { ideaTitle, ideaDescription } = input;

  const prompt = `You are a startup advisor. Generate actionable AI prompts that the founder can copy and use to build their business.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

POSITIONING: ${insights.positioning.uniqueValueProposition}
TARGET AUDIENCE: ${insights.positioning.targetAudience}
GTM CHANNELS: ${insights.positioning.messagingPillars.join(', ')}

Generate 4-5 useful prompts. Return a JSON object:
{
  "prompts": [
    {
      "id": "landing-page",
      "title": "Landing Page Copy",
      "description": "Generate compelling landing page content",
      "prompt": "Write a high-converting landing page for [product]. Target audience: [audience]. Key value proposition: [UVP]. Include: headline, subheadline, 3 benefit sections, social proof section, and CTA.",
      "category": "marketing"
    },
    {
      "id": "ad-copy",
      "title": "Ad Creatives",
      "description": "Create Facebook/Google ad copy",
      "prompt": "...",
      "category": "marketing"
    }
  ]
}

Categories: marketing, sales, product, content, strategy
Fill in the [brackets] with specific details from the business idea.
Make prompts immediately usable - specific and actionable.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('actionPrompts', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 8000, // Increased from 5000 - GPT-5.2 reasoning consumes tokens before content
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateActionPrompts] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'generateActionPrompts',
    model: REPORT_MODEL,
  });

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate action prompts: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateActionPrompts');

  try {
    const result = JSON.parse(content) as { prompts: ActionPrompt[] };
    return result.prompts;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse action prompts JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
}

// Phase 9: Generate social proof (MVP: AI-simulated)
export async function generateSocialProof(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SocialProof> {
  const { ideaTitle, ideaDescription } = input;

  // Get social proof guidelines from knowledge.json
  const socialProofGuidelines = KNOWLEDGE.socialProof;

  const prompt = `You are simulating social media research data. Generate realistic-looking social media posts that represent what real people might be saying about the problem this business solves.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

PAIN POINTS:
${JSON.stringify(insights.painPoints, null, 2)}

TARGET AUDIENCE: ${insights.positioning.targetAudience}

## AUTHENTICITY REQUIREMENTS
${socialProofGuidelines.requirements.map(r => `- ${r}`).join('\n')}

Generate simulated social proof data. Return a JSON object:
{
  "posts": [
    {
      "platform": "reddit",
      "author": "u/realistic_username",
      "content": "A realistic post about the pain point (100-200 chars). Should sound like real people venting or asking for solutions.",
      "url": "https://reddit.com/r/relevant_subreddit/comments/abc123",
      "engagement": {
        "upvotes": 234,
        "comments": 45
      },
      "date": "2024-01-15",
      "sentiment": "negative",
      "relevanceScore": 85
    },
    {
      "platform": "twitter",
      "author": "@realistic_handle",
      "content": "Tweet about the problem or a workaround (under 280 chars)",
      "url": "https://twitter.com/handle/status/123456",
      "engagement": {
        "likes": 89,
        "comments": 12,
        "shares": 23
      },
      "date": "2024-02-20",
      "sentiment": "neutral",
      "relevanceScore": 72
    }
  ],
  "summary": "A 2-3 sentence summary of what people are saying online about this problem. Highlight common themes.",
  "painPointsValidated": ["Pain point 1 that is confirmed by social data", "Pain point 2"],
  "demandSignals": ["Signal 1 indicating market demand", "Signal 2"]
}

Generate 4-6 realistic posts across reddit, twitter, and facebook.
Make the content sound authentic - including typos, casual language, and real frustrations.
Dates should be within the last 6 months.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('socialProof', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 8000, // Increased from 3000 - GPT-5.2 reasoning consumes tokens before content
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateSocialProof] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'generateSocialProof',
    model: REPORT_MODEL,
  });

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate social proof: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateSocialProof');

  try {
    return JSON.parse(content) as SocialProof;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse social proof JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
}

// Phase 10: Generate Tech Stack Recommendations
export async function generateTechStack(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<TechStackData> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  // Extract relevant interview data for tech stack inference
  const solutionDescription = interviewData?.solution_description?.value || '';
  const solutionFeatures = interviewData?.solution_key_features?.value || '';
  const revenueModel = interviewData?.revenue_model?.value || '';
  const pricingStrategy = interviewData?.pricing_strategy?.value || '';
  const gtmChannels = interviewData?.gtm_channels?.value || '';

  const prompt = `You are a senior technical architect advising startups on their technology stack. Analyze this business idea and provide detailed tech stack recommendations.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

SOLUTION DETAILS:
- Description: ${solutionDescription}
- Key Features: ${solutionFeatures}
- Revenue Model: ${revenueModel}
- Pricing: ${pricingStrategy}
- GTM Channels: ${gtmChannels}

MARKET CONTEXT:
- Target Audience: ${insights.positioning.targetAudience}
- Value Proposition: ${insights.positioning.uniqueValueProposition}
- Competitors: ${insights.competitors.slice(0, 3).map(c => c.name).join(', ')}

BUSINESS TYPE CLASSIFICATION:
First, determine the business type from these categories:
- "saas": Web apps, mobile apps, APIs, developer tools, B2B software
- "ecommerce": Online stores, marketplaces, subscription boxes, D2C brands
- "service": Consulting, agencies, freelance platforms, professional services
- "content": Blogs, newsletters, podcasts, video platforms, media companies

Return a comprehensive JSON object with tech stack recommendations:
{
  "businessType": "saas" | "ecommerce" | "service" | "content",
  "businessTypeConfidence": "high" | "medium" | "low",
  "businessTypeReasoning": "Brief explanation of why this business type was selected",

  "layers": {
    "frontend": [
      {
        "name": "Next.js",
        "category": "Framework",
        "purpose": "Full-stack React framework with SSR/SSG for fast loading and SEO",
        "alternatives": ["Remix", "Nuxt.js", "SvelteKit"],
        "complexity": "medium",
        "monthlyEstimate": "$0",
        "learnMoreUrl": "https://nextjs.org"
      }
    ],
    "backend": [
      {
        "name": "Node.js + tRPC",
        "category": "API Layer",
        "purpose": "Type-safe API with end-to-end TypeScript",
        "alternatives": ["Express", "Fastify", "NestJS"],
        "complexity": "medium",
        "monthlyEstimate": "$0"
      }
    ],
    "database": [
      {
        "name": "PostgreSQL",
        "category": "Primary Database",
        "purpose": "Reliable relational database for structured data",
        "alternatives": ["MySQL", "PlanetScale"],
        "complexity": "medium",
        "monthlyEstimate": "$0-25"
      }
    ],
    "hosting": [
      {
        "name": "Vercel",
        "category": "Frontend Hosting",
        "purpose": "Optimized for Next.js with global CDN",
        "alternatives": ["Netlify", "Cloudflare Pages"],
        "complexity": "low",
        "monthlyEstimate": "$0-20"
      }
    ],
    "devops": [
      {
        "name": "GitHub Actions",
        "category": "CI/CD",
        "purpose": "Automated testing and deployment",
        "alternatives": ["GitLab CI", "CircleCI"],
        "complexity": "low",
        "monthlyEstimate": "$0"
      }
    ],
    "thirdParty": [
      {
        "name": "Stripe",
        "category": "Payments",
        "purpose": "Handle subscriptions and one-time payments",
        "alternatives": ["Paddle", "LemonSqueezy"],
        "complexity": "medium",
        "monthlyEstimate": "2.9% + $0.30/txn"
      }
    ]
  },

  "estimatedMonthlyCost": {
    "min": 0,
    "max": 150,
    "breakdown": [
      { "category": "Hosting", "item": "Vercel Pro", "estimate": "$0-20" },
      { "category": "Database", "item": "Supabase/Railway", "estimate": "$0-25" },
      { "category": "Email", "item": "Resend/SendGrid", "estimate": "$0-20" },
      { "category": "Monitoring", "item": "Sentry", "estimate": "$0-26" }
    ]
  },

  "scalabilityNotes": "This stack scales horizontally. Start with free tiers, upgrade as you grow. Database is typically the first bottleneck - add read replicas when needed.",

  "securityConsiderations": [
    "Use environment variables for all secrets",
    "Implement rate limiting on API endpoints",
    "Set up HTTPS and secure headers",
    "Regular dependency updates for security patches"
  ],

  "summary": "A concise 2-3 sentence summary of why this tech stack is ideal for this business."
}

IMPORTANT GUIDELINES:
1. Tailor recommendations to the SPECIFIC business type and requirements
2. For SaaS: Focus on scalability, authentication, real-time features
3. For E-commerce: Focus on payments, inventory, shipping integrations
4. For Service: Focus on booking, CRM, invoicing, client portals
5. For Content: Focus on CMS, SEO, email marketing, analytics
6. Include REALISTIC cost estimates (many tools have free tiers)
7. Consider solo founder or small team capabilities
8. Prioritize proven, well-documented technologies
9. Include both open-source and paid options where relevant`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('techStack', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 20000, // Increased from 8000 - GPT-5.2 reasoning consumes significant tokens before content
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateTechStack] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Track token usage (fire-and-forget)
  trackUsageFromResponse(response, {
    functionName: 'generateTechStack',
    model: REPORT_MODEL,
  });

  // Check for incomplete response (e.g., model ran out of tokens during reasoning)
  const resp = response as unknown as Record<string, unknown>;
  if (resp.status === 'incomplete') {
    const details = resp.incomplete_details as Record<string, unknown> | undefined;
    const reason = details?.reason || 'unknown';
    throw new ResponseParseError(
      `Failed to generate tech stack: response incomplete (reason: ${reason}). Model may have exhausted tokens during reasoning.`,
      response
    );
  }

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate tech stack: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateTechStack');

  try {
    return JSON.parse(content) as TechStackData;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse tech stack JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
}

// =============================================================================
// MAIN PIPELINE - New 4-Phase Architecture
// =============================================================================

/**
 * Main research pipeline with o3-deep-research integration.
 *
 * NEW ARCHITECTURE:
 * - Phase 1 (0-30%): Deep Research - o3-deep-research for market/competitor research
 * - Phase 2 (30-55%): Social Proof - o3-deep-research with social domain filtering
 * - Phase 3 (55-80%): Synthesis - GPT-5.2 for structured data extraction
 * - Phase 4 (80-100%): Creative Generation - GPT-5.2 for report writing
 *
 * Both Phase 1 and 2 use o3-deep-research for real web search with citations.
 * Phase 3 and 4 use GPT-5.2 for reasoning and report generation.
 */
// Existing research data for resume functionality
export interface ExistingResearchData {
  rawDeepResearch?: DeepResearchOutput | null;
  researchChunks?: ChunkedResearchData | null; // NEW: for chunked research resume
  socialProof?: SocialProof | null;
  synthesizedInsights?: SynthesizedInsights | null;
  opportunityScore?: number | null;
  problemScore?: number | null;
  feasibilityScore?: number | null;
  whyNowScore?: number | null;
  scoreJustifications?: ResearchScores['justifications'] | null;
  scoreMetadata?: ResearchScores['metadata'] | null;
  revenuePotential?: BusinessMetrics['revenuePotential'] | null;
  executionDifficulty?: BusinessMetrics['executionDifficulty'] | null;
  gtmClarity?: BusinessMetrics['gtmClarity'] | null;
  founderFit?: BusinessMetrics['founderFit'] | null;
  marketSizing?: MarketSizingData | null; // TAM/SAM/SOM market sizing
  userStory?: UserStory | null;
  valueLadder?: OfferTier[] | null;
  actionPrompts?: ActionPrompt[] | null;
  keywordTrends?: KeywordTrend[] | null;
  techStack?: TechStackData | null; // Tech stack recommendations
  businessPlan?: string | null;
}

// =============================================================================
// PHASE 5: COMPREHENSIVE BUSINESS PLAN GENERATION
// Uses GPT-5.2 with xhigh reasoning + xhigh verbosity to write an extensive
// investor-ready business plan in markdown format from all research data.
// =============================================================================

export async function generateBusinessPlan(
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores | null,
  metrics: BusinessMetrics | null,
  marketSizing: MarketSizingData | null,
  socialProof: SocialProof | null,
  userStory: UserStory | null,
  valueLadder: OfferTier[] | null,
  techStack: TechStackData | null,
  deepResearch: DeepResearchOutput | null,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<string> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  // Build a comprehensive data dump for the model
  const dataContext = `
## RAW DEEP RESEARCH
${deepResearch?.rawReport ?? 'Not available'}

## CITATIONS & SOURCES
${deepResearch?.citations ? JSON.stringify(deepResearch.citations, null, 2) : 'Not available'}

## SYNTHESIZED MARKET ANALYSIS
${JSON.stringify(insights.marketAnalysis, null, 2)}

## COMPETITIVE LANDSCAPE
${JSON.stringify(insights.competitors, null, 2)}

## CUSTOMER PAIN POINTS
${JSON.stringify(insights.painPoints, null, 2)}

## POSITIONING & VALUE PROPOSITION
${JSON.stringify(insights.positioning, null, 2)}

## WHY NOW / MARKET TIMING
${JSON.stringify(insights.whyNow, null, 2)}

## PROOF SIGNALS & DEMAND INDICATORS
${JSON.stringify(insights.proofSignals, null, 2)}

## SCORES
${scores ? JSON.stringify({
  opportunity: { value: scores.opportunityScore, justification: scores.justifications?.opportunity?.justification, confidence: scores.justifications?.opportunity?.confidence },
  problem: { value: scores.problemScore, justification: scores.justifications?.problem?.justification, confidence: scores.justifications?.problem?.confidence },
  feasibility: { value: scores.feasibilityScore, justification: scores.justifications?.feasibility?.justification, confidence: scores.justifications?.feasibility?.confidence },
  whyNow: { value: scores.whyNowScore, justification: scores.justifications?.whyNow?.justification, confidence: scores.justifications?.whyNow?.confidence },
}, null, 2) : 'Not available'}

## BUSINESS METRICS
${metrics ? JSON.stringify(metrics, null, 2) : 'Not available'}

## MARKET SIZING (TAM/SAM/SOM)
${marketSizing ? JSON.stringify(marketSizing, null, 2) : 'Not available'}

## SOCIAL PROOF & DEMAND VALIDATION
${socialProof ? JSON.stringify({ summary: socialProof.summary, demandSignals: socialProof.demandSignals, painPointsValidated: socialProof.painPointsValidated, postCount: socialProof.posts?.length }, null, 2) : 'Not available'}

## USER STORY
${userStory ? JSON.stringify(userStory, null, 2) : 'Not available'}

## VALUE LADDER / PRICING TIERS
${valueLadder ? JSON.stringify(valueLadder, null, 2) : 'Not available'}

## TECH STACK RECOMMENDATIONS
${techStack ? JSON.stringify(techStack, null, 2) : 'Not available'}

## INTERVIEW DATA
${interviewData ? JSON.stringify(interviewData, null, 2) : 'Not available'}
`;

  const prompt = `You are a senior strategy consultant and business plan writer. Using ALL of the research data provided below, write a comprehensive, investor-ready business plan for the following business idea.

BUSINESS IDEA: ${ideaTitle}
DESCRIPTION: ${ideaDescription}

=== RESEARCH DATA ===
${dataContext}
=== END RESEARCH DATA ===

Write an extensive, detailed business plan in markdown format. This should read as a polished, professional document that could be presented to investors, partners, or used as an internal strategic blueprint. Use specific numbers, data points, and citations from the research wherever possible.

The business plan MUST include ALL of the following sections with substantial depth:

# 1. Executive Summary
A compelling 2-3 paragraph overview of the entire opportunity. Include the core value proposition, target market size, revenue model, and why this venture will succeed. This should stand alone as a pitch.

# 2. Problem & Solution
- Clearly articulate the problem with evidence from the research (pain points, social proof, demand signals)
- Present the solution and explain exactly how it addresses each pain point
- Include the user story/scenario to make it tangible

# 3. Market Analysis
- Total Addressable Market (TAM), Serviceable Addressable Market (SAM), Serviceable Obtainable Market (SOM) with dollar figures
- Market growth rates and projections
- Key market trends driving opportunity
- Market segments and their characteristics
- Include methodology and sources

# 4. Competitive Landscape & Positioning
- Detailed analysis of each competitor (strengths, weaknesses, positioning)
- Competitive matrix showing differentiation
- Unique value proposition and defensible advantages
- Positioning strategy and messaging pillars

# 5. Business Model & Revenue Strategy
- Revenue streams and pricing model (reference the value ladder tiers)
- Unit economics and margin assumptions
- Customer lifetime value and acquisition cost estimates
- Monetization roadmap from MVP to scale

# 6. Go-to-Market Strategy
- Target customer segments and ideal customer profile
- Customer acquisition channels (ranked by expected ROI)
- Launch strategy and first 90 days plan
- Partnership and distribution opportunities
- Content and brand strategy

# 7. Customer Profile & Pain Points
- Detailed ideal customer persona
- Pain point severity analysis with evidence
- Current solutions and their gaps
- Customer journey from awareness to purchase

# 8. Financial Projections (3-Year)
- Year 1, Year 2, Year 3 revenue projections with assumptions
- Cost structure breakdown (fixed vs variable)
- Path to profitability timeline
- Key financial metrics (burn rate, runway, break-even)
- Sensitivity analysis on key assumptions

# 9. Product & Technology
- Product roadmap (MVP → V1 → V2)
- Technology stack recommendations with rationale
- Build vs buy decisions
- Estimated development costs and timeline
- Security and scalability considerations

# 10. Team & Operations
- Key roles needed and hiring priorities
- Organizational structure at different stages
- Advisory board recommendations
- Operational processes and tools

# 11. Risk Analysis & Mitigation
- Market risks and mitigation strategies
- Execution risks and contingencies
- Competitive risks and defensive moats
- Regulatory and compliance considerations
- Technology risks

# 12. Funding Requirements & Use of Proceeds
- Capital needed by stage (pre-seed, seed, Series A)
- Detailed allocation of funds
- Milestones tied to each funding round
- Cap table assumptions and dilution expectations

# 13. Exit Strategy
- Potential exit paths (acquisition, IPO, strategic partnership)
- Comparable exits in the space with valuations
- Timeline to exit
- Key value drivers that increase exit multiple

Write with authority and specificity. Every claim should be backed by data from the research. Use markdown formatting with headers, bullet points, bold text, and tables where appropriate. Aim for a comprehensive document that leaves no strategic question unanswered.`;

  // Use Claude Opus for business plan generation (best long-form writing)
  const businessPlanProvider = getBusinessPlanProvider(tier);
  console.log('[Generate Business Plan] Using provider:', businessPlanProvider.name);

  const businessPlan = await businessPlanProvider.generate(prompt, {
    maxTokens: 50000,
    temperature: 1.0,
  });

  return businessPlan;
}

// OLD IMPLEMENTATION (keep temporarily for reference)
async function generateBusinessPlanOLD_DEPRECATED(
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores | null,
  metrics: BusinessMetrics | null,
  marketSizing: MarketSizingData | null,
  socialProof: SocialProof | null,
  userStory: UserStory | null,
  valueLadder: OfferTier[] | null,
  techStack: TechStackData | null,
  deepResearch: DeepResearchOutput | null,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<string> {
  // OLD OpenAI implementation - replaced by provider pattern above
  const aiParams = getAIParams('businessPlan', tier);

  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: '', // prompt removed
        max_output_tokens: 50000,
      }, aiParams)
    ),
    {
      maxAttempts: 3,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateBusinessPlan] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  trackUsageFromResponse(response, {
    functionName: 'generateBusinessPlan',
    model: REPORT_MODEL,
  });

  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate business plan: no content in response', response);
  }

  console.log(`[generateBusinessPlan] Generated business plan: ${content.length} characters`);
  return content;
}

// Intermediate data that can be saved during pipeline execution for resume capability
export interface IntermediateResearchData {
  deepResearch?: DeepResearchOutput;
  researchChunks?: ChunkedResearchData; // Chunk progress within DEEP_RESEARCH phase
  socialProof?: SocialProof;
  insights?: SynthesizedInsights;
  scores?: ResearchScores;
  metrics?: BusinessMetrics;
  marketSizing?: MarketSizingData; // TAM/SAM/SOM market sizing
}

export async function runResearchPipeline(
  input: ResearchInput,
  onProgress?: (phase: string, progress: number, intermediateData?: IntermediateResearchData) => Promise<void>,
  tier: SubscriptionTier = 'ENTERPRISE',
  existingResearch?: ExistingResearchData // NEW: for resume functionality
): Promise<{
  queries: GeneratedQueries;
  insights: SynthesizedInsights;
  scores: ResearchScores | null;
  metrics: BusinessMetrics | null;
  marketSizing: MarketSizingData | null;
  userStory: UserStory | null;
  keywordTrends: KeywordTrend[];
  valueLadder: OfferTier[] | null;
  actionPrompts: ActionPrompt[] | null;
  socialProof: SocialProof;
  techStack: TechStackData | null;
  deepResearch?: DeepResearchOutput; // New: raw research data
  businessPlan: string | null;
}> {
  console.log('[Research Pipeline] Starting NEW 4-phase pipeline for:', input.ideaTitle);
  console.log('[Research Pipeline] Using tier:', tier);
  console.log('[Research Pipeline] o3-deep-research model:', tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL);

  // Check for resume data
  // Phase 1: Deep market research (o3-deep-research)
  const hasPhase1 = existingResearch?.rawDeepResearch?.rawReport;
  // Phase 2: Social proof research (o3-deep-research) - NO GPT-5.2 calls
  const hasPhase2 = existingResearch?.socialProof?.posts;
  // Phase 3: ALL GPT-5.2 extraction (insights + scores + metrics)
  const hasPhase3 = existingResearch?.synthesizedInsights && existingResearch?.opportunityScore != null;
  // Phase 4: Creative generation (user story, value ladder, action prompts)
  const hasPhase4 = existingResearch?.userStory != null;
  const hasPhase5 = existingResearch?.businessPlan != null;

  if (hasPhase1 || hasPhase2 || hasPhase3 || hasPhase4 || hasPhase5) {
    console.log('[Research Pipeline] RESUME MODE - Existing data detected');
    console.log('[Research Pipeline] Phase 1 (deepResearch - o3):', hasPhase1 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 2 (socialProof - o3):', hasPhase2 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 3 (extraction - GPT-5.2):', hasPhase3 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 4 (generation - GPT-5.2):', hasPhase4 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 5 (businessPlan - GPT-5.2):', hasPhase5 ? 'SKIP' : 'RUN');
  }

  // =========================================================================
  // PHASE 1: DEEP MARKET RESEARCH (0-30%)
  // Uses CHUNKED o3-deep-research to avoid rate limits
  // Each chunk covers: Market Analysis, Competitors, Pain Points, Timing
  // =========================================================================
  let deepResearch: DeepResearchOutput;

  if (hasPhase1 && existingResearch?.rawDeepResearch) {
    console.log('[Research Pipeline] === PHASE 1: SKIPPED (resuming from existing data) ===');
    deepResearch = existingResearch.rawDeepResearch;
    await onProgress?.('DEEP_RESEARCH', 30);
  } else {
    await onProgress?.('DEEP_RESEARCH', 5);
    console.log('[Research Pipeline] === PHASE 1: Chunked Deep Research (o3-deep-research) ===');

    // Use chunked research to avoid 200k TPM rate limit
    // Each chunk is ~40-50k tokens with 60s delay between chunks
    deepResearch = await runChunkedDeepResearch(
      input,
      tier,
      onProgress, // Progress callback handles intermediate saves
      existingResearch?.researchChunks || undefined // Resume from existing chunks
    );

    // Final save with complete deep research data
    await onProgress?.('DEEP_RESEARCH', 30, { deepResearch });
    console.log('[Research Pipeline] Chunked research complete:', deepResearch.citations.length, 'citations');
  }

  // =========================================================================
  // PHASE 2: SOCIAL PROOF RESEARCH (30-55%)
  // Uses o3-deep-research ONLY - no GPT-5.2 calls
  // o3 will identify pain points directly from the raw research report
  // =========================================================================
  let socialProof: SocialProof;

  if (hasPhase2 && existingResearch?.socialProof) {
    console.log('[Research Pipeline] === PHASE 2: SKIPPED (resuming from existing data) ===');
    socialProof = existingResearch.socialProof;
    await onProgress?.('SOCIAL_RESEARCH', 55);
  } else {
    await onProgress?.('SOCIAL_RESEARCH', 35);
    console.log('[Research Pipeline] === PHASE 2: Social Proof Research (o3-deep-research) ===');

    // Pass raw deep research - o3 will identify pain points itself
    // This keeps Phase 2 purely o3-based with no GPT-5.2 calls
    socialProof = await fetchSocialProof(input, deepResearch, tier);
    await onProgress?.('SOCIAL_RESEARCH', 55, { socialProof });
    console.log('[Research Pipeline] Social proof gathered:', socialProof.posts.length, 'posts');
  }

  // =========================================================================
  // PHASE 3: SYNTHESIS & SCORING (55-80%)
  // ALL GPT-5.2 extraction happens here AFTER all o3 research is complete
  // This includes extractInsights which was previously in Phase 2
  // =========================================================================
  let insights: SynthesizedInsights;
  let scores: ResearchScores | null;
  let metrics: BusinessMetrics | null;
  let marketSizing: MarketSizingData | null;

  if (hasPhase3 && existingResearch?.synthesizedInsights && existingResearch?.opportunityScore != null && existingResearch?.scoreJustifications && existingResearch?.revenuePotential && existingResearch?.marketSizing) {
    console.log('[Research Pipeline] === PHASE 3: SKIPPED (resuming from existing data) ===');
    insights = existingResearch.synthesizedInsights;
    scores = {
      opportunityScore: existingResearch.opportunityScore!,
      problemScore: existingResearch.problemScore!,
      feasibilityScore: existingResearch.feasibilityScore!,
      whyNowScore: existingResearch.whyNowScore!,
      justifications: existingResearch.scoreJustifications,
      metadata: existingResearch.scoreMetadata || { passCount: 0, maxDeviation: 0, averageConfidence: 0, flagged: false },
    };
    metrics = {
      revenuePotential: existingResearch.revenuePotential,
      executionDifficulty: existingResearch.executionDifficulty || { rating: 'moderate' as const, factors: [], soloFriendly: false },
      gtmClarity: existingResearch.gtmClarity || { rating: 'moderate' as const, channels: [], confidence: 0 },
      founderFit: existingResearch.founderFit || { percentage: 0, strengths: [], gaps: [] },
    };
    marketSizing = existingResearch.marketSizing;
    await onProgress?.('SYNTHESIS', 80);
  } else {
    await onProgress?.('SYNTHESIS', 58);
    console.log('[Research Pipeline] === PHASE 3: Extraction & Synthesis (GPT-5.2) ===');

    // Step 1: Extract structured insights from raw deep research (moved from Phase 2)
    console.log('[Research Pipeline] Extracting insights from deep research...');
    insights = await extractInsights(deepResearch, input, tier);
    await onProgress?.('SYNTHESIS', 65, { insights });
    console.log('[Research Pipeline] Insights extracted successfully');

    // Step 2: Run scores, metrics, and market sizing in parallel with GPT-5.2 reasoning
    // Uses Promise.allSettled so individual failures don't lose sibling results
    console.log('[Research Pipeline] Calculating scores, metrics, and market sizing...');
    const phase3Results = await Promise.allSettled([
      extractScores(deepResearch, input, insights, tier),
      extractBusinessMetrics(deepResearch, input, insights, { opportunityScore: 0, problemScore: 0, feasibilityScore: 0, whyNowScore: 0, justifications: {} as ResearchScores['justifications'], metadata: {} as ResearchScores['metadata'] }, tier),
      extractMarketSizing(deepResearch, input, insights, tier),
    ]);
    const phase3Names = ['extractScores', 'extractBusinessMetrics', 'extractMarketSizing'] as const;
    phase3Results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Research Pipeline] Phase 3 FAILED: ${phase3Names[i]}:`, r.reason instanceof Error ? r.reason.message : r.reason);
      }
    });
    scores = phase3Results[0].status === 'fulfilled' ? phase3Results[0].value : null;
    metrics = phase3Results[1].status === 'fulfilled' ? phase3Results[1].value : null;
    marketSizing = phase3Results[2].status === 'fulfilled' ? phase3Results[2].value : null;
    // Pass all extraction results for immediate persistence (enables resume if Phase 4 fails)
    await onProgress?.('SYNTHESIS', 80, { insights, scores: scores ?? undefined, metrics: metrics ?? undefined, marketSizing: marketSizing ?? undefined });
    const phase3Succeeded = phase3Results.filter(r => r.status === 'fulfilled').length;
    console.log(`[Research Pipeline] Phase 3 complete: ${phase3Succeeded}/3 succeeded`);
  }

  // =========================================================================
  // PHASE 4: CREATIVE GENERATION (80-100%)
  // Uses GPT-5.2 for user story, value ladder, action prompts, tech stack
  // =========================================================================
  let userStory: UserStory | null;
  let valueLadder: OfferTier[] | null;
  let actionPrompts: ActionPrompt[] | null;
  let keywordTrends: KeywordTrend[];
  let techStack: TechStackData | null;

  if (hasPhase4 && existingResearch?.userStory && existingResearch?.valueLadder && existingResearch?.actionPrompts && existingResearch?.techStack) {
    console.log('[Research Pipeline] === PHASE 4: SKIPPED (resuming from existing data) ===');
    userStory = existingResearch.userStory;
    valueLadder = existingResearch.valueLadder;
    actionPrompts = existingResearch.actionPrompts;
    keywordTrends = existingResearch.keywordTrends || [];
    techStack = existingResearch.techStack;
    await onProgress?.('REPORT_GENERATION', 98);
  } else {
    await onProgress?.('REPORT_GENERATION', 85);
    console.log('[Research Pipeline] === PHASE 4: Creative Generation (GPT-5.2) ===');

    // Run creative generation in parallel
    // Uses Promise.allSettled so individual failures don't lose sibling results
    const fallbackMetrics: BusinessMetrics = {
      revenuePotential: { rating: 'medium' as const, estimate: 'Unknown', confidence: 0 },
      executionDifficulty: { rating: 'moderate' as const, factors: [], soloFriendly: false },
      gtmClarity: { rating: 'moderate' as const, channels: [], confidence: 0 },
      founderFit: { percentage: 0, strengths: [], gaps: [] },
    };
    const phase4Results = await Promise.allSettled([
      generateUserStory(input, insights, tier),
      generateValueLadder(input, insights, metrics ?? fallbackMetrics, tier),
      generateActionPrompts(input, insights, tier),
      generateTechStack(input, insights, tier),
    ]);
    const phase4Names = ['generateUserStory', 'generateValueLadder', 'generateActionPrompts', 'generateTechStack'] as const;
    phase4Results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Research Pipeline] Phase 4 FAILED: ${phase4Names[i]}:`, r.reason instanceof Error ? r.reason.message : r.reason);
      }
    });
    userStory = phase4Results[0].status === 'fulfilled' ? phase4Results[0].value : null;
    valueLadder = phase4Results[1].status === 'fulfilled' ? phase4Results[1].value : null;
    actionPrompts = phase4Results[2].status === 'fulfilled' ? phase4Results[2].value : null;
    techStack = phase4Results[3].status === 'fulfilled' ? phase4Results[3].value : null;
    const phase4Succeeded = phase4Results.filter(r => r.status === 'fulfilled').length;
    await onProgress?.('REPORT_GENERATION', 95);
    console.log(`[Research Pipeline] Phase 4 complete: ${phase4Succeeded}/4 succeeded`);

    // Keyword trends (uses SerpAPI for Google Trends - keep this separate)
    try {
      keywordTrends = await generateKeywordTrends(input, insights, tier);
    } catch (err) {
      console.error('[Research Pipeline] Keyword trends failed:', err instanceof Error ? err.message : err);
      keywordTrends = [];
    }
    await onProgress?.('REPORT_GENERATION', 90);
    console.log('[Research Pipeline] Keyword trends:', keywordTrends.length, 'keywords');
  }

  // =========================================================================
  // PHASE 5: BUSINESS PLAN GENERATION (90-100%)
  // Uses GPT-5.2 with xhigh reasoning + xhigh verbosity to write a
  // comprehensive investor-ready business plan from all accumulated data
  // =========================================================================
  let businessPlan: string | null;

  if (hasPhase5 && existingResearch?.businessPlan) {
    console.log('[Research Pipeline] === PHASE 5: SKIPPED (resuming from existing data) ===');
    businessPlan = existingResearch.businessPlan;
    await onProgress?.('BUSINESS_PLAN_GENERATION', 98);
  } else {
    await onProgress?.('BUSINESS_PLAN_GENERATION', 92);
    console.log('[Research Pipeline] === PHASE 5: Business Plan Generation (GPT-5.2 xhigh) ===');

    try {
      businessPlan = await generateBusinessPlan(
        input,
        insights,
        scores,
        metrics,
        marketSizing,
        socialProof,
        userStory,
        valueLadder,
        techStack,
        deepResearch,
        tier
      );
      console.log(`[Research Pipeline] Phase 5 complete: business plan generated (${businessPlan.length} chars)`);
    } catch (err) {
      console.error('[Research Pipeline] Phase 5 FAILED: generateBusinessPlan:', err instanceof Error ? err.message : err);
      businessPlan = null;
    }
    await onProgress?.('BUSINESS_PLAN_GENERATION', 98);
  }

  await onProgress?.('COMPLETE', 100);
  console.log('[Research Pipeline] === COMPLETE ===');

  // Generate empty queries for backward compatibility
  // (no longer used in new pipeline but kept for API compatibility)
  const queries: GeneratedQueries = {
    marketQueries: [],
    competitorQueries: [],
    customerQueries: [],
    trendQueries: [],
  };

  return {
    queries,
    insights,
    scores,
    metrics,
    marketSizing,
    userStory,
    keywordTrends,
    valueLadder,
    actionPrompts,
    socialProof,
    techStack,
    deepResearch, // Include raw research for debugging/display
    businessPlan,
  };
}

// =============================================================================
// LEGACY PIPELINE (for fallback if deep research is disabled)
// =============================================================================

/**
 * Original 9-phase pipeline using GPT-5.2 only.
 * @deprecated Use runResearchPipeline which uses o3-deep-research
 */
export async function runLegacyResearchPipeline(
  input: ResearchInput,
  onProgress?: (phase: string, progress: number) => Promise<void>,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<{
  queries: GeneratedQueries;
  insights: SynthesizedInsights;
  scores: ResearchScores;
  metrics: BusinessMetrics;
  userStory: UserStory;
  keywordTrends: KeywordTrend[];
  valueLadder: OfferTier[];
  actionPrompts: ActionPrompt[];
  socialProof: SocialProof;
}> {
  console.log('[Legacy Pipeline] Starting 9-phase pipeline for:', input.ideaTitle);
  console.log('[Legacy Pipeline] Using tier:', tier);

  // Phase 1: Generate queries
  await onProgress?.('QUERY_GENERATION', 5);
  const queries = await generateSearchQueries(input, tier);
  await onProgress?.('QUERY_GENERATION', 10);

  // Phase 2: Synthesize insights
  await onProgress?.('SYNTHESIS', 15);
  const insights = await synthesizeInsights(input, queries, tier);
  await onProgress?.('SYNTHESIS', 30);

  // Phase 3: Calculate scores
  await onProgress?.('SYNTHESIS', 35);
  const scores = await calculateScores(input, insights, tier);
  await onProgress?.('SYNTHESIS', 45);

  // Phase 4: Calculate business metrics
  await onProgress?.('SYNTHESIS', 50);
  const metrics = await calculateBusinessMetrics(input, insights, scores, tier);
  await onProgress?.('SYNTHESIS', 55);

  // Phase 5: Generate user story
  await onProgress?.('REPORT_GENERATION', 60);
  const userStory = await generateUserStory(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 65);

  // Phase 6: Generate keyword trends
  await onProgress?.('REPORT_GENERATION', 70);
  const keywordTrends = await generateKeywordTrends(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 75);

  // Phase 7: Generate value ladder
  await onProgress?.('REPORT_GENERATION', 80);
  const valueLadder = await generateValueLadder(input, insights, metrics, tier);
  await onProgress?.('REPORT_GENERATION', 85);

  // Phase 8: Generate action prompts
  await onProgress?.('REPORT_GENERATION', 88);
  const actionPrompts = await generateActionPrompts(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 92);

  // Phase 9: Generate social proof (simulated)
  await onProgress?.('REPORT_GENERATION', 95);
  const socialProof = await generateSocialProof(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 98);

  await onProgress?.('COMPLETE', 100);

  return {
    queries,
    insights,
    scores,
    metrics,
    userStory,
    keywordTrends,
    valueLadder,
    actionPrompts,
    socialProof,
  };
}
