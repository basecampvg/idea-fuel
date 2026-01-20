import OpenAI from 'openai';
import type { SubscriptionTier } from '@prisma/client';
import { configService } from '../services/config';

// Re-export retry utility from deep-research for convenience
export { withExponentialBackoff, type RetryOptions } from './deep-research';

// Log OpenAI initialization status
const apiKey = process.env.OPENAI_API_KEY;
console.log('[OpenAI] API Key configured:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

// Check if GPT-5.2 extended parameters are enabled
// Set OPENAI_USE_GPT52_PARAMS=true when you have access to GPT-5.2's reasoning/text params
export const USE_GPT52_PARAMS = process.env.OPENAI_USE_GPT52_PARAMS === 'true';
console.log('[OpenAI] GPT-5.2 extended params enabled:', USE_GPT52_PARAMS);

// Initialize OpenAI client with API key from environment
// Set a reasonable timeout (2 minutes) to prevent hanging
export const openai = new OpenAI({
  apiKey,
  timeout: 120000, // 2 minute timeout
  maxRetries: 2,   // Retry twice on transient errors
});

// Default model constants (used as fallbacks when config service not initialized)
export const INTERVIEW_MODEL = 'gpt-5.2';
export const EXTRACTION_MODEL = 'gpt-5.2';
export const RESEARCH_MODEL = 'gpt-5.2';

// =============================================================================
// CONFIG-AWARE MODEL GETTERS
// These functions check the config service first, fall back to defaults
// =============================================================================

/**
 * Get the interview model from config or fallback to default
 */
export function getInterviewModel(): string {
  return configService.isInitialized()
    ? configService.getString('ai.interview.model', INTERVIEW_MODEL)
    : INTERVIEW_MODEL;
}

/**
 * Get the research/synthesis model from config or fallback to default
 */
export function getResearchModel(): string {
  return configService.isInitialized()
    ? configService.getString('ai.research.model', RESEARCH_MODEL)
    : RESEARCH_MODEL;
}

/**
 * Check if GPT-5.2 reasoning params are enabled (config or env)
 */
export function isReasoningEnabled(): boolean {
  if (configService.isInitialized()) {
    return configService.getBoolean('ai.params.reasoningEnabled', USE_GPT52_PARAMS);
  }
  return USE_GPT52_PARAMS;
}

/**
 * Get default temperature from config or fallback
 */
export function getDefaultTemperature(): number {
  return configService.isInitialized()
    ? configService.getNumber('ai.params.temperature', 0.7)
    : 0.7;
}

/**
 * Get default max tokens from config or fallback
 */
export function getDefaultMaxTokens(): number {
  return configService.isInitialized()
    ? configService.getNumber('ai.params.maxTokens', 4096)
    : 4096;
}

// GPT-5.2 Parameter Types
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
export type Verbosity = 'low' | 'medium' | 'high';

export interface AIParams {
  reasoning: ReasoningEffort;
  verbosity: Verbosity;
}

// Tier-based AI parameter presets
// Higher tiers get more reasoning effort for better quality outputs
export const AI_PRESETS = {
  // Interview functions
  interviewQuestion: {
    FREE: { reasoning: 'high', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'low' },
  },
  dataExtraction: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'medium' },
  },
  // Research functions
  searchQueries: {
    FREE: { reasoning: 'low', verbosity: 'low' },
    PRO: { reasoning: 'medium', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'low' },
  },
  synthesizeInsights: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
  },
  calculateScores: {
    FREE: { reasoning: 'medium', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'low' },
  },
  businessMetrics: {
    FREE: { reasoning: 'medium', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'low' },
  },
  userStory: {
    FREE: { reasoning: 'low', verbosity: 'high' },
    PRO: { reasoning: 'medium', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'high' },
  },
  keywordTrends: {
    FREE: { reasoning: 'low', verbosity: 'medium' },
    PRO: { reasoning: 'medium', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'medium' },
  },
  valueLadder: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
  },
  actionPrompts: {
    FREE: { reasoning: 'low', verbosity: 'high' },
    PRO: { reasoning: 'medium', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'high' },
  },
  socialProof: {
    FREE: { reasoning: 'none', verbosity: 'high' },
    PRO: { reasoning: 'low', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'medium', verbosity: 'high' },
  },
  // New presets for deep research extraction phase
  extractInsights: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
  },
  extractScores: {
    FREE: { reasoning: 'high', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'low' },
  },
  extractMetrics: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'medium' },
  },
} as const;

export type AIPresetKey = keyof typeof AI_PRESETS;

// Get AI parameters for a specific preset and subscription tier
export function getAIParams(preset: AIPresetKey, tier: SubscriptionTier): AIParams {
  return AI_PRESETS[preset][tier];
}

// Responses API Parameters
// The Responses API uses different parameter structure than Chat Completions
// - Input: string or array of messages (not 'messages')
// - Output: response.output_text (not choices[0].message.content)
// - JSON mode: text.format.type (not response_format)

export interface ResponsesCreateBaseParams {
  model: string;
  input: string | Array<{ role: string; content: string }>;
  max_output_tokens?: number;
  instructions?: string;
}

export interface ResponsesCreateJsonParams extends ResponsesCreateBaseParams {
  response_format: { type: 'json_object' };
}

export interface ResponsesCreateTextParams extends ResponsesCreateBaseParams {
  response_format?: { type: 'text' };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponsesCreateParams = any;

// Helper to create Responses API params with optional GPT-5.2 extensions
// The Responses API supports reasoning.effort and text.verbosity for GPT-5.2
export function createResponsesParams(
  baseParams: ResponsesCreateBaseParams & { response_format?: { type: 'json_object' | 'text' } },
  aiParams: AIParams
): ResponsesCreateParams {
  // Build the params object for Responses API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: baseParams.model,
    input: baseParams.input,
  };

  if (baseParams.max_output_tokens) {
    params.max_output_tokens = baseParams.max_output_tokens;
  }

  if (baseParams.instructions) {
    params.instructions = baseParams.instructions;
  }

  // Only add GPT-5.2 extended params when enabled
  if (USE_GPT52_PARAMS) {
    params.reasoning = { effort: aiParams.reasoning };
    params.text = {
      format: baseParams.response_format || { type: 'text' },
      verbosity: aiParams.verbosity,
    };
  } else if (baseParams.response_format) {
    // Without GPT-5.2 params, still need to set format for JSON mode
    params.text = { format: baseParams.response_format };
  }

  return params;
}

// Legacy helper kept for backward compatibility during migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChatCompletionCreateParamsWithGPT52 = any;

export function createGPT52Params(
  params: Record<string, unknown>,
  aiParams: AIParams
): ChatCompletionCreateParamsWithGPT52 {
  // This function is deprecated - use createResponsesParams instead
  // Kept for any remaining Chat Completions API calls
  if (USE_GPT52_PARAMS) {
    return {
      ...params,
      reasoning: { effort: aiParams.reasoning },
      text: { verbosity: aiParams.verbosity },
    };
  }
  return params;
}

// =============================================================================
// WEB SEARCH TOOL HELPERS
// =============================================================================

/**
 * Creates a web_search tool configuration for the Responses API.
 * @param domains - Optional array of domains to restrict search (up to 100)
 * @returns Tool configuration object
 */
export function createWebSearchTool(domains?: string[]) {
  const tool: { type: 'web_search_preview'; filters?: { allowed_domains: string[] } } = {
    type: 'web_search_preview',
  };

  if (domains && domains.length > 0) {
    tool.filters = {
      allowed_domains: domains.slice(0, 100), // API limit
    };
  }

  return tool;
}

/**
 * Creates Responses API params with web_search tool enabled.
 * Used for social proof and supplementary research.
 */
export function createResponsesParamsWithWebSearch(
  baseParams: ResponsesCreateBaseParams & {
    response_format?: { type: 'json_object' | 'text' };
  },
  aiParams: AIParams,
  domains?: string[]
): ResponsesCreateParams {
  const params = createResponsesParams(baseParams, aiParams);

  // Add web_search tool
  params.tools = [createWebSearchTool(domains)];

  // Include sources in response
  params.include = ['web_search_call.action.sources'];

  return params;
}
