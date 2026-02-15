import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  AIProvider,
  AIRequestOptions,
  ResearchOptions,
  ResearchResponse,
  ProviderHealth,
  SearchProvider,
  SearchResult,
} from '../types';

/**
 * Anthropic Claude API Provider
 *
 * Implements AIProvider interface for Claude Sonnet 4.5 and Opus 4.6 models
 * https://docs.anthropic.com/en/api/getting-started
 *
 * Task-based model selection:
 * - Sonnet 4.5: Structured extraction, social proof synthesis (fast, cost-effective)
 * - Opus 4.6: Scoring, user stories, business plans, SWOT analysis (best reasoning + writing)
 */

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;
  private client: Anthropic;

  // Model selection - latest Claude models
  private readonly SONNET_MODEL = 'claude-sonnet-4-5-20250929';
  private readonly OPUS_MODEL = 'claude-opus-4-6';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    this.client = new Anthropic({
      apiKey,
      timeout: 1200000, // 20 minute timeout (Opus + large extraction prompts need >10min)
      maxRetries: 2,
    });
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
      // Simple health check with minimal token usage
      await this.client.messages.create({
        model: this.SONNET_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
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
    // If searchProvider provided, do multi-step: search → synthesize
    if (options.searchProvider) {
      return await this.researchWithSearch(prompt, options);
    }

    // Direct generation (no search)
    const result = await this.generate(prompt, options);

    return {
      content: result,
      citations: [],
      usage: {
        inputTokens: 0, // Not tracked in direct generation
        outputTokens: 0,
        totalTokens: 0,
      },
      metadata: {
        provider: 'anthropic',
        model: this.selectModel(options),
        responseId: `anthropic-${Date.now()}`,
        status: 'completed',
      },
    };
  }

  async extract<T>(prompt: string, schema: z.ZodSchema<T>, options?: AIRequestOptions): Promise<T> {
    const model = this.selectModel(options);

    const response = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens || 16000,
      temperature: options?.temperature ?? 0.2,
      messages: [{ role: 'user', content: prompt }],
      system:
        'You are a structured data extraction assistant. Output valid JSON matching the requested schema. Do not include markdown code blocks or explanations, just the raw JSON. Every field in the schema is REQUIRED - do not omit any fields.',
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Log response metadata for debugging
    console.log(`[Anthropic Extract] Model: ${model}, Stop reason: ${response.stop_reason}, Output tokens: ${response.usage.output_tokens}`);

    // Check for truncation - if stop_reason is "max_tokens", the JSON is likely incomplete
    if (response.stop_reason === 'max_tokens') {
      console.error(`[Anthropic Extract] WARNING: Response was truncated (hit max_tokens). Output tokens: ${response.usage.output_tokens}/${options?.maxTokens || 16000}`);
      console.error(`[Anthropic Extract] Response tail (last 200 chars): ${content.text.slice(-200)}`);
    }

    // Parse and validate JSON
    let rawJson: unknown;
    try {
      rawJson = this.extractJson(content.text);
    } catch (parseError) {
      console.error(`[Anthropic Extract] JSON parse failed. Response length: ${content.text.length} chars`);
      console.error(`[Anthropic Extract] Response preview (first 500 chars): ${content.text.slice(0, 500)}`);
      console.error(`[Anthropic Extract] Response tail (last 500 chars): ${content.text.slice(-500)}`);
      throw parseError;
    }

    // Use safeParse for better error reporting
    const result = schema.safeParse(rawJson);
    if (!result.success) {
      const topLevelKeys = rawJson && typeof rawJson === 'object' ? Object.keys(rawJson as object) : [];
      console.error(`[Anthropic Extract] Zod validation failed. Parsed JSON top-level keys: [${topLevelKeys.join(', ')}]`);
      console.error(`[Anthropic Extract] Zod errors:`, JSON.stringify(result.error.issues.slice(0, 5), null, 2));
      if (rawJson && typeof rawJson === 'object') {
        // Log which top-level fields are undefined/null/missing
        for (const issue of result.error.issues) {
          if (issue.path.length === 1) {
            const key = issue.path[0] as string;
            console.error(`[Anthropic Extract] Field "${key}" value: ${JSON.stringify((rawJson as Record<string, unknown>)[key])?.slice(0, 100) ?? 'MISSING'}`);
          }
        }
      }
      throw result.error;
    }

    return result.data;
  }

  async generate(prompt: string, options?: AIRequestOptions): Promise<string> {
    const model = this.selectModel(options);

    const response = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens || 16000,
      temperature: options?.temperature ?? 1.0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    return content.text;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private selectModel(options?: AIRequestOptions): string {
    // Task-based model selection: Opus for reasoning-heavy and creative tasks
    const opusTasks: AIRequestOptions['task'][] = ['generation', 'business-plan', 'swot'];
    if (options?.task && opusTasks.includes(options.task)) {
      return this.OPUS_MODEL;
    }

    // Sonnet tasks — always use Sonnet regardless of token count
    // Extraction is Sonnet's strength: fast structured JSON output, even at high token counts
    const sonnetTasks: AIRequestOptions['task'][] = ['scoring', 'extraction'];
    if (options?.task && sonnetTasks.includes(options.task)) {
      return this.SONNET_MODEL;
    }

    // Fallback: large output requests use Opus
    if (options?.maxTokens && options.maxTokens > 20000) {
      return this.OPUS_MODEL;
    }

    // Default to Sonnet (faster, cheaper, excellent for extraction)
    return this.SONNET_MODEL;
  }

  private async researchWithSearch(
    prompt: string,
    options: ResearchOptions
  ): Promise<ResearchResponse> {
    if (!options.searchProvider) {
      throw new Error('searchProvider is required for research with search');
    }

    // Step 1: Extract search queries from prompt using Claude
    const queries = await this.extractSearchQueries(prompt);

    // Step 2: Run searches
    const searchResults = await Promise.all(
      queries.map((q) => options.searchProvider!.search(q, { domains: options.domains }))
    );

    // Step 3: Synthesize results
    const context = this.formatSearchResults(searchResults.flat());
    const sources = [...new Set(searchResults.flat().map((r) => r.url))];

    const synthesisPrompt = `${prompt}\n\n# Search Results\n\n${context}\n\nSynthesize the above search results to answer the research question. Include inline citations like [1], [2].`;

    const response = await this.client.messages.create({
      model: this.OPUS_MODEL, // Use Opus for synthesis quality
      max_tokens: options.maxTokens || 50000,
      temperature: options.temperature ?? 1.0,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Extract citations (e.g., [1], [2], [3])
    const citations = [
      ...new Set((content.text.match(/\[(\d+)\]/g) || []).map((m) => m.replace(/\[|\]/g, ''))),
    ];

    return {
      content: content.text,
      citations,
      sources,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      metadata: {
        provider: 'anthropic',
        model: this.OPUS_MODEL,
        responseId: response.id,
        status: 'completed',
      },
    };
  }

  private async extractSearchQueries(prompt: string): Promise<string[]> {
    const response = await this.client.messages.create({
      model: this.SONNET_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Extract 3-5 web search queries from this research prompt:\n\n${prompt}\n\nOutput as JSON array: ["query1", "query2", ...]`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return [];
    }

    try {
      const json = this.extractJson(content.text);
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  }

  private formatSearchResults(results: SearchResult[]): string {
    return results.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}\n`).join('\n');
  }

  private extractJson(text: string): unknown {
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/) || text.match(/```\s*\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    // Try to parse the JSON directly
    try {
      return JSON.parse(jsonStr.trim());
    } catch (directError) {
      // Try to find JSON object/array in the text
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/) || jsonStr.match(/\[[\s\S]*\]/);
      if (jsonObjectMatch) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch (fallbackError) {
          // JSON was found but is malformed (likely truncated) - try to repair
          console.error(`[Anthropic extractJson] Found JSON-like content but it's malformed. Length: ${jsonObjectMatch[0].length}`);
          const repaired = this.tryRepairJson(jsonObjectMatch[0]);
          if (repaired !== null) {
            console.log(`[Anthropic extractJson] JSON repair succeeded`);
            return repaired;
          }
          throw new Error(`Failed to parse JSON from Claude response (malformed): ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }
      throw new Error(`Failed to parse JSON from Claude response (no JSON found): ${directError instanceof Error ? directError.message : 'Unknown error'}`);
    }
  }

  /**
   * Attempt to repair truncated JSON by closing open brackets/braces
   */
  private tryRepairJson(text: string): unknown | null {
    try {
      // Count open/close braces and brackets
      let braces = 0;
      let brackets = 0;
      let inString = false;
      let escaped = false;

      for (const char of text) {
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (char === '{') braces++;
        else if (char === '}') braces--;
        else if (char === '[') brackets++;
        else if (char === ']') brackets--;
      }

      // If unbalanced, try closing open structures
      if (braces > 0 || brackets > 0) {
        // Remove any trailing partial key-value pair (e.g., "key": "partial...)
        let repaired = text.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '');
        // Remove trailing comma
        repaired = repaired.replace(/,\s*$/, '');
        // Close open brackets and braces
        for (let i = 0; i < brackets; i++) repaired += ']';
        for (let i = 0; i < braces; i++) repaired += '}';
        return JSON.parse(repaired);
      }

      return null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
let _anthropicProvider: AnthropicProvider | null = null;

export function getAnthropicProvider(): AnthropicProvider {
  if (!_anthropicProvider) {
    _anthropicProvider = new AnthropicProvider();
  }
  return _anthropicProvider;
}

// Default export for easy import
export const anthropic = new Proxy({} as AnthropicProvider, {
  get(_target, prop) {
    return (getAnthropicProvider() as any)[prop];
  },
});
