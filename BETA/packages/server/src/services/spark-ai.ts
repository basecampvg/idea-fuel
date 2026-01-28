/**
 * Spark AI Service - Quick Validation Pipeline
 *
 * 6-step parallel pipeline for rapid idea validation:
 * - Call 1: Generate keywords with gpt-4o-mini
 * - Call 2: Demand + Community research (o4-mini-deep-research) ─┐
 * - Call 3: TAM + Trend research (o4-mini-deep-research)        ─┼─ PARALLEL (3 calls)
 * - Call 4: Competitor research (o4-mini-deep-research)         ─┘
 * - Call 5: Synthesize with GPT-5.2
 * - Step 6: SerpAPI keyword trends (optional)
 *
 * Outputs demand signals, directional TAM, keyword trends, Reddit/Facebook groups, competitors.
 */

import { openai, createResponsesParams, getAIParams } from '../lib/openai';
import { batchGetTrendData, isSerpApiConfigured, type TrendData } from '../lib/serpapi';
import {
  withExponentialBackoff,
  runDeepResearchWithPolling,
  createDeepResearchParams,
  DEEP_RESEARCH_MODEL_MINI,
  type ResponseStatus,
} from '../lib/deep-research';
import { trackUsageFromResponse } from '../lib/token-tracker';
import {
  extractResponseContent,
  validateJsonCompleteness,
  isolateJson,
  ResponseParseError,
} from './research-ai';
import { runDemandResearch, type SparkDemandResult } from './spark-demand';
import { runTamResearch, type SparkTamResult } from './spark-tam';
import { runCompetitorResearch, type SparkCompetitorResult } from './spark-competitors';
import type {
  SparkKeywords,
  SparkResult,
  SparkJobStatus,
  SparkKeywordTrend,
} from '@forge/shared';
import { sparkResultSchema } from '@forge/shared';

// =============================================================================
// CONSTANTS
// =============================================================================

const KEYWORD_MODEL = 'gpt-4o-mini';
const SPARK_RESEARCH_MODEL = DEEP_RESEARCH_MODEL_MINI; // o4-mini-deep-research
const SYNTHESIS_MODEL = 'gpt-5.2'; // Synthesis and verdict generation

// Feature flag for parallel pipeline (can be overridden via config)
const USE_PARALLEL_PIPELINE = true;

// =============================================================================
// CALL 1: KEYWORD GENERATION (gpt-4o-mini)
// =============================================================================

const KEYWORD_SYSTEM_PROMPT = `You are a keyword research expert specializing in market validation and demand discovery.

Your task is to generate a keyword pack for validating a business idea. The output must be:
1. 6 keyword phrases that mix:
   - Core intent keywords (what the product/service does)
   - Problem-based keywords (the pain points it solves)
   - Audience + format keywords (who needs it + how they search)
2. 10-20 synonym terms for semantic variations
3. A query plan with specific search queries for:
   - General web search
   - Reddit-specific searches (site:reddit.com)
   - Facebook Groups discovery (site:facebook.com/groups)

Output ONLY valid JSON matching this exact schema:
{
  "phrases": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "synonyms": ["synonym1", "synonym2", ...],
  "query_plan": {
    "general_search": ["query1", "query2", ...],
    "reddit_search": ["site:reddit.com query1", ...],
    "facebook_groups_search": ["site:facebook.com/groups query1", ...]
  }
}`;

/**
 * Call 1: Generate keyword pack from idea description
 */
export async function generateSparkKeywords(ideaDescription: string): Promise<SparkKeywords> {
  console.log('[Spark] Call 1: Generating keywords with gpt-4o-mini...');

  const params = createResponsesParams(
    {
      model: KEYWORD_MODEL,
      input: [
        { role: 'system', content: KEYWORD_SYSTEM_PROMPT },
        { role: 'user', content: `Generate a keyword pack for this business idea:\n\n${ideaDescription}` },
      ],
      max_output_tokens: 2000,
      response_format: { type: 'json_object' },
    },
    { reasoning: 'low', verbosity: 'low' }
  );

  const response = await withExponentialBackoff(
    () => openai.responses.create(params),
    {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        console.log(`[Spark] Keyword generation retry ${attempt}:`, error);
      },
    }
  );

  // Track token usage for keyword generation
  trackUsageFromResponse(response, {
    functionName: 'generateSparkKeywords',
    model: KEYWORD_MODEL,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseAny = response as any;
  const content = responseAny.output_text || responseAny.output?.[0]?.content || '';

  try {
    const parsed = JSON.parse(content);
    return {
      phrases: parsed.phrases || [],
      synonyms: parsed.synonyms || [],
      query_plan: {
        general_search: parsed.query_plan?.general_search || [],
        reddit_search: parsed.query_plan?.reddit_search || [],
        facebook_groups_search: parsed.query_plan?.facebook_groups_search || [],
      },
    };
  } catch (error) {
    console.error('[Spark] Failed to parse keyword response:', content);
    throw new Error('Failed to parse keyword generation response');
  }
}

// =============================================================================
// CALL 5: SYNTHESIS (GPT-5.2)
// =============================================================================

/**
 * Build synthesis prompt with data quality context
 */
function buildSynthesisPrompt(dataQualityContext: string): string {
  return `You are a senior business analyst synthesizing market validation data into a final report.

## YOUR MISSION
Combine demand research (Reddit, Facebook Groups, pain points), market sizing (TAM, trends), and competitive landscape into a cohesive SparkResult. Generate a verdict and actionable next experiment.

## CRITICAL RULES
1. **NO FABRICATION** - Only use data from the provided inputs
2. **NO INVENTED URLs** - Only include URLs that exist in the inputs
3. **PRESERVE ALL DATA** - Include every thread, group, competitor, and citation from inputs
4. **ADD ANALYSIS** - Your value is synthesis and judgment, not data creation

## DATA QUALITY CONTEXT
${dataQualityContext}

---

## VERDICT CRITERIA

Analyze the combined evidence to determine verdict:

### PROCEED (Green Light)
- 3+ relevant Reddit threads with clear demand signals
- 2+ WTP clues indicating pricing acceptance
- TAM base estimate > $100M
- Trend direction is "rising" or "flat"
- Facebook groups with fit_score >= 2 exist
- Competitors exist but have clear weaknesses or market gaps

### WATCHLIST (Yellow Light)
- Some demand signals exist but sparse
- WTP clues present but weak
- TAM reasonable but assumptions uncertain
- Mixed or unknown trend signals
- Limited community presence
- Strong competitors with unclear differentiation opportunity

### DROP (Red Light)
- Minimal or no demand signals found
- No WTP clues despite searching
- TAM very small (<$50M) or highly uncertain
- Declining trend with evidence
- No relevant communities found
- Dominant competitors with no clear market gaps

---

## NEXT EXPERIMENT DESIGN

Based on the verdict, recommend ONE specific next step:

### For PROCEED:
- Direct validation experiment (landing page, waitlist, customer interviews)
- Time-boxed, measurable, specific

### For WATCHLIST:
- Research clarification experiment (more specific searches, competitor analysis, user interviews)
- Address the uncertainty gaps identified

### For DROP:
- Pivot exploration or graceful exit
- What would need to change to reconsider?

---

## OUTPUT FORMAT

Return ONLY valid JSON matching SparkResult schema:

{
  "idea": "Brief restatement of the business idea being validated",
  "keywords": {
    "phrases": [...from input...],
    "synonyms": [...from input...],
    "query_plan": {...from input...}
  },
  "trend_signal": {...from TAM research or default if unavailable...},
  "reddit": {...from demand research or empty if unavailable...},
  "facebook_groups": [...from demand research or empty if unavailable...],
  "tam": {...from TAM research or default if unavailable...},
  "competitors": [...from competitor research or empty if unavailable...],
  "market_gaps": [...from competitor research or empty if unavailable...],
  "verdict": "proceed|watchlist|drop",
  "summary": "2-4 sentence executive summary synthesizing key findings. Include: (1) demand signal strength, (2) market opportunity, (3) key risk or gap. Tone should match verdict (confident for proceed, cautious for watchlist, direct for drop).",
  "next_experiment": {
    "hypothesis": "If we [specific action], then [expected outcome]",
    "test": "Specific test: e.g., 'Create landing page with email capture'",
    "success_metric": "Measurable: e.g., '50 email signups in 2 weeks'",
    "timebox": "Duration: e.g., '2 weeks'"
  }
}`;
}

/**
 * Call 5: Synthesize demand + TAM + competitor results into final SparkResult
 */
async function synthesizeSparkResults(
  ideaDescription: string,
  keywords: SparkKeywords,
  demandResult: SparkDemandResult | null,
  tamResult: SparkTamResult | null,
  competitorResult: SparkCompetitorResult | null,
  dataQualityContext: string
): Promise<SparkResult> {
  console.log('[Spark] Call 5: Synthesizing results with GPT-5.2...');

  const userPrompt = `Synthesize this market validation data into a final SparkResult:

## BUSINESS IDEA
${ideaDescription}

## KEYWORDS (from Call 1)
${JSON.stringify(keywords, null, 2)}

## DEMAND RESEARCH (from Call 2)
${demandResult ? JSON.stringify(demandResult, null, 2) : 'UNAVAILABLE - Community signals could not be retrieved.'}

## TAM RESEARCH (from Call 3)
${tamResult ? JSON.stringify(tamResult, null, 2) : 'UNAVAILABLE - Market sizing data could not be retrieved.'}

## COMPETITOR RESEARCH (from Call 4)
${competitorResult ? JSON.stringify(competitorResult, null, 2) : 'UNAVAILABLE - Competitor analysis could not be retrieved.'}

## INSTRUCTIONS
1. Combine all available data into a complete SparkResult
2. Generate a verdict based on available evidence
3. Design a next experiment appropriate for the verdict
4. If data is missing, acknowledge limitations and adjust confidence accordingly
5. Include all competitors and market gaps from competitor research`;

  const systemPrompt = buildSynthesisPrompt(dataQualityContext);
  const aiParams = getAIParams('synthesizeInsights', 'PRO');

  const params = createResponsesParams(
    {
      model: SYNTHESIS_MODEL,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_output_tokens: 15000,
      response_format: { type: 'json_object' },
    },
    aiParams
  );

  const response = await withExponentialBackoff(
    () => openai.responses.create(params),
    {
      maxAttempts: 5,
      initialDelayMs: 2000,
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[Spark] Synthesis retry ${attempt}/5 after ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
      },
    }
  );

  // Track token usage
  trackUsageFromResponse(response, {
    functionName: 'synthesizeSparkResults',
    model: SYNTHESIS_MODEL,
  });

  // Use unified content extractor (handles both output_text and output[] array formats)
  const content = extractResponseContent(response);

  if (!content) {
    throw new ResponseParseError('Synthesis returned empty content', response);
  }

  console.log('[Spark] Synthesis response length:', content.length);

  // Validate JSON completeness before parsing
  try {
    validateJsonCompleteness(content, 'synthesizeSparkResults');
  } catch (truncationError) {
    console.error('[Spark] Synthesis response appears truncated');
    throw truncationError;
  }

  // Try direct parse first, then isolate JSON if needed (handles markdown code fences)
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch (directParseError) {
    console.log('[Spark] Direct JSON parse failed, attempting isolation...');
    const isolated = isolateJson(content);
    if (!isolated) {
      console.error('[Spark] Failed to isolate JSON from response:', content.slice(0, 500));
      throw new ResponseParseError('Failed to parse synthesis response: could not isolate JSON', response);
    }
    try {
      parsed = JSON.parse(isolated);
      console.log('[Spark] Successfully parsed after JSON isolation');
    } catch (isolatedParseError) {
      console.error('[Spark] JSON parse failed after isolation:', isolatedParseError);
      throw new ResponseParseError('Failed to parse synthesis response after isolation', response);
    }
  }

  // Ensure keywords are preserved from input
  const mergedKeywords = {
    phrases: parsed.keywords && typeof parsed.keywords === 'object' && 'phrases' in parsed.keywords
      ? (parsed.keywords as Record<string, unknown>).phrases as string[] || keywords.phrases
      : keywords.phrases,
    synonyms: parsed.keywords && typeof parsed.keywords === 'object' && 'synonyms' in parsed.keywords
      ? (parsed.keywords as Record<string, unknown>).synonyms as string[] || keywords.synonyms
      : keywords.synonyms,
    query_plan: {
      general_search: (parsed.keywords as Record<string, unknown>)?.query_plan
        ? ((parsed.keywords as Record<string, unknown>).query_plan as Record<string, unknown>)?.general_search as string[] || keywords.query_plan.general_search
        : keywords.query_plan.general_search,
      reddit_search: (parsed.keywords as Record<string, unknown>)?.query_plan
        ? ((parsed.keywords as Record<string, unknown>).query_plan as Record<string, unknown>)?.reddit_search as string[] || keywords.query_plan.reddit_search
        : keywords.query_plan.reddit_search,
      facebook_groups_search: (parsed.keywords as Record<string, unknown>)?.query_plan
        ? ((parsed.keywords as Record<string, unknown>).query_plan as Record<string, unknown>)?.facebook_groups_search as string[] || keywords.query_plan.facebook_groups_search
        : keywords.query_plan.facebook_groups_search,
    },
  };

  try {
    // Validate with zod schema
    const validated = sparkResultSchema.parse({
      idea: parsed.idea || ideaDescription,
      keywords: mergedKeywords,
      trend_signal: parsed.trend_signal || tamResult?.trend_signal || { direction: 'unknown', evidence: [] },
      reddit: parsed.reddit || demandResult?.reddit || { top_threads: [], recurring_pains: [], willingness_to_pay_clues: [] },
      facebook_groups: parsed.facebook_groups || demandResult?.facebook_groups || [],
      tam: parsed.tam || tamResult?.tam || {
        currency: 'USD',
        low: 0,
        base: 0,
        high: 0,
        method: 'unavailable',
        assumptions: [],
        citations: [],
      },
      competitors: parsed.competitors || competitorResult?.competitors,
      market_gaps: parsed.market_gaps || competitorResult?.market_gaps,
      verdict: parsed.verdict || 'watchlist',
      summary: parsed.summary,  // AI-generated findings summary
      next_experiment: parsed.next_experiment || {
        hypothesis: '',
        test: '',
        success_metric: '',
        timebox: '',
      },
    });

    console.log('[Spark] Synthesis complete');
    return validated;
  } catch (validationError) {
    console.error('[Spark] Zod validation failed:', validationError);
    throw new ResponseParseError('Failed to validate synthesis response schema', response);
  }
}

// =============================================================================
// STEP 6: KEYWORD TRENDS (SerpAPI)
// =============================================================================

/**
 * Fetch keyword trends from SerpAPI
 */
export async function fetchSparkKeywordTrends(
  phrases: string[]
): Promise<SparkKeywordTrend[]> {
  if (!isSerpApiConfigured()) {
    console.log('[Spark] SerpAPI not configured, skipping trend data');
    return [];
  }

  console.log(`[Spark] Step 6: Fetching trends for ${phrases.length} keywords...`);

  const results = await batchGetTrendData(phrases, {
    timeRange: 'today 12-m',
    delayMs: 500,
  });

  const trends: SparkKeywordTrend[] = [];

  for (const [keyword, result] of results) {
    if (result instanceof Error) {
      console.warn(`[Spark] Failed to get trend for "${keyword}":`, result.message);
      continue;
    }

    // Determine growth direction from trend data
    const trendData = result as TrendData;
    const growth = determineTrendGrowth(trendData.interestOverTime);

    trends.push({
      keyword,
      volume: trendData.averageInterest,
      growth,
      trend: trendData.interestOverTime,
    });
  }

  console.log(`[Spark] Got trends for ${trends.length}/${phrases.length} keywords`);
  return trends;
}

/**
 * Determine if a trend is rising, stable, or declining
 */
function determineTrendGrowth(
  data: Array<{ date: string; value: number }>
): 'rising' | 'stable' | 'declining' {
  if (data.length < 4) return 'stable';

  // Compare first quarter average to last quarter average
  const quarterLength = Math.floor(data.length / 4);
  const firstQuarter = data.slice(0, quarterLength);
  const lastQuarter = data.slice(-quarterLength);

  const firstAvg = firstQuarter.reduce((sum, p) => sum + p.value, 0) / firstQuarter.length;
  const lastAvg = lastQuarter.reduce((sum, p) => sum + p.value, 0) / lastQuarter.length;

  const changePercent = ((lastAvg - firstAvg) / (firstAvg || 1)) * 100;

  if (changePercent > 15) return 'rising';
  if (changePercent < -15) return 'declining';
  return 'stable';
}

// =============================================================================
// PARALLEL PIPELINE ORCHESTRATOR (NEW)
// =============================================================================

export interface SparkPipelineOptions {
  onStatusChange?: (status: SparkJobStatus) => Promise<void>;
  includeTrends?: boolean;
  useParallelPipeline?: boolean;
}

/**
 * Run the full Spark validation pipeline (parallel version)
 *
 * @param ideaDescription - The idea to validate
 * @param options - Pipeline options
 * @returns Complete Spark validation result
 */
export async function runSparkPipeline(
  ideaDescription: string,
  options: SparkPipelineOptions = {}
): Promise<SparkResult> {
  const {
    onStatusChange,
    includeTrends = true,
    useParallelPipeline = USE_PARALLEL_PIPELINE,
  } = options;

  // Use legacy pipeline if parallel is disabled
  if (!useParallelPipeline) {
    return runSparkPipelineLegacy(ideaDescription, { onStatusChange, includeTrends });
  }

  console.log('[Spark] Starting parallel validation pipeline...');
  const pipelineStart = Date.now();

  // =========================================================================
  // Call 1: Generate keywords
  // =========================================================================
  await onStatusChange?.('RUNNING_KEYWORDS');
  const keywords = await generateSparkKeywords(ideaDescription);
  console.log(`[Spark] Call 1 complete - ${keywords.phrases.length} keywords generated`);

  // =========================================================================
  // Call 2 + 3 + 4: Parallel deep research
  // =========================================================================
  await onStatusChange?.('RUNNING_PARALLEL');
  console.log('[Spark] Starting parallel research (Call 2: Demand, Call 3: TAM, Call 4: Competitors)...');

  const [demandSettled, tamSettled, competitorSettled] = await Promise.allSettled([
    runDemandResearch(ideaDescription, keywords),
    runTamResearch(ideaDescription, keywords),
    runCompetitorResearch(ideaDescription, keywords),
  ]);

  // Extract results with graceful degradation
  const demandResult = demandSettled.status === 'fulfilled' ? demandSettled.value : null;
  const tamResult = tamSettled.status === 'fulfilled' ? tamSettled.value : null;
  const competitorResult = competitorSettled.status === 'fulfilled' ? competitorSettled.value : null;

  // Log errors if any
  if (demandSettled.status === 'rejected') {
    console.error('[Spark] Call 2 (Demand) failed:', demandSettled.reason);
  }
  if (tamSettled.status === 'rejected') {
    console.error('[Spark] Call 3 (TAM) failed:', tamSettled.reason);
  }
  if (competitorSettled.status === 'rejected') {
    console.error('[Spark] Call 4 (Competitors) failed:', competitorSettled.reason);
  }

  // Check if we can proceed - need at least one of demand or TAM
  if (!demandResult && !tamResult) {
    throw new Error('Both demand and TAM research calls failed - cannot synthesize');
  }

  // Determine data quality context for synthesis
  const qualityIssues: string[] = [];
  if (!demandResult) qualityIssues.push('Community signals unavailable (Call 2 failed)');
  if (!tamResult) qualityIssues.push('Market sizing unavailable (Call 3 failed)');
  if (!competitorResult) qualityIssues.push('Competitor analysis unavailable (Call 4 failed)');

  const dataQualityContext = qualityIssues.length === 0
    ? 'Full data available from all 3 research calls. Confidence: HIGH.'
    : qualityIssues.length === 1
    ? `WARNING: ${qualityIssues[0]}. Confidence: MEDIUM.`
    : `WARNING: ${qualityIssues.join('. ')}. Confidence: LOW.`;

  console.log(`[Spark] Parallel research complete - Demand: ${demandResult ? 'OK' : 'FAILED'}, TAM: ${tamResult ? 'OK' : 'FAILED'}, Competitors: ${competitorResult ? 'OK' : 'FAILED'}`);

  // =========================================================================
  // Call 5: Synthesize results
  // =========================================================================
  await onStatusChange?.('SYNTHESIZING');
  let result = await synthesizeSparkResults(
    ideaDescription,
    keywords,
    demandResult,
    tamResult,
    competitorResult,
    dataQualityContext
  );

  // =========================================================================
  // Step 6: SerpAPI keyword trends (optional)
  // =========================================================================
  if (includeTrends && keywords.phrases.length > 0) {
    try {
      const trends = await fetchSparkKeywordTrends(keywords.phrases);

      if (trends.length > 0) {
        result.keyword_trends = trends;

        const risingCount = trends.filter(t => t.growth === 'rising').length;
        const decliningCount = trends.filter(t => t.growth === 'declining').length;

        // Override trend direction if strong SerpAPI signals
        if (risingCount > decliningCount && risingCount >= 3) {
          result.trend_signal.direction = 'rising';
        } else if (decliningCount > risingCount && decliningCount >= 3) {
          result.trend_signal.direction = 'declining';
        }
      }
    } catch (trendError) {
      console.warn('[Spark] Step 6 (SerpAPI) failed:', trendError);
      // Continue without trend data - it's optional
    }
  }

  // =========================================================================
  // Complete
  // =========================================================================
  const status: SparkJobStatus = (!demandResult || !tamResult || !competitorResult) ? 'PARTIAL_COMPLETE' : 'COMPLETE';
  await onStatusChange?.(status);

  const elapsed = Math.round((Date.now() - pipelineStart) / 1000);
  console.log(`[Spark] Pipeline complete in ${elapsed}s - Status: ${status}`);

  return result;
}

// =============================================================================
// LEGACY PIPELINE (SINGLE DEEP RESEARCH CALL)
// =============================================================================

const SPARK_RESEARCH_PROMPT_LEGACY = `You are a senior market research analyst conducting rapid validation for a business idea.
Your task is to execute the EXACT search queries provided and return structured validation data.

## CRITICAL INSTRUCTIONS
1. Execute the EXACT search queries provided in the user message - do not substitute with generic searches
2. Only include results that are DIRECTLY RELEVANT to the specific business idea described
3. If a search returns no relevant results, return empty arrays - do NOT substitute irrelevant content

## RESEARCH TASK 1: REDDIT VALIDATION

Search Reddit using the provided queries. For each relevant thread found, capture:

| Field | Required | Description |
|-------|----------|-------------|
| title | Yes | Exact thread title |
| subreddit | Yes | Subreddit name (e.g., "r/entrepreneur") |
| url | Yes | Direct URL to the thread |
| upvotes | Yes | Upvote count (number) |
| comments | Yes | Comment count (number) |
| posted | Yes | When posted (e.g., "2 months ago") |
| signal | Yes | Key insight from this thread (1-2 sentences) |

**RELEVANCE CRITERIA for Reddit:**
- Thread MUST discuss the specific problem/solution in the business idea
- Thread MUST contain pain points, willingness to pay signals, or competitor mentions
- Do NOT include generic startup/business advice threads
- Prefer threads with 10+ upvotes and active discussion
- Find 3-5 highly relevant threads

**PAIN POINT EXTRACTION:**
From the Reddit threads, extract recurring pain points. For each pain point:
- Describe the specific problem (not generic)
- Note frequency (mentioned in X threads)
- Note severity indicators (strong language, repeated frustration)

**WILLINGNESS TO PAY CLUES:**
Look for signals that people would pay for a solution:
- "I would pay for..."
- "I've been looking for..."
- "We currently spend $X on..."
- Mentions of budget or pricing expectations

## RESEARCH TASK 2: FACEBOOK GROUPS

Search for Facebook Groups using the provided queries. For each relevant group:

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Exact group name |
| members | Yes | Member count (e.g., "15.2k members") |
| privacy | Yes | "public" or "private" |
| url | Yes | Direct URL to the group |
| fit_score | Yes | 0-3 relevance score |
| why_relevant | Yes | Why this group fits the target audience |

**FIT SCORING:**
- 3 = Perfect fit (group specifically about this problem/solution space)
- 2 = Good fit (adjacent audience that would be interested)
- 1 = Moderate fit (tangentially related)
- 0 = Not relevant (do not include)

## RESEARCH TASK 3: MARKET SIZING (TAM)

Estimate the Total Addressable Market using real data sources.

**Required Data Points:**
| Field | Required | Description |
|-------|----------|-------------|
| currency | Yes | "USD" |
| low | Yes | Conservative estimate (number) |
| base | Yes | Most likely estimate (number) |
| high | Yes | Optimistic estimate (number) |
| method | Yes | "topdown", "bottomup", or "topdown+bottomup" |
| assumptions | Yes | 3-5 specific assumptions made |
| citations | Yes | Sources with URLs |

## RESEARCH TASK 4: TREND SIGNAL

Determine if demand for this solution is rising, flat, or declining.

**Evidence Requirements:**
- Date-stamped data points showing trend direction
- Industry growth rates
- Recent news or funding activity

## OUTPUT FORMAT
Return ONLY valid JSON matching the SparkResult schema.

IMPORTANT: Quality over quantity. Only include data that is DIRECTLY relevant to the business idea. Empty arrays are acceptable if no relevant data is found.`;

/**
 * Legacy: Run single deep research call (kept for backward compatibility)
 */
async function runSparkResearchLegacy(
  idea: string,
  keywords: SparkKeywords
): Promise<SparkResult> {
  console.log('[Spark:Legacy] Running single research call...');

  const userQuery = `
## BUSINESS IDEA
${idea}

## REQUIRED SEARCH QUERIES - EXECUTE THESE EXACTLY

### Reddit Queries:
${keywords.query_plan.reddit_search.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### Facebook Groups Queries:
${keywords.query_plan.facebook_groups_search.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### General Market Research Queries:
${keywords.query_plan.general_search.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## KEYWORD CONTEXT
Primary phrases: ${keywords.phrases.join(', ')}
Synonyms: ${keywords.synonyms.slice(0, 10).join(', ')}
`;

  const params = createDeepResearchParams({
    model: SPARK_RESEARCH_MODEL,
    systemPrompt: SPARK_RESEARCH_PROMPT_LEGACY,
    userQuery,
    domains: [
      'reddit.com',
      'facebook.com',
      'news.ycombinator.com',
      'indiehackers.com',
      'producthunt.com',
      'twitter.com',
      'x.com',
      'statista.com',
      'grandviewresearch.com',
      'ibisworld.com',
      'mckinsey.com',
      'techcrunch.com',
      'forbes.com',
      'g2.com',
      'capterra.com',
      'trustpilot.com',
      'crunchbase.com',
    ],
    background: true,
    maxOutputTokens: 100000,
    reasoningSummary: 'auto',
  });

  const result = await withExponentialBackoff(
    () =>
      runDeepResearchWithPolling(params, {
        pollIntervalMs: 15000,
        maxWaitMs: 3600000,
        onProgress: (status: ResponseStatus, elapsed: number) => {
          console.log(`[Spark:Legacy] Status: ${status} (${Math.round(elapsed / 1000)}s)`);
        },
        onLog: (msg: string) => console.log(msg),
      }),
    {
      maxAttempts: 3,
      initialDelayMs: 10000,
      maxDelayMs: 120000,
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[Spark:Legacy] Retry ${attempt}/3 after ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
      },
    }
  );

  const rawContent = result.content || '';
  return parseSparkResultLegacy(rawContent, idea, keywords);
}

/**
 * Parse legacy SparkResult from raw content
 */
function parseSparkResultLegacy(
  rawContent: string,
  idea: string,
  keywords: SparkKeywords
): SparkResult {
  let jsonStr = rawContent;

  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
  }

  const parsed = JSON.parse(jsonStr);

  const parsedKeywords = parsed.keywords || {};
  const mergedKeywords = {
    phrases: parsedKeywords.phrases || keywords.phrases || [],
    synonyms: parsedKeywords.synonyms || keywords.synonyms || [],
    query_plan: {
      general_search: parsedKeywords.query_plan?.general_search || keywords.query_plan?.general_search || [],
      reddit_search: parsedKeywords.query_plan?.reddit_search || keywords.query_plan?.reddit_search || [],
      facebook_groups_search: parsedKeywords.query_plan?.facebook_groups_search || keywords.query_plan?.facebook_groups_search || [],
    },
  };

  const validated = sparkResultSchema.parse({
    idea: parsed.idea || idea,
    keywords: mergedKeywords,
    trend_signal: parsed.trend_signal || { direction: 'unknown', evidence: [] },
    reddit: parsed.reddit || { top_threads: [], recurring_pains: [], willingness_to_pay_clues: [] },
    facebook_groups: parsed.facebook_groups || [],
    tam: parsed.tam || {
      currency: 'USD',
      low: 0,
      base: 0,
      high: 0,
      method: 'estimated',
      assumptions: [],
      citations: [],
    },
    verdict: parsed.verdict || 'watchlist',
    next_experiment: parsed.next_experiment || {
      hypothesis: '',
      test: '',
      success_metric: '',
      timebox: '',
    },
  });

  return validated;
}

/**
 * Legacy pipeline orchestrator
 */
async function runSparkPipelineLegacy(
  ideaDescription: string,
  options: { onStatusChange?: (status: SparkJobStatus) => Promise<void>; includeTrends?: boolean }
): Promise<SparkResult> {
  const { onStatusChange, includeTrends = true } = options;

  console.log('[Spark:Legacy] Starting single-call pipeline...');

  // Call 1: Generate keywords
  await onStatusChange?.('RUNNING_KEYWORDS');
  const keywords = await generateSparkKeywords(ideaDescription);

  // Single research call
  await onStatusChange?.('RUNNING_RESEARCH');
  let result = await runSparkResearchLegacy(ideaDescription, keywords);

  // SerpAPI trends
  if (includeTrends && keywords.phrases.length > 0) {
    try {
      const trends = await fetchSparkKeywordTrends(keywords.phrases);
      if (trends.length > 0) {
        result.keyword_trends = trends;
        const risingCount = trends.filter(t => t.growth === 'rising').length;
        const decliningCount = trends.filter(t => t.growth === 'declining').length;
        if (risingCount > decliningCount && risingCount >= 3) {
          result.trend_signal.direction = 'rising';
        } else if (decliningCount > risingCount && decliningCount >= 3) {
          result.trend_signal.direction = 'declining';
        }
      }
    } catch (trendError) {
      console.warn('[Spark:Legacy] SerpAPI failed:', trendError);
    }
  }

  await onStatusChange?.('COMPLETE');
  console.log('[Spark:Legacy] Pipeline complete');

  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { KEYWORD_MODEL, SPARK_RESEARCH_MODEL, SYNTHESIS_MODEL };
