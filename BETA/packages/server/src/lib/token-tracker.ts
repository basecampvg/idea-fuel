/**
 * Token Usage Tracker
 *
 * Tracks OpenAI API token usage for cost monitoring.
 * Fire-and-forget design - never throws to avoid breaking main flow.
 */

import { prisma } from '../db';

// Model pricing (USD per 1K tokens) - update as pricing changes
// Note: Cached tokens are billed at 50% of input price (handled in cost calculation)
const MODEL_PRICING: Record<string, { input: number; output: number; cached: number }> = {
  // GPT-5.2 (hypothetical pricing) - cached tokens at 50% discount
  'gpt-5.2': { input: 0.005, output: 0.015, cached: 0.0025 },
  // GPT-4.1
  'gpt-4.1': { input: 0.03, output: 0.06, cached: 0.015 },
  // GPT-4o
  'gpt-4o': { input: 0.005, output: 0.015, cached: 0.0025 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006, cached: 0.000075 },
  // o3-deep-research models
  'o3-deep-research-2025-06-26': { input: 0.01, output: 0.03, cached: 0.005 },
  'o4-mini-deep-research-2025-06-26': { input: 0.003, output: 0.012, cached: 0.0015 },
  // Fallback for unknown models
  default: { input: 0.01, output: 0.03, cached: 0.005 },
};

export interface TokenUsageParams {
  userId?: string | null;
  ideaId?: string | null;
  functionName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number; // Tokens read from prompt cache (50% discount)
}

/**
 * Track token usage from an OpenAI API call.
 * This is fire-and-forget - it will never throw or block the main flow.
 */
export async function trackTokenUsage(params: TokenUsageParams): Promise<void> {
  const { userId, ideaId, functionName, model, inputTokens, outputTokens, cachedTokens = 0 } = params;
  const totalTokens = inputTokens + outputTokens;

  // Calculate cost estimate
  // Cached tokens are billed at 50% of input price
  // inputTokens includes cachedTokens, so we adjust: (inputTokens - cachedTokens) * full_price + cachedTokens * cached_price
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const nonCachedInputTokens = inputTokens - cachedTokens;
  const costEstimate =
    (nonCachedInputTokens / 1000) * pricing.input +
    (cachedTokens / 1000) * pricing.cached +
    (outputTokens / 1000) * pricing.output;

  // Log cache metrics for monitoring
  if (cachedTokens > 0) {
    const cacheHitRate = ((cachedTokens / inputTokens) * 100).toFixed(1);
    const savings = ((cachedTokens / 1000) * (pricing.input - pricing.cached)).toFixed(4);
    console.log(`[TokenTracker] Cache hit: ${cachedTokens}/${inputTokens} tokens (${cacheHitRate}%), saved $${savings}`);
  }

  try {
    await prisma.tokenUsage.create({
      data: {
        userId: userId ?? null,
        ideaId: ideaId ?? null,
        functionName,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        cachedTokens,
        costEstimate,
      },
    });
  } catch (error) {
    // Log but don't throw - tracking should never break main flow
    console.error('[TokenTracker] Failed to log usage:', error);
  }
}

/**
 * Extract token usage from an OpenAI Responses API response.
 * Handles both standard and background mode response formats.
 * Includes cached token extraction for prompt caching metrics.
 */
export function extractUsageFromResponse(
  response: unknown
): { inputTokens: number; outputTokens: number; cachedTokens: number } | null {
  if (!response || typeof response !== 'object') return null;

  const resp = response as Record<string, unknown>;
  const usage = resp.usage as
    | {
        input_tokens?: number;
        output_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      }
    | undefined;

  if (!usage) return null;

  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
  };
}

/**
 * Convenience function to track usage from a response object.
 * Combines extractUsageFromResponse and trackTokenUsage.
 */
export async function trackUsageFromResponse(
  response: unknown,
  context: Omit<TokenUsageParams, 'inputTokens' | 'outputTokens' | 'cachedTokens'>
): Promise<void> {
  const usage = extractUsageFromResponse(response);
  if (usage) {
    await trackTokenUsage({
      ...context,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
    });
  }
}
