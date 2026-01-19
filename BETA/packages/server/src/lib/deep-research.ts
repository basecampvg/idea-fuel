import OpenAI from 'openai';
import type { SubscriptionTier } from '@prisma/client';

// =============================================================================
// DEEP RESEARCH CONFIGURATION
// =============================================================================

// Models for deep research
export const DEEP_RESEARCH_MODEL = 'o3-deep-research-2025-06-26';
export const DEEP_RESEARCH_MODEL_MINI = 'o4-mini-deep-research-2025-06-26';
export const REPORT_MODEL = 'gpt-5.2';

// Feature flag for deep research
export const USE_DEEP_RESEARCH = process.env.OPENAI_USE_DEEP_RESEARCH === 'true';

// Extended timeout for deep research (10 minutes default)
export const DEEP_RESEARCH_TIMEOUT = parseInt(
  process.env.DEEP_RESEARCH_TIMEOUT || '600000',
  10
);

// =============================================================================
// DOMAIN CONFIGURATIONS
// =============================================================================

/**
 * Domain configurations for different research types.
 * Used with web_search tool's allowed_domains filter.
 */
export const SEARCH_DOMAINS = {
  // Social platforms for pain point validation and social proof
  social: [
    'reddit.com',
    'twitter.com',
    'x.com',
    'news.ycombinator.com',
    'indiehackers.com',
    'producthunt.com',
    'facebook.com',
    'linkedin.com',
  ],

  // Market research and industry analysis
  market: [
    'statista.com',
    'ibisworld.com',
    'grandviewresearch.com',
    'mckinsey.com',
    'bcg.com',
    'bain.com',
    'hbr.org',
    'forbes.com',
    'techcrunch.com',
    'bloomberg.com',
    'reuters.com',
    'ft.com',
    'wsj.com',
  ],

  // Competitor and product research
  competitor: [
    'g2.com',
    'capterra.com',
    'trustpilot.com',
    'crunchbase.com',
    'similarweb.com',
    'pitchbook.com',
    'builtwith.com',
    'stackshare.io',
  ],

  // Startup and venture research
  startup: [
    'ycombinator.com',
    'techcrunch.com',
    'venturebeat.com',
    'saastr.com',
    'firstround.com',
    'a16z.com',
  ],
} as const;

// Combined domains for comprehensive market research
export const MARKET_RESEARCH_DOMAINS = [
  ...SEARCH_DOMAINS.market,
  ...SEARCH_DOMAINS.competitor,
  ...SEARCH_DOMAINS.startup,
];

// All social domains for social proof research
export const SOCIAL_PROOF_DOMAINS = [...SEARCH_DOMAINS.social];

// =============================================================================
// OPENAI CLIENT FOR DEEP RESEARCH
// =============================================================================

const apiKey = process.env.OPENAI_API_KEY;

/**
 * Dedicated OpenAI client for deep research with extended timeout.
 * Deep research can take 5-10 minutes for comprehensive analysis.
 */
export const deepResearchClient = new OpenAI({
  apiKey,
  timeout: DEEP_RESEARCH_TIMEOUT,
  maxRetries: 1, // Don't retry expensive deep research calls
});

// =============================================================================
// WEB SEARCH TOOL HELPERS
// =============================================================================

/**
 * Creates a web_search tool configuration with optional domain filtering.
 * @param domains - Array of domains to restrict search to (up to 100)
 */
export function createWebSearchTool(domains?: string[]) {
  const tool: { type: 'web_search'; filters?: { allowed_domains: string[] } } = {
    type: 'web_search',
  };

  if (domains && domains.length > 0) {
    // API supports up to 100 domains
    tool.filters = {
      allowed_domains: domains.slice(0, 100),
    };
  }

  return tool;
}

/**
 * Get the appropriate deep research model based on subscription tier.
 * FREE tier uses the faster/cheaper o4-mini model.
 */
export function getDeepResearchModel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'FREE':
      return DEEP_RESEARCH_MODEL_MINI;
    case 'PRO':
    case 'ENTERPRISE':
    default:
      return DEEP_RESEARCH_MODEL;
  }
}

/**
 * Get search domains based on subscription tier.
 * FREE tier gets limited domains, PRO/ENTERPRISE get full access.
 */
export function getSearchDomains(
  type: 'market' | 'social',
  tier: SubscriptionTier
): string[] {
  const baseDomains = type === 'market' ? MARKET_RESEARCH_DOMAINS : SOCIAL_PROOF_DOMAINS;

  // FREE tier gets limited domains
  if (tier === 'FREE') {
    return baseDomains.slice(0, 10);
  }

  return baseDomains;
}

// =============================================================================
// DEEP RESEARCH REQUEST HELPERS
// =============================================================================

export interface DeepResearchOptions {
  model: string;
  systemPrompt: string;
  userQuery: string;
  domains?: string[];
  background?: boolean;
  reasoningSummary?: 'auto' | 'detailed' | 'none';
}

/**
 * Creates parameters for a deep research API call.
 * Uses the Responses API format with web_search tool.
 */
export function createDeepResearchParams(options: DeepResearchOptions) {
  const {
    model,
    systemPrompt,
    userQuery,
    domains,
    background = true,
    reasoningSummary = 'detailed',
  } = options;

  // Build the request using Responses API format for deep research
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model,
    input: [
      {
        role: 'developer',
        content: [{ type: 'input_text', text: systemPrompt }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: userQuery }],
      },
    ],
    reasoning: { summary: reasoningSummary },
    tools: [createWebSearchTool(domains)],
  };

  // Background mode for async execution (recommended for deep research)
  if (background) {
    params.background = true;
  }

  return params;
}

// =============================================================================
// RESPONSE PARSING HELPERS
// =============================================================================

export interface Citation {
  title: string;
  url: string;
  snippet?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface DeepResearchResult {
  content: string;
  citations: Citation[];
  sources: string[];
  searchQueries: string[];
  reasoningSummary?: string;
}

/**
 * Parses a deep research response to extract content, citations, and metadata.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDeepResearchResponse(response: any): DeepResearchResult {
  const result: DeepResearchResult = {
    content: '',
    citations: [],
    sources: [],
    searchQueries: [],
  };

  if (!response?.output || !Array.isArray(response.output)) {
    console.warn('[Deep Research] Invalid response structure');
    return result;
  }

  // Find the final message content
  const messageOutput = response.output.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (o: any) => o.type === 'message'
  );

  if (messageOutput?.content?.[0]?.text) {
    result.content = messageOutput.content[0].text;

    // Extract citations from annotations
    const annotations = messageOutput.content[0].annotations;
    if (Array.isArray(annotations)) {
      result.citations = annotations.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => ({
          title: a.title || 'Unknown',
          url: a.url || '',
          snippet: a.snippet,
          startIndex: a.start_index,
          endIndex: a.end_index,
        })
      );

      // Extract unique source URLs
      result.sources = [...new Set(result.citations.map((c) => c.url).filter(Boolean))];
    }
  }

  // Extract web search queries that were made
  result.searchQueries = response.output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((o: any) => o.type === 'web_search_call')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => s.action?.query)
    .filter(Boolean);

  // Extract reasoning summary if available
  const reasoningOutput = response.output.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (o: any) => o.type === 'reasoning'
  );
  if (reasoningOutput?.summary) {
    result.reasoningSummary = reasoningOutput.summary;
  }

  return result;
}

// =============================================================================
// SOCIAL PROOF SEARCH HELPERS
// =============================================================================

export interface SocialSearchOptions {
  keywords: string[];
  painPoints: string[];
  targetAudience: string;
  domains?: string[];
}

/**
 * Creates a prompt for searching social platforms for pain point discussions.
 */
export function createSocialSearchPrompt(options: SocialSearchOptions): string {
  const { keywords, painPoints, targetAudience, domains } = options;

  const platformList = domains?.length
    ? domains.map((d) => d.replace('.com', '')).join(', ')
    : 'Reddit, Twitter, HackerNews, IndieHackers, ProductHunt';

  return `Search for real discussions and posts about the following pain points from ${targetAudience}:

PAIN POINTS TO FIND:
${painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

RELEVANT KEYWORDS:
${keywords.join(', ')}

PLATFORMS TO SEARCH:
${platformList}

For each relevant post you find, extract:
1. Platform name (reddit, twitter, hackernews, etc.)
2. Author username
3. Full post content or relevant excerpt
4. URL to the post
5. Engagement metrics (upvotes, likes, comments)
6. Date posted
7. Sentiment (positive, negative, neutral)
8. How relevant it is to the pain points (1-10)

Find 5-10 highly relevant posts that demonstrate real people discussing these problems.
Focus on posts with genuine user frustration or validation of the problem.
Return the results as a JSON array.`;
}

/**
 * Creates a prompt for extracting structured social proof data.
 */
export function createSocialProofExtractionPrompt(searchResults: string): string {
  return `Analyze the following search results and extract structured social proof data.

SEARCH RESULTS:
${searchResults}

Extract and return a JSON object with:
{
  "posts": [
    {
      "platform": "reddit" | "twitter" | "hackernews" | "indiehackers" | "producthunt" | "facebook" | "linkedin",
      "author": "username",
      "content": "full post text or relevant excerpt",
      "url": "https://...",
      "engagement": {
        "upvotes": number (optional),
        "likes": number (optional),
        "comments": number (optional),
        "shares": number (optional)
      },
      "date": "YYYY-MM-DD",
      "sentiment": "positive" | "negative" | "neutral",
      "relevanceScore": number (1-10)
    }
  ],
  "summary": "Brief summary of what the social proof shows",
  "painPointsValidated": ["List of pain points that were validated by real posts"],
  "demandSignals": ["Key demand signals identified from the posts"]
}

Only include posts that are genuinely relevant (relevanceScore >= 6).
If no relevant posts were found, return empty arrays.`;
}

// =============================================================================
// LOGGING HELPERS
// =============================================================================

/**
 * Logs deep research progress with timestamps.
 */
export function logDeepResearch(phase: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[Deep Research] [${timestamp}] [${phase}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}
