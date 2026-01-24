/**
 * Spark TAM Research Service - Call 3
 *
 * Focused deep research call for market sizing:
 * - TAM estimation (top-down + bottom-up)
 * - Trend direction analysis
 * - Citations for all claims
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
import type { SparkKeywords } from '@forge/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface SparkTamResult {
  tam: {
    currency: string;
    low: number;
    base: number;
    high: number;
    method: string;
    assumptions: string[];
    citations: Array<{
      label: string;
      url: string;
    }>;
  };
  trend_signal: {
    direction: 'rising' | 'flat' | 'declining' | 'unknown';
    evidence: Array<{
      claim: string;
      source_url: string;
    }>;
  };
}

export interface TamResearchOptions {
  onProgress?: (status: ResponseStatus, elapsedMs: number) => void;
}

// =============================================================================
// PROMPT
// =============================================================================

const TAM_RESEARCH_PROMPT = `You are a market sizing analyst specializing in TAM estimation and trend analysis.

## YOUR MISSION
Estimate the Total Addressable Market and determine trend direction using REAL data sources. Your research powers the market sizing portion of a validation report.

## CRITICAL RULES
1. Every number MUST be backed by a citation (source URL)
2. Show your calculation methodology explicitly
3. Use both top-down AND bottom-up approaches
4. Be conservative - state assumptions clearly
5. Trend direction must be supported by dated evidence

---

## RESEARCH TASK 1: TAM ESTIMATION

Estimate the Total Addressable Market using authoritative sources.

### Top-Down Approach
1. Find the relevant industry/market size from reports (Statista, Grand View Research, IBISWorld, McKinsey)
2. Identify the specific segment relevant to this idea
3. Apply a realistic capture percentage with reasoning

### Bottom-Up Approach
1. Estimate number of potential customers in target segment
2. Estimate average revenue per customer (from competitor pricing or industry benchmarks)
3. Calculate: Customers × Annual Revenue Per Customer

### Required Output Fields
| Field | Required | Description |
|-------|----------|-------------|
| currency | Yes | Always "USD" |
| low | Yes | Conservative estimate (number, no commas) |
| base | Yes | Most likely estimate (number) |
| high | Yes | Optimistic estimate (number) |
| method | Yes | "topdown+bottomup" |
| assumptions | Yes | 3-5 SPECIFIC assumptions (not generic) |
| citations | Yes | At least 2 sources with URLs |

**Example assumptions (be this specific):**
- "Assumes 15% of US small businesses (5.4M) need this solution"
- "Based on $50/month average pricing from competitor analysis"
- "Conservative 2% market penetration in year 1"

---

## RESEARCH TASK 2: TREND DIRECTION

Determine if demand for this type of solution is rising, flat, or declining.

### Evidence Requirements
Collect 2-4 pieces of dated evidence:
- Industry growth rates (CAGR percentages with source)
- Recent funding activity in the space (TechCrunch, Crunchbase)
- Search trend indicators (if available)
- Market forecast projections

### Direction Classification
- **rising** = Multiple signals show >10% growth or increasing interest
- **flat** = Stable market, <10% change either direction
- **declining** = Contraction signals, negative growth, decreasing interest
- **unknown** = Insufficient data to determine (be honest)

---

## SEARCH DOMAINS

Focus your research on these authoritative sources:
- statista.com (market size data)
- grandviewresearch.com (industry reports)
- ibisworld.com (industry analysis)
- mckinsey.com (market insights)
- forbes.com (industry trends)
- techcrunch.com (funding, startup activity)
- crunchbase.com (funding rounds, valuations)

---

## OUTPUT FORMAT

Return ONLY valid JSON - no markdown, no commentary:

{
  "tam": {
    "currency": "USD",
    "low": 500000000,
    "base": 1200000000,
    "high": 2500000000,
    "method": "topdown+bottomup",
    "assumptions": [
      "Top-down: Global project management software market is $6.1B (Statista 2024), targeting 20% SMB segment",
      "Bottom-up: 2.1M target businesses × $480/year average = $1.01B addressable",
      "Conservative: Assumes only English-speaking markets initially",
      "Excludes enterprise segment (>1000 employees)"
    ],
    "citations": [
      {
        "label": "Statista - Project Management Software Market Size 2024",
        "url": "https://www.statista.com/statistics/..."
      },
      {
        "label": "Grand View Research - PM Software Market Analysis",
        "url": "https://www.grandviewresearch.com/industry-analysis/..."
      }
    ]
  },
  "trend_signal": {
    "direction": "rising",
    "evidence": [
      {
        "claim": "Project management software market growing at 10.7% CAGR through 2030",
        "source_url": "https://www.grandviewresearch.com/..."
      },
      {
        "claim": "3 competitors raised Series A/B in last 6 months totaling $47M",
        "source_url": "https://techcrunch.com/..."
      }
    ]
  }
}

Remember: Every number needs a citation. Assumptions must be specific. Be honest if data is limited.`;

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Run TAM + trend signal research (Call 3)
 *
 * Estimates market size and determines trend direction using
 * authoritative market research sources.
 */
export async function runTamResearch(
  idea: string,
  keywords: SparkKeywords,
  options: TamResearchOptions = {}
): Promise<SparkTamResult> {
  console.log('[Spark:TAM] Starting TAM + trend research...');

  const userQuery = `
## BUSINESS IDEA
${idea}

## KEYWORD CONTEXT
These keywords describe the market space:
- Primary phrases: ${keywords.phrases.join(', ')}
- Related terms: ${keywords.synonyms.slice(0, 10).join(', ')}

## GENERAL MARKET RESEARCH QUERIES
${keywords.query_plan.general_search.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## INSTRUCTIONS
1. Search for market size data related to this business idea
2. Find both top-down (industry reports) and bottom-up (customer counts × pricing) data
3. Look for trend indicators: growth rates, funding activity, forecasts
4. Cite every number with its source URL
5. Be conservative in estimates and explicit about assumptions
`;

  const params = createDeepResearchParams({
    model: DEEP_RESEARCH_MODEL_MINI,
    systemPrompt: TAM_RESEARCH_PROMPT,
    userQuery,
    domains: [
      // Market research
      'statista.com',
      'grandviewresearch.com',
      'ibisworld.com',
      'mckinsey.com',
      'forbes.com',
      'techcrunch.com',
      'crunchbase.com',
      // Additional market data
      'marketsandmarkets.com',
      'mordorintelligence.com',
      'precedenceresearch.com',
    ],
    background: true,
    maxOutputTokens: 50000,
    reasoningSummary: 'auto',
  });

  // Run with retry logic
  const result = await withExponentialBackoff(
    () =>
      runDeepResearchWithPolling(params, {
        pollIntervalMs: 15000, // 15 second polling
        maxWaitMs: 3600000, // 60 minute max wait
        onProgress: (status: ResponseStatus, elapsed: number) => {
          console.log(`[Spark:TAM] Status: ${status} (${Math.round(elapsed / 1000)}s)`);
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
          `[Spark:TAM] Retry ${attempt}/3 after ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
      },
    }
  );

  // Parse the response
  const rawContent = result.content || '';
  const parsed = parseTamResult(rawContent);

  console.log(
    `[Spark:TAM] Complete - TAM: $${formatNumber(parsed.tam.base)}, Trend: ${parsed.trend_signal.direction}`
  );

  return parsed;
}

// =============================================================================
// PARSING
// =============================================================================

/**
 * Parse TAM research result from raw content
 */
function parseTamResult(rawContent: string): SparkTamResult {
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

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate direction enum
    const direction = ['rising', 'flat', 'declining', 'unknown'].includes(
      parsed.trend_signal?.direction
    )
      ? (parsed.trend_signal.direction as 'rising' | 'flat' | 'declining' | 'unknown')
      : 'unknown';

    // Validate and return with defaults
    return {
      tam: {
        currency: String(parsed.tam?.currency || 'USD'),
        low: Number(parsed.tam?.low) || 0,
        base: Number(parsed.tam?.base) || 0,
        high: Number(parsed.tam?.high) || 0,
        method: String(parsed.tam?.method || 'estimated'),
        assumptions: Array.isArray(parsed.tam?.assumptions)
          ? parsed.tam.assumptions.map(String)
          : [],
        citations: Array.isArray(parsed.tam?.citations)
          ? parsed.tam.citations.map((c: Record<string, unknown>) => ({
              label: String(c.label || ''),
              url: String(c.url || ''),
            }))
          : [],
      },
      trend_signal: {
        direction,
        evidence: Array.isArray(parsed.trend_signal?.evidence)
          ? parsed.trend_signal.evidence.map((e: Record<string, unknown>) => ({
              claim: String(e.claim || ''),
              source_url: String(e.source_url || ''),
            }))
          : [],
      },
    };
  } catch (error) {
    console.error('[Spark:TAM] Failed to parse response:', error);
    // Return empty result on parse failure
    return {
      tam: {
        currency: 'USD',
        low: 0,
        base: 0,
        high: 0,
        method: 'unknown',
        assumptions: [],
        citations: [],
      },
      trend_signal: {
        direction: 'unknown',
        evidence: [],
      },
    };
  }
}

/**
 * Format number for logging
 */
function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}
