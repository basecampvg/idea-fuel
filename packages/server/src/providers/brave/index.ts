import type {
  SearchProvider,
  SearchResult,
  SearchOptions,
  SocialSearchResult,
  ProviderHealth,
  ProviderUnavailableError,
} from '../types';
import type { SocialProofPost } from '../../services/research-ai';

/**
 * Brave Search API Provider
 *
 * Implements SearchProvider interface for Brave Search Web Search API
 * https://api.search.brave.com/app/documentation/web-search/get-started
 *
 * Cost: ~$0.01/query vs OpenAI web_search_preview ~$15/call (98% savings)
 */

interface BraveSearchConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  age?: string; // Brave provides relative age (e.g., "2 days ago")
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
  };
  query?: {
    original: string;
  };
}

export class BraveSearchProvider implements SearchProvider {
  name = 'brave' as const;
  private config: BraveSearchConfig;

  constructor() {
    this.config = this.initConfig();
  }

  private initConfig(): BraveSearchConfig {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      throw new Error('BRAVE_SEARCH_API_KEY environment variable is not set');
    }

    return {
      apiKey,
      baseUrl: 'https://api.search.brave.com/res/v1',
      timeout: 30000, // 30 second timeout
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      // Simple health check query
      await this.search('test', { maxResults: 1 });

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'unavailable',
        latency: Date.now() - startTime,
        message: errorMessage,
        lastChecked: new Date(),
      };
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(options?.maxResults || 20),
    });

    // Add site: filter for domain restriction
    if (options?.domains && options.domains.length > 0) {
      const siteFilter = options.domains.map((d) => `site:${d}`).join(' OR ');
      params.set('q', `${query} (${siteFilter})`);
    }

    const url = `${this.config.baseUrl}/web/search?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Subscription-Token': this.config.apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(options?.timeout || this.config.timeout),
      });

      if (!response.ok) {
        // Handle rate limits and errors
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new Error(
            `Brave Search rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`
          );
        }

        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as BraveSearchResponse;
      return this.parseWebResults(data);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Brave Search request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async searchSocial(query: string, platforms: string[]): Promise<SocialSearchResult> {
    // Platform domain mapping
    const platformDomains: Record<string, string> = {
      reddit: 'reddit.com',
      twitter: 'twitter.com',
      facebook: 'facebook.com',
      linkedin: 'linkedin.com',
      hackernews: 'news.ycombinator.com',
      indiehackers: 'indiehackers.com',
      producthunt: 'producthunt.com',
    };

    const domains = platforms
      .map((p) => platformDomains[p.toLowerCase()])
      .filter((d): d is string => Boolean(d));

    if (domains.length === 0) {
      throw new Error(`No valid platform domains found for: ${platforms.join(', ')}`);
    }

    // Search with domain filtering (up to 50 results for social proof)
    const results = await this.search(query, { domains, maxResults: 50 });

    // Convert SearchResult[] to SocialProofPost[]
    const posts: SocialProofPost[] = results.map((r) => ({
      platform: this.detectPlatform(r.url),
      author: 'Anonymous', // Brave doesn't provide author info in API response
      content: r.snippet,
      url: r.url,
      engagement: {
        // Brave Search API doesn't provide engagement metrics
        // These would need to be scraped separately if needed
      },
      date: r.timestamp || new Date().toISOString(),
      sentiment: 'neutral' as const, // Sentiment analysis done by AI later
      relevanceScore: 0.5, // Default relevance, refined by AI synthesis
    }));

    return {
      posts,
      totalResults: results.length,
      sources: [...new Set(results.map((r) => r.url))],
      provider: 'brave',
    };
  }

  private parseWebResults(data: BraveSearchResponse): SearchResult[] {
    if (!data.web?.results) {
      return [];
    }

    return data.web.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      timestamp: r.age, // Brave provides relative age like "2 days ago"
      platform: this.detectPlatformFromUrl(r.url),
    }));
  }

  private detectPlatformFromUrl(url: string): SearchResult['platform'] {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('reddit.com')) return 'reddit';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
    if (urlLower.includes('facebook.com')) return 'facebook';
    if (urlLower.includes('linkedin.com')) return 'linkedin';
    if (urlLower.includes('news.ycombinator.com')) return 'hackernews';
    if (urlLower.includes('indiehackers.com')) return 'indiehackers';
    if (urlLower.includes('producthunt.com')) return 'producthunt';

    return 'other';
  }

  private detectPlatform(
    url: string
  ): 'reddit' | 'facebook' | 'twitter' | 'hackernews' | 'indiehackers' | 'producthunt' | 'linkedin' {
    const platform = this.detectPlatformFromUrl(url);

    if (platform === 'other') {
      // Fallback to reddit if platform can't be detected
      return 'reddit';
    }

    return platform as 'reddit' | 'facebook' | 'twitter' | 'hackernews' | 'indiehackers' | 'producthunt' | 'linkedin';
  }
}

// Singleton instance
let _braveSearchProvider: BraveSearchProvider | null = null;

export function getBraveSearchProvider(): BraveSearchProvider {
  if (!_braveSearchProvider) {
    _braveSearchProvider = new BraveSearchProvider();
  }
  return _braveSearchProvider;
}

// Default export for easy import
export const braveSearch = new Proxy({} as BraveSearchProvider, {
  get(_target, prop) {
    return (getBraveSearchProvider() as any)[prop];
  },
});
