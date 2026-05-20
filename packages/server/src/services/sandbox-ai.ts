/**
 * Sandbox AI Service — AI actions that operate on collections of notes.
 *
 * Each function takes concatenated note content and returns structured output.
 * Uses Claude Haiku for speed and cost.
 */

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

const dimensionCoverageSchema = z.object({
  problem: z.boolean(),
  audience: z.boolean(),
  solution: z.boolean(),
  angle: z.boolean(),
  pricing: z.boolean(),
});

const summarySchema = z.object({
  summary: z.string().min(1),
  dimensionCoverage: dimensionCoverageSchema,
});

export type DimensionCoverage = z.infer<typeof dimensionCoverageSchema>;

export type SummarizeSandboxResult = {
  summary: string;
  dimensionCoverage: DimensionCoverage;
};

export async function summarizeSandbox(noteContents: string[]): Promise<SummarizeSandboxResult> {
  const result = await callHaikuJson(
    `You synthesize collections of notes into coherent summaries for entrepreneurs. Distill the key themes, decisions, and insights across all notes into a 2-3 paragraph summary. Write in second person ("You've been thinking about...").

You also assess which of the five business dimensions the notes cover. For each dimension, set true if any note speaks to it, false otherwise:
- problem: a real pain or unmet need
- audience: a specific target user/customer segment
- solution: a proposed product, service, or approach
- angle: a unique insight, edge, or differentiator
- pricing: business model, price point, or monetization

Return JSON: { "summary": "...", "dimensionCoverage": { "problem": bool, "audience": bool, "solution": bool, "angle": bool, "pricing": bool } }`,
    `Summarize these notes:\n\n${formatNotesForAi(noteContents)}`,
    summarySchema,
  );
  return result;
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
// Synthesize Idea (cluster crystallization)
// ---------------------------------------------------------------------------

const crystallizedFieldsSchema = z.object({
  title: z.string().min(1),
  problemStatement: z.string().min(1),
  targetAudience: z.string().min(1),
  proposedSolution: z.string().min(1),
  uniqueAngle: z.string().min(1),
  pricingHypothesis: z.string().min(1),
});

export type CrystallizedFields = z.infer<typeof crystallizedFieldsSchema>;

export async function synthesizeIdea(contents: string[]): Promise<CrystallizedFields> {
  return callHaikuJson(
    `You are a startup strategist. Given raw thought fragments, extract a structured idea.
Return JSON with exactly these fields:
- title: short name for this idea (3-7 words, no punctuation)
- problemStatement: the core problem being solved (1-2 sentences)
- targetAudience: who specifically experiences this problem (1 sentence)
- proposedSolution: how the idea solves it (1-2 sentences)
- uniqueAngle: what makes this different from existing solutions (1 sentence). If unclear, write "Not yet differentiated."
- pricingHypothesis: business model hypothesis (1 sentence). If unclear, write "Not yet defined."
Output strictly the JSON object, no markdown.`,
    `Synthesize a business idea from these thought fragments:\n\n${formatNotesForAi(contents)}`,
    crystallizedFieldsSchema,
    1500,
  );
}

// ---------------------------------------------------------------------------
// Identify Gaps
// ---------------------------------------------------------------------------

const gapsSchema = z.object({
  gaps: z.array(z.string().min(1)).min(1).max(10),
});

export type GapStage = 'early' | 'forming' | 'ready';

const STAGE_GUIDANCE: Record<GapStage, string> = {
  early: `STAGE: divergent — the user is still opening up the idea space.
Surface 2-3 OPEN-ENDED THREADS to pull next. Texture > rigor.
- Focus on: who the user is picturing, what the moment of friction actually looks like, how people handle this today, what would surprise the user about their own thinking.
- Avoid: monetization, competitive positioning, validation methodology, compliance, market sizing, regulatory questions. None of that helps an idea that hasn't found its shape yet.
- Voice: curious friend at the bar, not a VC associate.`,
  forming: `STAGE: sharpening — the user has a recognizable idea. Help them deepen the parts that are still vague.
Surface 3-4 nudges to make the picture more specific.
- Focus on: which slice of users feels this most acutely, what behavior change they're betting on, what a "yes" or "no" from a real user would look like, which assumption is loadest-bearing.
- Voice: thoughtful collaborator, not an examiner.`,
  ready: `STAGE: convergent — the user is close to a defensible bet. Now you can press a little harder.
Surface 3-5 places where the idea would meet reality and could fall apart.
- Focus on: which assumption breaks the whole thing if wrong, what specific real-world test would falsify it, where two notes in the cluster might quietly disagree about who this is for.
- Voice: trusted advisor before a board meeting — direct but not adversarial.`,
};

export async function identifyGaps(
  noteContents: string[],
  opts: { stage: GapStage } = { stage: 'early' },
): Promise<string[]> {
  const systemPrompt = `You help an entrepreneur explore an emerging idea more deeply. You're not auditing for completeness; you're nudging them toward threads worth pulling on next.

${STAGE_GUIDANCE[opts.stage]}

RULES that apply at every stage:
- Each "gap" is a discovery nudge phrased so it invites curiosity, not a checklist item phrased as a deficiency.
- Phrase as a question or a soft observation ("It might be worth picturing the first time a coach actually opens this on the sideline — what are they doing in that moment?"). Avoid "No mention of X" or "Missing Y" framings.
- Ground each nudge in something the cluster's notes actually said. Reference a specific detail when you can.
- Do NOT prescribe research methodology, validation steps, or business-plan deliverables. The user already has those tools elsewhere; this view is for thinking, not pitching.
- Keep each gap to one or two sentences. No bullet points inside a gap. No section headers.

Return JSON: { "gaps": ["nudge 1", "nudge 2", ...] }`;

  const result = await callHaikuJson(
    systemPrompt,
    `These notes belong to one cluster the entrepreneur is building. Surface the discovery nudges:\n\n${formatNotesForAi(noteContents)}`,
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
