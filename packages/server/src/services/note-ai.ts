/**
 * Note AI Service — Refines raw brain-dump content into a structured idea.
 *
 * Uses Claude Haiku to extract a title, description, and tags from
 * free-form note content.
 */

import { noteRefinementSchema } from '@forge/shared';
import type { NoteRefinement } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const REFINEMENT_SYSTEM_PROMPT = `You are an AI assistant that helps entrepreneurs refine raw notes into structured business ideas. Given a user's brain dump, extract a clear business idea.

Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no commentary:

{
  "title": "A concise, compelling title for the business idea (max 200 chars)",
  "description": "A clear 1-3 sentence description of what the business does and who it serves (max 2000 chars)",
  "tags": ["tag1", "tag2", "tag3"]
}

Rules:
- title: Concise and specific. Not generic like "Business Idea" — capture the essence.
- description: Explain the problem being solved, the target customer, and the core solution. Keep it actionable.
- tags: 1-10 lowercase tags describing the domain, market, or technology. Each tag max 50 chars.
- Every field is REQUIRED.
- If the notes are vague, do your best to identify the strongest signal and build from there.`;

/**
 * Calls Haiku to refine raw note content into a structured NoteRefinement.
 * Throws on API failure or invalid response.
 */
export async function refineNote(content: string): Promise<NoteRefinement> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1000,
    temperature: 0,
    system: REFINEMENT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Refine these raw notes into a structured business idea:\n\n---\n\n${content}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  // Parse JSON from response
  const jsonStr = block.text.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      // Try to find a JSON object in the text
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        throw new Error('No JSON found in Haiku response');
      }
    }
  }

  // Validate with Zod schema
  const result = noteRefinementSchema.safeParse(parsed);
  if (!result.success) {
    console.error('[NoteAI] Zod validation failed:', result.error.issues.slice(0, 3));
    throw new Error('Refinement response failed validation');
  }

  console.log('[NoteAI] Refinement successful:', result.data.title);
  return result.data;
}
