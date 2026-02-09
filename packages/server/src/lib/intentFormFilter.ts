/**
 * Intent-Form Filter for Daily Trend Pick
 *
 * Implements 50+ regex patterns to identify high-intent search queries:
 * - How-to / best-way patterns
 * - WH-questions
 * - Troubleshooting
 * - Personal pain
 * - Purchase/comparison (with guards)
 *
 * Also implements blocklist patterns for non-commercial queries:
 * - Sports events/games
 * - Celebrity news
 * - TV/movie schedules
 */

import { countQueryTokens } from './normalizeQuery';

/**
 * Blocklist patterns for queries with no commercial value
 * These are filtered OUT before intent pattern matching
 */
const BLOCKLIST_PATTERNS: RegExp[] = [
  // Sports team matchups (NBA, NFL, MLB, NHL, etc.)
  /\b(pacers|thunder|lakers|celtics|warriors|heat|bulls|knicks|nets|spurs|rockets|mavs|mavericks|suns|clippers|bucks|sixers|76ers|raptors|hawks|hornets|magic|pistons|cavs|cavaliers|wizards|grizzlies|pelicans|timberwolves|blazers|jazz|kings|nuggets)\s+(vs|versus|at|@)\b/i,
  /\b(patriots|chiefs|eagles|cowboys|bills|niners|49ers|packers|dolphins|ravens|bengals|lions|browns|steelers|raiders|broncos|chargers|seahawks|vikings|jets|giants|commanders|bears|saints|falcons|panthers|bucs|buccaneers|cardinals|rams|titans|colts|texans|jaguars)\s+(vs|versus|at|@)\b/i,
  /\b(yankees|dodgers|mets|phillies|braves|astros|rangers|cubs|cardinals|giants|padres|brewers|diamondbacks|mariners|orioles|guardians|twins|rays|red sox|white sox|royals|tigers|reds|pirates|rockies|angels|athletics|marlins|nationals)\s+(vs|versus|at|@)\b/i,
  // Generic sports patterns
  /\b(game|match|score|lineup|roster|injury|trade)\s+(today|tonight|tomorrow|yesterday)\b/i,
  /\b(nba|nfl|mlb|nhl|mls|ncaa|ufc|wwe)\s+(schedule|scores?|standings|playoffs|draft)\b/i,
  /\bwho (won|plays|is playing)\b/i,
  /\b(final score|box score|game time|tip.?off|kickoff)\b/i,
  // Celebrity/entertainment news
  /\b(died|death|dead|pregnant|divorce|married|dating|cheating|affair|scandal)\b.*\b(celebrity|star|actor|actress|singer|rapper)\b/i,
  /\b(celebrity|star|actor|actress|singer|rapper)\b.*\b(died|death|dead|pregnant|divorce|married|dating)\b/i,
  // TV schedules (not product-related)
  /\bwhat time (is|does)\b.+\b(on|air|start)\b/i,
  /\b(episode|season)\s+\d+\s+(release|air)\b/i,
];

export interface IntentPattern {
  id: string;
  regex: RegExp;
  group: string;
  guard?: (query: string) => boolean;
}

// Configuration defaults (can be overridden via env)
const MIN_QUERY_TOKENS_FOR_BEST = parseInt(
  process.env.MIN_QUERY_TOKENS_FOR_BEST || '3',
  10
);

/**
 * Pattern Lexicon - 50+ patterns organized by group
 */
export const INTENT_PATTERNS: IntentPattern[] = [
  // A) How-to / best-way
  { id: 'Q01', regex: /\bhow to\b/i, group: 'how-to' },
  { id: 'Q02', regex: /\bhow do i\b/i, group: 'how-to' },
  { id: 'Q03', regex: /\bhow can i\b/i, group: 'how-to' },
  { id: 'Q04', regex: /\bhow should i\b/i, group: 'how-to' },
  { id: 'Q05', regex: /\bhow would i\b/i, group: 'how-to' },
  { id: 'Q06', regex: /\bhow do you\b/i, group: 'how-to' },
  { id: 'Q07', regex: /\bhow can you\b/i, group: 'how-to' },
  { id: 'Q08', regex: /\bhow do we\b/i, group: 'how-to' },
  { id: 'Q09', regex: /\bhow can we\b/i, group: 'how-to' },
  { id: 'Q10', regex: /\bsteps to\b/i, group: 'how-to' },
  { id: 'Q11', regex: /\bguide to\b/i, group: 'how-to' },
  { id: 'Q12', regex: /\btutorial\b/i, group: 'how-to' },
  { id: 'Q13', regex: /\bwalkthrough\b/i, group: 'how-to' },
  { id: 'Q14', regex: /\bhelp me\b/i, group: 'how-to' },
  { id: 'Q15', regex: /\banyone know how\b/i, group: 'how-to' },
  { id: 'Q16', regex: /\bwhat is the best way\b/i, group: 'how-to' },
  { id: 'Q17', regex: /\bwhat is the easiest way\b/i, group: 'how-to' },
  { id: 'Q18', regex: /\bwhat is the fastest way\b/i, group: 'how-to' },
  { id: 'Q19', regex: /\bwhat is the cheapest way\b/i, group: 'how-to' },
  { id: 'Q20', regex: /\bwhat is the simplest way\b/i, group: 'how-to' },

  // B) WH-questions
  { id: 'Q21', regex: /\bwhat is\b/i, group: 'wh-question' },
  { id: 'Q22', regex: /\bwhat are\b/i, group: 'wh-question' },
  { id: 'Q23', regex: /\bwhat does\b/i, group: 'wh-question' },
  { id: 'Q24', regex: /\bwhy is\b/i, group: 'wh-question' },
  { id: 'Q25', regex: /\bwhy does\b/i, group: 'wh-question' },
  { id: 'Q26', regex: /\bwhen should i\b/i, group: 'wh-question' },
  { id: 'Q27', regex: /\bwhen do i\b/i, group: 'wh-question' },
  { id: 'Q28', regex: /\bwhere can i\b/i, group: 'wh-question' },
  { id: 'Q29', regex: /\bwhich\b/i, group: 'wh-question' },
  { id: 'Q30', regex: /\bshould i\b/i, group: 'wh-question' },

  // C) Troubleshooting
  { id: 'T01', regex: /\bfix\b/i, group: 'troubleshooting' },
  { id: 'T02', regex: /\bhow to fix\b/i, group: 'troubleshooting' },
  { id: 'T03', regex: /\btroubleshoot\b/i, group: 'troubleshooting' },
  { id: 'T04', regex: /\bnot working\b/i, group: 'troubleshooting' },
  { id: 'T05', regex: /\bstopped working\b/i, group: 'troubleshooting' },
  { id: 'T06', regex: /\bwon't work\b|\bdoesn't work\b/i, group: 'troubleshooting' },
  {
    id: 'T07',
    regex: /\bkeeps (crashing|freezing|disconnecting|restarting)\b/i,
    group: 'troubleshooting',
  },
  { id: 'T08', regex: /\b(crash|crashing|freeze|freezing)\b/i, group: 'troubleshooting' },
  { id: 'T09', regex: /\berror\b|\berror code\b|\bcode \d+\b/i, group: 'troubleshooting' },
  { id: 'T10', regex: /\bbug\b|\bglitch\b/i, group: 'troubleshooting' },
  { id: 'T11', regex: /\bissue\b|\bissues\b/i, group: 'troubleshooting' },
  { id: 'T12', regex: /\bproblem\b|\bproblems\b/i, group: 'troubleshooting' },
  { id: 'T13', regex: /\bsolution\b/i, group: 'troubleshooting' },
  { id: 'T14', regex: /\bworkaround\b/i, group: 'troubleshooting' },
  { id: 'T15', regex: /\breset\b|\brestart\b|\breinstall\b|\bupdate\b/i, group: 'troubleshooting' },

  // D) Personal pain
  { id: 'P01', regex: /\bi'?m having (an )?issue\b|\bi am having (an )?issue\b/i, group: 'pain' },
  { id: 'P02', regex: /\bi'?m having trouble\b|\bi am having trouble\b/i, group: 'pain' },
  { id: 'P03', regex: /\bi can'?t\b|\bi cannot\b/i, group: 'pain' },
  { id: 'P04', regex: /\bcan'?t figure out\b/i, group: 'pain' },
  { id: 'P05', regex: /\bneed help\b|\bplease help\b/i, group: 'pain' },
  { id: 'P06', regex: /\bhelp with\b/i, group: 'pain' },
  { id: 'P07', regex: /\bstruggling with\b/i, group: 'pain' },
  { id: 'P08', regex: /\bconfused about\b/i, group: 'pain' },
  { id: 'P09', regex: /\bwhat do i do when\b/i, group: 'pain' },
  { id: 'P10', regex: /\bhow do i (stop|prevent)\b/i, group: 'pain' },

  // E) Purchase/comparison (guarded)
  {
    id: 'B01',
    regex: /\bbest\b/i,
    group: 'purchase',
    guard: (q) => countQueryTokens(q) >= MIN_QUERY_TOKENS_FOR_BEST,
  },
  {
    id: 'B02',
    regex: /\btop\b/i,
    group: 'purchase',
    guard: (q) => countQueryTokens(q) >= 3, // "top" needs context
  },
  { id: 'B03', regex: /\breview(s)?\b/i, group: 'purchase' },
  {
    id: 'B04',
    regex: /\bvs\b|\bversus\b/i,
    group: 'purchase',
    // Guard: require 4+ tokens (short "X vs Y" matchups are usually sports, not product comparisons)
    // e.g. "pacers vs thunder" (3 tokens) = sports, "iphone 15 vs samsung s24" (5 tokens) = purchase
    guard: (q) => countQueryTokens(q) >= 4,
  },
  { id: 'B05', regex: /\bcompare\b|\bcomparison\b/i, group: 'purchase' },
  { id: 'B06', regex: /\bworth it\b/i, group: 'purchase' },
  { id: 'B07', regex: /\bprice\b|\bcost\b/i, group: 'purchase' },
  { id: 'B08', regex: /\bcoupon\b|\bdeal\b|\bdiscount\b/i, group: 'purchase' },
  { id: 'B09', regex: /\bnear me\b/i, group: 'purchase' },
  { id: 'B10', regex: /\brecommend(ed|ation)?\b/i, group: 'purchase' },
];

export interface FilterResult {
  passed: boolean;
  reason: 'pattern_match' | 'question_phrase' | 'problem_phrase' | 'fallback' | null;
  matched: string[]; // Pattern IDs that matched
}

/**
 * Check if a query matches any blocklist pattern (no commercial value)
 */
function isBlocklisted(query: string): boolean {
  return BLOCKLIST_PATTERNS.some((pattern) => pattern.test(query));
}

/**
 * Filter a query based on intent-form patterns
 * Passes queries that match pain-point, question, or purchase-comparison patterns
 * Rejects queries that match blocklist patterns (sports, celebrity news, etc.)
 */
export function filterQueryIntentForm(query: string): FilterResult {
  // Check blocklist first - reject non-commercial queries
  if (isBlocklisted(query)) {
    return {
      passed: false,
      reason: null,
      matched: ['BLOCKLIST'],
    };
  }

  const matchedPatterns: string[] = [];

  for (const pattern of INTENT_PATTERNS) {
    if (pattern.regex.test(query)) {
      // Check guard if present
      if (pattern.guard && !pattern.guard(query)) {
        continue; // Guard failed, skip this pattern
      }
      matchedPatterns.push(pattern.id);
    }
  }

  if (matchedPatterns.length > 0) {
    // Determine reason based on first matched group
    const firstPattern = INTENT_PATTERNS.find((p) => p.id === matchedPatterns[0]);
    let reason: FilterResult['reason'] = 'pattern_match';

    if (firstPattern) {
      if (firstPattern.group === 'wh-question' || firstPattern.group === 'how-to') {
        reason = 'question_phrase';
      } else if (firstPattern.group === 'pain' || firstPattern.group === 'troubleshooting') {
        reason = 'problem_phrase';
      }
    }

    return {
      passed: true,
      reason,
      matched: matchedPatterns,
    };
  }

  return {
    passed: false,
    reason: null,
    matched: [],
  };
}

export interface BatchFilterResult {
  passed: { query: string; result: FilterResult }[];
  failed: { query: string; result: FilterResult }[];
  stats: {
    noPatternMatch: number;
    fallbackUsed: number;
  };
}

/**
 * Filter a batch of queries with fallback support
 */
export function filterQueriesBatch(
  queries: string[],
  options: {
    minFilteredCandidates?: number;
    fallbackAllowNonMatching?: boolean;
    fallbackTopN?: number;
  } = {}
): BatchFilterResult {
  const minFiltered = options.minFilteredCandidates ?? 25;
  const allowFallback = options.fallbackAllowNonMatching ?? true;
  const fallbackN = options.fallbackTopN ?? 10; // Reduced from 25

  const passed: BatchFilterResult['passed'] = [];
  const failed: BatchFilterResult['failed'] = [];
  const stats = { noPatternMatch: 0, fallbackUsed: 0 };

  for (const query of queries) {
    const result = filterQueryIntentForm(query);
    if (result.passed) {
      passed.push({ query, result });
    } else {
      failed.push({ query, result });
      stats.noPatternMatch++;
    }
  }

  // Apply fallback if needed
  if (passed.length < minFiltered && allowFallback && failed.length > 0) {
    const fallbackCount = Math.min(fallbackN, failed.length, minFiltered - passed.length);

    console.log(`[IntentFilter] Using fallback: adding ${fallbackCount} queries`);

    for (let i = 0; i < fallbackCount; i++) {
      const item = failed[i];
      passed.push({
        query: item.query,
        result: {
          passed: true,
          reason: 'fallback',
          matched: [],
        },
      });
      stats.fallbackUsed++;
    }

    // Remove from failed
    failed.splice(0, fallbackCount);
  }

  console.log(`[IntentFilter] Batch filter: ${passed.length} passed, ${failed.length} failed (${stats.noPatternMatch} no pattern, ${stats.fallbackUsed} fallback)`);

  return { passed, failed, stats };
}

/**
 * Get pattern groups summary for a set of matched pattern IDs
 */
export function getMatchedGroups(patternIds: string[]): string[] {
  const groups = new Set<string>();
  for (const id of patternIds) {
    const pattern = INTENT_PATTERNS.find((p) => p.id === id);
    if (pattern) {
      groups.add(pattern.group);
    }
  }
  return Array.from(groups);
}
