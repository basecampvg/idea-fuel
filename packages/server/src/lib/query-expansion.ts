/**
 * Query Expansion Module
 *
 * Generates richer search variations from keyword phrases using:
 * 1. Deterministic template patterns (zero-cost, always runs)
 * 2. SerpAPI rising related queries (if budget permits)
 *
 * Used by both Spark and full research pipelines to improve result quality.
 */

import { fetchRelatedRisingQueries, isSerpApiConfigured } from './serpapi';
import { getRemainingBudget, BUDGET_POOL } from './serpapi-budget';
import type { QueryVariation, QuerySource } from '@forge/shared';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface ExpansionConfig {
  maxTemplateQueries: number;    // default: 30
  maxSerpApiQueries: number;     // default: 15
  serpApiEnabled: boolean;       // default: true, false when budget exhausted
  timeoutMs: number;             // default: 15000 (15s max for expansion)
  phrasesToExpand: number;       // default: 3 (expand top N phrases)
}

const DEFAULT_CONFIG: ExpansionConfig = {
  maxTemplateQueries: 30,
  maxSerpApiQueries: 15,
  serpApiEnabled: true,
  timeoutMs: 15000,
  phrasesToExpand: 3,
};

// =============================================================================
// TEMPLATE PATTERNS
// =============================================================================

interface TemplatePattern {
  template: string;
  category: string;
}

const TEMPLATE_PATTERNS: TemplatePattern[] = [
  // Problem-framing
  { template: '{kw} problems', category: 'problem-framing' },
  { template: '{kw} frustrations', category: 'problem-framing' },
  { template: '{kw} complaints', category: 'problem-framing' },
  // Solution-seeking
  { template: 'how to {kw}', category: 'solution-seeking' },
  { template: 'best {kw}', category: 'solution-seeking' },
  { template: '{kw} alternatives', category: 'solution-seeking' },
  { template: '{kw} tools', category: 'solution-seeking' },
  // Comparison
  { template: '{kw} vs', category: 'comparison' },
  { template: '{kw} comparison', category: 'comparison' },
  { template: '{kw} reviews', category: 'comparison' },
  // Purchase intent
  { template: 'best {kw} 2026', category: 'purchase-intent' },
  { template: '{kw} pricing', category: 'purchase-intent' },
  { template: '{kw} free', category: 'purchase-intent' },
  // Platform-specific
  { template: 'site:reddit.com {kw}', category: 'platform' },
  { template: '{kw} facebook group', category: 'platform' },
  // Question-form
  { template: 'why is {kw}', category: 'question' },
  { template: 'can I {kw}', category: 'question' },
  { template: 'is there a way to {kw}', category: 'question' },
  // Pain-point
  { template: 'tired of {kw}', category: 'pain-point' },
  { template: '{kw} sucks', category: 'pain-point' },
  { template: '{kw} broken', category: 'pain-point' },
];

// =============================================================================
// CORE EXPANSION LOGIC
// =============================================================================

export interface ExpansionResult {
  queries: QueryVariation[];
  templateCount: number;
  serpApiCount: number;
  llmCount: number;
  totalUnique: number;
  elapsedMs: number;
}

/**
 * Normalize a query for deduplication:
 * lowercase, trim, collapse multiple spaces
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Apply template patterns to keyword phrases
 */
function expandWithTemplates(
  phrases: string[],
  maxPhrases: number,
  maxQueries: number
): QueryVariation[] {
  const results: QueryVariation[] = [];
  const phrasesToUse = phrases.slice(0, maxPhrases);

  for (const phrase of phrasesToUse) {
    for (const pattern of TEMPLATE_PATTERNS) {
      if (results.length >= maxQueries) break;
      results.push({
        query: pattern.template.replace('{kw}', phrase),
        source: 'template' as QuerySource,
        category: pattern.category,
      });
    }
    if (results.length >= maxQueries) break;
  }

  return results;
}

/**
 * Fetch rising related queries from SerpAPI
 */
async function expandWithSerpApi(
  phrases: string[],
  maxPhrases: number,
  maxQueries: number,
  timeoutMs: number
): Promise<QueryVariation[]> {
  if (!isSerpApiConfigured()) return [];

  const phrasesToUse = phrases.slice(0, maxPhrases);

  try {
    const result = await Promise.race([
      fetchRelatedRisingQueries(phrasesToUse, { timeRange: 'today 3-m' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SerpAPI expansion timeout')), timeoutMs)
      ),
    ]);

    return result.queries.slice(0, maxQueries).map((q) => ({
      query: q,
      source: 'serp_rising' as QuerySource,
    }));
  } catch (error) {
    console.warn('[QueryExpansion] SerpAPI expansion failed, continuing with templates only:', error);
    return [];
  }
}

/**
 * Deduplicate queries by normalized form, keeping the first occurrence
 */
function deduplicateQueries(queries: QueryVariation[]): QueryVariation[] {
  const seen = new Map<string, QueryVariation>();

  for (const q of queries) {
    const normalized = normalizeQuery(q.query);
    if (!seen.has(normalized)) {
      seen.set(normalized, q);
    }
  }

  return Array.from(seen.values());
}

/**
 * Expand keyword phrases into a rich set of search variations.
 *
 * Combines:
 * 1. Template-based patterns (always runs)
 * 2. SerpAPI rising queries (if budget permits)
 * 3. LLM-generated queries (passed in from generateSparkKeywords)
 *
 * @param phrases - Top keyword phrases to expand
 * @param llmQueries - Optional LLM-generated query variations (from generateSparkKeywords)
 * @param config - Expansion configuration
 * @returns Deduplicated, source-tagged query variations
 */
export async function expandQueries(
  phrases: string[],
  llmQueries: string[] = [],
  config: Partial<ExpansionConfig> = {}
): Promise<ExpansionResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. Template expansion (always runs, zero cost)
  const templateQueries = expandWithTemplates(phrases, cfg.phrasesToExpand, cfg.maxTemplateQueries);

  // 2. LLM-generated queries (from generateSparkKeywords, already generated)
  const llmVariations: QueryVariation[] = llmQueries.map((q) => ({
    query: q,
    source: 'llm_generated' as QuerySource,
  }));

  // 3. SerpAPI rising queries (conditional on budget)
  let serpApiQueries: QueryVariation[] = [];

  if (cfg.serpApiEnabled) {
    const remaining = await getRemainingBudget(BUDGET_POOL.USER_PIPELINE);
    if (remaining > 0) {
      const serpTimeout = Math.max(cfg.timeoutMs - (Date.now() - startTime), 5000);
      serpApiQueries = await expandWithSerpApi(
        phrases,
        cfg.phrasesToExpand,
        cfg.maxSerpApiQueries,
        serpTimeout
      );
    } else {
      console.log('[QueryExpansion] SerpAPI budget exhausted, skipping SerpAPI expansion');
    }
  }

  // 4. Combine and deduplicate
  const allQueries = [...templateQueries, ...llmVariations, ...serpApiQueries];
  const deduplicated = deduplicateQueries(allQueries);

  return {
    queries: deduplicated,
    templateCount: templateQueries.length,
    serpApiCount: serpApiQueries.length,
    llmCount: llmVariations.length,
    totalUnique: deduplicated.length,
    elapsedMs: Date.now() - startTime,
  };
}

/**
 * Get just the query strings from an expansion result (for injecting into prompts)
 */
export function getExpandedQueryStrings(result: ExpansionResult): string[] {
  return result.queries.map((q) => q.query);
}

/**
 * Format expanded queries as a prompt section for injection into deep research
 */
export function formatQueriesForPrompt(queries: string[], label = 'ADDITIONAL SEARCH ANGLES'): string {
  if (queries.length === 0) return '';

  return `\n## ${label}
In addition to the specific queries above, also explore these validated search variations
to ensure comprehensive coverage:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`;
}
