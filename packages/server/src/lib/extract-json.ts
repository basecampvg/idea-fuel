/**
 * JSON Extraction Utility
 *
 * When Perplexity sonar-deep-research returns prose/markdown instead of JSON,
 * this utility re-processes the content through Anthropic Haiku to extract
 * structured JSON matching the expected schema.
 */

import { getAnthropicProvider } from '../providers/anthropic';

/**
 * Attempts to extract JSON from prose/markdown content using a fast LLM.
 * Used as a fallback when Perplexity ignores JSON formatting instructions.
 *
 * @param rawContent The prose/markdown content from Perplexity
 * @param jsonSchema A string showing the expected JSON structure
 * @param context Label for logging (e.g., "Spark:Demand")
 * @returns Parsed object or null if extraction fails
 */
export async function extractJsonFromProse<T = Record<string, unknown>>(
  rawContent: string,
  jsonSchema: string,
  context: string
): Promise<T | null> {
  if (!rawContent || rawContent.trim().length < 50) {
    return null;
  }

  console.log(`[${context}] Attempting LLM JSON extraction from prose (${rawContent.length} chars)...`);

  try {
    const anthropic = getAnthropicProvider();
    const result = await anthropic.generate(
      `Extract structured data from the following research content and return it as valid JSON matching this exact schema:

${jsonSchema}

RULES:
- Return ONLY valid JSON, no markdown, no commentary, no code fences
- Map the research findings to the schema fields as accurately as possible
- Use empty arrays [] for fields where no data was found
- Use 0 for numeric fields where no data was found
- Use "unknown" for string fields where no data was found
- Every URL must come directly from the source content — do NOT fabricate URLs

RESEARCH CONTENT:
${rawContent.slice(0, 12000)}`,
      { maxTokens: 8000, temperature: 0, task: 'extraction' }
    );

    // Strip any code fences the model might add anyway
    let cleaned = result;
    const fenceMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    // Find JSON boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleaned) as T;
    console.log(`[${context}] LLM JSON extraction succeeded`);
    return parsed;
  } catch (error) {
    console.error(`[${context}] LLM JSON extraction failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}
