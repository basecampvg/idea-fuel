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
  return thoughtClassificationSchema.parse(parseHaikuJson(text));
}

// Haiku occasionally wraps JSON in ```json fences or trailing prose despite the
// system prompt; mirrors the tolerance pattern used in note-ai.ts.
function parseHaikuJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenced) return JSON.parse(fenced[1].trim());
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) return JSON.parse(obj[0]);
    throw new Error(`Thought classifier returned non-JSON: ${text.slice(0, 200)}`);
  }
}
