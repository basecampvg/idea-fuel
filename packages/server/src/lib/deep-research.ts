import OpenAI from 'openai';
import type { SubscriptionTier } from '../generated/prisma';
import { configService } from '../services/config';

// =============================================================================
// DEEP RESEARCH CONFIGURATION (DEFAULTS)
// =============================================================================

// Default models for deep research (used when config not initialized)
export const DEEP_RESEARCH_MODEL = 'o3-deep-research-2025-06-26';
export const DEEP_RESEARCH_MODEL_MINI = 'o4-mini-deep-research-2025-06-26';
export const REPORT_MODEL = 'gpt-5.2';

// Feature flag from environment (fallback when config not initialized)
export const USE_DEEP_RESEARCH = process.env.OPENAI_USE_DEEP_RESEARCH === 'true';

// Default timeout from environment (3 hours - o3-deep-research can take 1-2+ hours per call)
export const DEEP_RESEARCH_TIMEOUT = parseInt(
  process.env.DEEP_RESEARCH_TIMEOUT || '10800000',  // 3 hours (3 * 60 * 60 * 1000)
  10
);

// =============================================================================
// EXPONENTIAL BACKOFF RETRY UTILITY
// =============================================================================

/**
 * HTTP status codes that should trigger a retry (transient errors)
 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Error types that indicate a transient failure worth retrying
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Check for OpenAI API errors with status codes
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // OpenAI SDK error structure
    if (typeof err.status === 'number' && RETRYABLE_STATUS_CODES.includes(err.status)) {
      return true;
    }

    // Generic HTTP error
    if (typeof err.statusCode === 'number' && RETRYABLE_STATUS_CODES.includes(err.statusCode)) {
      return true;
    }

    // Connection errors
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      return true;
    }

    // Rate limit with retry-after header
    if (err.status === 429) {
      return true;
    }
  }

  // Check error message for common transient patterns
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up') ||
      msg.includes('network') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('504')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract retry-after delay from error (for rate limits)
 */
function getRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;

  const err = error as Record<string, unknown>;

  // Check headers for retry-after
  if (err.headers && typeof err.headers === 'object') {
    const headers = err.headers as Record<string, unknown>;
    const retryAfter = headers['retry-after'];
    if (typeof retryAfter === 'string') {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
  }

  return null;
}

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 2000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 60000) */
  maxDelayMs?: number;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback for logging retry attempts */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

/**
 * Execute a function with exponential backoff retry on transient errors.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withExponentialBackoff(
 *   () => deepResearchClient.responses.create(params),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 5,
    initialDelayMs = 2000,
    maxDelayMs = 60000,
    isRetryable = isRetryableError,
    onRetry,
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Check if we should retry
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      let delayMs = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      );

      // Check for retry-after header (rate limits)
      const retryAfter = getRetryAfterMs(error);
      if (retryAfter !== null && retryAfter > 0) {
        delayMs = Math.min(retryAfter, maxDelayMs);
      }

      // Add jitter (±20%)
      const jitter = delayMs * 0.2 * (Math.random() * 2 - 1);
      delayMs = Math.round(delayMs + jitter);

      // Log retry
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// =============================================================================
// CONFIG-AWARE GETTERS
// =============================================================================

/**
 * Get the deep research model from config (PRO/ENTERPRISE tier)
 */
export function getDeepResearchModelFull(): string {
  return configService.isInitialized()
    ? configService.getString('ai.deepResearch.model', DEEP_RESEARCH_MODEL)
    : DEEP_RESEARCH_MODEL;
}

/**
 * Get the budget deep research model from config (FREE tier)
 */
export function getDeepResearchModelMini(): string {
  return configService.isInitialized()
    ? configService.getString('ai.deepResearch.modelMini', DEEP_RESEARCH_MODEL_MINI)
    : DEEP_RESEARCH_MODEL_MINI;
}

/**
 * Check if deep research is enabled
 */
export function isDeepResearchEnabled(): boolean {
  return configService.isInitialized()
    ? configService.getBoolean('ai.deepResearch.enabled', USE_DEEP_RESEARCH)
    : USE_DEEP_RESEARCH;
}

/**
 * Get deep research timeout from config
 */
export function getDeepResearchTimeout(): number {
  return configService.isInitialized()
    ? configService.getNumber('research.timeout', DEEP_RESEARCH_TIMEOUT)
    : DEEP_RESEARCH_TIMEOUT;
}

/**
 * Get social domains from config or defaults
 */
export function getSocialDomains(): string[] {
  if (configService.isInitialized()) {
    return configService.getArray('domains.social', [...DEFAULT_SOCIAL_DOMAINS]);
  }
  return [...DEFAULT_SOCIAL_DOMAINS];
}

/**
 * Get market research domains from config or defaults
 */
export function getMarketDomains(): string[] {
  if (configService.isInitialized()) {
    return configService.getArray('domains.market', [...DEFAULT_MARKET_DOMAINS]);
  }
  return [...DEFAULT_MARKET_DOMAINS];
}

/**
 * Get competitor research domains from config or defaults
 */
export function getCompetitorDomains(): string[] {
  if (configService.isInitialized()) {
    return configService.getArray('domains.competitor', [...DEFAULT_COMPETITOR_DOMAINS]);
  }
  return [...DEFAULT_COMPETITOR_DOMAINS];
}

// Default domain arrays (for fallback)
const DEFAULT_SOCIAL_DOMAINS = [
  'reddit.com',
  'twitter.com',
  'x.com',
  'news.ycombinator.com',
  'indiehackers.com',
  'producthunt.com',
  'facebook.com',
  'linkedin.com',
];

const DEFAULT_MARKET_DOMAINS = [
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
];

const DEFAULT_COMPETITOR_DOMAINS = [
  'g2.com',
  'capterra.com',
  'trustpilot.com',
  'crunchbase.com',
  'similarweb.com',
  'pitchbook.com',
  'builtwith.com',
  'stackshare.io',
];

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

/**
 * Lazy-initialized OpenAI client for deep research with extended timeout.
 * Deep research can take 5-10 minutes for comprehensive analysis.
 */
let _deepResearchClient: OpenAI | null = null;

function getDeepResearchClient(): OpenAI {
  if (!_deepResearchClient) {
    _deepResearchClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: DEEP_RESEARCH_TIMEOUT,
      maxRetries: 1, // Don't retry expensive deep research calls
    });
  }
  return _deepResearchClient;
}

export const deepResearchClient = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getDeepResearchClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// =============================================================================
// BACKGROUND MODE + POLLING (Best Practice for Deep Research)
// =============================================================================

/**
 * Default polling interval (10 seconds)
 */
export const DEFAULT_POLL_INTERVAL_MS = 10000;

/**
 * Default max wait time (45 minutes - job-level SLA per best practices)
 */
export const DEFAULT_MAX_WAIT_MS = 2700000;

/**
 * Response status types from background mode
 */
export type ResponseStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'incomplete';

export interface PollOptions {
  /** Polling interval in milliseconds (default: 10000 = 10 seconds) */
  pollIntervalMs?: number;
  /** Maximum wait time in milliseconds (default: 2700000 = 45 minutes) */
  maxWaitMs?: number;
  /** Callback for status updates during polling */
  onProgress?: (status: ResponseStatus, elapsed: number) => void;
  /** Callback for logging */
  onLog?: (message: string) => void;
}

export interface BackgroundResponse {
  /** The response ID to use for polling */
  responseId: string;
  /** Current status of the response */
  status: ResponseStatus;
  /** The parsed response (if completed) */
  response?: DeepResearchResult;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Poll for the completion of a background deep research response.
 *
 * @param responseId - The response ID returned from a background request
 * @param options - Polling configuration
 * @returns The completed response result
 * @throws Error if polling times out or the response fails
 *
 * @example
 * ```typescript
 * // Start background request
 * const initial = await runDeepResearchBackground(params);
 *
 * // Poll for completion
 * const result = await pollForCompletion(initial.responseId, {
 *   pollIntervalMs: 15000,
 *   maxWaitMs: 1800000, // 30 minutes
 *   onProgress: (status, elapsed) => {
 *     console.log(`Status: ${status} (${Math.round(elapsed/1000)}s elapsed)`);
 *   }
 * });
 * ```
 */
export async function pollForCompletion(
  responseId: string,
  options: PollOptions = {}
): Promise<DeepResearchResult> {
  const {
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    onProgress,
    onLog = console.log,
  } = options;

  const startTime = Date.now();
  let lastStatus: ResponseStatus = 'queued';

  onLog(`[Poll] Starting to poll response ${responseId} (max wait: ${Math.round(maxWaitMs/60000)} minutes)`);

  while (true) {
    const elapsed = Date.now() - startTime;

    // Check timeout
    if (elapsed > maxWaitMs) {
      throw new Error(`Polling timeout: response ${responseId} did not complete within ${Math.round(maxWaitMs/60000)} minutes`);
    }

    try {
      // Fetch current response status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (deepResearchClient.responses as any).retrieve(responseId);

      const status = response.status as ResponseStatus;

      // Log status changes
      if (status !== lastStatus) {
        onLog(`[Poll] Status changed: ${lastStatus} -> ${status} (${Math.round(elapsed/1000)}s elapsed)`);
        lastStatus = status;
      }

      // Notify progress callback
      if (onProgress) {
        onProgress(status, elapsed);
      }

      // Handle terminal states
      if (status === 'completed') {
        onLog(`[Poll] Response completed after ${Math.round(elapsed/1000)} seconds`);
        return parseDeepResearchResponse(response);
      }

      if (status === 'failed') {
        const errorMsg = response.error?.message || 'Unknown error';
        throw new Error(`Deep research failed: ${errorMsg}`);
      }

      if (status === 'incomplete') {
        // Incomplete responses may have partial content
        onLog(`[Poll] Response incomplete after ${Math.round(elapsed/1000)}s - extracting partial content`);
        onLog(`[Poll] Response keys: ${Object.keys(response || {}).join(', ')}`);
        if (response?.output_text) {
          onLog(`[Poll] Has output_text: ${response.output_text.length} chars`);
        }
        if (response?.output) {
          onLog(`[Poll] Has output array: ${response.output.length} items`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLog(`[Poll] Output types: ${response.output.map((o: any) => o.type).join(', ')}`);
        }
        const result = parseDeepResearchResponse(response);
        if (result.content) {
          onLog(`[Poll] Partial content available: ${result.content.length} chars`);
          return result;
        }
        // Log more details about why we couldn't extract content
        onLog(`[Poll] Could not extract content from response. Full response keys: ${JSON.stringify(Object.keys(response || {}))}`);
        throw new Error('Deep research incomplete with no usable content');
      }

      // Still in progress - wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    } catch (error) {
      // Check if it's a retryable error or a terminal failure
      if (error instanceof Error && error.message.includes('Deep research')) {
        throw error; // Re-throw our own errors
      }

      // Log and continue polling for API errors
      onLog(`[Poll] Error fetching response status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }
}

/**
 * Start a deep research request in background mode.
 * Returns immediately with a response ID for polling.
 *
 * @param params - The deep research parameters (from createDeepResearchParams)
 * @returns Object with responseId and initial status
 *
 * @example
 * ```typescript
 * const params = createDeepResearchParams({
 *   model: 'o3-deep-research-2025-06-26',
 *   systemPrompt: '...',
 *   userQuery: '...',
 *   domains: ['example.com'],
 *   background: true  // Will be set automatically
 * });
 *
 * const { responseId, status } = await startBackgroundResearch(params);
 * console.log(`Started research: ${responseId} (status: ${status})`);
 *
 * // Later: poll for completion
 * const result = await pollForCompletion(responseId);
 * ```
 */
export async function startBackgroundResearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
): Promise<BackgroundResponse> {
  // Ensure background mode is enabled
  params.background = true;

  console.log('[Background Research] Starting background request...');

  const response = await deepResearchClient.responses.create(params);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseAny = response as any;

  const responseId = responseAny.id;
  const status = responseAny.status as ResponseStatus || 'queued';

  console.log(`[Background Research] Request started: ${responseId} (status: ${status})`);

  // If already completed (unlikely but possible for cached results)
  if (status === 'completed') {
    return {
      responseId,
      status,
      response: parseDeepResearchResponse(response),
    };
  }

  return {
    responseId,
    status,
  };
}

/**
 * Run deep research in background mode with automatic polling.
 * This is the recommended way to call deep research per best practices.
 *
 * @param params - The deep research parameters
 * @param pollOptions - Polling configuration
 * @returns The completed research result
 */
export async function runDeepResearchWithPolling(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  pollOptions: PollOptions = {}
): Promise<DeepResearchResult> {
  // Start in background mode
  const { responseId, response, status } = await startBackgroundResearch(params);

  // If already completed, return immediately
  if (status === 'completed' && response) {
    return response;
  }

  // Poll for completion
  return pollForCompletion(responseId, pollOptions);
}

// =============================================================================
// WEB SEARCH TOOL HELPERS
// =============================================================================

/**
 * Creates a web_search tool configuration with optional domain filtering.
 * @param domains - Array of domains to restrict search to (up to 100)
 */
export function createWebSearchTool(domains?: string[]) {
  const tool: { type: 'web_search_preview'; filters?: { allowed_domains: string[] } } = {
    type: 'web_search_preview',
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
 * Uses config service values when available.
 */
export function getDeepResearchModel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'FREE':
      return getDeepResearchModelMini();
    case 'PRO':
    case 'ENTERPRISE':
    default:
      return getDeepResearchModelFull();
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
  maxOutputTokens?: number;
}

// Default max output tokens for deep research (per best practices: 25k-50k)
export const DEFAULT_DEEP_RESEARCH_MAX_TOKENS = 50000;

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
    background = false,
    reasoningSummary = 'detailed',
    maxOutputTokens = DEFAULT_DEEP_RESEARCH_MAX_TOKENS,
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
    max_output_tokens: maxOutputTokens,
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
 * Handles both output_text (direct) and output[] array (structured) formats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDeepResearchResponse(response: any): DeepResearchResult {
  const result: DeepResearchResult = {
    content: '',
    citations: [],
    sources: [],
    searchQueries: [],
  };

  // Check for direct output_text field first (Responses API format)
  if (response?.output_text) {
    result.content = response.output_text;
    console.log(`[Deep Research] Found output_text: ${result.content.length} chars`);
  }

  // Check output array structure (alternate format)
  if (!result.content && response?.output && Array.isArray(response.output)) {
    // Find the final message content
    const messageOutput = response.output.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.type === 'message'
    );

    if (messageOutput?.content?.[0]?.text) {
      result.content = messageOutput.content[0].text;
      console.log(`[Deep Research] Found message content: ${result.content.length} chars`);
    }

    // Also check for text output type
    if (!result.content) {
      const textOutput = response.output.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o: any) => o.type === 'text' && o.text
      );
      if (textOutput?.text) {
        result.content = textOutput.text;
        console.log(`[Deep Research] Found text output: ${result.content.length} chars`);
      }
    }
  }

  // Log warning if still no content found
  if (!result.content) {
    console.warn('[Deep Research] No content found in response. Keys:', Object.keys(response || {}));
    if (response?.output) {
      console.warn('[Deep Research] Output types:', response.output.map((o: any) => o.type));
    }
    return result;
  }

  // Extract citations and metadata from output array if available
  if (response?.output && Array.isArray(response.output)) {
    const messageOutput = response.output.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.type === 'message'
    );

    if (messageOutput?.content?.[0]) {
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
