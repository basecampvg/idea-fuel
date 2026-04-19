import { thoughtClassificationSchema } from '@forge/shared';
import type { ThoughtClassification } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const CLASSIFY_SYSTEM_PROMPT = `You are a thought classifier for an ideation app. Classify the user's thought into exactly one category:

- problem: A pain point, frustration, or inefficiency observed or experienced.
- solution: A proposed approach, feature, or mechanism to address a problem.
- what_if: Speculative or hypothetical. Exploratory. "What if we..." thinking.
- observation: Something noticed — a trend, behavior, market signal, data point.
- question: An open question to research or think about further.

Return ONLY valid JSON: {"thoughtType": "category"}`;

export async function classifyThought(content: string): Promise<ThoughtClassification> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 50,
    temperature: 0,
    system: CLASSIFY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Thought classifier returned non-JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return thoughtClassificationSchema.parse(parsed);
}
