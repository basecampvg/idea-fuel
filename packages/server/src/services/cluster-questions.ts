/**
 * Cluster Questions Service
 *
 * Generates "questions to grow this cluster" — short, sharp questions the
 * user can answer (by capturing a new thought) to push a thought-cluster
 * toward a real idea.
 *
 * Voice and structure are grounded in:
 *   - The Mom Test (Fitzpatrick): ask about past behavior + specifics, never
 *     hypotheticals; never lead the witness; never pitch.
 *   - Jobs to be Done (Christensen): what job were they hiring something to
 *     do; what context, struggles, outcomes.
 *   - Customer Development (Blank): get out of the building; concrete users,
 *     concrete pain.
 *   - "How to Get Startup Ideas" (Graham): organic problems; founders should
 *     be a target user themselves; live in the future.
 *   - "How Might We" (IDEO): convert problems into open invitations.
 *   - 5 Whys + SCAMPER: peel layers, transform constraints.
 *   - Eames constraint-finding, Pixar Braintrust, Wallas, Guilford
 *     (divergent → convergent thinking by stage).
 *
 * Questions are tiered by stage:
 *   - early   (1-4 thoughts): divergent — open the space.
 *   - forming (5-11 thoughts): sharpen the cluster's weak dimensions.
 *   - ready   (readiness >= 0.7): convergent — pressure-test, name the bet,
 *     resolve tensions, define what "validated" looks like.
 *
 * Pipeline: a single Haiku generation call returns 4-6 questions, then a
 * single batched Haiku validator pass replaces leading/hypothetical/closed
 * questions with rewrites. Cost ≈ 2 Haiku calls per generation (~$0.002).
 */

import { z } from 'zod';
import { getAnthropicClient } from '../lib/anthropic';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type QuestionSource =
  | 'gap_problem'
  | 'gap_audience'
  | 'gap_solution'
  | 'gap_angle'
  | 'gap_pricing'
  | 'depth_problem'
  | 'depth_audience'
  | 'depth_solution'
  | 'depth_angle'
  | 'depth_pricing'
  | 'tension_resolution'
  | 'constraint';

export type GeneratedQuestion = {
  id: string;
  text: string;
  source: QuestionSource;
  generatedAt: string; // ISO
};

export type Stage = 'early' | 'forming' | 'ready';

export type DimensionCoverageInput = {
  problem: boolean;
  audience: boolean;
  solution: boolean;
  angle: boolean;
  pricing: boolean;
};

export type QuestionsContext = {
  thoughts: { content: string; thoughtType: string | null }[];
  dimensionCoverage: DimensionCoverageInput | null;
  unresolvedTensions: string[];
  stage: Stage;
};

// ---------------------------------------------------------------------------
// Stage detection
// ---------------------------------------------------------------------------

/**
 * Pick the cluster stage from thought count + readiness.
 *
 * - readiness >= 0.7  -> 'ready'    (convergent: pressure-test the bet)
 * - thoughtCount >= 5 -> 'forming'  (sharpen weak dimensions)
 * - else              -> 'early'    (divergent: open the space)
 *
 * `readinessScore` may be null on older clusters; we treat null as
 * "no signal" and fall back to thoughtCount alone.
 */
export function detectStage(inputs: {
  thoughtCount: number;
  readinessScore: number | null;
}): Stage {
  const readiness = inputs.readinessScore ?? 0;
  if (readiness >= 0.7) return 'ready';
  if (inputs.thoughtCount >= 5) return 'forming';
  return 'early';
}

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

const QUESTION_SOURCES: QuestionSource[] = [
  'gap_problem',
  'gap_audience',
  'gap_solution',
  'gap_angle',
  'gap_pricing',
  'depth_problem',
  'depth_audience',
  'depth_solution',
  'depth_angle',
  'depth_pricing',
  'tension_resolution',
  'constraint',
];

const generatedSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(3).max(280),
        source: z.enum(QUESTION_SOURCES as [QuestionSource, ...QuestionSource[]]),
      }),
    )
    .min(1)
    .max(8),
});

const validatorSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      verdict: z.enum(['pass', 'rewrite', 'drop']),
      rewrite: z.string().max(280).optional(),
    }),
  ),
});

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  early:
    "EARLY (just a few thoughts). The user is still exploring. Favor DIVERGENT, open questions that surface concrete past experiences and specific people. Goal: widen the space, not narrow it.",
  forming:
    "FORMING (5+ thoughts, taking shape). The user has signal but ambiguity. Favor questions that SHARPEN the weakest dimension(s). Goal: turn vague generalities into concrete claims about specific people, problems, and contexts.",
  ready:
    "READY (high readiness). The user has a real candidate idea. Favor CONVERGENT questions that pressure-test the bet, name the riskiest assumption, define what 'validated' would look like, and resolve open tensions. Goal: surface the falsifiable claim.",
};

const DIMENSION_GUIDANCE: Record<keyof DimensionCoverageInput, string> = {
  problem:
    "PROBLEM uncovered: ask about a real pain a real person has lived through. 'Tell me about the last time...' style.",
  audience:
    "AUDIENCE uncovered: ask who specifically (one person they could name), what their day looks like, where they hang out.",
  solution:
    "SOLUTION uncovered: ask what people already do today (workarounds, hacks, alternatives). What did they hire for this job?",
  angle:
    "ANGLE uncovered: ask what they uniquely see, hear, or know that others don't. What's the unfair edge?",
  pricing:
    "PRICING uncovered: ask what people already pay for adjacent solutions, or what they'd give up to make this go away.",
};

function formatThoughts(
  thoughts: { content: string; thoughtType: string | null }[],
): string {
  // Truncate to ~2000 tokens (~8000 chars). Drop low-signal entries first
  // by keeping order but capping total length.
  const budget = 8000;
  const blocks: string[] = [];
  let used = 0;
  for (let i = 0; i < thoughts.length; i++) {
    const t = thoughts[i];
    if (!t.content || t.content.trim().length === 0) continue;
    const typeTag = t.thoughtType ? ` [${t.thoughtType}]` : '';
    const block = `--- Thought ${i + 1}${typeTag} ---\n${t.content}`;
    if (used + block.length > budget) {
      blocks.push(`--- (${thoughts.length - i} more thoughts truncated) ---`);
      break;
    }
    blocks.push(block);
    used += block.length;
  }
  return blocks.join('\n\n');
}

function buildSystemPrompt(stage: Stage): string {
  return [
    "You are a question designer for a thought-cluster on the way to becoming a real business idea.",
    "Your craft is grounded in: The Mom Test (Rob Fitzpatrick), Jobs to Be Done (Christensen), Customer Development (Steve Blank), 'How to Get Startup Ideas' (Paul Graham), IDEO's How Might We, 5 Whys, SCAMPER, Eames constraint-finding, Pixar's Braintrust, Wallas (creativity stages), and Guilford (divergent vs convergent thinking).",
    "",
    "Heuristic for a GOOD question:",
    "  - Concrete > hypothetical (ask about something that has actually happened)",
    "  - Past-tense > future-tense (real memory beats imagined behavior)",
    "  - Open > closed (no yes/no questions)",
    "  - Non-leading (don't pitch the user's own idea back at them)",
    "  - Answerable from lived experience (the user can write a short reply from memory)",
    "  - Short (one question per item, not a multi-parter)",
    "",
    "Stage guidance:",
    `  - ${STAGE_DESCRIPTIONS[stage]}`,
    "",
    "Source taxonomy (pick the most accurate one for each question):",
    "  gap_problem | gap_audience | gap_solution | gap_angle | gap_pricing — fills an UNCOVERED dimension",
    "  depth_problem | depth_audience | depth_solution | depth_angle | depth_pricing — sharpens an already-touched dimension",
    "  tension_resolution — pushes the user to reconcile a contradiction in their thinking",
    "  constraint — applies an Eames-style limit (time, money, audience size, channel) to surface a sharper edge",
    "",
    "Output STRICT JSON: { \"questions\": [ { \"text\": \"...\", \"source\": \"...\" }, ... ] }. 4 to 6 items. No prose, no markdown fence.",
  ].join('\n');
}

function buildUserMessage(ctx: QuestionsContext): string {
  const parts: string[] = [];
  parts.push(`STAGE: ${ctx.stage}`);

  if (ctx.dimensionCoverage) {
    const cov = ctx.dimensionCoverage;
    const uncovered: string[] = [];
    const covered: string[] = [];
    (Object.keys(cov) as (keyof DimensionCoverageInput)[]).forEach((k) => {
      (cov[k] ? covered : uncovered).push(k);
    });
    parts.push(`DIMENSIONS COVERED: ${covered.join(', ') || '(none)'}`);
    parts.push(`DIMENSIONS UNCOVERED: ${uncovered.join(', ') || '(none)'}`);
    if (uncovered.length > 0) {
      parts.push("Focus first on uncovered dimensions:");
      uncovered.forEach((dim) => {
        parts.push(`  - ${DIMENSION_GUIDANCE[dim as keyof DimensionCoverageInput]}`);
      });
    }
  } else {
    parts.push("DIMENSION COVERAGE: unknown");
  }

  const tensions = ctx.unresolvedTensions.slice(0, 3);
  if (tensions.length > 0) {
    parts.push("UNRESOLVED TENSIONS (consider tension_resolution questions):");
    tensions.forEach((t, i) => parts.push(`  ${i + 1}. ${t}`));
  }

  parts.push("");
  parts.push("THOUGHTS IN THIS CLUSTER:");
  parts.push(formatThoughts(ctx.thoughts));
  parts.push("");
  parts.push(
    "Return 4-6 questions that, if answered, would meaningfully advance this cluster toward a sharp, falsifiable idea. JSON only.",
  );

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Validator (single batched Haiku call)
// ---------------------------------------------------------------------------

const VALIDATOR_SYSTEM = [
  "You are a quality gate for entrepreneur-research questions.",
  "For each candidate question, judge whether it is:",
  "  (a) about past behavior or specifics (not pure hypothetical)",
  "  (b) open-ended (not yes/no)",
  "  (c) non-leading (does not pitch a solution at the user)",
  "  (d) answerable from lived experience",
  "  (e) a single question (not stacked)",
  "",
  "Verdicts:",
  "  - 'pass'    : the question is fine as-is",
  "  - 'rewrite' : keep the intent, but fix the form. Provide the rewritten text under 'rewrite'.",
  "  - 'drop'    : irreparable (e.g., asks the user to predict a market). Use sparingly.",
  "",
  "Output STRICT JSON: { \"results\": [ { \"index\": 0, \"verdict\": \"pass\" }, { \"index\": 1, \"verdict\": \"rewrite\", \"rewrite\": \"...\" }, ... ] }",
  "Return one entry per input question, in input order. No prose, no markdown fence.",
].join('\n');

function buildValidatorMessage(candidates: { text: string }[]): string {
  const lines = ["Candidate questions:"];
  candidates.forEach((c, i) => {
    lines.push(`${i}. ${c.text}`);
  });
  lines.push("");
  lines.push("Return your JSON verdicts now.");
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON parsing helper (mirrors sandbox-ai.ts)
// ---------------------------------------------------------------------------

function parseJsonResponse<T>(raw: string, schema: z.ZodType<T>): T {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenced) {
      parsed = JSON.parse(fenced[1].trim());
    } else {
      const obj = trimmed.match(/\{[\s\S]*\}/);
      if (!obj) throw new Error('No JSON found in Haiku response');
      parsed = JSON.parse(obj[0]);
    }
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error('[ClusterQuestions] Validation failed:', result.error.issues.slice(0, 3));
    throw new Error('AI response failed validation');
  }
  return result.data;
}

async function callHaiku(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }
  return block.text;
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Generate 4-6 questions for a cluster, with a self-check pass.
 * Returns at least one question; throws only on hard parse/transport failures.
 */
export async function generateClusterQuestions(
  ctx: QuestionsContext,
): Promise<GeneratedQuestion[]> {
  // Pass 1: generation
  const genRaw = await callHaiku(buildSystemPrompt(ctx.stage), buildUserMessage(ctx), 1500);
  const generated = parseJsonResponse(genRaw, generatedSchema);

  const candidates = generated.questions.slice(0, 6);
  if (candidates.length === 0) return [];

  // Pass 2: validator (single batch call)
  let validated: { text: string; source: QuestionSource }[] = [];
  try {
    const valRaw = await callHaiku(
      VALIDATOR_SYSTEM,
      buildValidatorMessage(candidates),
      900,
    );
    const verdicts = parseJsonResponse(valRaw, validatorSchema);
    const verdictByIndex = new Map(verdicts.results.map((r) => [r.index, r]));
    candidates.forEach((c, i) => {
      const v = verdictByIndex.get(i);
      if (!v || v.verdict === 'pass') {
        validated.push(c);
      } else if (v.verdict === 'rewrite' && v.rewrite && v.rewrite.trim().length > 0) {
        validated.push({ text: v.rewrite.trim(), source: c.source });
      }
      // 'drop' -> omit
    });
  } catch (err) {
    console.warn(
      '[ClusterQuestions] Validator pass failed, falling back to raw generation:',
      err instanceof Error ? err.message : err,
    );
    validated = candidates;
  }

  if (validated.length === 0) {
    // Validator dropped everything — better to surface the raw generation than nothing.
    validated = candidates;
  }

  const now = new Date().toISOString();
  return validated.slice(0, 6).map((q) => ({
    id: crypto.randomUUID(),
    text: q.text,
    source: q.source,
    generatedAt: now,
  }));
}
