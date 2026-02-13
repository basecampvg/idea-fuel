import { z } from 'zod';
import type {
  AIProvider,
  AIRequestOptions,
  ResearchOptions,
  ResearchResponse,
  ProviderHealth,
  SearchProvider,
  SearchOptions,
  SearchResult,
  SocialSearchResult,
} from '../types';
import { openai as openaiClient } from '../../lib/openai';
import { runDeepResearchWithPolling } from '../../lib/deep-research';
import { withExponentialBackoff } from '../../lib/deep-research';

/**
 * OpenAI API Provider
 *
 * Wraps existing OpenAI functionality into AIProvider interface
 * Maintains compatibility with existing code while enabling multi-provider support
 *
 * Models: o3-deep-research, o4-mini-deep-research, GPT-5.2, GPT-4o
 */

export class OpenAIProvider implements AIProvider {
  name: 'openai' = 'openai';

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
      // Simple health check with minimal token usage
      await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });

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

  async research(prompt: string, options: ResearchOptions): Promise<ResearchResponse> {
    // For OpenAI, research = deep research with web_search_preview tool
    // This leverages o3-deep-research or o4-mini-deep-research models

    const model = this.selectResearchModel();

    // Use existing deep research infrastructure with polling
    const result = await runDeepResearchWithPolling({
      model,
      systemPrompt: 'You are a research assistant. Conduct thorough research and provide comprehensive insights with citations.',
      userQuery: prompt,
      domains: options.domains,
      background: options.background ?? true,
      reasoningSummary: 'auto',
      maxOutputTokens: options.maxTokens || 50000,
    });

    return {
      content: result.rawReport || result.output,
      citations: result.citations.map((c) => c.url),
      sources: result.sources || [],
      usage: {
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
      metadata: {
        provider: 'openai',
        model,
        responseId: result.responseId || `openai-${Date.now()}`,
        status: result.status as 'completed' | 'incomplete' | 'failed',
      },
    };
  }

  async extract<T>(prompt: string, schema: z.ZodSchema<T>, options?: AIRequestOptions): Promise<T> {
    const model = options?.maxTokens && options.maxTokens > 20000 ? 'gpt-5.2' : 'gpt-4o';

    const response = await withExponentialBackoff(
      async () => {
        return await openaiClient.responses.create({
          model,
          input: [
            {
              role: 'system',
              content:
                'You are a structured data extraction assistant. Output valid JSON matching the requested schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_output_tokens: options?.maxTokens || 16000,
          response_format: { type: 'json_object' },
        } as any);
      },
      { maxAttempts: 5 }
    );

    // Parse response
    const content = this.extractResponseContent(response);
    const rawJson = JSON.parse(content);

    // Validate with Zod schema
    return schema.parse(rawJson);
  }

  async generate(prompt: string, options?: AIRequestOptions): Promise<string> {
    const model = options?.maxTokens && options.maxTokens > 20000 ? 'gpt-5.2' : 'gpt-4o';

    const response = await withExponentialBackoff(
      async () => {
        return await openaiClient.responses.create({
          model,
          input: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_output_tokens: options?.maxTokens || 16000,
          response_format: { type: 'text' },
        } as any);
      },
      { maxAttempts: 5 }
    );

    return this.extractResponseContent(response);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private selectResearchModel(): string {
    // Default to o3-deep-research for PRO/ENTERPRISE quality
    // Could be made configurable via config service
    return 'o3-deep-research-2025-06-26';
  }

  private extractResponseContent(response: any): string {
    // Handle both output_text and output[] array formats
    if (response.output_text) {
      return response.output_text;
    }

    if (Array.isArray(response.output)) {
      return response.output.map((item: any) => item.content || item.text || '').join('\n');
    }

    throw new Error('Unexpected response format from OpenAI');
  }
}

// Singleton instance
let _openaiProvider: OpenAIProvider | null = null;

export function getOpenAIProvider(): OpenAIProvider {
  if (!_openaiProvider) {
    _openaiProvider = new OpenAIProvider();
  }
  return _openaiProvider;
}

// Default export for easy import
export const openaiProvider = new Proxy({} as OpenAIProvider, {
  get(_target, prop) {
    return (getOpenAIProvider() as any)[prop];
  },
});

// ============================================================================
// OpenAI Search Provider (web_search_preview wrapper)
// ============================================================================

import type { SocialProofPost } from '../../services/research-ai';

/**
 * OpenAI Search Provider
 *
 * Wraps OpenAI's web_search_preview tool for SearchProvider interface
 * Used as fallback when Brave Search returns insufficient results
 */
export class OpenAISearchProvider implements SearchProvider {
  name: 'openai' = 'openai';

  async isAvailable(): Promise<boolean> {
    // OpenAI search is available if the client is available
    return true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      lastChecked: new Date(),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // This is a simplified wrapper - actual implementation would use web_search_preview tool
    // For now, we throw an error indicating this should use the deep research path
    throw new Error('OpenAI search requires using the research() method with web_search_preview tool');
  }

  async searchSocial(query: string, platforms: string[]): Promise<SocialSearchResult> {
    // This is a simplified wrapper - actual implementation would use web_search_preview tool
    // For now, we throw an error indicating this should use the deep research path
    throw new Error('OpenAI social search requires using the research() method with domain filtering');
  }
}

export const openaiSearch = new OpenAISearchProvider();
