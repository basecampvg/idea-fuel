/**
 * Sandbox AI Service — AI actions that operate on collections of notes.
 *
 * Each function takes concatenated note content and returns structured output.
 * Uses Claude Haiku for speed and cost.
 */

import { noteRefinementSchema } from '@forge/shared';
import type { NoteRefinement } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';
import { z } from 'zod';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/** Shared helper: call Haiku with system + user message, parse JSON response. */
async function callHaikuJson<T>(
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodType<T>,
  maxTokens: number = 2000,
): Promise<T> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: maxTokens,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  const jsonStr = block.text.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        throw new Error('No JSON found in Haiku response');
      }
    }
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error('[SandboxAI] Validation failed:', result.error.issues.slice(0, 3));
    throw new Error('AI response failed validation');
  }

  return result.data;
}

/** Shared helper: call Haiku and return raw text (for markdown/prose outputs). */
async function callHaikuText(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4000,
): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: maxTokens,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  return block.text.trim();
}

/** Format note content for AI input. */
function formatNotesForAi(noteContents: string[]): string {
  return noteContents
    .map((content, i) => `--- Note ${i + 1} ---\n${content}`)
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Summarize
// ---------------------------------------------------------------------------

const summarySchema = z.object({
  summary: z.string().min(1),
});

export async function summarizeSandbox(noteContents: string[]): Promise<string> {
  const result = await callHaikuJson(
    `You synthesize collections of notes into coherent summaries for entrepreneurs. Distill the key themes, decisions, and insights across all notes into a 2-3 paragraph summary. Write in second person ("You've been thinking about..."). Return JSON: { "summary": "..." }`,
    `Summarize these notes:\n\n${formatNotesForAi(noteContents)}`,
    summarySchema,
  );
  return result.summary;
}

// ---------------------------------------------------------------------------
// Extract Todos
// ---------------------------------------------------------------------------

const todosSchema = z.object({
  todos: z.array(z.string().min(1)).min(1).max(20),
});

export async function extractTodosFromSandbox(noteContents: string[]): Promise<string[]> {
  const result = await callHaikuJson(
    `You extract action items from collections of entrepreneur notes. Find every explicit and implied task, commitment, or next step across all notes. Return actionable, specific items — not vague intentions. Return JSON: { "todos": ["action item 1", "action item 2", ...] }. Maximum 20 items.`,
    `Extract all action items from these notes:\n\n${formatNotesForAi(noteContents)}`,
    todosSchema,
  );
  return result.todos;
}

// ---------------------------------------------------------------------------
// Promote to Idea
// ---------------------------------------------------------------------------

export async function synthesizeIdea(noteContents: string[]): Promise<NoteRefinement> {
  return callHaikuJson(
    `You synthesize collections of entrepreneur notes into a single, focused business idea. Across all the notes, identify the strongest business concept and distill it into a structured idea. Return ONLY valid JSON:
{
  "title": "Concise, compelling title (max 200 chars)",
  "description": "Clear 1-3 sentence description of the problem, customer, and solution (max 2000 chars)",
  "tags": ["tag1", "tag2", "tag3"]
}
Rules:
- title: Specific, not generic. Capture the essence of the strongest idea across all notes.
- description: Problem, target customer, core solution.
- tags: 1-10 lowercase tags. Each max 50 chars.`,
    `Synthesize a business idea from these notes:\n\n${formatNotesForAi(noteContents)}`,
    noteRefinementSchema,
    1000,
  );
}

// ---------------------------------------------------------------------------
// Identify Gaps
// ---------------------------------------------------------------------------

const gapsSchema = z.object({
  gaps: z.array(z.string().min(1)).min(1).max(10),
});

export async function identifyGaps(noteContents: string[]): Promise<string[]> {
  const result = await callHaikuJson(
    `You analyze collections of entrepreneur notes for completeness. Identify what's MISSING from their thinking — topics they haven't addressed, questions they haven't asked, assumptions they haven't validated. Be specific and actionable. Return JSON: { "gaps": ["gap 1", "gap 2", ...] }. Return 3-5 gaps.`,
    `Identify gaps in the thinking across these notes:\n\n${formatNotesForAi(noteContents)}`,
    gapsSchema,
  );
  return result.gaps;
}

// ---------------------------------------------------------------------------
// Generate Brief
// ---------------------------------------------------------------------------

export async function generateBrief(noteContents: string[]): Promise<string> {
  return callHaikuText(
    `You turn messy entrepreneur notes into structured documents. Given a collection of notes, produce a clean, well-organized brief with clear sections, headers, and coherent prose. The brief should be something the user could share with a cofounder or advisor. Use markdown formatting. Be concise but complete.`,
    `Turn these notes into a structured brief:\n\n${formatNotesForAi(noteContents)}`,
    4000,
  );
}

// ---------------------------------------------------------------------------
// Find Contradictions
// ---------------------------------------------------------------------------

const contradictionsSchema = z.object({
  contradictions: z.array(z.string().min(1)).min(0).max(10),
});

export async function findContradictions(noteContents: string[]): Promise<string[]> {
  const result = await callHaikuJson(
    `You analyze collections of entrepreneur notes for internal contradictions and tensions. Find places where the user's thinking conflicts with itself — different notes that say opposite things, evolving positions that haven't been reconciled, or assumptions that contradict each other. Reference which notes the contradiction appears in (e.g., "In Note 2 you said X, but in Note 5 you lean toward Y"). If there are no contradictions, return an empty array. Return JSON: { "contradictions": ["contradiction 1", ...] }`,
    `Find contradictions across these notes:\n\n${formatNotesForAi(noteContents)}`,
    contradictionsSchema,
  );
  return result.contradictions;
}
