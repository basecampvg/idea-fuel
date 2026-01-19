import { openai, INTERVIEW_MODEL, EXTRACTION_MODEL, getAIParams, createResponsesParams } from '../lib/openai';
import type { SubscriptionTier } from '@prisma/client';
import { getInterviewKnowledge, KNOWLEDGE } from '../lib/knowledge';
import type { ChatMessage, InterviewMode, InterviewDataPoints, DataPoint } from '@forge/shared';

// Data point field names for extraction
const DATA_POINT_FIELDS = [
  'idea_core',
  'idea_name',
  'customer_segment',
  'customer_demographics',
  'customer_pain_intensity',
  'customer_hangouts',
  'problem_statement',
  'problem_severity',
  'solution_description',
  'solution_key_features',
  'solution_unique_mechanism',
  'competitors_direct',
  'differentiation',
  'competitive_advantage',
  'biggest_competitor_weakness',
  'revenue_model',
  'pricing_strategy',
  'price_point',
  'gtm_channels',
  'gtm_first_customers',
  'marketing_strategy',
  'target_search_terms',
  'why_now_triggers',
  'market_timing_factors',
  'founder_background',
  'founder_relevant_experience',
  'founder_unfair_advantage',
  'funding_needs',
  'funding_stage',
  'existing_traction',
  'validation_done',
] as const;

// High-value fields to prioritize in interviews
const HIGH_VALUE_FIELDS = [
  'why_now_triggers',
  'biggest_competitor_weakness',
  'target_search_terms',
  'customer_pain_intensity',
  'differentiation',
] as const;

// Build system prompt for the interview using knowledge.json configuration
function buildSystemPrompt(
  mode: InterviewMode,
  ideaTitle: string,
  ideaDescription: string,
  currentTurn: number,
  maxTurns: number,
  collectedData: Partial<InterviewDataPoints> | null
): string {
  // Calculate confidence score based on filled fields
  const filledFields = collectedData
    ? Object.values(collectedData).filter((v) => v?.value).length
    : 0;
  const totalFields = DATA_POINT_FIELDS.length; // 31 fields
  const confidenceScore = Math.min(100, Math.round((filledFields / totalFields) * 100));

  // Determine interview phase
  const phase =
    currentTurn === 0
      ? 'opening'
      : currentTurn >= maxTurns - 2
        ? 'closing'
        : 'discovery';

  // Calculate canEnd based on mode
  const canEnd =
    mode === 'LIGHT'
      ? confidenceScore >= 80 && currentTurn >= 5
      : confidenceScore >= 90 && currentTurn >= 20;

  // Find high-value gaps (priority fields not yet collected)
  const gaps = HIGH_VALUE_FIELDS.filter(
    (f) => !collectedData?.[f as keyof InterviewDataPoints]?.value
  );

  // Format collected data for display
  const collectedSoFar = Object.entries(collectedData || {})
    .filter(([, v]) => v?.value)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v!.value }), {});

  // Get knowledge-based guardrails and rules
  const knowledgeContext = getInterviewKnowledge();

  return `${knowledgeContext}

---

## SESSION CONTEXT

Turn: ${currentTurn + 1} / ${maxTurns}
Phase: ${phase}
Confidence: ${confidenceScore}%
Can End: ${canEnd}

BUSINESS: ${ideaTitle}
${ideaDescription}

COLLECTED:
${JSON.stringify(collectedSoFar, null, 2)}

GAPS: ${gaps.join(', ') || 'None - good coverage!'}

KEY TOPICS TO EXPLORE:
- Customer: Who they are, their pain intensity, how they currently solve the problem
- Competition: Direct competitors, their weaknesses, your differentiation
- Why Now: What market changes make this the right time?
- Validation: Any traction, tests, or proof of demand?
- Search Terms: What would customers search for to find this solution?`;
}

// Get max turns for a given mode
function getMaxTurnsForMode(mode: InterviewMode): number {
  const MAX_TURNS = {
    LIGHTNING: 0,
    LIGHT: 10,
    IN_DEPTH: 65,
  } as const;
  return MAX_TURNS[mode] ?? 10;
}

// Generate opening question for a new interview
export async function generateOpeningQuestion(
  ideaTitle: string,
  ideaDescription: string,
  mode: InterviewMode,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<string> {
  const maxTurns = getMaxTurnsForMode(mode);
  const systemPrompt = buildSystemPrompt(
    mode,
    ideaTitle,
    ideaDescription,
    0, // currentTurn = 0 for opening
    maxTurns,
    null // no collected data yet
  );

  // Get tier-based AI parameters
  const aiParams = getAIParams('interviewQuestion', tier);

  console.log('[Interview AI] Generating opening question for mode:', mode);
  console.log('[Interview AI] Using model:', INTERVIEW_MODEL);
  console.log('[Interview AI] Tier:', tier, '| Reasoning:', aiParams.reasoning, '| Verbosity:', aiParams.verbosity);

  try {
    // Use Responses API for GPT-5.2 reasoning support
    const response = await openai.responses.create(
      createResponsesParams({
        model: INTERVIEW_MODEL,
        input: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Please start the discovery interview. Based on the idea description, ask your first question to understand the core problem and target customer better.`,
          },
        ],
        max_output_tokens: 500,
      }, aiParams)
    );

    console.log('[Interview AI] OpenAI response received');
    return response.output_text || "Let's start with your business idea. What problem are you trying to solve, and who experiences this problem most acutely?";
  } catch (error) {
    console.error('[Interview AI] OpenAI API error:', error);
    throw error; // Re-throw to let tRPC handle it
  }
}

// Generate next question based on conversation history
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
  // Build system prompt with full context (confidence, phase, gaps, etc.)
  const systemPrompt = buildSystemPrompt(
    mode,
    ideaTitle,
    ideaDescription,
    currentTurn,
    maxTurns,
    collectedData
  );

  // Get tier-based AI parameters
  const aiParams = getAIParams('interviewQuestion', tier);

  // Build conversation history for OpenAI
  const conversationHistory = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: INTERVIEW_MODEL,
      input: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ],
      max_output_tokens: 500,
    }, aiParams)
  );

  return response.output_text || 'Could you tell me more about that?';
}

// Extract data points from the latest user response
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
- solution_description: How the solution works
- solution_key_features: Main features/capabilities
- solution_unique_mechanism: What makes it unique
- competitors_direct: Direct competitors
- differentiation: How it differs from competitors
- competitive_advantage: Sustainable advantages
- biggest_competitor_weakness: Weaknesses of competitors
- revenue_model: How money is made (subscription, one-time, etc.)
- pricing_strategy: Pricing approach
- price_point: Specific price or range
- gtm_channels: Go-to-market channels
- gtm_first_customers: How to acquire first customers
- marketing_strategy: Marketing approach
- target_search_terms: Keywords customers search for
- why_now_triggers: Market triggers making this timely
- market_timing_factors: Why the market is ready now
- founder_background: Founder's background
- founder_relevant_experience: Relevant experience
- founder_unfair_advantage: Unique advantages founder has
- funding_needs: How much funding needed
- funding_stage: Current funding stage
- existing_traction: Any existing traction/customers
- validation_done: Validation already performed

Only include fields where you can extract clear, specific information. Return an empty object {} if nothing can be extracted.`;

  // Get tier-based AI parameters for data extraction
  const aiParams = getAIParams('dataExtraction', tier);

  try {
    // Use Responses API for GPT-5.2 reasoning support
    const response = await openai.responses.create(
      createResponsesParams({
        model: EXTRACTION_MODEL,
        input: extractionPrompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 1000,
      }, aiParams)
    );

    const content = response.output_text;
    if (!content) return {};

    const extracted = JSON.parse(content);

    // Transform to DataPoint format and validate fields
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

// Generate a context summary for resume greeting
export function generateResumeContext(messages: ChatMessage[], collectedData: Partial<InterviewDataPoints> | null): string {
  if (messages.length === 0) return '';

  // Get the last few exchanges
  const recentMessages = messages.slice(-4);
  const lastTopic = recentMessages
    .filter((m) => m.role === 'assistant')
    .pop()?.content.slice(0, 200);

  // Summarize what's been collected
  const collectedFields = collectedData ? Object.keys(collectedData).filter((k) => collectedData[k as keyof InterviewDataPoints]?.value) : [];

  return `Last discussed: ${lastTopic || 'Getting started'}. Collected ${collectedFields.length} data points so far.`;
}

// Merge new extracted data with existing data
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
