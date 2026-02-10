import { openai, INTERVIEW_MODEL, EXTRACTION_MODEL, getAIParams, createResponsesParams } from '../lib/openai';
import type { SubscriptionTier } from '../db/schema';
import { getInterviewKnowledge } from '../lib/knowledge';
import type { ChatMessage, InterviewMode, InterviewDataPoints, DataPoint } from '@forge/shared';
import { trackUsageFromResponse } from '../lib/token-tracker';

// ---------------------------------------------------------------------------
// Data Point Fields
// ---------------------------------------------------------------------------

const DATA_POINT_FIELDS = [
  'idea_core',
  'idea_name',
  'customer_segment',
  'customer_demographics',
  'customer_pain_intensity',
  'customer_hangouts',
  'problem_statement',
  'problem_severity',
  'problem_trigger',
  'problem_cost',
  'problem_frequency',
  'solution_description',
  'solution_key_features',
  'solution_unique_mechanism',
  'solution_mvp',
  'competitors_direct',
  'differentiation',
  'competitive_advantage',
  'biggest_competitor_weakness',
  'revenue_model',
  'pricing_strategy',
  'price_point',
  'value_metric',
  'sales_motion',
  'gtm_channels',
  'gtm_first_customers',
  'marketing_strategy',
  'target_search_terms',
  'beachhead_market',
  'market_wedge',
  'why_now_triggers',
  'market_timing_factors',
  'founder_background',
  'founder_relevant_experience',
  'founder_unfair_advantage',
  'funding_needs',
  'funding_stage',
  'existing_traction',
  'validation_done',
  'key_assumptions',
  'execution_risks',
  'moat_formation',
] as const;

// ---------------------------------------------------------------------------
// Scripted Question Definitions
// ---------------------------------------------------------------------------

export interface QuestionTemplate {
  id: number;
  block: string;
  intent: string;
  contextHint: string;
  dataPoints: string[];
  modes: InterviewMode[];
}

/**
 * Scripted questions asked in fixed order.
 * LIGHT mode uses questions with 'LIGHT' in modes (1-6).
 * IN_DEPTH mode uses all 10.
 */
const SCRIPTED_QUESTIONS: QuestionTemplate[] = [
  {
    id: 1,
    block: 'Problem & Customer',
    intent: 'Understand the core problem being solved and who experiences it most acutely.',
    contextHint: 'Ask about the problem in one sentence, who has it (job title, context), and what triggers it.',
    dataPoints: ['problem_statement', 'customer_segment', 'idea_core', 'problem_trigger'],
    modes: ['LIGHT', 'IN_DEPTH'],
  },
  {
    id: 2,
    block: 'Pain Severity',
    intent: 'Understand how painful the problem is and what the current workarounds cost.',
    contextHint: 'Ask how they solve it today, what\'s broken about that, and what it costs them (time, money, stress). How often do they feel this pain?',
    dataPoints: ['customer_pain_intensity', 'problem_severity', 'problem_cost', 'problem_frequency'],
    modes: ['LIGHT', 'IN_DEPTH'],
  },
  {
    id: 3,
    block: 'Target Customer',
    intent: 'Narrow down exactly who feels the pain most intensely and where they are.',
    contextHint: 'Ask which specific segment feels it most intensely and why them. Where do they hang out? What are they already paying for that partially addresses it?',
    dataPoints: ['customer_demographics', 'customer_hangouts', 'beachhead_market'],
    modes: ['LIGHT', 'IN_DEPTH'],
  },
  {
    id: 4,
    block: 'Solution',
    intent: 'Understand how the solution works and what the minimum viable version looks like.',
    contextHint: 'Ask them to walk through how the solution works without buzzwords. What is the smallest version that still delivers the core value?',
    dataPoints: ['solution_description', 'solution_key_features', 'solution_unique_mechanism', 'solution_mvp'],
    modes: ['LIGHT', 'IN_DEPTH'],
  },
  {
    id: 5,
    block: 'Differentiation',
    intent: 'Understand the competitive landscape and what makes this approach meaningfully different.',
    contextHint: 'Ask about the top 3 alternatives, what\'s meaningfully different in outcomes (not features), and why this hasn\'t already been solved well.',
    dataPoints: ['competitors_direct', 'differentiation', 'competitive_advantage', 'biggest_competitor_weakness'],
    modes: ['LIGHT', 'IN_DEPTH'],
  },
  {
    id: 6,
    block: 'Why Now',
    intent: 'Understand market timing — what has changed that makes this the right moment.',
    contextHint: 'Ask what has changed recently (tech shift, regulation, behavior change, distribution shift) that creates this opportunity now.',
    dataPoints: ['why_now_triggers', 'market_timing_factors'],
    modes: ['LIGHT', 'IN_DEPTH'],
  },
  {
    id: 7,
    block: 'Revenue Model',
    intent: 'Understand who pays, how much, and what the value metric is.',
    contextHint: 'Ask specifically: who pays, how much, what\'s the value metric (per seat, usage, outcome), and what does the sales motion look like (self-serve, sales-led, product-led)?',
    dataPoints: ['revenue_model', 'pricing_strategy', 'price_point', 'value_metric', 'sales_motion'],
    modes: ['IN_DEPTH'],
  },
  {
    id: 8,
    block: 'Go-to-Market',
    intent: 'Understand the initial distribution strategy and beachhead entry point.',
    contextHint: 'Ask how they\'ll get their first 10 customers, what channel #1 is and why it\'s credible for them, and what their narrow entry wedge is that expands later.',
    dataPoints: ['gtm_first_customers', 'gtm_channels', 'marketing_strategy', 'target_search_terms', 'market_wedge'],
    modes: ['IN_DEPTH'],
  },
  {
    id: 9,
    block: 'Validation & Traction',
    intent: 'Understand what testing has been done and what assumptions must hold true.',
    contextHint: 'Ask what validation they\'ve done so far (conversations, waitlist, prototype). What are the 3-5 key assumptions that must be true? Which assumption is most likely wrong?',
    dataPoints: ['existing_traction', 'validation_done', 'key_assumptions'],
    modes: ['IN_DEPTH'],
  },
  {
    id: 10,
    block: 'Execution & Defensibility',
    intent: 'Understand execution risks and what creates a moat over time.',
    contextHint: 'Ask about the biggest execution risks in the next 90 days and what prevents a well-funded competitor from copying this. What\'s their unfair advantage?',
    dataPoints: ['execution_risks', 'moat_formation', 'founder_unfair_advantage', 'founder_background', 'founder_relevant_experience'],
    modes: ['IN_DEPTH'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the scripted questions applicable to a given mode. */
function getScriptedQuestionsForMode(mode: InterviewMode): QuestionTemplate[] {
  return SCRIPTED_QUESTIONS.filter((q) => q.modes.includes(mode));
}

/** Total number of scripted questions for a mode. */
export function getScriptedCountForMode(mode: InterviewMode): number {
  return getScriptedQuestionsForMode(mode).length;
}

/** Max turns per mode. */
export function getMaxTurnsForMode(mode: InterviewMode): number {
  const MAX_TURNS: Record<string, number> = {
    SPARK: 0,
    LIGHT: 10,
    IN_DEPTH: 18,
  };
  return MAX_TURNS[mode] ?? 10;
}

/** Determine interview phase from turn index. */
function getPhase(currentTurn: number, scriptedCount: number, maxTurns: number): 'scripted' | 'dynamic' | 'closing' {
  if (currentTurn >= maxTurns - 1) return 'closing';
  if (currentTurn < scriptedCount) return 'scripted';
  return 'dynamic';
}

// ---------------------------------------------------------------------------
// Answer Quality Scoring
// ---------------------------------------------------------------------------

export type AnswerQuality = 'thin' | 'adequate' | 'rich';

interface BlockGap {
  block: string;
  quality: AnswerQuality;
  missingFields: string[];
  existingValue: string | null;
}

/** Score the quality of answers for each scripted block. */
function scoreBlockQuality(
  collectedData: Partial<InterviewDataPoints> | null,
  mode: InterviewMode
): BlockGap[] {
  const questions = getScriptedQuestionsForMode(mode);
  const gaps: BlockGap[] = [];

  for (const q of questions) {
    const filled = q.dataPoints.filter(
      (f) => (collectedData as Record<string, DataPoint | undefined>)?.[f]?.value
    );
    const missing = q.dataPoints.filter(
      (f) => !(collectedData as Record<string, DataPoint | undefined>)?.[f]?.value
    );

    // Get the first existing value for context
    const firstFilled = filled[0];
    const existingValue = firstFilled
      ? ((collectedData as Record<string, DataPoint | undefined>)?.[firstFilled]?.value ?? null)
      : null;

    const ratio = filled.length / q.dataPoints.length;
    let quality: AnswerQuality;
    if (ratio >= 0.75) {
      // Check if values are substantive (not just a few words)
      const values = filled.map(
        (f) => (collectedData as Record<string, DataPoint | undefined>)?.[f]?.value ?? ''
      );
      const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length;
      quality = avgLength > 30 ? 'rich' : 'adequate';
    } else if (ratio >= 0.4) {
      quality = 'adequate';
    } else {
      quality = 'thin';
    }

    gaps.push({ block: q.block, quality, missingFields: missing, existingValue });
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

/** Build prompt for a scripted question turn. */
function buildScriptedPrompt(
  question: QuestionTemplate,
  ideaTitle: string,
  ideaDescription: string,
  collectedData: Partial<InterviewDataPoints> | null,
  lastUserMessage: string | null,
  currentTurn: number,
  maxTurns: number,
): string {
  const knowledge = getInterviewKnowledge();

  // Gather relevant context from already-collected data
  const contextPairs = question.dataPoints
    .map((f) => {
      const dp = (collectedData as Record<string, DataPoint | undefined>)?.[f];
      return dp?.value ? `${f}: ${dp.value}` : null;
    })
    .filter(Boolean);

  return `${knowledge}

---

## CURRENT INSTRUCTION

You are on turn ${currentTurn + 1} of ${maxTurns}.
Phase: SCRIPTED (question ${question.id} of ${SCRIPTED_QUESTIONS.length})

**Ask about: ${question.block}**
Intent: ${question.intent}
Guidance: ${question.contextHint}

Business idea: "${ideaTitle}"
Description: ${ideaDescription}

${contextPairs.length > 0 ? `Already collected for this topic:\n${contextPairs.join('\n')}` : 'No data collected for this topic yet.'}

${lastUserMessage ? `User's previous answer: "${lastUserMessage}"` : ''}

RULES:
- Ask ONE focused question about this specific topic
- Personalize using the business idea context
${lastUserMessage ? '- Briefly acknowledge their previous answer (1 sentence max) before asking' : ''}
- Do NOT ask about other topics
- Keep your total response under 3 sentences
- End with a clear, direct question`;
}

/** Build prompt for a dynamic gap-fill question. */
function buildDynamicPrompt(
  gap: BlockGap,
  ideaTitle: string,
  ideaDescription: string,
  collectedData: Partial<InterviewDataPoints> | null,
  lastUserMessage: string | null,
  currentTurn: number,
  maxTurns: number,
): string {
  const knowledge = getInterviewKnowledge();

  return `${knowledge}

---

## CURRENT INSTRUCTION

You are on turn ${currentTurn + 1} of ${maxTurns}.
Phase: DYNAMIC FOLLOW-UP

**Follow up on: ${gap.block}**
Gap: The user's answer about this topic was thin. Specifically missing: ${gap.missingFields.join(', ')}.
${gap.existingValue ? `What we have so far: "${gap.existingValue}"` : 'We have very little on this topic.'}

Business idea: "${ideaTitle}"
Description: ${ideaDescription}

${lastUserMessage ? `User's previous answer: "${lastUserMessage}"` : ''}

RULES:
- Ask ONE targeted follow-up about this specific gap
- Reference what they already shared to avoid repetition
- Keep it conversational, not interrogative
- Do NOT change topic
- Keep response under 3 sentences
- End with a clear, direct question`;
}

/** Build prompt for the closing turn. */
function buildClosingPrompt(
  ideaTitle: string,
  collectedData: Partial<InterviewDataPoints> | null,
  currentTurn: number,
  maxTurns: number,
): string {
  const knowledge = getInterviewKnowledge();

  const filledCount = collectedData
    ? Object.values(collectedData).filter((v) => (v as DataPoint | undefined)?.value).length
    : 0;

  // Gather key collected insights for summary
  const highlights: string[] = [];
  const cd = collectedData as Record<string, DataPoint | undefined> | null;
  if (cd?.problem_statement?.value) highlights.push(`Problem: ${cd.problem_statement.value}`);
  if (cd?.customer_segment?.value) highlights.push(`Customer: ${cd.customer_segment.value}`);
  if (cd?.differentiation?.value) highlights.push(`Edge: ${cd.differentiation.value}`);
  if (cd?.why_now_triggers?.value) highlights.push(`Timing: ${cd.why_now_triggers.value}`);

  return `${knowledge}

---

## CURRENT INSTRUCTION

You are on turn ${currentTurn + 1} of ${maxTurns}.
Phase: CLOSING

Business idea: "${ideaTitle}"
Data points collected: ${filledCount}/${DATA_POINT_FIELDS.length}

Key insights gathered:
${highlights.map((h) => `- ${h}`).join('\n') || '- (limited data collected)'}

YOUR TASK:
1. Briefly summarize 2-3 key insights you learned about their idea (be specific, use their words)
2. Thank them for their time
3. Let them know the research phase is next — we'll analyze the market, competitors, and validate demand based on what they shared
4. Keep it warm and concise (4-5 sentences max)
- Do NOT ask another question`;
}

// ---------------------------------------------------------------------------
// Core API Functions
// ---------------------------------------------------------------------------

/** Generate the opening question for a new interview. */
export async function generateOpeningQuestion(
  ideaTitle: string,
  ideaDescription: string,
  mode: InterviewMode,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<string> {
  const questions = getScriptedQuestionsForMode(mode);
  const firstQuestion = questions[0];
  const maxTurns = getMaxTurnsForMode(mode);

  const systemPrompt = buildScriptedPrompt(
    firstQuestion,
    ideaTitle,
    ideaDescription,
    null,
    null,
    0,
    maxTurns,
  );

  const aiParams = getAIParams('interviewQuestion', tier);

  console.log('[Interview AI] Generating opening question for mode:', mode);
  console.log('[Interview AI] Using model:', INTERVIEW_MODEL);

  try {
    const response = await openai.responses.create(
      createResponsesParams({
        model: INTERVIEW_MODEL,
        input: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: 'Please start the discovery interview with your first question.',
          },
        ],
        max_output_tokens: 300,
      }, aiParams)
    );

    trackUsageFromResponse(response, {
      functionName: 'generateOpeningQuestion',
      model: INTERVIEW_MODEL,
    });

    const text = response.output_text?.trim();
    if (!text) {
      console.error('[Interview AI] Empty response for opening question, using fallback');
      return `Let's dig into your idea. What's the core problem you're solving, and who experiences it most?`;
    }
    return text;
  } catch (error) {
    console.error('[Interview AI] OpenAI API error:', error);
    throw error;
  }
}

/** Generate the next question based on conversation history and scripted flow. */
export async function generateNextQuestion(
  ideaTitle: string,
  ideaDescription: string,
  mode: InterviewMode,
  messages: ChatMessage[],
  collectedData: Partial<InterviewDataPoints> | null,
  currentTurn: number,
  maxTurns: number,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<string> {
  const scriptedQuestions = getScriptedQuestionsForMode(mode);
  const scriptedCount = scriptedQuestions.length;
  const phase = getPhase(currentTurn, scriptedCount, maxTurns);

  // Get last user message for acknowledgment
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? null;

  let systemPrompt: string;

  if (phase === 'closing') {
    systemPrompt = buildClosingPrompt(ideaTitle, collectedData, currentTurn, maxTurns);
  } else if (phase === 'scripted') {
    const question = scriptedQuestions[currentTurn];
    systemPrompt = buildScriptedPrompt(
      question,
      ideaTitle,
      ideaDescription,
      collectedData,
      lastUserMsg,
      currentTurn,
      maxTurns,
    );
  } else {
    // Dynamic phase — find weakest blocks
    const gaps = scoreBlockQuality(collectedData, mode);
    const thinGaps = gaps.filter((g) => g.quality === 'thin');
    const adequateGaps = gaps.filter((g) => g.quality === 'adequate' && g.missingFields.length > 0);

    // Pick the worst gap, preferring thin over adequate
    const targetGap = thinGaps[0] ?? adequateGaps[0];

    if (targetGap) {
      systemPrompt = buildDynamicPrompt(
        targetGap,
        ideaTitle,
        ideaDescription,
        collectedData,
        lastUserMsg,
        currentTurn,
        maxTurns,
      );
    } else {
      // No gaps — go to closing early
      systemPrompt = buildClosingPrompt(ideaTitle, collectedData, currentTurn, maxTurns);
    }
  }

  const aiParams = getAIParams('interviewQuestion', tier);

  // Build conversation history
  const conversationHistory = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  try {
    const response = await openai.responses.create(
      createResponsesParams({
        model: INTERVIEW_MODEL,
        input: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
        ],
        max_output_tokens: 300,
      }, aiParams)
    );

    trackUsageFromResponse(response, {
      functionName: 'generateNextQuestion',
      model: INTERVIEW_MODEL,
    });

    const text = response.output_text?.trim();
    if (!text) {
      // Retry once on empty response
      console.warn('[Interview AI] Empty response, retrying once...');
      const retryResponse = await openai.responses.create(
        createResponsesParams({
          model: INTERVIEW_MODEL,
          input: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
          ],
          max_output_tokens: 300,
        }, aiParams)
      );

      trackUsageFromResponse(retryResponse, {
        functionName: 'generateNextQuestion_retry',
        model: INTERVIEW_MODEL,
      });

      const retryText = retryResponse.output_text?.trim();
      if (!retryText) {
        console.error('[Interview AI] Empty response after retry');
        throw new Error('Failed to generate interview question after retry');
      }
      return retryText;
    }

    return text;
  } catch (error) {
    console.error('[Interview AI] Error generating question:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Data Extraction
// ---------------------------------------------------------------------------

/** Extract data points from the latest user response. */
export async function extractDataPoints(
  userMessage: string,
  conversationContext: string,
  currentData: Partial<InterviewDataPoints> | null,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<Partial<Record<keyof InterviewDataPoints, DataPoint>>> {
  const extractionPrompt = `You are a data extraction assistant. Analyze the user's response and extract any business-related information into structured data points.

Previous conversation context:
${conversationContext}

User's latest response:
"${userMessage}"

Extract ONLY information that was explicitly stated or clearly implied in the user's response.
Return a JSON object with the following structure for each extracted field:
{
  "field_name": {
    "value": "extracted value as a string",
    "source": "collected"
  }
}

Available fields to extract:
- idea_core: Core concept of the business idea
- idea_name: Name/brand for the idea
- customer_segment: Target customer segment
- customer_demographics: Age, income, location, etc.
- customer_pain_intensity: How severe is the problem (scale or description)
- customer_hangouts: Where target customers spend time (online/offline)
- problem_statement: The problem being solved
- problem_severity: How critical/urgent the problem is
- problem_trigger: What triggers the problem / when it becomes urgent
- problem_cost: Cost of the problem today (time, money, risk, stress)
- problem_frequency: How often the customer feels this pain
- solution_description: How the solution works
- solution_key_features: Main features/capabilities
- solution_unique_mechanism: What makes it unique
- solution_mvp: Smallest version that delivers core value
- competitors_direct: Direct competitors
- differentiation: How it differs from competitors
- competitive_advantage: Sustainable advantages
- biggest_competitor_weakness: Weaknesses of competitors
- revenue_model: How money is made (subscription, one-time, etc.)
- pricing_strategy: Pricing approach
- price_point: Specific price or range
- value_metric: Value metric (per seat, usage, outcome, workflow)
- sales_motion: Sales motion (self-serve, sales-led, product-led, partners)
- gtm_channels: Go-to-market channels
- gtm_first_customers: How to acquire first customers
- marketing_strategy: Marketing approach
- target_search_terms: Keywords customers search for
- beachhead_market: Precisely defined initial market segment (SAM)
- market_wedge: Narrow entry point that expands later
- why_now_triggers: Market triggers making this timely
- market_timing_factors: Why the market is ready now
- founder_background: Founder's background
- founder_relevant_experience: Relevant experience
- founder_unfair_advantage: Unique advantages founder has
- funding_needs: How much funding needed
- funding_stage: Current funding stage
- existing_traction: Any existing traction/customers
- validation_done: Validation already performed
- key_assumptions: Key assumptions that must be true (3-5)
- execution_risks: Biggest execution risks in next 90 days
- moat_formation: What prevents well-funded competitors from copying

Only include fields where you can extract clear, specific information. Return an empty object {} if nothing can be extracted.`;

  const aiParams = getAIParams('dataExtraction', tier);

  try {
    const response = await openai.responses.create(
      createResponsesParams({
        model: EXTRACTION_MODEL,
        input: extractionPrompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 1000,
      }, aiParams)
    );

    trackUsageFromResponse(response, {
      functionName: 'extractDataPoints',
      model: EXTRACTION_MODEL,
    });

    const content = response.output_text;
    if (!content) return {};

    const extracted = JSON.parse(content);

    const result: Partial<Record<keyof InterviewDataPoints, DataPoint>> = {};

    for (const [key, data] of Object.entries(extracted)) {
      if (DATA_POINT_FIELDS.includes(key as (typeof DATA_POINT_FIELDS)[number]) && data && typeof data === 'object') {
        const dataObj = data as { value?: string; source?: string };
        if (dataObj.value) {
          result[key as keyof InterviewDataPoints] = {
            weight: 1,
            value: String(dataObj.value),
            source: 'collected',
            question: null,
            turn: null,
          };
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error extracting data points:', error);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Resume & Merge Utilities
// ---------------------------------------------------------------------------

/** Generate a context summary for resume greeting. */
export function generateResumeContext(messages: ChatMessage[], collectedData: Partial<InterviewDataPoints> | null): string {
  if (messages.length === 0) return '';

  const recentMessages = messages.slice(-4);
  const lastTopic = recentMessages
    .filter((m) => m.role === 'assistant')
    .pop()?.content.slice(0, 200);

  const collectedFields = collectedData ? Object.keys(collectedData).filter((k) => (collectedData as Record<string, DataPoint | undefined>)[k]?.value) : [];

  return `Last discussed: ${lastTopic || 'Getting started'}. Collected ${collectedFields.length} data points so far.`;
}

/** Merge new extracted data with existing data. */
export function mergeCollectedData(
  existing: Partial<InterviewDataPoints> | null,
  newData: Partial<Record<keyof InterviewDataPoints, DataPoint>>,
  currentTurn: number
): Partial<InterviewDataPoints> {
  const merged = { ...(existing || {}) };

  for (const [key, dataPoint] of Object.entries(newData)) {
    if (dataPoint && dataPoint.value) {
      merged[key as keyof InterviewDataPoints] = {
        ...dataPoint,
        turn: currentTurn,
      };
    }
  }

  return merged;
}
