import Perplexity from '@perplexity-ai/perplexity_ai';
import {
  RateLimitError,
  AuthenticationError,
  APIError,
} from '@perplexity-ai/perplexity_ai';
import { z } from 'zod';
import type {
  AIProvider,
  AIRequestOptions,
  ResearchOptions,
  ResearchResponse,
  ProviderHealth,
} from '../types';
import {
  ProviderError,
  ProviderRateLimitError,
} from '../types';

const DEEP_RESEARCH_MODEL = 'sonar-deep-research';

// Adaptive polling intervals based on elapsed time
function getPollingInterval(elapsedMs: number): number {
  if (elapsedMs < 2 * 60 * 1000) return 3000;   // First 2 min: every 3s
  if (elapsedMs < 5 * 60 * 1000) return 10000;   // 2-5 min: every 10s
  return 30000;                                     // 5+ min: every 30s
}

export class PerplexityProvider implements AIProvider {
  name = 'perplexity' as const;
  private client: Perplexity;

  constructor() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY is required to initialize PerplexityProvider');
    }

    this.client = new Perplexity({
      apiKey,
      maxRetries: 0, // We handle retries at the pipeline level via withExponentialBackoff
      timeout: 60000, // 60s per HTTP request (polling calls are quick)
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!process.env.PERPLEXITY_API_KEY;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      // Quick ping using a lightweight model
      await this.client.chat.completions.create({
        model: 'sonar',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unavailable',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  async research(prompt: string, options: ResearchOptions): Promise<ResearchResponse> {
    const idempotencyKey = `pplx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      // 1. Submit async deep research job
      const submission = await this.client.async.chat.completions.create({
        idempotency_key: idempotencyKey,
        request: {
          model: DEEP_RESEARCH_MODEL,
          messages: [
            ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
            { role: 'user' as const, content: prompt },
          ],
          max_tokens: options.maxTokens || 16000,
          reasoning_effort: 'high',
          ...(options.domains && options.domains.length > 0 ? {
            search_domain_filter: options.domains.slice(0, 20), // Max 20 domains
          } : {}),
        },
      });

      const requestId = submission.id;
      console.log(`[Perplexity] Async job submitted: ${requestId}`);

      // 2. Poll for completion with adaptive intervals + deadline timeout
      const DEADLINE_MS = 15 * 60 * 1000; // 15 min hard deadline
      const startTime = Date.now();

      while (true) {
        const elapsed = Date.now() - startTime;

        if (elapsed > DEADLINE_MS) {
          throw new ProviderError(
            `Perplexity deep research timed out after ${Math.round(elapsed / 1000)}s`,
            'perplexity',
            'TIMEOUT',
            true
          );
        }

        const interval = getPollingInterval(elapsed);
        await new Promise(resolve => setTimeout(resolve, interval));

        const result = await this.client.async.chat.completions.get(requestId);

        console.log(`[Perplexity] [${requestId}] Status: ${result.status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);

        if (result.status === 'COMPLETED') {
          return this.parseAsyncResponse(result, requestId);
        }

        if (result.status === 'FAILED') {
          throw new ProviderError(
            `Perplexity deep research failed: ${result.error_message || 'Unknown error'}`,
            'perplexity',
            'RESEARCH_FAILED',
            true // Retryable — might succeed on retry
          );
        }

        // CREATED or IN_PROGRESS — keep polling
      }
    } catch (error) {
      if (error instanceof ProviderError || error instanceof ProviderRateLimitError) {
        throw error; // Already mapped
      }
      if (error instanceof RateLimitError) {
        throw new ProviderRateLimitError('perplexity');
      }
      if (error instanceof AuthenticationError) {
        throw new ProviderError(
          'Perplexity authentication failed — check PERPLEXITY_API_KEY',
          'perplexity',
          'AUTH_ERROR',
          false // Not retryable
        );
      }
      if (error instanceof APIError) {
        throw new ProviderError(
          `Perplexity API error: ${error.message}`,
          'perplexity',
          'API_ERROR',
          error.status ? error.status >= 500 : false // 5xx retryable
        );
      }
      throw error;
    }
  }

  async extract<T>(_prompt: string, _schema: z.ZodSchema<T>, _options?: AIRequestOptions): Promise<T> {
    throw new Error('Not implemented: use OpenAI or Anthropic for extraction');
  }

  async generate(_prompt: string, _options?: AIRequestOptions): Promise<string> {
    throw new Error('Not implemented: use OpenAI or Anthropic for generation');
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private parseAsyncResponse(
    result: { response?: { choices?: Array<{ message?: { content?: string | null } }>; citations?: Array<string> | null; search_results?: Array<{ url: string; title: string; snippet?: string }> | null; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null } | null },
    requestId: string,
  ): ResearchResponse {
    const response = result.response;

    // Extract content from first choice
    const content = response?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new ProviderError(
        'Perplexity returned empty or malformed response',
        'perplexity',
        'EMPTY_RESPONSE',
        true
      );
    }

    // Extract citations from inline markers [1], [2], etc.
    const inlineCitations = [...new Set(
      (content.match(/\[(\d+)\]/g) || []).map(m => m.replace(/\[|\]/g, ''))
    )];

    // Extract source URLs from search_results
    const sources = (response?.search_results || []).map(r => r.url);

    // Combine inline citation markers + search result URLs
    const citations = sources.length > 0 ? sources : inlineCitations;

    const usage = response?.usage;

    return {
      content,
      citations,
      sources,
      usage: {
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
      metadata: {
        provider: 'perplexity',
        model: DEEP_RESEARCH_MODEL,
        responseId: requestId,
        status: 'completed',
      },
    };
  }
}

// Lazy singleton with eager validation
let _provider: PerplexityProvider | null = null;

export function getPerplexityProvider(): PerplexityProvider {
  if (!_provider) {
    _provider = new PerplexityProvider();
  }
  return _provider;
}

// Proxy export for convenient lazy access (follows Anthropic provider pattern)
export const perplexity = new Proxy({} as PerplexityProvider, {
  get(_target, prop) {
    return (getPerplexityProvider() as any)[prop];
  },
});
