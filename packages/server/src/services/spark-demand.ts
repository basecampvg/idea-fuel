/**
 * Spark Demand Research Service - Call 2
 *
 * Focused deep research call for community signals:
 * - Reddit thread discovery
 * - Facebook groups search
 * - Pain point extraction
 * - Willingness-to-pay clues
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
import { safeJsonParse } from './research-ai';

// =============================================================================
// TYPES
// =============================================================================

export interface SparkDemandResult {
  reddit: {
    top_threads: Array<{
      title: string;
      subreddit: string;
      url: string;
      upvotes: number;
      comments: number;
      posted: string;
      signal: string;
    }>;
    recurring_pains: string[];
    willingness_to_pay_clues: string[];
  };
  facebook_groups: Array<{
    name: string;
    members: string;
    privacy: 'public' | 'private' | 'unknown';
    url: string;
    fit_score: number;
    why_relevant: string;
  }>;
}

export interface DemandResearchOptions {
  onProgress?: (status: ResponseStatus, elapsedMs: number) => void;
}

// =============================================================================
// PROMPT
// =============================================================================

const DEMAND_RESEARCH_PROMPT = `You are a community signal analyst specializing in demand discovery and pain point validation.

## YOUR MISSION
Execute the EXACT search queries provided to find REAL demand signals. Your research powers the community validation portion of a market research report.

## CRITICAL RULES
1. Execute the EXACT search queries provided - do not substitute with generic searches
2. Only include results DIRECTLY RELEVANT to the specific business idea
3. Every claim MUST have a citation (source URL)
4. If a search returns no relevant results, return empty arrays - do NOT fabricate content
5. Quality over quantity - 3 real threads beat 10 tangentially-related ones

---

## RESEARCH TASK 1: REDDIT THREAD DISCOVERY

Search Reddit using the provided queries. Find 3-5 highly relevant threads.

**For each thread, capture:**
| Field | Required | Description |
|-------|----------|-------------|
| title | Yes | Exact thread title as it appears |
| subreddit | Yes | Subreddit name (e.g., "r/entrepreneur") |
| url | Yes | Direct URL to the thread (must be real) |
| upvotes | Yes | Upvote count (number) |
| comments | Yes | Comment count (number) |
| posted | Yes | When posted (e.g., "2 months ago", "6 days ago") |
| signal | Yes | The key demand signal from this thread (1-2 sentences) |

**RELEVANCE CRITERIA:**
- Thread MUST discuss the specific problem/solution in the business idea
- Thread MUST contain pain points, willingness-to-pay signals, or competitor mentions
- Prefer threads with 10+ upvotes and active discussion
- Skip generic startup advice, promotional posts, or tangentially related content

---

## RESEARCH TASK 2: FACEBOOK GROUPS DISCOVERY

Search for Facebook Groups where the target audience congregates.

**For each group, capture:**
| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Exact group name |
| members | Yes | Member count string (e.g., "15.2k members", "234k members") |
| privacy | Yes | "public" or "private" |
| url | Yes | Direct URL to the group (must be real) |
| fit_score | Yes | 0-3 relevance score |
| why_relevant | Yes | 1 sentence: why this group's members would care about this idea |

**FIT SCORING GUIDE:**
- **3** = Perfect fit - group specifically discusses this problem space
- **2** = Strong fit - adjacent audience with clear interest overlap
- **1** = Moderate fit - tangentially related community
- **0** = Not relevant - do NOT include

Find 3-6 groups with fit_score >= 2.

---

## RESEARCH TASK 3: PAIN POINT EXTRACTION

From all discovered threads and discussions, extract recurring pain points.

**For each pain point:**
- Be SPECIFIC to this idea (not generic business pains)
- Note frequency: "Mentioned in X threads" or "Multiple users reported..."
- Note severity: Look for strong language, frustration, repeated complaints
- Include at least one quote or paraphrase as evidence

Target: 3-5 specific, validated pain points.

---

## RESEARCH TASK 4: WILLINGNESS TO PAY (WTP) CLUES

Extract signals that people would pay for a solution to this problem.

**Look for:**
- "I would pay for..." statements
- "I've been looking for..." (active search = latent demand)
- "We currently spend $X on..." (existing budget)
- Mentions of competitor pricing or budget expectations
- "Take my money" or similar enthusiasm signals

Target: 2-4 WTP clues with source context.

---

## OUTPUT FORMAT

Return ONLY valid JSON - no markdown, no commentary:

{
  "reddit": {
    "top_threads": [
      {
        "title": "exact thread title",
        "subreddit": "r/subredditname",
        "url": "https://reddit.com/r/.../comments/...",
        "upvotes": 234,
        "comments": 87,
        "posted": "2 months ago",
        "signal": "key demand insight from this thread"
      }
    ],
    "recurring_pains": [
      "Specific pain point 1 - mentioned in 3 threads, users express frustration about...",
      "Specific pain point 2 - severity high based on language like..."
    ],
    "willingness_to_pay_clues": [
      "'I would gladly pay $X/month for...' - r/subreddit user",
      "Multiple users asking for pricing on similar solutions"
    ]
  },
  "facebook_groups": [
    {
      "name": "Exact Group Name",
      "members": "15.2k members",
      "privacy": "public",
      "url": "https://facebook.com/groups/...",
      "fit_score": 3,
      "why_relevant": "Members actively discuss this exact problem space"
    }
  ]
}

Remember: Every URL must be REAL. Every claim needs evidence. Empty arrays are acceptable if no relevant data found.`;

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Run demand + community signal research (Call 2)
 *
 * Searches Reddit and Facebook Groups for demand signals using
 * the keywords generated in Call 1.
 */
export async function runDemandResearch(
  idea: string,
  keywords: SparkKeywords,
  expansionPromptSection: string = '',
  options: DemandResearchOptions = {}
): Promise<SparkDemandResult> {
  console.log('[Spark:Demand] Starting demand + community research...');

  const userQuery = `
## BUSINESS IDEA
${idea}

## REQUIRED SEARCH QUERIES - EXECUTE THESE EXACTLY

### Reddit Queries (execute all of these):
${keywords.query_plan.reddit_search.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### Facebook Groups Queries (execute all of these):
${keywords.query_plan.facebook_groups_search.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## KEYWORD CONTEXT
Primary phrases: ${keywords.phrases.join(', ')}
Synonyms: ${keywords.synonyms.slice(0, 10).join(', ')}

## INSTRUCTIONS
1. Execute ALL the search queries listed above
2. Only include results that are DIRECTLY relevant to the business idea
3. Do NOT substitute irrelevant content if specific searches yield no results
4. Compile findings into the required JSON format
${expansionPromptSection}
`;

  const params = createDeepResearchParams({
    model: DEEP_RESEARCH_MODEL_MINI,
    systemPrompt: DEMAND_RESEARCH_PROMPT,
    userQuery,
    domains: [
      // Social - for pain point validation
      'reddit.com',
      'facebook.com',
      'news.ycombinator.com',
      'indiehackers.com',
      'producthunt.com',
      'twitter.com',
      'x.com',
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
          console.log(`[Spark:Demand] Status: ${status} (${Math.round(elapsed / 1000)}s)`);
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
          `[Spark:Demand] Retry ${attempt}/3 after ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
      },
    }
  );

  // Parse the response
  const rawContent = result.content || '';
  const parsed = parseDemandResult(rawContent);

  console.log(
    `[Spark:Demand] Complete - ${parsed.reddit.top_threads.length} threads, ${parsed.facebook_groups.length} groups`
  );

  return parsed;
}

// =============================================================================
// PARSING
// =============================================================================

/**
 * Parse demand research result from raw content
 */
function parseDemandResult(rawContent: string): SparkDemandResult {
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
    console.error('[Spark:Demand] Failed to parse response:', result.reason);
    return {
      reddit: {
        top_threads: [],
        recurring_pains: [],
        willingness_to_pay_clues: [],
      },
      facebook_groups: [],
    };
  }

  const parsed = result.data;
  const reddit = (parsed.reddit || {}) as Record<string, unknown>;

  // Validate and return with defaults
  return {
    reddit: {
      top_threads: Array.isArray(reddit.top_threads)
        ? reddit.top_threads.map((t: Record<string, unknown>) => ({
            title: String(t.title || ''),
            subreddit: String(t.subreddit || ''),
            url: String(t.url || ''),
            upvotes: Number(t.upvotes) || 0,
            comments: Number(t.comments) || 0,
            posted: String(t.posted || ''),
            signal: String(t.signal || ''),
          }))
        : [],
      recurring_pains: Array.isArray(reddit.recurring_pains)
        ? reddit.recurring_pains.map(String)
        : [],
      willingness_to_pay_clues: Array.isArray(reddit.willingness_to_pay_clues)
        ? reddit.willingness_to_pay_clues.map(String)
        : [],
    },
    facebook_groups: Array.isArray(parsed.facebook_groups)
      ? parsed.facebook_groups.map((g: Record<string, unknown>) => ({
          name: String(g.name || ''),
          members: String(g.members || ''),
          privacy: ['public', 'private'].includes(String(g.privacy))
            ? (String(g.privacy) as 'public' | 'private')
            : 'unknown',
          url: String(g.url || ''),
          fit_score: Math.min(3, Math.max(0, Number(g.fit_score) || 0)),
          why_relevant: String(g.why_relevant || ''),
        }))
      : [],
  };
}
