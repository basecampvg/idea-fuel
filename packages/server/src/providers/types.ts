import { z } from 'zod';
import type { SocialProofPost } from '../services/research-ai';

/**
 * Provider abstraction layer for multi-provider support
 * Enables integration of Brave Search, Anthropic Claude, and OpenAI models
 */

// ============================================================================
// Base Provider
// ============================================================================

export interface BaseProvider {
  /** Provider name (e.g., 'brave', 'openai', 'anthropic') */
  name: string;

  /** Check if provider is available and configured */
  isAvailable(): Promise<boolean>;

  /** Health check for provider status */
  healthCheck(): Promise<ProviderHealth>;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  latency?: number; // milliseconds
  message?: string;
  lastChecked: Date;
}

// ============================================================================
// Search Provider (Brave Search, OpenAI web_search_preview, SerpAPI)
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  timestamp?: string;
  platform?: 'reddit' | 'twitter' | 'facebook' | 'linkedin' | 'hackernews' | 'indiehackers' | 'producthunt' | 'other';
}

export interface SearchOptions {
  domains?: string[];
  maxResults?: number;
  timeout?: number;
}

export interface SearchProvider extends BaseProvider {
  name: 'brave' | 'openai' | 'serpapi';

  /**
   * General web search
   * @param query - Search query string
   * @param options - Optional search parameters (domain filtering, result limits)
   * @returns Array of search results
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Social platform-specific search
   * @param query - Search query string
   * @param platforms - Target social platforms
   * @returns Social proof posts with metadata
   */
  searchSocial(query: string, platforms: string[]): Promise<SocialSearchResult>;
}

export interface SocialSearchResult {
  posts: SocialProofPost[];
  totalResults: number;
  sources: string[];
  provider: string; // Which provider returned these results
}

// ============================================================================
// AI Provider (OpenAI, Anthropic)
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number; // Optional cost tracking
}

export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'; // For models that support reasoning
  responseFormat?: 'text' | 'json';
  background?: boolean; // Run in background with polling
  timeout?: number; // Request timeout in milliseconds
  task?: 'extraction' | 'scoring' | 'generation' | 'business-plan'; // Hints model selection
  longContext?: boolean; // Enable 1M token context window (Anthropic beta, ENTERPRISE tier only)
}

export interface AIResponse {
  content: string;
  usage: TokenUsage;
  metadata: {
    provider: string;
    model: string;
    responseId: string;
    status?: 'completed' | 'incomplete' | 'failed';
  };
}

export interface ResearchOptions extends AIRequestOptions {
  searchProvider?: SearchProvider;
  domains?: string[]; // Domain filtering for web search
  systemPrompt?: string; // Chunk-specific research context
}

export interface ResearchResponse extends AIResponse {
  citations: string[];
  reasoning?: string; // For models that expose reasoning traces
  sources?: string[]; // URLs from search results
}

export interface AIProvider extends BaseProvider {
  name: 'openai' | 'anthropic' | 'perplexity';

  /**
   * Deep research with optional web search
   * @param prompt - Research prompt
   * @param options - Research options (search provider, background mode, etc.)
   * @returns Research output with citations
   */
  research(prompt: string, options: ResearchOptions): Promise<ResearchResponse>;

  /**
   * Structured extraction with schema validation
   * @param prompt - Extraction prompt
   * @param schema - Zod schema for validation
   * @param options - Request options
   * @returns Typed extraction result
   */
  extract<T>(prompt: string, schema: z.ZodSchema<T>, options?: AIRequestOptions): Promise<T>;

  /**
   * Creative generation (long-form text)
   * @param prompt - Generation prompt
   * @param options - Request options
   * @returns Generated text
   */
  generate(prompt: string, options?: AIRequestOptions): Promise<string>;
}

// ============================================================================
// Provider Factory & Registry
// ============================================================================

export type ProviderType = 'search' | 'ai';

export interface ProviderRegistry {
  search: Map<string, SearchProvider>;
  ai: Map<string, AIProvider>;
}

export interface ProviderConfig {
  // Search provider configuration
  search: {
    default: 'brave' | 'openai' | 'serpapi';
    fallback?: 'openai' | 'serpapi';
    qualityThreshold?: {
      minPosts: number;
      minWordCount: number;
    };
  };

  // AI provider configuration
  ai: {
    research: 'openai' | 'anthropic' | 'perplexity';
    extraction: 'openai' | 'anthropic' | 'perplexity';
    generation: 'openai' | 'anthropic' | 'perplexity';
    businessPlan: 'openai' | 'anthropic' | 'perplexity';
  };

  // Tier-based overrides
  tierOverrides?: {
    FREE?: Partial<ProviderConfig['ai']>;
    PRO?: Partial<ProviderConfig['ai']>;
    ENTERPRISE?: Partial<ProviderConfig['ai']>;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, reason?: string) {
    super(
      `Provider ${provider} is unavailable${reason ? `: ${reason}` : ''}`,
      provider,
      'PROVIDER_UNAVAILABLE',
      true
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Provider ${provider} rate limit exceeded${retryAfter ? `, retry after ${retryAfter}ms` : ''}`,
      provider,
      'RATE_LIMIT_EXCEEDED',
      true
    );
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderValidationError extends ProviderError {
  constructor(provider: string, message: string) {
    super(`Provider ${provider} validation failed: ${message}`, provider, 'VALIDATION_ERROR', false);
    this.name = 'ProviderValidationError';
  }
}
