/**
 * Shared Anthropic client — lazy singleton used by all AI services.
 *
 * Extracted from card-ai.ts so that note-ai.ts (and future services)
 * reuse the same SDK instance + configuration.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

/**
 * Returns a lazily-initialised Anthropic SDK client.
 * Throws if ANTHROPIC_API_KEY is missing at call time.
 */
export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    _client = new Anthropic({
      apiKey,
      timeout: 30_000,
      maxRetries: 1,
    });
  }
  return _client;
}
