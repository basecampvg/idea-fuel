/**
 * Customer Interview AI Service — Question Generation & Response Synthesis
 *
 * Uses Claude Haiku to:
 * 1. Generate 8-12 customer discovery questions tailored to a project
 * 2. Synthesize interview responses into structured insights
 */

import { z } from 'zod';
import { interviewQuestionSchema } from '@forge/shared';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// =============================================================================
// Interfaces
// =============================================================================

export interface QuestionGenerationContext {
  projectTitle: string;
  projectDescription: string;
  cardResult?: unknown;
  interviewData?: unknown;
  interviewMessages?: unknown;
  synthesizedInsights?: unknown;
  painPoints?: unknown;
  positioning?: unknown;
}

export interface SynthesisContext {
  projectTitle: string;
  projectDescription: string;
  questions: InterviewQuestion[];
  responses: Array<{
    answers: InterviewAnswer[];
    respondentName?: string | null;
  }>;
  researchData?: {
    synthesizedInsights?: unknown;
    painPoints?: unknown;
    competitors?: unknown;
    positioning?: unknown;
  };
}

// =============================================================================
// Validation Schemas
// =============================================================================

const generatedQuestionsSchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(interviewQuestionSchema).min(8).max(12),
});

const synthesisResultSchema = z.object({
  responseOverview: z.string(),
  painValidation: z.string(),
  severityAndFrequency: z.string(),
  workaroundAnalysis: z.string(),
  willingnessToPay: z.string(),
  keyQuotes: z.string(),
  researchDelta: z.string(),
  confidenceUpdate: z.string(),
  recommendedNextSteps: z.string(),
});

export type CustomerDiscoverySynthesis = z.infer<typeof synthesisResultSchema>;

// =============================================================================
// Prompts
// =============================================================================

const QUESTION_GENERATION_SYSTEM_PROMPT = `You are an expert customer discovery interviewer helping entrepreneurs validate business ideas. Your goal is to design interview questions that surface real pain, willingness to act, and market opportunity.

Generate 8-12 customer discovery questions following this flow:
1. Context — Understand the respondent's background and current situation
2. Problem exploration — Dig into the specific problem the product addresses
3. Current workarounds — How do they solve this problem today?
4. Pain severity — How much does this problem affect them?
5. Willingness to act — Would they change their behavior or pay for a solution?
6. Commitment — Would they participate further (beta, purchase, referral)?

Use a mix of question types: FREE_TEXT for open-ended exploration, SCALE (1-10) for severity/likelihood ratings, MULTIPLE_CHOICE for categorical answers, and YES_NO for commitment checks.

Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no commentary:

{
  "title": "A concise interview title (max 200 chars)",
  "questions": [
    {
      "id": "q1",
      "text": "Question text",
      "type": "FREE_TEXT",
      "required": true
    },
    {
      "id": "q2",
      "text": "On a scale of 1-10, how severe is this problem?",
      "type": "SCALE",
      "required": true
    },
    {
      "id": "q3",
      "text": "Which best describes your current approach?",
      "type": "MULTIPLE_CHOICE",
      "required": true,
      "options": ["Option A", "Option B", "Option C"]
    },
    {
      "id": "q4",
      "text": "Would you join a waitlist for early access?",
      "type": "YES_NO",
      "required": true
    }
  ]
}

Rules:
- Use sequential IDs: q1, q2, q3, etc.
- MULTIPLE_CHOICE questions MUST have an "options" array with 2-10 items
- SCALE, FREE_TEXT, and YES_NO questions must NOT include "options"
- All fields are required per question (id, text, type, required)
- Questions should be specific to the product context provided`;

const SYNTHESIS_SYSTEM_PROMPT = `You are an expert customer discovery analyst. You will receive interview questions and responses from multiple respondents, then synthesize them into structured insights.

Analyze all responses holistically and return insights as a JSON object with these exact 9 sections (all as markdown strings):

{
  "responseOverview": "Summary of respondent demographics, volume, and response quality",
  "painValidation": "Assessment of whether the target pain is validated, partially validated, or invalidated by responses",
  "severityAndFrequency": "How severe and frequent is the pain based on scale scores and qualitative answers",
  "workaroundAnalysis": "Current solutions respondents use and how painful/expensive those workarounds are",
  "willingnessToPay": "Evidence of willingness to pay or switch, including any pricing signals",
  "keyQuotes": "3-5 direct quotes (with respondent label if named) that best illustrate the core findings",
  "researchDelta": "How these responses confirm or contradict prior research/assumptions",
  "confidenceUpdate": "Updated confidence level in the business idea (High/Medium/Low) with reasoning",
  "recommendedNextSteps": "2-4 specific, actionable next steps based on the interview findings"
}

Return ONLY valid JSON — no markdown, no code fences, no commentary. Each value should be formatted as markdown text (use **bold**, bullet points, etc. as appropriate for readability).`;

// =============================================================================
// Helpers
// =============================================================================

function parseJsonFromResponse(text: string): unknown {
  const jsonStr = text.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }

    // Try to find a JSON object in the text
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }

    throw new Error('No JSON found in Haiku response');
  }
}

function buildContextSummary(context: QuestionGenerationContext): string {
  const parts: string[] = [
    `Project: ${context.projectTitle}`,
    `Description: ${context.projectDescription}`,
  ];

  if (context.synthesizedInsights) {
    parts.push(`Research insights: ${JSON.stringify(context.synthesizedInsights)}`);
  }
  if (context.painPoints) {
    parts.push(`Known pain points: ${JSON.stringify(context.painPoints)}`);
  }
  if (context.positioning) {
    parts.push(`Positioning: ${JSON.stringify(context.positioning)}`);
  }
  if (context.cardResult) {
    parts.push(`Validation card result: ${JSON.stringify(context.cardResult)}`);
  }
  if (context.interviewData) {
    parts.push(`Prior interview data: ${JSON.stringify(context.interviewData)}`);
  }
  if (context.interviewMessages) {
    parts.push(`Interview messages: ${JSON.stringify(context.interviewMessages)}`);
  }

  return parts.join('\n\n');
}

// =============================================================================
// Exported Functions
// =============================================================================

/**
 * Calls Claude Haiku to generate 8-12 customer discovery questions
 * tailored to the project context.
 */
export async function generateInterviewQuestions(
  context: QuestionGenerationContext
): Promise<{ title: string; questions: InterviewQuestion[] }> {
  const client = getAnthropicClient();

  const contextSummary = buildContextSummary(context);

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4000,
    temperature: 0,
    system: QUESTION_GENERATION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate customer discovery interview questions for this business:\n\n---\n\n${contextSummary}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  const parsed = parseJsonFromResponse(block.text);

  const result = generatedQuestionsSchema.safeParse(parsed);
  if (!result.success) {
    console.error(
      '[CustomerInterviewAI] Question generation validation failed:',
      result.error.issues.slice(0, 3)
    );
    throw new Error('Question generation response failed validation');
  }

  console.log(
    '[CustomerInterviewAI] Question generation successful:',
    result.data.questions.length,
    'questions'
  );
  return result.data;
}

/**
 * Calls Claude Haiku to synthesize all interview responses into structured
 * customer discovery insights.
 */
export async function synthesizeResponses(
  context: SynthesisContext
): Promise<CustomerDiscoverySynthesis> {
  const client = getAnthropicClient();

  // Build a readable summary of questions and responses
  const questionMap = new Map(context.questions.map((q) => [q.id, q]));

  const responseSections = context.responses.map((resp, idx) => {
    const label = resp.respondentName ?? `Respondent ${idx + 1}`;
    const answers = resp.answers
      .map((a) => {
        const question = questionMap.get(a.questionId);
        const questionText = question?.text ?? a.questionId;
        return `  Q: ${questionText}\n  A: ${String(a.value)}`;
      })
      .join('\n\n');
    return `### ${label}\n\n${answers}`;
  });

  const researchContext = context.researchData
    ? `\n\n## Prior Research\n${JSON.stringify(context.researchData, null, 2)}`
    : '';

  const userContent = [
    `## Project: ${context.projectTitle}`,
    `## Description: ${context.projectDescription}`,
    researchContext,
    `\n## Interview Questions`,
    context.questions.map((q) => `- [${q.id}] ${q.text} (${q.type})`).join('\n'),
    `\n## Responses (${context.responses.length} total)`,
    responseSections.join('\n\n---\n\n'),
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4000,
    temperature: 0,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Synthesize these customer interview responses:\n\n${userContent}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  const parsed = parseJsonFromResponse(block.text);

  const result = synthesisResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error(
      '[CustomerInterviewAI] Synthesis validation failed:',
      result.error.issues.slice(0, 3)
    );
    throw new Error('Synthesis response failed validation');
  }

  console.log('[CustomerInterviewAI] Synthesis successful for', context.responses.length, 'responses');
  return result.data;
}
