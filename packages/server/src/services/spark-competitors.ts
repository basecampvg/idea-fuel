/**
 * Spark Competitor Research Service - Call 4
 *
 * Focused deep research call for competitive landscape:
 * - Direct and indirect competitor discovery
 * - Competitor positioning and differentiation
 * - Strengths and weaknesses analysis
 * - Market gaps and opportunities
 *
 * Uses o4-mini-deep-research with background polling.
 */

import {
  withExponentialBackoff,
  runDeepResearchWithPolling,
  createDeepResearchParams,
  DEEP_RESEARCH_MODEL_MINI,
  type ResponseStatus,
} from '../lib/deep-research';
import { getResearchProvider } from '../providers';
import type { SparkKeywords } from '@forge/shared';
import { safeJsonParse } from './research-ai';

// =============================================================================
// TYPES
// =============================================================================

export interface SparkCompetitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
  website?: string;
  pricing_model?: string;
}

export interface SparkCompetitorResult {
  competitors: SparkCompetitor[];
  market_gaps: string[];
}

export interface CompetitorResearchOptions {
  onProgress?: (status: ResponseStatus, elapsedMs: number) => void;
  engine?: 'OPENAI' | 'PERPLEXITY';
}

// =============================================================================
// PROMPT
// =============================================================================

const COMPETITOR_RESEARCH_PROMPT = `You are a competitive intelligence analyst specializing in market positioning and competitor analysis.

## YOUR MISSION
Find and analyze direct and indirect competitors for a business idea. Your research powers the competitive landscape portion of a market validation report.

## CRITICAL RULES
1. Only include REAL competitors that actually exist
2. Every competitor MUST have verifiable information (website, reviews, or press coverage)
3. Provide balanced analysis - both strengths AND weaknesses
4. Focus on competitors that serve the same target audience or solve the same problem
5. Quality over quantity - 3-5 well-researched competitors beat 10 surface-level mentions

---

## RESEARCH TASK 1: COMPETITOR DISCOVERY

Find 3-5 competitors (direct and indirect) that serve the same market or solve similar problems.

**For each competitor, capture:**
| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Company/product name |
| description | Yes | 1-2 sentence description of what they do |
| strengths | Yes | 2-4 specific strengths based on evidence |
| weaknesses | Yes | 2-4 specific weaknesses based on evidence |
| positioning | Yes | How they position themselves in the market |
| website | No | Main website URL if found |
| pricing_model | No | Pricing approach (freemium, subscription, one-time, etc.) |

**COMPETITOR TYPES TO FIND:**
- **Direct competitors** - Same solution to same problem for same audience
- **Indirect competitors** - Different solution to same problem
- **Adjacent competitors** - Same solution to related problem

**EVIDENCE SOURCES:**
- G2, Capterra, TrustRadius (software reviews)
- Crunchbase (funding, company info)
- ProductHunt (launches, community feedback)
- TechCrunch, Forbes (press coverage)
- Reddit, Twitter (user sentiment)

---

## RESEARCH TASK 2: MARKET GAPS

Based on competitor analysis, identify 2-4 market gaps or opportunities.

**Look for:**
- Common complaints across competitors (pricing, features, UX)
- Underserved segments that competitors ignore
- Features users request but no one provides
- Pricing tiers that don't exist
- Geographic or demographic gaps

---

## OUTPUT FORMAT

Return ONLY valid JSON - no markdown, no commentary:

{
  "competitors": [
    {
      "name": "Competitor Name",
      "description": "Brief description of what they do",
      "strengths": [
        "Specific strength 1 with evidence",
        "Specific strength 2 with evidence"
      ],
      "weaknesses": [
        "Specific weakness 1 based on reviews/feedback",
        "Specific weakness 2 based on reviews/feedback"
      ],
      "positioning": "How they describe themselves or are perceived",
      "website": "https://example.com",
      "pricing_model": "Freemium with paid tiers from $X/month"
    }
  ],
  "market_gaps": [
    "Gap 1: Specific opportunity based on competitor weaknesses",
    "Gap 2: Underserved segment or missing feature"
  ]
}

Remember: Every competitor must be REAL and verifiable. Balanced analysis with both strengths and weaknesses. Empty arrays are acceptable if no relevant competitors found.`;

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Run competitor research (Call 4)
 *
 * Searches for direct and indirect competitors using
 * the keywords generated in Call 1.
 */
export async function runCompetitorResearch(
  idea: string,
  keywords: SparkKeywords,
  expansionPromptSection: string = '',
  options: CompetitorResearchOptions = {}
): Promise<SparkCompetitorResult> {
  console.log('[Spark:Competitors] Starting competitive landscape research...');

  const userQuery = `
## BUSINESS IDEA
${idea}

## KEYWORD CONTEXT
These keywords describe the market space and can help identify competitors:
- Primary phrases: ${keywords.phrases.join(', ')}
- Related terms: ${keywords.synonyms.slice(0, 10).join(', ')}

## SEARCH QUERIES TO EXECUTE
1. "${keywords.phrases[0] || 'solution'} alternatives"
2. "${keywords.phrases[0] || 'solution'} competitors"
3. "best ${keywords.phrases[1] || keywords.phrases[0] || 'tools'} for ${keywords.phrases[2] || 'business'}"
4. "${keywords.phrases[0] || 'product'} reviews G2"
5. "${keywords.phrases[0] || 'product'} vs"

## INSTRUCTIONS
1. Find 3-5 real competitors (direct and indirect)
2. Research each competitor's positioning, strengths, weaknesses
3. Look for pricing information and market positioning
4. Identify market gaps based on competitor weaknesses
5. Return structured JSON with all findings
${expansionPromptSection}
`;

  const competitorDomains = [
    'g2.com',
    'capterra.com',
    'trustradius.com',
    'getapp.com',
    'crunchbase.com',
    'producthunt.com',
    'techcrunch.com',
    'forbes.com',
    'venturebeat.com',
    'trustpilot.com',
    'reddit.com',
    'twitter.com',
    'x.com',
  ];

  let result: { content: string };

  if (options.engine === 'PERPLEXITY') {
    // --- Perplexity path: route through AIProvider abstraction ---
    const provider = getResearchProvider(undefined, 'PERPLEXITY');
    console.log(`[Spark:Competitors] Using Perplexity sonar-deep-research with ${competitorDomains.length} domains...`);

    const response = await withExponentialBackoff(
      () => provider.research(userQuery, {
        systemPrompt: COMPETITOR_RESEARCH_PROMPT,
        domains: competitorDomains,
        maxTokens: 16000,
      }),
      {
        maxAttempts: 2,
        initialDelayMs: 10000,
        maxDelayMs: 60000,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Spark:Competitors] Perplexity retry ${attempt}/2 after ${delayMs}ms:`, error instanceof Error ? error.message : error);
        },
      }
    );
    result = { content: response.content };
  } else {
    // --- OpenAI path: deep research with polling ---
    const params = createDeepResearchParams({
      model: DEEP_RESEARCH_MODEL_MINI,
      systemPrompt: COMPETITOR_RESEARCH_PROMPT,
      userQuery,
      domains: competitorDomains,
      background: true,
      maxOutputTokens: 50000,
      reasoningSummary: 'auto',
    });

    result = await withExponentialBackoff(
      () =>
        runDeepResearchWithPolling(params, {
          pollIntervalMs: 15000,
          maxWaitMs: 3600000,
          onProgress: (status: ResponseStatus, elapsed: number) => {
            console.log(`[Spark:Competitors] Status: ${status} (${Math.round(elapsed / 1000)}s)`);
            options.onProgress?.(status, elapsed);
          },
          onLog: (msg: string) => console.log(msg),
        }),
      {
        maxAttempts: 3,
        initialDelayMs: 10000,
        maxDelayMs: 120000,
        onRetry: (attempt, error, delayMs) => {
          console.warn(
            `[Spark:Competitors] Retry ${attempt}/3 after ${delayMs}ms:`,
            error instanceof Error ? error.message : error
          );
        },
      }
    );
  }

  // Parse the response
  const rawContent = result.content || '';
  const parsed = parseCompetitorResult(rawContent);

  console.log(
    `[Spark:Competitors] Complete - ${parsed.competitors.length} competitors, ${parsed.market_gaps.length} gaps`
  );

  return parsed;
}

// =============================================================================
// PARSING
// =============================================================================

/**
 * Parse competitor research result from raw content
 */
function parseCompetitorResult(rawContent: string): SparkCompetitorResult {
  // Try to find JSON in the content
  let jsonStr = rawContent;

  // Check if wrapped in markdown code block
  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object boundaries
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
  }

  const result = safeJsonParse<Record<string, unknown>>(jsonStr);

  if (!result.ok) {
    console.error('[Spark:Competitors] Failed to parse response:', result.reason);
    return {
      competitors: [],
      market_gaps: [],
    };
  }

  const parsed = result.data;

  // Validate and return with defaults
  return {
    competitors: Array.isArray(parsed.competitors)
      ? parsed.competitors.map((c: Record<string, unknown>) => ({
          name: String(c.name || ''),
          description: String(c.description || ''),
          strengths: Array.isArray(c.strengths) ? c.strengths.map(String) : [],
          weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses.map(String) : [],
          positioning: String(c.positioning || ''),
          website: c.website ? String(c.website) : undefined,
          pricing_model: c.pricing_model ? String(c.pricing_model) : undefined,
        }))
      : [],
    market_gaps: Array.isArray(parsed.market_gaps)
      ? parsed.market_gaps.map(String)
      : [],
  };
}
