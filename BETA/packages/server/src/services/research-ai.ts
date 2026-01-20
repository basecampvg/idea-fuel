import { openai, getAIParams, createResponsesParams, createResponsesParamsWithWebSearch, withExponentialBackoff } from '../lib/openai';
import { configService } from './config';
import type { SubscriptionTier } from '@prisma/client';
import { getResearchKnowledge, KNOWLEDGE } from '../lib/knowledge';
import type { InterviewDataPoints } from '@forge/shared';
import {
  batchGetTrendData,
  isSerpApiConfigured,
  type TrendData,
} from '../lib/serpapi';
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

// Model for post-processing tasks (interpreting research, generating reports)
const REPORT_MODEL = 'gpt-5.2';

// Types for research pipeline
export interface ResearchInput {
  ideaTitle: string;
  ideaDescription: string;
  interviewData: Partial<InterviewDataPoints> | null;
  interviewMessages: Array<{ role: string; content: string }>;
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
  engagement: {
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
  const { ideaTitle, ideaDescription, interviewData, interviewMessages } = input;

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
  const userQuery = `## BUSINESS IDEA
**Title:** ${ideaTitle}
**Description:** ${ideaDescription}

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
    progressEnd: 12,
    focus: 'Market size, growth rate, trends, dynamics, and industry analysis',
    getDomains: () => [...SEARCH_DOMAINS.market],
  },
  {
    id: 'competitors',
    name: 'Competitor Research',
    progressStart: 12,
    progressEnd: 19,
    focus: 'Direct and indirect competitors, their positioning, strengths, weaknesses, and market share',
    getDomains: () => [...SEARCH_DOMAINS.competitor, ...SEARCH_DOMAINS.startup],
  },
  {
    id: 'painpoints',
    name: 'Customer Pain Points',
    progressStart: 19,
    progressEnd: 25,
    focus: 'Evidence of customer pain points from forums, reviews, social media, and discussions',
    getDomains: () => [...SEARCH_DOMAINS.social],
  },
  {
    id: 'timing',
    name: 'Timing & Validation',
    progressStart: 25,
    progressEnd: 30,
    focus: 'Market timing factors, why now indicators, recent changes, and validation signals',
    getDomains: () => [...SEARCH_DOMAINS.market],
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
  const { ideaTitle, ideaDescription, interviewData, interviewMessages } = input;

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

  // Process each chunk sequentially
  for (let i = 0; i < RESEARCH_CHUNKS.length; i++) {
    const chunk = RESEARCH_CHUNKS[i];

    // Skip if chunk already completed (resume support)
    if (results[chunk.id]) {
      console.log(`[Chunked Research] Skipping ${chunk.name} (already completed)`);
      await onProgress?.('DEEP_RESEARCH', chunk.progressEnd);
      continue;
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
        model
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
  model: string
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

  const userQuery = `## BUSINESS IDEA
**Title:** ${ideaTitle}
**Description:** ${ideaDescription}

## FOUNDER CONTEXT
${interviewData ? JSON.stringify(interviewData, null, 2) : 'No additional context provided.'}

## INTERVIEW CONTEXT
${interviewContext || 'No interview transcript available.'}

---

## RESEARCH FOCUS: ${chunk.name.toUpperCase()}
${chunk.focus}

Provide specific, actionable insights with citations. Focus only on this research area.`;

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
function extractResponseContent(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const resp = response as Record<string, unknown>;

  // Try output_text first (standard Responses API format)
  if (resp.output_text && typeof resp.output_text === 'string') {
    return resp.output_text;
  }

  // Try output array (deep research / background mode format)
  if (Array.isArray(resp.output)) {
    // Find the message output in the array
    const messageOutput = resp.output.find(
      (item: unknown) =>
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).type === 'message'
    ) as Record<string, unknown> | undefined;

    if (messageOutput?.content && Array.isArray(messageOutput.content)) {
      const textContent = messageOutput.content[0] as Record<string, unknown> | undefined;
      if (textContent?.text && typeof textContent.text === 'string') {
        return textContent.text;
      }
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

  return null;
}

/**
 * Validates that JSON content appears complete (not truncated).
 * Checks that the content ends with a closing brace or bracket.
 * Throws ResponseParseError if truncation is detected.
 */
function validateJsonCompleteness(content: string, context: string): void {
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

Extract the key insights and return a structured JSON object with this exact format:
{
  "marketAnalysis": {
    "size": "Market size with specific numbers if available (e.g., '$4.2B in 2024, projected $8.1B by 2028')",
    "growth": "Growth trajectory with CAGR or % if available",
    "trends": ["trend1", "trend2", "trend3"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  },
  "competitors": [
    {
      "name": "Actual competitor name from research",
      "description": "What they do",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "positioning": "How they position in market"
    }
  ],
  "painPoints": [
    {
      "problem": "Specific pain point with evidence",
      "severity": "high|medium|low",
      "currentSolutions": ["How people currently solve this"],
      "gaps": ["What's missing from current solutions"]
    }
  ],
  "positioning": {
    "uniqueValueProposition": "Clear UVP based on research gaps",
    "targetAudience": "Specific target description",
    "differentiators": ["diff1", "diff2"],
    "messagingPillars": ["pillar1", "pillar2"]
  },
  "whyNow": {
    "marketTriggers": ["Recent market change or event"],
    "timingFactors": ["Why this is the right time"],
    "urgencyScore": 0-100
  },
  "proofSignals": {
    "demandIndicators": ["Evidence of demand from research"],
    "validationOpportunities": ["How to validate further"],
    "riskFactors": ["Identified risks"]
  },
  "keywords": {
    "primary": ["main keywords from research"],
    "secondary": ["related keywords"],
    "longTail": ["long tail phrases"]
  }
}

Use ONLY information from the research report. Be specific and cite findings where relevant.`;

  const aiParams = getAIParams('extractInsights', tier);

  console.log('[Extract Insights] Calling OpenAI with model:', REPORT_MODEL);
  console.log('[Extract Insights] Prompt length:', prompt.length, 'chars');

  // Use exponential backoff for transient errors (5 attempts for extraction calls)
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 25000, // Increased from 3500 to prevent truncation
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      initialDelayMs: 2000,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract Insights] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Debug logging
  const responseStatus = getResponseStatus(response);
  console.log('[Extract Insights] Response received, status:', responseStatus);
  console.log('[Extract Insights] Response keys:', Object.keys(response));

  // Check for incomplete status (may have partial content)
  if (responseStatus === 'incomplete') {
    console.warn('[Extract Insights] Response marked incomplete - may have partial content');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseAny = response as any;

  // Log usage info for monitoring
  if (responseAny.usage) {
    console.log('[Extract Insights] Usage:', JSON.stringify(responseAny.usage));
  }
  if (responseAny.error) {
    console.error('[Extract Insights] Response error:', responseAny.error);
  }

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);

  if (!content) {
    throw new ResponseParseError(
      `Failed to extract insights: no content found in response (status: ${responseStatus})`,
      response
    );
  }

  console.log('[Extract Insights] Successfully extracted content, length:', content.length);

  try {
    return JSON.parse(content) as SynthesizedInsights;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse insights JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
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

Return JSON:
{
  "opportunityScore": number (0-100),
  "opportunityJustification": "2-3 sentences",
  "problemScore": number (0-100),
  "problemJustification": "2-3 sentences",
  "feasibilityScore": number (0-100),
  "feasibilityJustification": "2-3 sentences",
  "whyNowScore": number (0-100),
  "whyNowJustification": "2-3 sentences"
}

This is pass ${passNumber} - evaluate independently based on the research data.`;

    const aiParams = getAIParams('extractScores', tier);

    // Use exponential backoff for transient errors
    const response = await withExponentialBackoff(
      () => openai.responses.create(
        createResponsesParams({
          model: REPORT_MODEL,
          input: prompt,
          response_format: { type: 'json_object' },
          max_output_tokens: 2000,
        }, aiParams)
      ),
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Extract Scores] Pass ${passNumber} retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
        }
      }
    );

    // Use unified content extractor (handles both output_text and output[] array formats)
    const content = extractResponseContent(response);
    if (!content) {
      const responseStatus = getResponseStatus(response);
      throw new Error(`Failed to calculate scores (pass ${passNumber}): no content (status: ${responseStatus})`);
    }

    return JSON.parse(content) as RawScorePass;
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

Evaluate business metrics and return JSON:
{
  "revenuePotential": {
    "rating": "high|medium|low",
    "estimate": "Specific revenue estimate based on market data (e.g., '$10K-50K MRR potential')",
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

Base estimates on the actual market data from research.`;

  const aiParams = getAIParams('extractMetrics', tier);

  // Use exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 2000,
      }, aiParams)
    ),
    {
      maxAttempts: 3,
      initialDelayMs: 2000,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract Metrics] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    const responseStatus = getResponseStatus(response);
    console.error('[Extract Metrics] Empty response:', responseStatus);
    throw new Error(`Failed to extract business metrics: no content found in response (status: ${responseStatus})`);
  }

  console.log('[Extract Metrics] Successfully calculated metrics');
  return JSON.parse(content) as BusinessMetrics;
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
  console.log('[Social Proof] Using o3-deep-research to search social platforms...');
  console.log('[Social Proof] Tier:', tier);
  console.log('[Social Proof] Domains:', SEARCH_DOMAINS.social.join(', '));

  // Select model based on tier (same as deep research)
  const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
  console.log('[Social Proof] Using model:', model);

  // Pass raw research report - o3 will identify pain points itself
  // This avoids needing to call extractInsights (GPT-5.2) before social proof
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

  // Convert readonly array to mutable array for the API call
  const socialDomains = [...SEARCH_DOMAINS.social];

  const startTime = Date.now();

  try {
    const params = createDeepResearchParams({
      model,
      systemPrompt,
      userQuery,
      domains: socialDomains,
      background: true, // Use background mode to avoid HTTP timeouts
      reasoningSummary: 'auto',
    });

    // Use background mode + polling (same as deep research) to avoid timeout issues
    // Social proof uses o3-deep-research which can take several minutes
    const result = await runDeepResearchWithPolling(params, {
      pollIntervalMs: 10000, // 10 second intervals
      maxWaitMs: 900000, // 15 minute SLA for social proof
      onLog: (message) => console.log(`[Social Proof] ${message}`),
      onProgress: (status, elapsed) => {
        if (elapsed > 0 && elapsed % 30000 < 10000) { // Log every ~30 seconds
          console.log(`[Social Proof] Status: ${status} (${Math.round(elapsed/1000)}s elapsed)`);
        }
      },
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Social Proof] Search complete after ${elapsed}s`);

    // Try to extract JSON from the response content
    let socialProofData: Omit<SocialProof, 'sources'>;
    try {
      // The model should return JSON, but might wrap it in markdown
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        socialProofData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('[Social Proof] Could not parse JSON from response, using structured extraction');
      // Fallback: create structure from raw response
      socialProofData = {
        posts: [],
        summary: result.content.substring(0, 500),
        painPointsValidated: [],
        demandSignals: [],
      };
    }

    console.log('[Social Proof] Found', socialProofData.posts?.length || 0, 'posts');
    console.log('[Social Proof] Citations:', result.citations.length);

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
    // Fallback to empty social proof rather than failing the pipeline
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
        max_output_tokens: 2000,
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateSearchQueries] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate search queries: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateSearchQueries');

  try {
    return JSON.parse(content) as GeneratedQueries;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse search queries JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
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
        max_output_tokens: 4000, // Increased from 1500 - scoring needs room for 4 detailed justifications
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[calculateScores] Pass ${passNumber} retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

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
        max_output_tokens: 2000,
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[calculateBusinessMetrics] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

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
export async function generateUserStory(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<UserStory> {
  const { ideaTitle, ideaDescription, interviewData } = input;

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

Create a relatable, specific user story. Return a JSON object:
{
  "scenario": "A concise narrative (MAX 200 WORDS) that tells the full story - the protagonist's situation, their struggle with the problem, discovering and using the solution, and the positive outcome. Make it vivid and relatable but keep it tight.",
  "protagonist": "Who the user is (e.g., 'Sarah, a busy marketing manager at a tech startup')",
  "problem": "The specific pain they experience in 1-2 sentences",
  "solution": "How this product/service solves their problem in 1-2 sentences",
  "outcome": "The transformation and results they achieve in 1-2 sentences"
}

Make the story feel real and emotionally resonant. Use specific details.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('userStory', tier);

  // Use Responses API with exponential backoff for transient errors
  const response = await withExponentialBackoff(
    () => openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 2500,
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateUserStory] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);
  if (!content) {
    throw new ResponseParseError('Failed to generate user story: no content in response', response);
  }

  // Validate JSON completeness before parsing
  validateJsonCompleteness(content, 'generateUserStory');

  try {
    return JSON.parse(content) as UserStory;
  } catch (parseError) {
    throw new ResponseParseError(
      `Failed to parse user story JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      response
    );
  }
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
        max_output_tokens: 2500,
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateValueLadder] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

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
        max_output_tokens: 5000,
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateActionPrompts] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

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
        max_output_tokens: 3000,
      }, aiParams)
    ),
    {
      maxAttempts: 5,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[generateSocialProof] Retry ${attempt}/5 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
      }
    }
  );

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
  userStory?: UserStory | null;
  valueLadder?: OfferTier[] | null;
  actionPrompts?: ActionPrompt[] | null;
  keywordTrends?: KeywordTrend[] | null;
}

// Intermediate data that can be saved during pipeline execution for resume capability
export interface IntermediateResearchData {
  deepResearch?: DeepResearchOutput;
  researchChunks?: ChunkedResearchData; // Chunk progress within DEEP_RESEARCH phase
  socialProof?: SocialProof;
  insights?: SynthesizedInsights;
  scores?: ResearchScores;
  metrics?: BusinessMetrics;
}

export async function runResearchPipeline(
  input: ResearchInput,
  onProgress?: (phase: string, progress: number, intermediateData?: IntermediateResearchData) => Promise<void>,
  tier: SubscriptionTier = 'ENTERPRISE',
  existingResearch?: ExistingResearchData // NEW: for resume functionality
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
  deepResearch?: DeepResearchOutput; // New: raw research data
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

  if (hasPhase1 || hasPhase2 || hasPhase3 || hasPhase4) {
    console.log('[Research Pipeline] RESUME MODE - Existing data detected');
    console.log('[Research Pipeline] Phase 1 (deepResearch - o3):', hasPhase1 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 2 (socialProof - o3):', hasPhase2 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 3 (extraction - GPT-5.2):', hasPhase3 ? 'SKIP' : 'RUN');
    console.log('[Research Pipeline] Phase 4 (generation - GPT-5.2):', hasPhase4 ? 'SKIP' : 'RUN');
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
  let scores: ResearchScores;
  let metrics: BusinessMetrics;

  if (hasPhase3 && existingResearch?.synthesizedInsights && existingResearch?.opportunityScore != null && existingResearch?.scoreJustifications && existingResearch?.revenuePotential) {
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
    await onProgress?.('SYNTHESIS', 80);
  } else {
    await onProgress?.('SYNTHESIS', 58);
    console.log('[Research Pipeline] === PHASE 3: Extraction & Synthesis (GPT-5.2) ===');

    // Step 1: Extract structured insights from raw deep research (moved from Phase 2)
    console.log('[Research Pipeline] Extracting insights from deep research...');
    insights = await extractInsights(deepResearch, input, tier);
    await onProgress?.('SYNTHESIS', 65, { insights });
    console.log('[Research Pipeline] Insights extracted successfully');

    // Step 2: Run scores and metrics in parallel with GPT-5.2 reasoning
    console.log('[Research Pipeline] Calculating scores and metrics...');
    [scores, metrics] = await Promise.all([
      extractScores(deepResearch, input, insights, tier),
      extractBusinessMetrics(deepResearch, input, insights, { opportunityScore: 0, problemScore: 0, feasibilityScore: 0, whyNowScore: 0, justifications: {} as ResearchScores['justifications'], metadata: {} as ResearchScores['metadata'] }, tier),
    ]);
    // Pass all extraction results for immediate persistence (enables resume if Phase 4 fails)
    await onProgress?.('SYNTHESIS', 80, { insights, scores, metrics });
    console.log('[Research Pipeline] Scores and metrics calculated with GPT-5.2 reasoning');
  }

  // =========================================================================
  // PHASE 4: CREATIVE GENERATION (80-100%)
  // Uses GPT-5.2 for user story, value ladder, action prompts
  // =========================================================================
  let userStory: UserStory;
  let valueLadder: OfferTier[];
  let actionPrompts: ActionPrompt[];
  let keywordTrends: KeywordTrend[];

  if (hasPhase4 && existingResearch?.userStory && existingResearch?.valueLadder && existingResearch?.actionPrompts) {
    console.log('[Research Pipeline] === PHASE 4: SKIPPED (resuming from existing data) ===');
    userStory = existingResearch.userStory;
    valueLadder = existingResearch.valueLadder;
    actionPrompts = existingResearch.actionPrompts;
    keywordTrends = existingResearch.keywordTrends || [];
    await onProgress?.('REPORT_GENERATION', 98);
  } else {
    await onProgress?.('REPORT_GENERATION', 85);
    console.log('[Research Pipeline] === PHASE 4: Creative Generation (GPT-5.2) ===');

    // Run creative generation in parallel
    [userStory, valueLadder, actionPrompts] = await Promise.all([
      generateUserStory(input, insights, tier),
      generateValueLadder(input, insights, metrics, tier),
      generateActionPrompts(input, insights, tier),
    ]);
    await onProgress?.('REPORT_GENERATION', 95);
    console.log('[Research Pipeline] User story, value ladder, action prompts generated');

    // Keyword trends (uses SerpAPI for Google Trends - keep this separate)
    keywordTrends = await generateKeywordTrends(input, insights, tier);
    await onProgress?.('REPORT_GENERATION', 98);
    console.log('[Research Pipeline] Keyword trends:', keywordTrends.length, 'keywords');
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
    userStory,
    keywordTrends,
    valueLadder,
    actionPrompts,
    socialProof,
    deepResearch, // Include raw research for debugging/display
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
