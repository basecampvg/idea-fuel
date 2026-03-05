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
  type SocialSearchResult,
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
  researchId?: string;   // used for per-pipeline SerpAPI budget cap
  founderProfile?: import('@forge/shared').FounderProfile | null;
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
    marketDynamics?: {
      stage: 'emerging' | 'growing' | 'mature' | 'declining';
      consolidationLevel: string;
      entryBarriers: string[];
      regulatoryEnvironment: string;
    };
    keyMetrics?: {
      cagr: string;
      avgDealSize: string;
      customerAcquisitionCost: string;
      lifetimeValue: string;
    };
    adjacentMarkets?: Array<{
      name: string;
      relevance: string;
      crossoverOpportunity: string;
    }>;
  };
  competitors: Array<{
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    positioning: string;
    website?: string;
    fundingStage?: string;
    estimatedRevenue?: string;
    targetSegment?: string;
    pricingModel?: string;
    keyDifferentiator?: string;
    vulnerability?: string;
  }>;
  painPoints: Array<{
    problem: string;
    severity: 'high' | 'medium' | 'low';
    currentSolutions: string[];
    gaps: string[];
    affectedSegment?: string;
    frequencyOfOccurrence?: string;
    costOfInaction?: string;
    emotionalImpact?: string;
    evidenceQuotes?: string[];
  }>;
  positioning: {
    uniqueValueProposition: string;
    targetAudience: string;
    differentiators: string[];
    messagingPillars: string[];
    idealCustomerProfile?: {
      persona: string;
      demographics: string;
      psychographics: string;
      buyingTriggers: string[];
    };
    competitivePositioning?: {
      category: string;
      against: string;
      anchorBenefit: string;
      proofPoint: string;
    };
    messagingFramework?: {
      headline: string;
      subheadline: string;
      elevatorPitch: string;
      objectionHandlers: Array<{ objection: string; response: string }>;
    };
  };
  whyNow: {
    marketTriggers: string[];
    timingFactors: string[];
    urgencyScore: number;
    windowOfOpportunity?: {
      opens: string;
      closesBy: string;
      reasoning: string;
    };
    catalysts?: Array<{
      event: string;
      impact: 'high' | 'medium' | 'low';
      timeframe: string;
      howToLeverage: string;
    }>;
    urgencyNarrative?: string;
  };
  proofSignals: {
    demandIndicators: string[];
    validationOpportunities: string[];
    riskFactors: string[];
    demandStrength?: {
      score: number;
      searchVolumeSignal: string;
      communitySignal: string;
      spendingSignal: string;
    };
    validationExperiments?: Array<{
      experiment: string;
      hypothesis: string;
      cost: string;
      timeframe: string;
    }>;
    riskMitigation?: Array<{
      risk: string;
      severity: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
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
  dayInTheLife?: {
    before: string;
    after: string;
    timeSaved: string;
  };
  emotionalArc?: {
    frustration: string;
    discovery: string;
    relief: string;
  };
  quote?: string;
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
  chunkResults?: Record<string, string>;
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

// =============================================================================
// PROMPT REWRITING PRE-STEP (GPT-4.1)
// =============================================================================

const PROMPT_REWRITE_MODEL = 'gpt-4.1';

/**
 * Rewrite chunk prompts into focused research briefs using GPT-4.1.
 * Incorporates founder context (interview data, canvas notes) and query expansion
 * to produce tailored search angles for each research chunk.
 *
 * Non-fatal: returns empty object on failure, allowing default prompts to be used.
 */
async function rewriteResearchBriefs(
  input: ResearchInput,
  chunks: typeof RESEARCH_CHUNKS,
  expansionContext: string
): Promise<Record<string, string>> {
  const { ideaTitle, ideaDescription, interviewData, interviewMessages, canvasContext } = input;

  const interviewSummary = interviewMessages
    .filter(m => m.role !== 'system')
    .slice(-10) // Last 10 messages for context
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const chunkList = chunks.map(c => `- ${c.id}: ${c.name} — ${c.focus}`).join('\n');

  const prompt = `You are a research strategist preparing focused briefs for a market research team.

## BUSINESS IDEA
**${ideaTitle}**
${ideaDescription}

${canvasContext ? `## FOUNDER'S NOTES\n${canvasContext}\n` : ''}
## INTERVIEW INSIGHTS
${interviewData ? JSON.stringify(interviewData, null, 2) : 'None'}

## RECENT INTERVIEW MESSAGES
${interviewSummary || 'None'}

${expansionContext || ''}

## RESEARCH CHUNKS TO BRIEF
${chunkList}

## YOUR TASK
For each chunk ID, write a tailored research brief (3-5 sentences) that:
1. Narrows the research focus based on what the founder actually cares about
2. Incorporates specific angles from the interview data and founder's notes
3. Suggests specific companies, markets, or data points to investigate
4. Keeps the original chunk's domain focus intact

Output ONLY valid JSON: an object keyed by chunk ID, where each value is the rewritten research brief string.

Example format:
{
  "market": "Research the market size and growth rate for...",
  "competitors": "Identify direct competitors in the... space, focusing on..."
}`;

  const params = createResponsesParams(
    {
      model: PROMPT_REWRITE_MODEL,
      input: [
        { role: 'user', content: prompt },
      ],
      max_output_tokens: 3000,
      response_format: { type: 'json_object' },
    },
    { reasoning: 'low', verbosity: 'low' }
  );

  const startTime = Date.now();
  const response = await withExponentialBackoff(
    () => openai.responses.create(params),
    { maxAttempts: 2, initialDelayMs: 2000 }
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Prompt Rewriting] GPT-4.1 completed in ${elapsed}s`);

  // Extract text from response
  const text = response.output_text || '';

  if (!text) {
    console.warn('[Prompt Rewriting] Empty response from GPT-4.1');
    return {};
  }

  try {
    const briefs = JSON.parse(text) as Record<string, string>;
    return briefs;
  } catch {
    console.warn('[Prompt Rewriting] Failed to parse JSON response');
    return {};
  }
}

/**
 * Run chunked deep research - fires all chunks in parallel using background mode.
 * Pre-computes query expansion, then launches all chunks simultaneously via Promise.allSettled.
 * Each chunk uses OpenAI background mode with polling, so OpenAI handles queuing server-side.
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
  existingChunks?: ChunkedResearchData,
  engine?: 'OPENAI' | 'PERPLEXITY'
): Promise<DeepResearchOutput> {
  const { ideaTitle, ideaDescription, interviewData, interviewMessages, canvasContext } = input;

  console.log('[Chunked Research] Starting parallel deep research...');
  console.log('[Chunked Research] Tier:', tier);
  console.log('[Chunked Research] Engine:', engine || 'OPENAI (default)');
  console.log('[Chunked Research] Chunks:', RESEARCH_CHUNKS.length);

  // Select model based on tier (FREE uses cheaper mini model)
  const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
  console.log('[Chunked Research] Using model:', model);

  // Initialize results from existing data or empty
  const results: Record<string, string> = existingChunks?.chunkResults ? { ...existingChunks.chunkResults } : {};
  const allCitations: Array<{ title: string; url: string; snippet?: string }> = existingChunks?.citations ? [...existingChunks.citations] : [];
  const allSources: string[] = existingChunks?.sources ? [...existingChunks.sources] : [];

  // Check for existing chunks to resume from
  const completedChunkIds = Object.keys(results);
  if (completedChunkIds.length > 0) {
    console.log('[Chunked Research] RESUME MODE - Found', completedChunkIds.length, 'completed chunks:', completedChunkIds.join(', '));
  }

  // Build interview context once (shared across chunks)
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  // --- Pre-step: Query expansion (await before firing chunks) ---
  const keyPhrases = extractKeyPhrases(ideaTitle, ideaDescription);
  let expansionContext = '';
  try {
    const expansion = await expandQueries(keyPhrases, [], {
      maxTemplateQueries: 20,
      maxSerpApiQueries: 8,
      serpApiEnabled: true,
      pipelineId: input.researchId,
    });
    if (expansion.totalUnique > 0) {
      const expandedStrings = getExpandedQueryStrings(expansion);
      expansionContext = formatQueriesForPrompt(expandedStrings, 'ADDITIONAL SEARCH ANGLES');
      console.log(`[Chunked Research] Query expansion: ${expansion.totalUnique} queries (${expansion.templateCount} template, ${expansion.serpApiCount} SerpAPI) in ${expansion.elapsedMs}ms`);
    }
  } catch (err) {
    console.warn('[Chunked Research] Query expansion failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  // --- Pre-step: Prompt rewriting via GPT-4.1 ---
  let rewrittenBriefs: Record<string, string> = {};
  try {
    rewrittenBriefs = await rewriteResearchBriefs(input, RESEARCH_CHUNKS, expansionContext);
    console.log(`[Chunked Research] Prompt rewriting complete: ${Object.keys(rewrittenBriefs).length} briefs generated`);
  } catch (err) {
    console.warn('[Chunked Research] Prompt rewriting failed (non-fatal, using default prompts):', err instanceof Error ? err.message : err);
  }

  // Filter to only chunks that still need to run
  const chunksToRun = RESEARCH_CHUNKS.filter(chunk => !results[chunk.id]);
  console.log(`[Chunked Research] Firing ${chunksToRun.length} chunks in parallel...`);

  if (chunksToRun.length === 0) {
    console.log('[Chunked Research] All chunks already completed (full resume)');
    return {
      rawReport: combineChunkResults(results),
      citations: allCitations,
      sources: [...new Set(allSources)],
      searchQueriesUsed: [],
    };
  }

  await onProgress?.('DEEP_RESEARCH', 5);

  // Track completed count for progress reporting
  let completedCount = completedChunkIds.length;
  const totalChunks = RESEARCH_CHUNKS.length;

  // Perplexity Tier 0 rate limit is 5 RPM — stagger submissions by 15s each
  // OpenAI can fire all chunks truly in parallel
  const PERPLEXITY_STAGGER_MS = 15000;
  const useStagger = engine === 'PERPLEXITY';

  // Fire all chunks (parallel for OpenAI, staggered for Perplexity)
  const chunkPromises = chunksToRun.map((chunk, index) => {
    // Stagger delay: chunk 0 = 0ms, chunk 1 = 15s, chunk 2 = 30s, etc.
    const staggerDelay = useStagger ? index * PERPLEXITY_STAGGER_MS : 0;

    const startTime = Date.now();
    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Chunked Research] [${chunk.name}] Still researching... (${elapsed}s elapsed)`);
    }, 30000); // Less frequent heartbeat since we have multiple chunks

    const runChunk = async () => {
      if (staggerDelay > 0) {
        console.log(`[Chunked Research] [${chunk.name}] Staggering submission by ${staggerDelay / 1000}s (Perplexity rate limit)`);
        await new Promise(resolve => setTimeout(resolve, staggerDelay));
      }
      return runSingleResearchChunk(
        ideaTitle,
        ideaDescription,
        interviewData,
        interviewContext,
        chunk,
        model,
        expansionContext,
        canvasContext,
        rewrittenBriefs[chunk.id],
        engine
      );
    };

    return runChunk().then(async (chunkResult) => {
      clearInterval(heartbeat);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Chunked Research] [${chunk.name}] Complete after ${elapsed}s - ${chunkResult.content.length} chars`);

      // Accumulate results
      results[chunk.id] = chunkResult.content;
      allCitations.push(...chunkResult.citations);
      allSources.push(...chunkResult.sources);

      // Update progress as each chunk completes
      completedCount++;
      const progress = Math.round((completedCount / totalChunks) * 30);
      await onProgress?.('DEEP_RESEARCH', progress, {
        deepResearch: {
          rawReport: combineChunkResults(results),
          citations: allCitations,
          sources: [...new Set(allSources)],
          searchQueriesUsed: [],
        },
      });

      return { chunkId: chunk.id, success: true as const };
    }).catch((error) => {
      clearInterval(heartbeat);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.error(`[Chunked Research] [${chunk.name}] Error after ${elapsed}s:`, error);
      return { chunkId: chunk.id, success: false as const, error };
    });
  });

  const settled = await Promise.all(chunkPromises);

  // Check for failures
  const failures = settled.filter(r => !r.success);
  if (failures.length > 0) {
    const failedNames = failures.map(f => f.chunkId).join(', ');
    console.error(`[Chunked Research] ${failures.length} chunk(s) failed: ${failedNames}`);

    // If all chunks failed, throw the first error
    if (failures.length === chunksToRun.length) {
      const firstFailure = failures[0] as { chunkId: string; success: false; error: unknown };
      throw firstFailure.error instanceof Error
        ? firstFailure.error
        : new Error(`All research chunks failed. First error: ${firstFailure.error}`);
    }

    // Partial failure: log but continue with what we have
    console.warn(`[Chunked Research] Continuing with ${settled.length - failures.length}/${chunksToRun.length} successful chunks`);
  }

  console.log('[Chunked Research] === All chunks complete ===');
  console.log('[Chunked Research] Total citations:', allCitations.length);
  console.log('[Chunked Research] Unique sources:', [...new Set(allSources)].length);

  return {
    rawReport: combineChunkResults(results),
    citations: allCitations,
    sources: [...new Set(allSources)],
    searchQueriesUsed: [],
    chunkResults: results,
  };
}

/**
 * Run a single focused research chunk.
 * Routes through the provider abstraction when engine is specified.
 * - OPENAI (default): Uses createDeepResearchParams + runDeepResearchWithPolling (OpenAI Responses API)
 * - PERPLEXITY: Uses getResearchProvider().research() (Perplexity async deep research)
 */
async function runSingleResearchChunk(
  ideaTitle: string,
  ideaDescription: string,
  interviewData: Partial<InterviewDataPoints> | null,
  interviewContext: string,
  chunk: typeof RESEARCH_CHUNKS[number],
  model: string,
  expansionContext: string = '',
  canvasContext?: string,
  rewrittenBrief?: string,
  engine?: 'OPENAI' | 'PERPLEXITY'
): Promise<DeepResearchResult> {
  // Use rewritten brief if available, otherwise fall back to default focus
  const researchFocus = rewrittenBrief || chunk.focus;

  const systemPrompt = `You are a market research analyst conducting focused research.

## YOUR SPECIFIC TASK
Research ONLY: ${researchFocus}

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
${researchFocus}

Provide specific, actionable insights with citations. Focus only on this research area.
${expansionContext}`;

  // --- Perplexity path: route through AIProvider abstraction ---
  if (engine === 'PERPLEXITY') {
    const provider = getResearchProvider(undefined, 'PERPLEXITY');
    console.log(`[Chunked Research] [${chunk.name}] Using Perplexity sonar-deep-research with ${chunk.getDomains().length} domains...`);

    const response = await withExponentialBackoff(
      () => provider.research(userQuery, {
        systemPrompt,
        domains: chunk.getDomains(),
        maxTokens: 16000,
      }),
      {
        maxAttempts: 2, // Perplexity deep research is expensive; fewer retries
        initialDelayMs: 10000,
        maxDelayMs: 120000,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Chunked Research] [${chunk.name}] Perplexity retry ${attempt}/2 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
        }
      }
    );

    // Map ResearchResponse → DeepResearchResult
    return {
      content: response.content,
      citations: (response.sources || response.citations).map(url => ({
        title: url,
        url,
      })),
      sources: response.sources || [],
      searchQueries: [],
      reasoningSummary: response.reasoning,
    };
  }

  // --- OpenAI path: existing Responses API deep research ---
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
  if (results.marketsizing) {
    sections.push(`## Market Sizing\n\n${results.marketsizing}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Reconstruct individual chunk results from a combined report.
 * Used when resuming research that was stored before chunkResults were persisted.
 */
function reconstructChunkResults(rawReport: string): Record<string, string> {
  const chunks: Record<string, string> = {};
  const sectionMap: [string, string][] = [
    ['## Market Analysis', 'market'],
    ['## Competitor Analysis', 'competitors'],
    ['## Customer Pain Points', 'painpoints'],
    ['## Timing & Validation', 'timing'],
    ['## Market Sizing', 'marketsizing'],
  ];

  for (const [header, key] of sectionMap) {
    const start = rawReport.indexOf(header);
    if (start === -1) continue;

    const contentStart = start + header.length;
    // Find the next section separator or end of report
    const nextSep = rawReport.indexOf('\n\n---\n\n', contentStart);
    const content = (nextSep === -1 ? rawReport.slice(contentStart) : rawReport.slice(contentStart, nextSep)).trim();
    if (content) chunks[key] = content;
  }

  return chunks;
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

Extract comprehensive, detailed insights from the research report. Preserve specific data points, statistics, dollar figures, and citations. Return structured JSON matching this EXACT schema. Every top-level field is required; fields marked OPTIONAL may be omitted only if the research lacks sufficient data:

{
  "marketAnalysis": {
    "size": "<string: detailed market size with dollar figures, segments, and geographic scope>",
    "growth": "<string: growth rate with CAGR, projections, and drivers>",
    "trends": ["<string: describe each trend in 1-2 sentences with specific data>", ...],
    "opportunities": ["<string: describe each opportunity in 1-2 sentences with reasoning>", ...],
    "threats": ["<string: describe each threat in 1-2 sentences with specific examples>", ...],
    "marketDynamics": {
      "stage": "emerging" | "growing" | "mature" | "declining",
      "consolidationLevel": "<string: fragmented/consolidating/concentrated — describe the competitive density>",
      "entryBarriers": ["<string: specific barrier with context>", ...],
      "regulatoryEnvironment": "<string: key regulations, compliance requirements, or policy trends affecting the market>"
    },
    "keyMetrics": {
      "cagr": "<string: compound annual growth rate with timeframe, e.g. '12.5% CAGR 2024-2030'>",
      "avgDealSize": "<string: average contract/deal value, e.g. '$15,000/year'>",
      "customerAcquisitionCost": "<string: industry average CAC estimate>",
      "lifetimeValue": "<string: industry average customer LTV estimate>"
    },
    "adjacentMarkets": [
      {
        "name": "<string: adjacent market name>",
        "relevance": "<string: why this market is relevant>",
        "crossoverOpportunity": "<string: specific opportunity to expand into this market>"
      }
    ]
  },
  "competitors": [
    {
      "name": "<string: company name>",
      "description": "<string: what they do and their market position>",
      "strengths": ["<string: specific strength with evidence>", ...],
      "weaknesses": ["<string: specific weakness or limitation>", ...],
      "positioning": "<string: how they position themselves in the market>",
      "website": "<string: OPTIONAL - company URL>",
      "fundingStage": "<string: OPTIONAL - e.g. 'Series B, $45M raised' or 'Bootstrapped'>",
      "estimatedRevenue": "<string: OPTIONAL - e.g. '$10-50M ARR'>",
      "targetSegment": "<string: OPTIONAL - primary customer segment>",
      "pricingModel": "<string: OPTIONAL - e.g. 'Freemium, $49-299/mo'>",
      "keyDifferentiator": "<string: OPTIONAL - their single biggest competitive advantage>",
      "vulnerability": "<string: OPTIONAL - strategic weakness that can be exploited>"
    }
  ],
  "painPoints": [
    {
      "problem": "<string: specific problem statement>",
      "severity": "high" | "medium" | "low",
      "currentSolutions": ["<string: existing solution or workaround>", ...],
      "gaps": ["<string: what current solutions fail to address>", ...],
      "affectedSegment": "<string: OPTIONAL - which customer segment feels this most>",
      "frequencyOfOccurrence": "<string: OPTIONAL - how often this occurs, e.g. 'daily', 'during onboarding'>",
      "costOfInaction": "<string: OPTIONAL - quantified cost, e.g. '$500/month wasted' or '10 hours/week lost'>",
      "emotionalImpact": "<string: OPTIONAL - the frustration or fear this causes>",
      "evidenceQuotes": ["<string: OPTIONAL - direct findings or data points from research>", ...]
    }
  ],
  "positioning": {
    "uniqueValueProposition": "<string: clear, specific value prop referencing the market gap>",
    "targetAudience": "<string: detailed description of primary target audience>",
    "differentiators": ["<string: specific differentiator with reasoning>", ...],
    "messagingPillars": ["<string: core messaging theme>", ...],
    "idealCustomerProfile": {
      "persona": "<string: named persona e.g. 'Sarah, 35, Head of Marketing at a 50-person SaaS company'>",
      "demographics": "<string: company size, industry, role, budget range>",
      "psychographics": "<string: motivations, fears, aspirations, buying behavior>",
      "buyingTriggers": ["<string: specific event that triggers purchase intent>", ...]
    },
    "competitivePositioning": {
      "category": "<string: market category being created or entered>",
      "against": "<string: 'Unlike [Competitor X], we [key difference]' positioning statement>",
      "anchorBenefit": "<string: single most important benefit>",
      "proofPoint": "<string: evidence or data backing the positioning>"
    },
    "messagingFramework": {
      "headline": "<string: primary one-line headline>",
      "subheadline": "<string: supporting statement>",
      "elevatorPitch": "<string: 2-3 sentence pitch>",
      "objectionHandlers": [{"objection": "<string>", "response": "<string>"}, ...]
    }
  },
  "whyNow": {
    "marketTriggers": ["<string: specific market trigger with context>", ...],
    "timingFactors": ["<string: timing factor with evidence>", ...],
    "urgencyScore": <number 0-100>,
    "windowOfOpportunity": {
      "opens": "<string: OPTIONAL - when the window opens, e.g. 'Now' or 'Q3 2026'>",
      "closesBy": "<string: OPTIONAL - when it closes, e.g. '18 months' or 'When [competitor] launches X'>",
      "reasoning": "<string: OPTIONAL - why this window exists and what closes it>"
    },
    "catalysts": [
      {
        "event": "<string: OPTIONAL - specific catalyst event>",
        "impact": "high" | "medium" | "low",
        "timeframe": "<string: when this catalyst takes effect>",
        "howToLeverage": "<string: specific action to capitalize on this>"
      }
    ],
    "urgencyNarrative": "<string: OPTIONAL - 2-3 sentence narrative of why acting now matters>"
  },
  "proofSignals": {
    "demandIndicators": ["<string: specific indicator with data point>", ...],
    "validationOpportunities": ["<string: actionable validation step>", ...],
    "riskFactors": ["<string: specific risk with context>", ...],
    "demandStrength": {
      "score": <number: OPTIONAL - 0-100 overall demand confidence>,
      "searchVolumeSignal": "<string: OPTIONAL - search volume evidence>",
      "communitySignal": "<string: OPTIONAL - community/forum discussion evidence>",
      "spendingSignal": "<string: OPTIONAL - evidence of willingness to pay>"
    },
    "validationExperiments": [
      {
        "experiment": "<string: OPTIONAL - specific low-cost experiment to run>",
        "hypothesis": "<string: what result would validate demand>",
        "cost": "<string: estimated cost, e.g. '$50-100'>",
        "timeframe": "<string: how long to run, e.g. '1 week'>"
      }
    ],
    "riskMitigation": [
      {
        "risk": "<string: OPTIONAL - specific risk>",
        "severity": "high" | "medium" | "low",
        "mitigation": "<string: concrete mitigation strategy>"
      }
    ]
  },
  "keywords": {
    "primary": ["<string>", ...],
    "secondary": ["<string>", ...],
    "longTail": ["<string>", ...]
  }
}

Use ONLY information from the research report. Be thorough — include specific dollar figures, percentages, company names, and data points from the research. Longer, more detailed responses are preferred over brief summaries. Output ONLY the JSON object, no markdown or explanation.`;

  const extractionProvider = getExtractionProvider(tier);
  console.log('[Extract Insights] Using provider:', extractionProvider.name);
  console.log('[Extract Insights] Prompt length:', prompt.length, 'chars');

  const { InsightsSchema } = await import('./research-schemas');

  // Retry up to 3 times - extraction can fail if Claude returns incomplete/malformed JSON
  const insights = await withExponentialBackoff(
    async () => {
      return await extractionProvider.extract(prompt, InsightsSchema, {
        maxTokens: 50000,
        temperature: 0.2,  // Low temperature for deterministic structured extraction
        task: 'extraction',
      });
    },
    {
      maxAttempts: 3,
      initialDelayMs: 3000,
      // Retry on Zod validation errors AND transient network errors
      isRetryable: (error: unknown) => {
        // Retry Zod validation errors (Claude returned bad JSON)
        if (error && typeof error === 'object' && 'issues' in error) {
          console.warn('[Extract Insights] Zod validation failed, will retry...');
          return true;
        }
        // Retry JSON parse errors
        if (error instanceof Error && error.message.includes('Failed to parse JSON')) {
          console.warn('[Extract Insights] JSON parse failed, will retry...');
          return true;
        }
        // Retry timeout errors (APIConnectionTimeoutError from Anthropic SDK)
        if (error instanceof Error && error.message.includes('timed out')) {
          console.warn('[Extract Insights] Request timed out, will retry...');
          return true;
        }
        // Also retry standard transient errors (502, 503, etc.)
        if (error && typeof error === 'object') {
          const err = error as Record<string, unknown>;
          if (typeof err.status === 'number' && [429, 500, 502, 503, 504].includes(err.status)) {
            return true;
          }
        }
        return false;
      },
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract Insights] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : 'Zod validation error');
      },
    }
  );

  console.log('[Extract Insights] Successfully extracted insights');
  return insights;
}

// =============================================================================
// PER-CHUNK EXTRACTION FUNCTIONS
// Each function extracts specific schema sections from a single research chunk
// =============================================================================

/**
 * Extract market analysis + keywords from the market research chunk.
 */
async function extractChunkMarket(
  chunkText: string,
  input: ResearchInput,
  tier: SubscriptionTier
): Promise<{ marketAnalysis: SynthesizedInsights['marketAnalysis']; keywords: SynthesizedInsights['keywords'] }> {
  console.log('[Extract:Market] Extracting market analysis + keywords...');

  const prompt = `You are extracting structured market analysis data from a focused market research report.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## MARKET RESEARCH DATA
${chunkText}

---

Extract comprehensive market analysis and relevant keywords from the research above. Preserve specific data points, statistics, dollar figures, and citations. Return structured JSON matching this EXACT schema:

{
  "marketAnalysis": {
    "size": "<string: detailed market size with dollar figures, segments, and geographic scope>",
    "growth": "<string: growth rate with CAGR, projections, and drivers>",
    "trends": ["<string: describe each trend in 1-2 sentences with specific data>", ...],
    "opportunities": ["<string: describe each opportunity in 1-2 sentences with reasoning>", ...],
    "threats": ["<string: describe each threat in 1-2 sentences with specific examples>", ...],
    "marketDynamics": {
      "stage": "emerging" | "growing" | "mature" | "declining",
      "consolidationLevel": "<string: fragmented/consolidating/concentrated>",
      "entryBarriers": ["<string: specific barrier with context>", ...],
      "regulatoryEnvironment": "<string: key regulations or policy trends>"
    },
    "keyMetrics": {
      "cagr": "<string: compound annual growth rate with timeframe>",
      "avgDealSize": "<string: average contract/deal value>",
      "customerAcquisitionCost": "<string: industry average CAC estimate>",
      "lifetimeValue": "<string: industry average customer LTV estimate>"
    },
    "adjacentMarkets": [
      {
        "name": "<string: adjacent market name>",
        "relevance": "<string: why this market is relevant>",
        "crossoverOpportunity": "<string: specific expansion opportunity>"
      }
    ]
  },
  "keywords": {
    "primary": ["<string: primary search keyword>", ...],
    "secondary": ["<string: secondary keyword>", ...],
    "longTail": ["<string: long-tail keyword phrase>", ...]
  }
}

Use ONLY information from the research data. Be thorough — include specific dollar figures, percentages, and data points. Output ONLY the JSON object.`;

  const extractionProvider = getExtractionProvider(tier);
  const { MarketChunkSchema } = await import('./research-schemas');

  return await withExponentialBackoff(
    () => extractionProvider.extract(prompt, MarketChunkSchema, {
      maxTokens: 12000,
      temperature: 0.2,
      task: 'extraction',
    }),
    {
      maxAttempts: 3,
      initialDelayMs: 3000,
      isRetryable: chunkExtractionRetryable,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract:Market] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : 'Validation error');
      },
    }
  );
}

/**
 * Extract competitor profiles + positioning from the competitor research chunk.
 */
async function extractChunkCompetitors(
  chunkText: string,
  input: ResearchInput,
  tier: SubscriptionTier
): Promise<{ competitors: SynthesizedInsights['competitors']; positioning: SynthesizedInsights['positioning'] }> {
  console.log('[Extract:Competitors] Extracting competitor profiles + positioning...');

  const prompt = `You are extracting structured competitor and positioning data from a focused competitor research report.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## COMPETITOR RESEARCH DATA
${chunkText}

---

Extract detailed competitor profiles and derive positioning strategy based on the competitive landscape. For each competitor, analyze their actual pricing, technical architecture choices, user complaints, and strategic vulnerabilities. Then derive positioning that exploits gaps in the competitive landscape.

Return structured JSON matching this EXACT schema:

{
  "competitors": [
    {
      "name": "<string: company name>",
      "description": "<string: what they do and their market position>",
      "strengths": ["<string: specific strength with evidence>", ...],
      "weaknesses": ["<string: specific weakness or limitation>", ...],
      "positioning": "<string: how they position themselves>",
      "website": "<string: OPTIONAL - company URL>",
      "fundingStage": "<string: OPTIONAL - e.g. 'Series B, $45M raised'>",
      "estimatedRevenue": "<string: OPTIONAL - e.g. '$10-50M ARR'>",
      "targetSegment": "<string: OPTIONAL - primary customer segment>",
      "pricingModel": "<string: OPTIONAL - e.g. 'Freemium, $49-299/mo'>",
      "keyDifferentiator": "<string: OPTIONAL - biggest competitive advantage>",
      "vulnerability": "<string: OPTIONAL - strategic weakness to exploit>"
    }
  ],
  "positioning": {
    "uniqueValueProposition": "<string: clear, specific value prop referencing competitive gaps>",
    "targetAudience": "<string: detailed description of primary target audience>",
    "differentiators": ["<string: specific differentiator vs competitors>", ...],
    "messagingPillars": ["<string: core messaging theme>", ...],
    "idealCustomerProfile": {
      "persona": "<string: named persona>",
      "demographics": "<string: company size, industry, role, budget>",
      "psychographics": "<string: motivations, fears, buying behavior>",
      "buyingTriggers": ["<string: event that triggers purchase intent>", ...]
    },
    "competitivePositioning": {
      "category": "<string: market category>",
      "against": "<string: 'Unlike [Competitor X], we [key difference]'>",
      "anchorBenefit": "<string: single most important benefit>",
      "proofPoint": "<string: evidence backing the positioning>"
    },
    "messagingFramework": {
      "headline": "<string: primary one-line headline>",
      "subheadline": "<string: supporting statement>",
      "elevatorPitch": "<string: 2-3 sentence pitch>",
      "objectionHandlers": [{"objection": "<string>", "response": "<string>"}, ...]
    }
  }
}

Use ONLY information from the research data. Be thorough with competitor details. Output ONLY the JSON object.`;

  const extractionProvider = getExtractionProvider(tier);
  const { CompetitorsChunkSchema } = await import('./research-schemas');

  return await withExponentialBackoff(
    () => extractionProvider.extract(prompt, CompetitorsChunkSchema, {
      maxTokens: 15000,
      temperature: 0.2,
      task: 'extraction',
    }),
    {
      maxAttempts: 3,
      initialDelayMs: 3000,
      isRetryable: chunkExtractionRetryable,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract:Competitors] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : 'Validation error');
      },
    }
  );
}

/**
 * Extract customer pain points from the pain points research chunk.
 */
async function extractChunkPainPoints(
  chunkText: string,
  input: ResearchInput,
  tier: SubscriptionTier
): Promise<{ painPoints: SynthesizedInsights['painPoints'] }> {
  console.log('[Extract:PainPoints] Extracting customer pain points...');

  const prompt = `You are extracting structured customer pain point data from focused customer research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## CUSTOMER PAIN POINT RESEARCH
${chunkText}

---

Extract detailed customer pain points with evidence and severity analysis. Pay close attention to severity ratings, affected segments, evidence quotes, and the cost of inaction. Each pain point should be grounded in specific findings from the research.

Return structured JSON matching this EXACT schema:

{
  "painPoints": [
    {
      "problem": "<string: specific problem statement>",
      "severity": "high" | "medium" | "low",
      "currentSolutions": ["<string: existing solution or workaround>", ...],
      "gaps": ["<string: what current solutions fail to address>", ...],
      "affectedSegment": "<string: OPTIONAL - which customer segment feels this most>",
      "frequencyOfOccurrence": "<string: OPTIONAL - how often, e.g. 'daily', 'during onboarding'>",
      "costOfInaction": "<string: OPTIONAL - quantified cost, e.g. '$500/month wasted'>",
      "emotionalImpact": "<string: OPTIONAL - the frustration or fear this causes>",
      "evidenceQuotes": ["<string: OPTIONAL - direct findings from research>", ...]
    }
  ]
}

Use ONLY information from the research data. Be thorough — include as many distinct pain points as the data supports. Output ONLY the JSON object.`;

  const extractionProvider = getExtractionProvider(tier);
  const { PainPointsChunkSchema } = await import('./research-schemas');

  return await withExponentialBackoff(
    () => extractionProvider.extract(prompt, PainPointsChunkSchema, {
      maxTokens: 10000,
      temperature: 0.2,
      task: 'extraction',
    }),
    {
      maxAttempts: 3,
      initialDelayMs: 3000,
      isRetryable: chunkExtractionRetryable,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract:PainPoints] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : 'Validation error');
      },
    }
  );
}

/**
 * Extract why-now triggers + proof signals from the timing research chunk.
 */
async function extractChunkTiming(
  chunkText: string,
  input: ResearchInput,
  tier: SubscriptionTier
): Promise<{ whyNow: SynthesizedInsights['whyNow']; proofSignals: SynthesizedInsights['proofSignals'] }> {
  console.log('[Extract:Timing] Extracting why-now triggers + proof signals...');

  const prompt = `You are extracting structured timing and validation data from focused market timing research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## TIMING & VALIDATION RESEARCH
${chunkText}

---

Extract market timing factors, urgency analysis, demand signals, and validation opportunities. Assess why NOW is the right time to build this business and what signals indicate real demand.

Return structured JSON matching this EXACT schema:

{
  "whyNow": {
    "marketTriggers": ["<string: specific market trigger with context>", ...],
    "timingFactors": ["<string: timing factor with evidence>", ...],
    "urgencyScore": <number 0-100>,
    "windowOfOpportunity": {
      "opens": "<string: OPTIONAL - when the window opens>",
      "closesBy": "<string: OPTIONAL - when it closes>",
      "reasoning": "<string: OPTIONAL - why this window exists>"
    },
    "catalysts": [
      {
        "event": "<string: OPTIONAL - specific catalyst event>",
        "impact": "high" | "medium" | "low",
        "timeframe": "<string: when this catalyst takes effect>",
        "howToLeverage": "<string: specific action to capitalize on this>"
      }
    ],
    "urgencyNarrative": "<string: OPTIONAL - 2-3 sentence narrative of why acting now matters>"
  },
  "proofSignals": {
    "demandIndicators": ["<string: specific indicator with data point>", ...],
    "validationOpportunities": ["<string: actionable validation step>", ...],
    "riskFactors": ["<string: specific risk with context>", ...],
    "demandStrength": {
      "score": <number: OPTIONAL - 0-100 overall demand confidence>,
      "searchVolumeSignal": "<string: OPTIONAL - search volume evidence>",
      "communitySignal": "<string: OPTIONAL - community discussion evidence>",
      "spendingSignal": "<string: OPTIONAL - willingness to pay evidence>"
    },
    "validationExperiments": [
      {
        "experiment": "<string: OPTIONAL - specific low-cost experiment>",
        "hypothesis": "<string: what result would validate demand>",
        "cost": "<string: estimated cost>",
        "timeframe": "<string: how long to run>"
      }
    ],
    "riskMitigation": [
      {
        "risk": "<string: OPTIONAL - specific risk>",
        "severity": "high" | "medium" | "low",
        "mitigation": "<string: concrete mitigation strategy>"
      }
    ]
  }
}

Use ONLY information from the research data. Be thorough with timing factors and demand evidence. Output ONLY the JSON object.`;

  const extractionProvider = getExtractionProvider(tier);
  const { TimingChunkSchema } = await import('./research-schemas');

  return await withExponentialBackoff(
    () => extractionProvider.extract(prompt, TimingChunkSchema, {
      maxTokens: 12000,
      temperature: 0.2,
      task: 'extraction',
    }),
    {
      maxAttempts: 3,
      initialDelayMs: 3000,
      isRetryable: chunkExtractionRetryable,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Extract:Timing] Retry ${attempt}/3 after ${delayMs}ms:`, error instanceof Error ? error.message : 'Validation error');
      },
    }
  );
}

/** Shared retry predicate for all chunk extraction calls */
function chunkExtractionRetryable(error: unknown): boolean {
  // Retry Zod validation errors (model returned bad JSON)
  if (error && typeof error === 'object' && 'issues' in error) return true;
  // Retry JSON parse errors
  if (error instanceof Error && error.message.includes('Failed to parse JSON')) return true;
  // Retry timeout errors
  if (error instanceof Error && error.message.includes('timed out')) return true;
  // Retry transient HTTP errors
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.status === 'number' && [429, 500, 502, 503, 504].includes(err.status)) return true;
  }
  return false;
}

// =============================================================================
// PARALLEL EXTRACTION ORCHESTRATOR
// =============================================================================

/** Default values for failed extractions — enables graceful degradation */
const EMPTY_MARKET_ANALYSIS: SynthesizedInsights['marketAnalysis'] = {
  size: 'Data unavailable',
  growth: 'Data unavailable',
  trends: [],
  opportunities: [],
  threats: [],
};

const EMPTY_POSITIONING: SynthesizedInsights['positioning'] = {
  uniqueValueProposition: '',
  targetAudience: '',
  differentiators: [],
  messagingPillars: [],
};

const EMPTY_WHY_NOW: SynthesizedInsights['whyNow'] = {
  marketTriggers: [],
  timingFactors: [],
  urgencyScore: 50,
};

const EMPTY_PROOF_SIGNALS: SynthesizedInsights['proofSignals'] = {
  demandIndicators: [],
  validationOpportunities: [],
  riskFactors: [],
};

const EMPTY_KEYWORDS: SynthesizedInsights['keywords'] = {
  primary: [],
  secondary: [],
  longTail: [],
};

/**
 * Extract insights from deep research chunks in parallel.
 * Each chunk extracts its relevant schema sections independently,
 * then results are merged into a single SynthesizedInsights object.
 *
 * Falls back gracefully — if a chunk extraction fails, empty defaults
 * are used for those sections so downstream functions can still run.
 */
export async function extractInsightsParallel(
  chunkResults: Record<string, string>,
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SynthesizedInsights> {
  console.log('[Extract Parallel] Starting 4 parallel chunk extractions...');
  console.log('[Extract Parallel] Available chunks:', Object.keys(chunkResults).join(', '));

  const chunkNames = ['market', 'competitors', 'painpoints', 'timing'] as const;

  const results = await Promise.allSettled([
    chunkResults.market
      ? extractChunkMarket(chunkResults.market, input, tier)
      : Promise.reject(new Error('No market chunk data')),
    chunkResults.competitors
      ? extractChunkCompetitors(chunkResults.competitors, input, tier)
      : Promise.reject(new Error('No competitors chunk data')),
    chunkResults.painpoints
      ? extractChunkPainPoints(chunkResults.painpoints, input, tier)
      : Promise.reject(new Error('No painpoints chunk data')),
    chunkResults.timing
      ? extractChunkTiming(chunkResults.timing, input, tier)
      : Promise.reject(new Error('No timing chunk data')),
  ]);

  // Log results
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[Extract Parallel] FAILED: ${chunkNames[i]}:`, r.reason instanceof Error ? r.reason.message : r.reason);
    } else {
      console.log(`[Extract Parallel] OK: ${chunkNames[i]}`);
    }
  });

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[Extract Parallel] ${succeeded}/4 chunk extractions succeeded`);

  // Merge results with fallback defaults for failed chunks
  const insights = mergeChunkInsights(results);

  console.log('[Extract Parallel] Merged insights assembled');
  return insights;
}

/**
 * Merge per-chunk extraction results into a single SynthesizedInsights object.
 * Uses empty defaults for any chunks that failed extraction.
 */
function mergeChunkInsights(
  results: [
    PromiseSettledResult<{ marketAnalysis: SynthesizedInsights['marketAnalysis']; keywords: SynthesizedInsights['keywords'] }>,
    PromiseSettledResult<{ competitors: SynthesizedInsights['competitors']; positioning: SynthesizedInsights['positioning'] }>,
    PromiseSettledResult<{ painPoints: SynthesizedInsights['painPoints'] }>,
    PromiseSettledResult<{ whyNow: SynthesizedInsights['whyNow']; proofSignals: SynthesizedInsights['proofSignals'] }>,
  ]
): SynthesizedInsights {
  const [marketResult, competitorsResult, painPointsResult, timingResult] = results;

  return {
    marketAnalysis: marketResult.status === 'fulfilled' ? marketResult.value.marketAnalysis : EMPTY_MARKET_ANALYSIS,
    keywords: marketResult.status === 'fulfilled' ? marketResult.value.keywords : EMPTY_KEYWORDS,
    competitors: competitorsResult.status === 'fulfilled' ? competitorsResult.value.competitors : [],
    positioning: competitorsResult.status === 'fulfilled' ? competitorsResult.value.positioning : EMPTY_POSITIONING,
    painPoints: painPointsResult.status === 'fulfilled' ? painPointsResult.value.painPoints : [],
    whyNow: timingResult.status === 'fulfilled' ? timingResult.value.whyNow : EMPTY_WHY_NOW,
    proofSignals: timingResult.status === 'fulfilled' ? timingResult.value.proofSignals : EMPTY_PROOF_SIGNALS,
  };
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
  const researchSnippet = deepResearch.rawReport.substring(0, 15000);

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

## REQUIRED JSON FORMAT
Return EXACTLY this structure with these exact key names:
{
  "opportunityScore": <number 0-100>,
  "opportunityJustification": "<string explaining the opportunity score>",
  "problemScore": <number 0-100>,
  "problemJustification": "<string explaining the problem score>",
  "feasibilityScore": <number 0-100>,
  "feasibilityJustification": "<string explaining the feasibility score>",
  "whyNowScore": <number 0-100>,
  "whyNowJustification": "<string explaining the why now score>"
}

CRITICAL: Use the EXACT key names above (e.g. "opportunityScore" NOT "opportunity"). All scores must be numbers. All justifications must be plain strings. Do NOT nest objects.

This is pass ${passNumber} - evaluate independently based on the research data.`;

    // Use a coercing schema that handles Opus returning nested objects like
    // {opportunity: {score: 75, justification: "..."}} instead of flat keys
    const CoercingScoresSchema = z.preprocess((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return raw;
      const obj = raw as Record<string, unknown>;

      // If already has the correct flat keys, pass through
      if ('opportunityScore' in obj && typeof obj.opportunityScore === 'number') return obj;

      // Map nested structure to flat keys
      const mapped: Record<string, unknown> = { ...obj };
      const scoreFields = ['opportunity', 'problem', 'feasibility', 'whyNow'] as const;
      for (const field of scoreFields) {
        const val = obj[field];
        if (val && typeof val === 'object') {
          const nested = val as Record<string, unknown>;
          // Extract score: could be nested.score, nested.value, or a direct number
          if (!(`${field}Score` in mapped) || mapped[`${field}Score`] === undefined) {
            mapped[`${field}Score`] = nested.score ?? nested.value ?? nested.rating;
          }
          // Extract justification: could be nested.justification, nested.reasoning, nested.explanation
          if (!(`${field}Justification` in mapped) || mapped[`${field}Justification`] === undefined) {
            const justText = nested.justification ?? nested.reasoning ?? nested.explanation ?? nested.rationale;
            mapped[`${field}Justification`] = typeof justText === 'string' ? justText
              : typeof justText === 'object' ? JSON.stringify(justText) : String(justText || '');
          }
        } else if (typeof val === 'number') {
          // Model returned {opportunity: 75} directly
          if (!(`${field}Score` in mapped) || mapped[`${field}Score`] === undefined) {
            mapped[`${field}Score`] = val;
          }
        }
      }
      return mapped;
    }, ScoresPassSchema);

    const scorePass = await extractionProvider.extract(prompt, CoercingScoresSchema, {
      maxTokens: 8000,
      temperature: 1.0,
      task: 'scoring',
    });

    return scorePass as RawScorePass;
  };

  // Run passes in parallel — tolerate individual failures (require >= 2 of 3)
  const passResults = await Promise.allSettled(
    Array.from({ length: PASS_COUNT }, (_, i) => runPass(i + 1))
  );
  const passes = passResults
    .filter((r): r is PromiseFulfilledResult<RawScorePass> => r.status === 'fulfilled')
    .map(r => r.value);

  const failedCount = PASS_COUNT - passes.length;
  if (failedCount > 0) {
    const failReasons = passResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => String(r.reason).slice(0, 200));
    console.warn(`[Extract Scores] ${failedCount}/${PASS_COUNT} passes failed:`, failReasons);
  }
  if (passes.length < 2) {
    throw new Error(`extractScores: Only ${passes.length}/${PASS_COUNT} scoring passes succeeded (minimum 2 required)`);
  }

  const passCount = passes.length;

  // Calculate averages and deviations (reusing existing logic)
  const opportunityScores = passes.map(p => clampScore(p.opportunityScore));
  const problemScores = passes.map(p => clampScore(p.problemScore));
  const feasibilityScores = passes.map(p => clampScore(p.feasibilityScore));
  const whyNowScores = passes.map(p => clampScore(p.whyNowScore));

  const avgOpportunity = Math.round(opportunityScores.reduce((a, b) => a + b, 0) / passCount);
  const avgProblem = Math.round(problemScores.reduce((a, b) => a + b, 0) / passCount);
  const avgFeasibility = Math.round(feasibilityScores.reduce((a, b) => a + b, 0) / passCount);
  const avgWhyNow = Math.round(whyNowScores.reduce((a, b) => a + b, 0) / passCount);

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
      passCount: passCount,
      maxDeviation,
      averageConfidence,
      flagged,
      flagReason,
    },
  };
}

/**
 * Build a textual context block from the founder's profile and interview data
 * for injection into the business metrics extraction prompt.
 */
function buildFounderContext(input: ResearchInput): string {
  const sections: string[] = [];

  // From founder profile (settings page)
  const fp = input.founderProfile;
  if (fp) {
    if (fp.bio) sections.push(`**Bio:** ${fp.bio}`);
    if (fp.skills.length > 0) sections.push(`**Skills:** ${fp.skills.join(', ')}`);
    if (fp.workHistory.length > 0) {
      const workLines = fp.workHistory.map(w =>
        `- ${w.title} at ${w.company} (${w.startDate} - ${w.endDate || 'Present'}): ${w.description}`
      ).join('\n');
      sections.push(`**Work History:**\n${workLines}`);
    }
    if (fp.education.length > 0) {
      const eduLines = fp.education.map(e =>
        `- ${e.degree}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ''} from ${e.institution}${e.graduationYear ? ` (${e.graduationYear})` : ''}`
      ).join('\n');
      sections.push(`**Education:**\n${eduLines}`);
    }
  }

  // From interview data (3 founder data points)
  const id = input.interviewData;
  if (id?.founder_background?.value) sections.push(`**Background (interview):** ${id.founder_background.value}`);
  if (id?.founder_relevant_experience?.value) sections.push(`**Relevant Experience (interview):** ${id.founder_relevant_experience.value}`);
  if (id?.founder_unfair_advantage?.value) sections.push(`**Unfair Advantage (interview):** ${id.founder_unfair_advantage.value}`);

  return sections.length > 0
    ? sections.join('\n\n')
    : 'No founder information available. Evaluate founder fit based on general requirements for this type of business.';
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

  const researchSnippet = deepResearch.rawReport.substring(0, 15000);
  console.log('[Extract Metrics] Research snippet length:', researchSnippet.length);

  const founderContext = buildFounderContext(input);

  const prompt = `You are evaluating business viability metrics based on deep market research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## FOUNDER PROFILE
${founderContext}

## RESEARCH FINDINGS
${researchSnippet}...

## RESEARCH SCORES
${JSON.stringify(scores, null, 2)}

## MARKET INSIGHTS
${JSON.stringify(insights.marketAnalysis, null, 2)}

## REQUIRED OUTPUT SCHEMA
Return a JSON object with EXACTLY this structure. Top-level fields are required; OPTIONAL fields may be omitted if insufficient data:
{
  "revenuePotential": {
    "rating": "high" | "medium" | "low",
    "estimate": "<string: detailed revenue estimate with dollar figures and timeframe>",
    "confidence": <0-100>,
    "revenueModel": "<string: OPTIONAL - primary revenue model, e.g. 'SaaS subscriptions' or 'Marketplace take-rate'>",
    "timeToFirstRevenue": "<string: OPTIONAL - e.g. '2-3 months post-launch'>",
    "unitEconomics": "<string: OPTIONAL - estimated LTV:CAC ratio and key unit economics>"
  },
  "executionDifficulty": {
    "rating": "easy" | "moderate" | "hard",
    "factors": ["<string: specific execution factor>", ...],
    "soloFriendly": true | false,
    "mvpTimeEstimate": "<string: OPTIONAL - e.g. '4-6 weeks for core features'>",
    "criticalPath": ["<string: OPTIONAL - must-build-first item>", ...],
    "biggestRisk": "<string: OPTIONAL - single biggest execution risk>"
  },
  "gtmClarity": {
    "rating": "clear" | "moderate" | "unclear",
    "channels": ["<string: specific GTM channel>", ...],
    "confidence": <0-100>,
    "primaryChannel": "<string: OPTIONAL - single best channel to start with and why>",
    "estimatedCAC": "<string: OPTIONAL - e.g. '$50-100 per customer'>",
    "firstMilestone": "<string: OPTIONAL - e.g. '100 users in 60 days via [channel]'>"
  },
  "founderFit": {
    "percentage": <0-100>,
    "strengths": ["<string: specific strength>", ...],
    "gaps": ["<string: specific gap>", ...],
    "criticalSkillNeeded": "<string: OPTIONAL - most important skill to acquire or hire for>",
    "recommendedFirstHire": "<string: OPTIONAL - e.g. 'Technical co-founder' or 'Growth marketer'>"
  }
}

Evaluate business metrics thoroughly using actual market data, competitor pricing, and research findings. Be specific with dollar figures and timeframes.

For "founderFit": Evaluate the founder's ACTUAL background, skills, and experience against the specific requirements of this business idea. If founder profile data is provided above, use it to give a personalized assessment. Score the percentage based on genuine skill-to-requirement matching, not generic assumptions.`;

  const extractionProvider = getExtractionProvider(tier);
  console.log('[Extract Metrics] Using provider:', extractionProvider.name);

  const { BusinessMetricsSchema } = await import('./research-schemas');

  const metrics = await extractionProvider.extract(prompt, BusinessMetricsSchema, {
    maxTokens: 12000,
    temperature: 0.2,
    task: 'extraction',
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
  const marketSizingChunk = deepResearch.chunkResults?.marketsizing || '';
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
// SWOT ANALYSIS EXTRACTION
// =============================================================================

/**
 * Extract SWOT analysis from deep research output.
 * Synthesizes across all research chunks (market, competitors, pain points, timing, sizing)
 * to produce a comprehensive Strengths/Weaknesses/Opportunities/Threats analysis
 * for the specific business idea — not just the market.
 *
 * Uses Sonnet for fast structured extraction with enriched prompt.
 */
export type SWOTAnalysis = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export async function extractSWOT(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier
): Promise<SWOTAnalysis> {
  const { ideaTitle, ideaDescription } = input;

  const prompt = `You are a strategic business analyst performing a SWOT analysis. Think carefully about the business idea and research data before producing your analysis.

## Business Idea
**${ideaTitle}**
${ideaDescription}

## Research Data
${deepResearch.rawReport.substring(0, 15000)}

## Key Insights Already Extracted
- Market size: ${insights.marketAnalysis.size}
- Market growth: ${insights.marketAnalysis.growth}
- Competitors: ${insights.competitors.map(c => c.name).join(', ')}
- Key pain points: ${insights.painPoints.map(p => p.problem).join('; ')}
- Differentiators: ${insights.positioning.differentiators.join(', ')}
- Why-now factors: ${insights.whyNow.marketTriggers.join(', ')}

## SWOT Framework

Map findings from the research into four quadrants. Each item MUST reference specific data from the research above (competitor names, market figures, trend data, or user pain points).

**Strengths** (Internal advantages):
Unique value proposition, market fit evidence, timing advantages, technical feasibility, cost structure advantages, founder/team strengths.
- GOOD example: "15-minute setup vs. Competitor X's 2-week onboarding creates immediate switching incentive for SMBs"
- BAD example: "Strong market demand" (too generic, no evidence)

**Weaknesses** (Internal disadvantages):
Resource constraints, technical complexity, market education burden, dependency risks, go-to-market gaps.
- GOOD example: "Requires integration with 3 legacy EHR systems (Epic, Cerner, Meditech) that average 6-month certification cycles"
- BAD example: "Limited resources" (vague, applies to any startup)

**Opportunities** (External factors to leverage):
Market trends, regulatory tailwinds, competitor gaps, emerging tech, underserved segments, distribution channels.
- GOOD example: "Competitor Y's recent 40% price increase has driven 2,300+ complaints on G2, creating a switching window"
- BAD example: "Growing market" (generic, no specifics)

**Threats** (External risks):
Strong incumbents, market saturation, regulatory headwinds, economic conditions, technology disruption, platform risk.
- GOOD example: "Google's March 2026 announcement of a competing API could commoditize the core feature within 12 months"
- BAD example: "Competition" (obvious, no analysis)

## Output Requirements
- Return 4-6 items per quadrant
- Each item: 1-2 sentences, citing specific data points from the research
- Do NOT include generic platitudes — every item must be grounded in evidence from the research data above
- Return valid JSON matching the schema exactly`;

  const extractionProvider = getExtractionProvider(tier);
  console.log('[Extract SWOT] Using provider:', extractionProvider.name);

  const { SWOTSchema } = await import('./research-schemas');

  const swot = await extractionProvider.extract(prompt, SWOTSchema, {
    maxTokens: 8000,
    temperature: 0.2,
    task: 'extraction',
  });

  console.log(`[Extract SWOT] Complete: ${swot.strengths.length}S / ${swot.weaknesses.length}W / ${swot.opportunities.length}O / ${swot.threats.length}T`);

  return swot;
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

    // Step 2: Perform social platform search (wrapped in its own try/catch
    // so that provider failures fall through to the deep research fallback
    // instead of bailing the entire function)
    const platforms = ['reddit', 'twitter', 'hackernews', 'indiehackers', 'producthunt', 'linkedin'];
    const searchQuery = `${input.ideaTitle} ${input.ideaDescription.substring(0, 200)}`;

    let searchResult: SocialSearchResult | null = null;
    try {
      console.log(`[Social Proof] Searching platforms: ${platforms.join(', ')}`);
      searchResult = await searchProvider.searchSocial(searchQuery, platforms);
      console.log(`[Social Proof] Search returned ${searchResult.totalResults} posts from ${searchResult.provider}`);
    } catch (searchError) {
      console.warn(`[Social Proof] Search provider '${searchProvider.name}' failed, falling back to deep research:`, searchError instanceof Error ? searchError.message : searchError);
    }

    // Step 3: Validate quality thresholds (only if search succeeded)
    let qualityPassed = false;
    if (searchResult) {
      const minPosts = configService.getNumber('search.fallback.minPosts', 5);
      const minWordCount = configService.getNumber('search.fallback.minWordCount', 500);

      const totalWordCount = searchResult.posts.reduce((sum, post) => {
        return sum + (post.content?.split(/\s+/).length || 0);
      }, 0);

      qualityPassed = searchResult.totalResults >= minPosts && totalWordCount >= minWordCount;

      console.log(`[Social Proof] Quality check: ${searchResult.totalResults} posts, ${totalWordCount} words (need ${minPosts}/${minWordCount})`);
      console.log(`[Social Proof] Quality passed: ${qualityPassed}`);
    }

    // Step 4: If quality passes, synthesize with Claude Sonnet
    if (qualityPassed && searchResult && searchProvider.name === 'brave') {
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
        temperature: 0.2,
        task: 'extraction',
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
      pipelineId: input.researchId,
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

## REQUIRED JSON FORMAT
Return EXACTLY this structure with all values as plain strings (NOT objects):
{
  "scenario": "A 1-2 sentence setup describing the context and setting",
  "protagonist": "A 1-2 sentence description of the main character and their role",
  "problem": "A 2-3 sentence description of the challenge they face",
  "solution": "A 2-3 sentence description of how the product solves their problem",
  "outcome": "A 2-3 sentence description of the positive results achieved",
  "dayInTheLife": {                          // OPTIONAL — before/after contrast
    "before": "Describe a typical day BEFORE using the product — specific pain, wasted time, frustration",
    "after": "Describe the same day AFTER using the product — what changed, how it feels",
    "timeSaved": "Quantified time/money saved, e.g. '2 hours/day' or '$500/month'"
  },
  "emotionalArc": {                          // OPTIONAL — emotional journey
    "frustration": "The specific frustration the user felt before",
    "discovery": "The moment they found the solution — what triggered it",
    "relief": "The emotional relief and confidence after adopting the product"
  },
  "quote": "A hypothetical testimonial quote from the protagonist, e.g. 'I used to spend 3 hours on reports — now it takes 10 minutes.'"
}

CRITICAL: Every field must be a plain string. Do NOT use nested objects or arrays for the top-level fields (scenario, protagonist, problem, solution, outcome, quote). The dayInTheLife and emotionalArc objects contain only string values.

Create a relatable, specific user story matching the schema above. Make the story feel real and emotionally resonant with specific details. Include the dayInTheLife, emotionalArc, and quote fields to make it vivid and compelling.`;

  const generationProvider = getGenerationProvider(tier);
  console.log('[Generate User Story] Using provider:', generationProvider.name);

  const { UserStorySchema } = await import('./research-schemas');

  // Use a coercing schema that flattens objects to strings if the model returns them.
  // AI models sometimes return {name: "...", role: "..."} instead of a flat string.
  const flattenToString = (val: unknown): unknown => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      // Concatenate all string values from the object
      const parts = Object.values(val as Record<string, unknown>)
        .map(v => {
          if (typeof v === 'string') return v;
          if (Array.isArray(v)) return v.filter(i => typeof i === 'string').join('. ');
          return '';
        })
        .filter(Boolean);
      return parts.join(' ');
    }
    return val;
  };

  const CoercingUserStorySchema = z.object({
    scenario: z.preprocess(flattenToString, z.string()).optional().default(''),
    protagonist: z.preprocess(flattenToString, z.string()),
    problem: z.preprocess(flattenToString, z.string()),
    solution: z.preprocess(flattenToString, z.string()),
    outcome: z.preprocess(flattenToString, z.string()),
    dayInTheLife: z.object({
      before: z.string(),
      after: z.string(),
      timeSaved: z.string(),
    }).optional(),
    emotionalArc: z.object({
      frustration: z.string(),
      discovery: z.string(),
      relief: z.string(),
    }).optional(),
    quote: z.preprocess(flattenToString, z.string()).optional(),
  });

  const userStory = await generationProvider.extract(prompt, CoercingUserStorySchema, {
    maxTokens: 12000,
    temperature: 1.0,
    task: 'generation',
  });

  // If scenario came back empty (model omitted it), synthesize from other fields
  if (!userStory.scenario) {
    userStory.scenario = `${userStory.protagonist} ${userStory.problem}`;
    console.log('[Generate User Story] Synthesized missing "scenario" from protagonist + problem');
  }

  // Validate against the strict schema to ensure type compatibility
  return UserStorySchema.parse(userStory);
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
    task: 'business-plan',
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
  existingResearch?: ExistingResearchData, // for resume functionality
  engine?: 'OPENAI' | 'PERPLEXITY' // research engine selection
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
  swot: SWOTAnalysis | null;
}> {
  console.log('[Research Pipeline] Starting NEW 4-phase pipeline for:', input.ideaTitle);
  console.log('[Research Pipeline] Using tier:', tier);
  console.log('[Research Pipeline] Engine:', engine || 'OPENAI (default)');
  console.log('[Research Pipeline] o3-deep-research model:', engine === 'PERPLEXITY' ? 'sonar-deep-research' : (tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL));

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
    // Reconstruct chunkResults for resumed data that predates parallel extraction
    if (!deepResearch.chunkResults && deepResearch.rawReport) {
      deepResearch.chunkResults = reconstructChunkResults(deepResearch.rawReport);
      console.log(`[Research Pipeline] Reconstructed ${Object.keys(deepResearch.chunkResults).length} chunks from combined report`);
    }
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
      existingResearch?.researchChunks || undefined, // Resume from existing chunks
      engine
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
  let swot: SWOTAnalysis | null;

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
    swot = (existingResearch as any).swot || null;
    await onProgress?.('SYNTHESIS', 80);
  } else {
    await onProgress?.('SYNTHESIS', 58);
    console.log('[Research Pipeline] === PHASE 3: Extraction & Synthesis (GPT-5.2) ===');

    // Step 1: Extract structured insights from raw deep research
    // Use per-chunk parallel extraction when chunk results are available (4 parallel calls × ~25K each)
    // Falls back to monolithic extraction (1 call × ~125K) for legacy data without chunks
    if (deepResearch.chunkResults && Object.keys(deepResearch.chunkResults).length > 0) {
      console.log('[Research Pipeline] Extracting insights via parallel per-chunk extraction...');
      console.log(`[Research Pipeline] Available chunks: ${Object.keys(deepResearch.chunkResults).join(', ')}`);
      insights = await extractInsightsParallel(deepResearch.chunkResults, input, tier);
    } else {
      console.log('[Research Pipeline] Extracting insights from deep research (monolithic fallback)...');
      insights = await extractInsights(deepResearch, input, tier);
    }
    await onProgress?.('SYNTHESIS', 65, { insights });
    console.log('[Research Pipeline] Insights extracted successfully');

    // Step 2: Run scores, metrics, and market sizing in parallel with GPT-5.2 reasoning
    // Uses Promise.allSettled so individual failures don't lose sibling results
    console.log('[Research Pipeline] Calculating scores, metrics, and market sizing...');
    const phase3Results = await Promise.allSettled([
      extractScores(deepResearch, input, insights, tier),
      extractBusinessMetrics(deepResearch, input, insights, { opportunityScore: 0, problemScore: 0, feasibilityScore: 0, whyNowScore: 0, justifications: {} as ResearchScores['justifications'], metadata: {} as ResearchScores['metadata'] }, tier),
      extractMarketSizing(deepResearch, input, insights, tier),
      extractSWOT(deepResearch, input, insights, tier),
    ]);
    const phase3Names = ['extractScores', 'extractBusinessMetrics', 'extractMarketSizing', 'extractSWOT'] as const;
    phase3Results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Research Pipeline] Phase 3 FAILED: ${phase3Names[i]}:`, r.reason instanceof Error ? r.reason.message : r.reason);
      }
    });
    scores = phase3Results[0].status === 'fulfilled' ? phase3Results[0].value : null;
    metrics = phase3Results[1].status === 'fulfilled' ? phase3Results[1].value : null;
    marketSizing = phase3Results[2].status === 'fulfilled' ? phase3Results[2].value : null;
    swot = phase3Results[3].status === 'fulfilled' ? phase3Results[3].value : null;
    // Pass all extraction results for immediate persistence (enables resume if Phase 4 fails)
    await onProgress?.('SYNTHESIS', 80, { insights, scores: scores ?? undefined, metrics: metrics ?? undefined, marketSizing: marketSizing ?? undefined });
    const phase3Succeeded = phase3Results.filter(r => r.status === 'fulfilled').length;
    console.log(`[Research Pipeline] Phase 3 complete: ${phase3Succeeded}/4 succeeded`);
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
    marketSizing,
    userStory,
    keywordTrends,
    valueLadder,
    actionPrompts,
    socialProof,
    techStack,
    deepResearch, // Include raw research for debugging/display
    businessPlan: null, // Decoupled from pipeline — generated on-demand
    swot,
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
