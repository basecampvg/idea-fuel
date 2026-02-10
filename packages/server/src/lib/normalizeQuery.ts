/**
 * Query Normalization for Daily Trend Pick
 *
 * Implements consistent normalization rules for trending queries:
 * - trim
 * - Unicode NFKC normalization
 * - lowercase
 * - collapse whitespace
 * - remove trailing punctuation [?!.,:;] only at end
 * - keep internal punctuation
 */

/**
 * Normalize a search query for deduplication and matching
 */
export function normalizeQuery(query: string): string {
  if (!query) return '';

  let normalized = query;

  // 1. Trim whitespace
  normalized = normalized.trim();

  // 2. Unicode NFKC normalization (handles ligatures, compatibility chars)
  normalized = normalized.normalize('NFKC');

  // 3. Lowercase
  normalized = normalized.toLowerCase();

  // 4. Collapse multiple whitespace to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // 5. Remove trailing punctuation (only at the very end)
  normalized = normalized.replace(/[?!.,:;]+$/, '');

  // 6. Trim again in case punctuation removal left whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Count tokens (words) in a query
 * Used for guard rules like MIN_QUERY_TOKENS_FOR_BEST
 */
export function countQueryTokens(query: string): number {
  const normalized = normalizeQuery(query);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

/**
 * Deduplicate queries by normalized form
 * Returns unique queries (first occurrence wins)
 */
export function dedupeQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const query of queries) {
    const normalized = normalizeQuery(query);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(query); // Keep original form
    }
  }

  return unique;
}

/**
 * Normalize and dedupe, returning both original and normalized forms
 */
export function normalizeAndDedupeQueries(
  queries: string[]
): { original: string; normalized: string }[] {
  const seen = new Set<string>();
  const results: { original: string; normalized: string }[] = [];

  for (const query of queries) {
    const normalized = normalizeQuery(query);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      results.push({ original: query, normalized });
    }
  }

  return results;
}
