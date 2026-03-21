import OpenAI from 'openai';
import type { SubscriptionTier } from '../db/schema';
import { configService } from '../services/config';
import { getOpenAIKeyPool } from './key-pool';

// Re-export retry utility from deep-research for convenience
export { withExponentialBackoff, type RetryOptions } from './deep-research';

// Check if GPT-5.2 extended parameters are enabled
// Set OPENAI_USE_GPT52_PARAMS=true when you have access to GPT-5.2's reasoning/text params
export const USE_GPT52_PARAMS = process.env.OPENAI_USE_GPT52_PARAMS === 'true';

// =============================================================================
// OPENAI CLIENT WITH KEY POOL ROTATION
// Caches one client per API key to avoid re-creating clients on every call.
// When multiple keys are configured (comma-separated in OPENAI_API_KEY),
// each call to getOpenAIClient() round-robins through available keys.
// =============================================================================

const _clientCache = new Map<string, OpenAI>();

export function getOpenAIClient(): OpenAI {
  const pool = getOpenAIKeyPool();
  const apiKey = pool.getKey();

  let client = _clientCache.get(apiKey);
  if (!client) {
    client = new OpenAI({
      apiKey,
      timeout: 600000, // 10 minute timeout for xhigh reasoning
      maxRetries: 2,
    });
    _clientCache.set(apiKey, client);
  }
  return client;
}

/**
 * Mark the most recently used OpenAI key as rate-limited.
 * Call this when you catch a 429 from OpenAI.
 */
export function markOpenAIKeyRateLimited(durationMs?: number): void {
  getOpenAIKeyPool().markCurrentRateLimited(durationMs);
}

/** @deprecated Use getOpenAIClient() for lazy initialization */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Default model constants (used as fallbacks when config service not initialized)
export const INTERVIEW_MODEL = 'gpt-5.2';
export const EXTRACTION_MODEL = 'gpt-4o-mini';
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
    FREE: { reasoning: 'medium', verbosity: 'low' },
    PRO: { reasoning: 'medium', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'medium', verbosity: 'low' },
    TESTER: { reasoning: 'medium', verbosity: 'low' },
  },
  dataExtraction: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'medium' },
    TESTER: { reasoning: 'xhigh', verbosity: 'medium' },
  },
  // Research functions
  searchQueries: {
    FREE: { reasoning: 'low', verbosity: 'low' },
    PRO: { reasoning: 'medium', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'low' },
    TESTER: { reasoning: 'high', verbosity: 'low' },
  },
  synthesizeInsights: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
    TESTER: { reasoning: 'xhigh', verbosity: 'high' },
  },
  calculateScores: {
    FREE: { reasoning: 'medium', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'low' },
    TESTER: { reasoning: 'xhigh', verbosity: 'low' },
  },
  businessMetrics: {
    FREE: { reasoning: 'medium', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'low' },
    TESTER: { reasoning: 'xhigh', verbosity: 'low' },
  },
  userStory: {
    FREE: { reasoning: 'low', verbosity: 'high' },
    PRO: { reasoning: 'medium', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'high' },
    TESTER: { reasoning: 'high', verbosity: 'high' },
  },
  keywordTrends: {
    FREE: { reasoning: 'low', verbosity: 'medium' },
    PRO: { reasoning: 'medium', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'medium' },
    TESTER: { reasoning: 'high', verbosity: 'medium' },
  },
  valueLadder: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
    TESTER: { reasoning: 'xhigh', verbosity: 'high' },
  },
  actionPrompts: {
    FREE: { reasoning: 'low', verbosity: 'high' },
    PRO: { reasoning: 'medium', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'high' },
    TESTER: { reasoning: 'high', verbosity: 'high' },
  },
  socialProof: {
    FREE: { reasoning: 'none', verbosity: 'high' },
    PRO: { reasoning: 'low', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'medium', verbosity: 'high' },
    TESTER: { reasoning: 'medium', verbosity: 'high' },
  },
  // New presets for deep research extraction phase
  extractInsights: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
    TESTER: { reasoning: 'xhigh', verbosity: 'high' },
  },
  extractScores: {
    FREE: { reasoning: 'high', verbosity: 'low' },
    PRO: { reasoning: 'high', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'low' },
    TESTER: { reasoning: 'xhigh', verbosity: 'low' },
  },
  extractMetrics: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'medium' },
    TESTER: { reasoning: 'xhigh', verbosity: 'medium' },
  },
  businessPlan: {
    // Plain text output (not JSON) — safe to use xhigh reasoning without truncation risk
    FREE: { reasoning: 'xhigh', verbosity: 'high' },
    PRO: { reasoning: 'xhigh', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'xhigh', verbosity: 'high' },
    TESTER: { reasoning: 'xhigh', verbosity: 'high' },
  },
  extractMarketSizing: {
    // IMPORTANT: For JSON mode, avoid xhigh reasoning - it consumes tokens on hidden reasoning
    // leaving insufficient budget for visible JSON output, causing status: incomplete
    FREE: { reasoning: 'medium', verbosity: 'low' },
    PRO: { reasoning: 'medium', verbosity: 'low' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'low' },  // Downgraded from xhigh
    TESTER: { reasoning: 'high', verbosity: 'low' },
  },
  // Tech stack recommendations preset
  techStack: {
    // IMPORTANT: For JSON mode, avoid xhigh reasoning - it consumes tokens on hidden reasoning
    // leaving insufficient budget for visible JSON output, causing status: incomplete
    FREE: { reasoning: 'low', verbosity: 'medium' },
    PRO: { reasoning: 'medium', verbosity: 'medium' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'medium' },  // Downgraded from xhigh
    TESTER: { reasoning: 'high', verbosity: 'medium' },
  },
  // Spark enrichment - GPT-5.2 post-processing for quick validation
  enrichSparkResult: {
    FREE: { reasoning: 'medium', verbosity: 'medium' },
    PRO: { reasoning: 'high', verbosity: 'high' },
    ENTERPRISE: { reasoning: 'high', verbosity: 'high' },
    TESTER: { reasoning: 'high', verbosity: 'high' },
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

/**
 * Check if a model supports GPT-5.2 extended parameters (reasoning.effort, text.verbosity)
 * Only GPT-5.x models support these parameters
 */
export function modelSupportsGPT52Params(model: string): boolean {
  return model.startsWith('gpt-5');
}

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

  // Check if this model supports GPT-5.2 extended params
  const supportsExtendedParams = modelSupportsGPT52Params(baseParams.model);

  // Enable 24h extended prompt cache retention for GPT-5.x models
  // This keeps cached prefixes active for up to 24 hours (vs default 5-10 min)
  // See: https://platform.openai.com/docs/guides/prompt-caching
  if (supportsExtendedParams) {
    params.prompt_cache_retention = '24h';
  }

  // Only add GPT-5.2 extended params when enabled AND model supports them
  // Models like gpt-4o-mini don't support reasoning.effort parameter
  if (USE_GPT52_PARAMS && supportsExtendedParams) {
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

// =============================================================================
// STRUCTURED OUTPUT WITH JSON SCHEMA VALIDATION
// =============================================================================

import Ajv from 'ajv';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Initialize AJV for JSON Schema validation
const ajv = new Ajv({ strict: false, allErrors: true });

// Cache for compiled schemas
const schemaCache = new Map<string, ReturnType<typeof ajv.compile>>();

/**
 * Load and compile a JSON schema from file
 */
function loadSchema(schemaPath: string): ReturnType<typeof ajv.compile> {
  if (schemaCache.has(schemaPath)) {
    return schemaCache.get(schemaPath)!;
  }

  // Try multiple possible locations for the schema
  // (handles different execution contexts: Next.js build, direct tsx, etc.)
  const possiblePaths = [
    // When running from packages/web or packages/server
    path.resolve(process.cwd(), '../shared/src/schemas', schemaPath),
    // When running from BETA root
    path.resolve(process.cwd(), 'packages/shared/src/schemas', schemaPath),
    // Original __dirname approach (works in some environments)
    path.resolve(__dirname, '../../..', 'shared/src/schemas', schemaPath),
  ];

  let fullPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      fullPath = p;
      break;
    }
  }

  if (!fullPath) {
    throw new Error(
      `Schema file not found: ${schemaPath}. Searched paths:\n${possiblePaths.join('\n')}`
    );
  }

  const schemaContent = fs.readFileSync(fullPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  const validate = ajv.compile(schema);
  schemaCache.set(schemaPath, validate);

  return validate;
}

/**
 * Generate SHA256 hash of payload for deduplication
 */
function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload);
  return createHash('sha256').update(str).digest('hex');
}

export interface RunStructuredOptions<T> {
  model?: string;
  schemaPath: string; // Path relative to schemas folder, e.g., 'triage.schema.json'
  systemPrompt: string;
  userPayload: unknown;
  maxRetries?: number;
  maxOutputTokens?: number;
  tier?: SubscriptionTier;
}

export interface RunStructuredResult<T> {
  output: T;
  payloadHash: string;
  model: string;
  schemaVersion: string;
}

/**
 * Run a structured AI call with JSON schema validation
 *
 * Features:
 * - Validates output against JSON schema using AJV
 * - Retries once on validation failure with stricter prompt
 * - Returns payload hash for deduplication
 */
export async function runStructured<T>(
  options: RunStructuredOptions<T>
): Promise<RunStructuredResult<T>> {
  const {
    model = 'gpt-4o-mini',
    schemaPath,
    systemPrompt,
    userPayload,
    maxRetries = 1,
    maxOutputTokens = 4096,
    tier = 'FREE',
  } = options;

  // Load and compile schema
  const validate = loadSchema(schemaPath);

  // Extract schema version from schema
  const fullPath = path.resolve(
    __dirname,
    '../../..',
    'shared/src/schemas',
    schemaPath
  );
  const schemaContent = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  const schemaVersion = schemaContent.title || schemaPath;

  // Generate payload hash
  const payloadHash = hashPayload(userPayload);

  // Build user message
  const userMessage =
    typeof userPayload === 'string'
      ? userPayload
      : JSON.stringify(userPayload, null, 2);

  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts <= maxRetries) {
    attempts++;

    // Build prompt with schema enforcement
    const enforcePrompt =
      attempts > 1
        ? '\n\nCRITICAL: Your previous response failed schema validation. Ensure your response is valid JSON matching the exact schema structure. No extra fields allowed.'
        : '';

    const aiParams = getAIParams('extractInsights', tier);

    const params = createResponsesParams(
      {
        model,
        input: [
          { role: 'system', content: systemPrompt + enforcePrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_output_tokens: maxOutputTokens,
      },
      aiParams
    );

    try {
      // Make API call
      const response = await openai.responses.create(params);

      // Extract output text
      const outputText = response.output_text;

      if (!outputText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON
      let parsed: T;
      try {
        parsed = JSON.parse(outputText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError}`);
      }

      // Validate against schema
      const valid = validate(parsed);

      if (!valid) {
        const errors = validate.errors
          ?.map((e) => `${e.instancePath} ${e.message}`)
          .join('; ');
        throw new Error(`Schema validation failed: ${errors}`);
      }

      // Success!
      return {
        output: parsed,
        payloadHash,
        model,
        schemaVersion,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[runStructured] Attempt ${attempts} failed: ${lastError.message}`
      );

      if (attempts > maxRetries) {
        break;
      }
    }
  }

  throw new Error(
    `runStructured failed after ${attempts} attempts: ${lastError?.message}`
  );
}
