/**
 * Note AI Service — Refines raw brain-dump content into a structured idea.
 *
 * Uses Claude Haiku to extract a title, description, and tags from
 * free-form note content.
 */

import { noteRefinementSchema, extractedIdeasArraySchema } from '@forge/shared';
import type { NoteRefinement, ExtractedIdea } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const REFINEMENT_SYSTEM_PROMPT = `You are an AI assistant that helps people refine raw notes into clear, structured summaries. You may also receive images (screenshots, whiteboards, sketches). Incorporate visual context into your analysis.

First, determine what type of content the notes represent. Common types include:
- Business idea or product concept
- Bug report or technical issue
- Feature request or improvement
- Personal reflection or journal entry
- Meeting notes or action items
- Research notes or learning
- Project planning or brainstorm
- General thought or observation

Then refine the notes in a way that matches their actual intent — do NOT force every note into a business idea format.

Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no commentary:

{
  "title": "A concise, descriptive title that captures the essence of the note (max 200 chars)",
  "description": "A clear 1-3 sentence summary that preserves the original intent and key details (max 2000 chars)",
  "tags": ["tag1", "tag2", "tag3"]
}

Rules:
- title: Concise and specific. Capture what the note is actually about — not what it could become.
- description: Summarize the core content faithfully. For bug reports, describe the issue and context. For ideas, describe the concept. For reflections, distill the insight. Match the tone and purpose of the original.
- tags: 1-10 lowercase tags describing the topic, domain, or category. Each tag max 50 chars.
- Every field is REQUIRED.
- Preserve the author's intent. If they wrote down bugs, refine it as bugs. If they wrote a business idea, refine it as a business idea. Do not invent intent that isn't there.`;

/**
 * Calls Haiku to refine raw note content into a structured NoteRefinement.
 * When imageUrls are provided, sends them as vision content blocks for multimodal analysis.
 * Throws on API failure or invalid response.
 */
export async function refineNote(
  content: string,
  metadata?: { purpose?: string; labels?: string[] },
  imageUrls?: string[],
): Promise<NoteRefinement> {
  const client = getAnthropicClient();

  const contextLine = metadata
    ? `\nContext: Purpose=${metadata.purpose || 'idea'}${metadata.labels?.length ? `, Labels=[${metadata.labels.join(', ')}]` : ''}\n`
    : '';

  // Build user message: multimodal content blocks when images are present, plain string otherwise
  let userContent: string | Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }>;

  if (imageUrls && imageUrls.length > 0) {
    const contentBlocks: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }> = [];

    // Add images first so the model sees them before the text prompt
    for (const url of imageUrls) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'url', url },
      });
    }

    // Add text content
    contentBlocks.push({
      type: 'text',
      text: `Refine these raw notes into a clear, structured summary:\n\n---\n${contextLine}\n${content}`,
    });

    userContent = contentBlocks;
  } else {
    userContent = `Refine these raw notes into a clear, structured summary:\n\n---\n${contextLine}\n${content}`;
  }

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 1000,
    temperature: 0,
    system: REFINEMENT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userContent,
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

const EXTRACTION_SYSTEM_PROMPT = `You are an AI assistant that helps entrepreneurs extract multiple business ideas from raw notes. Given a user's brain dump, identify ALL distinct business ideas mentioned or implied.

Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no commentary:

{
  "ideas": [
    {
      "title": "Concise, compelling title for the business idea (max 200 chars)",
      "description": "Clear 1-3 sentence description of the problem, target customer, and solution (max 2000 chars)",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Rules:
- Extract every distinct idea — even tangential ones. Minimum 1, maximum 10.
- Each idea should stand on its own as a potential business concept.
- title: Specific, not generic. Capture the essence of each unique idea.
- description: Explain the problem being solved, the target customer, and the core solution.
- tags: 1-10 lowercase tags per idea describing the domain, market, or technology. Each tag max 50 chars.
- If the notes contain only one clear idea, return an array with one element.
- If notes are vague, identify the strongest signals and extract what you can.`;

/**
 * Calls Haiku to extract multiple business ideas from raw note content.
 * Throws on API failure or invalid response.
 */
export async function extractIdeasFromNote(content: string): Promise<ExtractedIdea[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4000,
    temperature: 0,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract all business ideas from these raw notes:\n\n---\n\n${content}`,
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

  // Extract the ideas array from the wrapper object
  const ideasArray = (parsed as any)?.ideas ?? parsed;

  // Validate with Zod schema
  const result = extractedIdeasArraySchema.safeParse(ideasArray);
  if (!result.success) {
    console.error('[NoteAI] Extraction validation failed:', result.error.issues.slice(0, 3));
    throw new Error('Extraction response failed validation');
  }

  console.log('[NoteAI] Extraction successful:', result.data.length, 'ideas');
  return result.data;
}
