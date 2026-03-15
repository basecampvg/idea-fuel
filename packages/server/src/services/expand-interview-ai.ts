/**
 * Expand Mode Interview AI Service
 *
 * 30 questions across 3 tracks:
 * - Track A: Product Line Audit (10 questions)
 * - Track B: Customer Intelligence (10 questions)
 * - Track C: Strategic Context (10 questions)
 *
 * Uses the same OpenAI infrastructure as Launch Mode interviews
 * but with Expand-specific question templates and data extraction.
 */

import { openai, INTERVIEW_MODEL, EXTRACTION_MODEL, getAIParams, createResponsesParams } from '../lib/openai';
import type { SubscriptionTier } from '../db/schema';
import type { ChatMessage, ExpandDataPoints, ExpandTrackId, ExpandTrackProgress, DataPoint, BusinessContext } from '@forge/shared';
import { trackUsageFromResponse } from '../lib/token-tracker';

// ---------------------------------------------------------------------------
// Expand Data Point Fields (31 total — Track A has 11 because A1 extracts 2)
// ---------------------------------------------------------------------------

export const EXPAND_DATA_POINT_FIELDS = [
  // Track A: Product Line Audit
  'currentProducts', 'topRevenueProduct', 'bestMarginProduct', 'underperformingProduct',
  'customerRequests', 'targetExpansion', 'avgOrderValue', 'hasRecurringRevenue', 'sunsettingProducts',
  'failedExpansions', 'customerOnboardingTime', 'operationalBottleneck',
  // Track B: Customer Intelligence
  'bestCustomerProfile', 'topCustomerRevenueConcentration', 'customerSpendElsewhere',
  'topComplaints', 'churnReasons', 'upsellHistory', 'referralBehavior',
  'wrongFitCustomers', 'customerBaseTrajectory', 'prioritySegment',
  // Track C: Strategic Context
  'primaryGoal', 'availableCapital', 'canOperateWithoutNewHire', 'riskTolerance',
  'timeConstraints', 'explicitAvoidances', 'competitorConcerns', 'twoYearVision',
  'suppressedIdea', 'worstCaseScenario',
] as const;

// ---------------------------------------------------------------------------
// Question Templates
// ---------------------------------------------------------------------------

export interface ExpandQuestionTemplate {
  id: number;
  track: ExpandTrackId;
  trackQuestion: number; // 1-10 within track
  block: string;
  intent: string;
  questionText: string; // The exact question to ask — AI must use this verbatim (with business name substitution)
  contextHint: string;
  dataPoints: string[];
}

const EXPAND_QUESTIONS: ExpandQuestionTemplate[] = [
  // ======================== TRACK A: Product Line Audit ========================
  {
    id: 1, track: 'A', trackQuestion: 1,
    block: 'Current Product Portfolio',
    intent: 'Understand the full product/service lineup and which generates the most revenue.',
    questionText: 'Can you list all the products or services {{business}} currently offers, and tell me which one drives the most revenue?',
    contextHint: 'Also ask which product has the best margins.',
    dataPoints: ['currentProducts', 'topRevenueProduct'],
  },
  {
    id: 2, track: 'A', trackQuestion: 2,
    block: 'Margin Analysis',
    intent: 'Identify highest-margin and underperforming products.',
    questionText: 'Which of those products or services has the best profit margin, and which one is underperforming or barely breaking even? Why is the underperformer struggling?',
    contextHint: 'Get specifics on margin percentages if possible.',
    dataPoints: ['bestMarginProduct', 'underperformingProduct'],
  },
  {
    id: 3, track: 'A', trackQuestion: 3,
    block: 'Customer Requests',
    intent: 'Surface unmet demand from existing customers.',
    questionText: 'What do your customers most frequently ask for that {{business}} doesn\'t currently offer? How often do you hear these requests, and are there patterns in who asks?',
    contextHint: 'Get frequency and specificity on the requests.',
    dataPoints: ['customerRequests'],
  },
  {
    id: 4, track: 'A', trackQuestion: 4,
    block: 'Order Value & Revenue Model',
    intent: 'Understand transaction sizes and recurring revenue.',
    questionText: 'What is your average order or contract value, and what percentage of {{business}}\'s revenue is recurring (subscriptions, retainers, maintenance contracts) versus one-time?',
    contextHint: 'Get dollar amounts if possible.',
    dataPoints: ['avgOrderValue', 'hasRecurringRevenue'],
  },
  {
    id: 5, track: 'A', trackQuestion: 5,
    block: 'Product Lifecycle',
    intent: 'Identify products being sunset or near end-of-life.',
    questionText: 'Are there any products or services you\'re currently phasing out, or that you wish you could stop offering? What\'s keeping you from dropping them?',
    contextHint: 'Understand the constraints preventing sunsetting.',
    dataPoints: ['sunsettingProducts'],
  },
  {
    id: 6, track: 'A', trackQuestion: 6,
    block: 'Past Expansion Attempts',
    intent: 'Learn from previous expansion successes and failures.',
    questionText: 'Has {{business}} tried expanding into new products, services, or markets before? What worked, what failed, and what did you learn from it?',
    contextHint: 'If they haven\'t tried, ask what stopped them.',
    dataPoints: ['failedExpansions'],
  },
  {
    id: 7, track: 'A', trackQuestion: 7,
    block: 'Onboarding Complexity',
    intent: 'Understand how long it takes to deliver value to new customers.',
    questionText: 'Walk me through your onboarding process for a new customer — from first contact to delivering value. How long does it take, and where is the biggest friction point?',
    contextHint: 'Get timeline and specific bottlenecks.',
    dataPoints: ['customerOnboardingTime'],
  },
  {
    id: 8, track: 'A', trackQuestion: 8,
    block: 'Operational Constraints',
    intent: 'Identify bottlenecks that would limit expansion.',
    questionText: 'If {{business}} doubled its customer base in the next 60-90 days, what would break first — production capacity, delivery, staffing, or something else?',
    contextHint: 'Identify the hard constraint on growth.',
    dataPoints: ['operationalBottleneck'],
  },
  {
    id: 9, track: 'A', trackQuestion: 9,
    block: 'Target Expansion',
    intent: 'Directly identify the specific new product, service, or market the owner wants to expand into.',
    questionText: 'What is the specific new product, service, or market you are planning to expand into — or most seriously considering? What makes it the right move for {{business}} right now?',
    contextHint: 'This is the most important question in the interview. Get a concrete, specific answer about what they want to build/launch/enter.',
    dataPoints: ['targetExpansion'],
  },
  {
    id: 10, track: 'A', trackQuestion: 10,
    block: 'Product Line Summary',
    intent: 'Validate understanding and surface anything missed.',
    questionText: 'Let me recap what I\'ve heard about {{business}}\'s product line. [recap]. Is there anything about your product line you haven\'t mentioned yet that matters for your expansion plans?',
    contextHint: 'Briefly recap their product portfolio strengths and weaknesses, then ask if anything was missed.',
    dataPoints: ['currentProducts', 'operationalBottleneck'],
  },

  // ======================== TRACK B: Customer Intelligence ========================
  {
    id: 11, track: 'B', trackQuestion: 1,
    block: 'Best Customer Profile',
    intent: 'Identify the ideal customer and what makes them valuable.',
    questionText: 'Describe your best customers in detail — not just demographics, but behavior. What do the top 20% of {{business}}\'s customers have in common?',
    contextHint: 'Get behavioral traits, not just firmographics.',
    dataPoints: ['bestCustomerProfile'],
  },
  {
    id: 12, track: 'B', trackQuestion: 2,
    block: 'Revenue Concentration',
    intent: 'Assess revenue concentration risk.',
    questionText: 'What percentage of {{business}}\'s revenue comes from your top 5 customers? Is there a single customer you can\'t afford to lose?',
    contextHint: 'Get specific percentages.',
    dataPoints: ['topCustomerRevenueConcentration'],
  },
  {
    id: 13, track: 'B', trackQuestion: 3,
    block: 'Customer Spending Elsewhere',
    intent: 'Identify adjacent revenue opportunities from existing customers.',
    questionText: 'What are your customers currently spending money on with other vendors that\'s related to what {{business}} offers? What adjacent services do they wish they could get from one provider?',
    contextHint: 'Identify wallet share opportunities.',
    dataPoints: ['customerSpendElsewhere'],
  },
  {
    id: 14, track: 'B', trackQuestion: 4,
    block: 'Customer Pain Points',
    intent: 'Surface complaints and frustrations.',
    questionText: 'What are the top 3 complaints or frustrations you hear from your customers about {{business}}\'s products or services? What makes customers leave?',
    contextHint: 'Get specific complaints, not general sentiments.',
    dataPoints: ['topComplaints', 'churnReasons'],
  },
  {
    id: 15, track: 'B', trackQuestion: 5,
    block: 'Churn & Retention',
    intent: 'Understand why customers leave and retention dynamics.',
    questionText: 'How many customers does {{business}} lose per quarter or per year? What is the number one reason they leave, and have you tried to address it?',
    contextHint: 'Get hard numbers on churn rate.',
    dataPoints: ['churnReasons'],
  },
  {
    id: 16, track: 'B', trackQuestion: 6,
    block: 'Upsell & Cross-sell History',
    intent: 'Understand existing expansion revenue patterns.',
    questionText: 'Have you successfully upsold or cross-sold to existing customers before? What worked, and what is your biggest missed upsell opportunity?',
    contextHint: 'Get specific examples and revenue impact.',
    dataPoints: ['upsellHistory'],
  },
  {
    id: 17, track: 'B', trackQuestion: 7,
    block: 'Referral Behavior',
    intent: 'Assess organic growth and word-of-mouth dynamics.',
    questionText: 'How do new customers typically find {{business}} today? Do existing customers refer new ones, and if so, what makes someone refer you?',
    contextHint: 'Understand acquisition channels and referral drivers.',
    dataPoints: ['referralBehavior'],
  },
  {
    id: 18, track: 'B', trackQuestion: 8,
    block: 'Wrong-fit Customers',
    intent: 'Identify customer segments that drain resources.',
    questionText: 'Which types of customers are a bad fit for {{business}} — the ones who take the most time, complain the most, or end up being unprofitable? What pattern do they share?',
    contextHint: 'Identify anti-personas.',
    dataPoints: ['wrongFitCustomers'],
  },
  {
    id: 19, track: 'B', trackQuestion: 9,
    block: 'Customer Base Trajectory',
    intent: 'Understand the trend direction of the customer base.',
    questionText: 'Over the last 6-12 months, has {{business}}\'s customer base been growing, shrinking, or flat? Are you seeing any new customer segments emerge?',
    contextHint: 'Get growth rate and segment shifts.',
    dataPoints: ['customerBaseTrajectory'],
  },
  {
    id: 20, track: 'B', trackQuestion: 10,
    block: 'Priority Customer Segment',
    intent: 'Force a prioritization decision on which customer to serve best.',
    questionText: 'If {{business}} could only serve one type of customer for the next 2 years, which segment would you choose and why? What makes that segment the best bet for growth?',
    contextHint: 'Force a single-segment prioritization.',
    dataPoints: ['prioritySegment'],
  },

  // ======================== TRACK C: Strategic Context ========================
  {
    id: 21, track: 'C', trackQuestion: 1,
    block: 'Primary Growth Goal',
    intent: 'Understand what success looks like for this expansion.',
    questionText: 'What is your number one growth goal for {{business}} over the next 12 months — revenue growth, market share, diversification, or something else? What does success look like?',
    contextHint: 'Get a specific, measurable goal.',
    dataPoints: ['primaryGoal'],
  },
  {
    id: 22, track: 'C', trackQuestion: 2,
    block: 'Available Capital',
    intent: 'Understand financial capacity for expansion.',
    questionText: 'How much capital can {{business}} realistically invest in expansion over the next 12 months? Is this from cash flow, savings, or would you need financing?',
    contextHint: 'A rough range is fine.',
    dataPoints: ['availableCapital'],
  },
  {
    id: 23, track: 'C', trackQuestion: 3,
    block: 'Operational Capacity',
    intent: 'Assess whether they can expand without new hires.',
    questionText: 'Could {{business}} take on a new product or service line without hiring anyone new? What would need to change in operations, and what is your team\'s current bandwidth like?',
    contextHint: 'Understand staffing constraints.',
    dataPoints: ['canOperateWithoutNewHire'],
  },
  {
    id: 24, track: 'C', trackQuestion: 4,
    block: 'Risk Tolerance',
    intent: 'Calibrate how aggressive the expansion recommendations should be.',
    questionText: 'When it comes to expansion, would you rather bet big on one opportunity or make several smaller, safer bets? What is the most you would be willing to lose on an expansion that doesn\'t work out?',
    contextHint: 'Get a dollar amount on acceptable loss.',
    dataPoints: ['riskTolerance'],
  },
  {
    id: 25, track: 'C', trackQuestion: 5,
    block: 'Time Constraints',
    intent: 'Understand timeline pressures and windows of opportunity.',
    questionText: 'Is there any external timing pressure driving this expansion — a competitive threat, a lease renewal, a seasonal window, a budget cycle? How quickly do you need to see results?',
    contextHint: 'Surface deadlines and windows.',
    dataPoints: ['timeConstraints'],
  },
  {
    id: 26, track: 'C', trackQuestion: 6,
    block: 'Explicit Avoidances',
    intent: 'Surface hard constraints and non-starters.',
    questionText: 'What are the explicit non-starters for {{business}} as you grow — any customer segments, business models, product types, or markets that are completely off the table? Why?',
    contextHint: 'Get hard constraints.',
    dataPoints: ['explicitAvoidances'],
  },
  {
    id: 27, track: 'C', trackQuestion: 7,
    block: 'Competitive Landscape Concerns',
    intent: 'Understand competitive threats driving expansion.',
    questionText: 'Which competitor worries you the most right now, and what specifically are they doing that threatens {{business}}? What would happen if you did nothing for the next year?',
    contextHint: 'Get specific competitive actions, not general anxiety.',
    dataPoints: ['competitorConcerns'],
  },
  {
    id: 28, track: 'C', trackQuestion: 8,
    block: 'Two-Year Vision',
    intent: 'Understand the strategic direction and ambition level.',
    questionText: 'In 2 years, what does winning look like for {{business}}? What is the revenue target, how many customers, and what does the product or service portfolio include?',
    contextHint: 'Get concrete numbers for the vision.',
    dataPoints: ['twoYearVision'],
  },
  {
    id: 29, track: 'C', trackQuestion: 9,
    block: 'Suppressed Idea',
    intent: 'Surface the expansion idea they haven\'t mentioned yet.',
    questionText: 'Is there an expansion idea you\'ve been thinking about for {{business}} but haven\'t mentioned yet — something you\'re excited about but unsure of? What\'s holding you back?',
    contextHint: 'Create a safe space for the risky/uncertain idea.',
    dataPoints: ['suppressedIdea'],
  },
  {
    id: 30, track: 'C', trackQuestion: 10,
    block: 'Worst Case & Downside',
    intent: 'Understand their worst-case scenario thinking.',
    questionText: 'If {{business}}\'s expansion goes wrong, what does the worst-case scenario look like? How much cash and time could you afford to burn, and would it hurt the core business?',
    contextHint: 'Get blast radius and recovery plan.',
    dataPoints: ['worstCaseScenario'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get questions for a specific track. */
export function getQuestionsForTrack(track: ExpandTrackId): ExpandQuestionTemplate[] {
  return EXPAND_QUESTIONS.filter(q => q.track === track);
}

/** Get the next question within a track based on current progress. */
export function getNextExpandQuestion(
  trackOrder: [ExpandTrackId, ExpandTrackId, ExpandTrackId],
  trackProgress: ExpandTrackProgress,
): ExpandQuestionTemplate | null {
  const currentTrack = trackProgress.currentTrack;
  const progress = trackProgress[currentTrack];
  const trackQuestions = getQuestionsForTrack(currentTrack);

  if (progress.completed < progress.total) {
    return trackQuestions[progress.completed] ?? null;
  }

  // Current track is complete — find the next incomplete track in order
  for (const track of trackOrder) {
    if (track === currentTrack) continue;
    const tp = trackProgress[track];
    if (tp.completed < tp.total) {
      const questions = getQuestionsForTrack(track);
      return questions[tp.completed] ?? null;
    }
  }

  return null; // All tracks complete
}

/** Initialize track progress. */
export function createInitialTrackProgress(
  startTrack: ExpandTrackId = 'A'
): ExpandTrackProgress {
  return {
    A: { completed: 0, total: 10 },
    B: { completed: 0, total: 10 },
    C: { completed: 0, total: 10 },
    currentTrack: startTrack,
  };
}

/** Check if minimum completion threshold is met for research. */
export function meetsMinimumCompletion(progress: ExpandTrackProgress): boolean {
  const trackAComplete = progress.A.completed >= progress.A.total;
  const trackBSufficient = progress.B.completed >= Math.ceil(progress.B.total * 0.6);
  const trackCSufficient = progress.C.completed >= Math.ceil(progress.C.total * 0.6);
  return trackAComplete && (trackBSufficient || trackCSufficient);
}

/** Total questions answered across all tracks. */
export function getTotalCompleted(progress: ExpandTrackProgress): number {
  return progress.A.completed + progress.B.completed + progress.C.completed;
}

// ---------------------------------------------------------------------------
// Track Labels (for UI context in prompts)
// ---------------------------------------------------------------------------

const TRACK_LABELS: Record<ExpandTrackId, string> = {
  A: 'Product Line Audit',
  B: 'Customer Intelligence',
  C: 'Strategic Context',
};

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

/** Build the system prompt for an Expand Mode scripted question. */
function buildExpandScriptedPrompt(
  question: ExpandQuestionTemplate,
  businessContext: BusinessContext,
  _collectedData: Partial<ExpandDataPoints> | null,
  lastUserMessage: string | null,
  _trackProgress: ExpandTrackProgress,
): string {
  const businessName = businessContext.businessName || 'your business';
  const exactQuestion = question.questionText.replace(/\{\{business\}\}/g, businessName);

  return `You are an expert business expansion strategist conducting a structured interview.

## YOUR TASK
You MUST ask this exact question:

"${exactQuestion}"

## RULES — STRICT, NO EXCEPTIONS
1. ${lastUserMessage ? 'Start with a ONE-sentence acknowledgment of their previous answer (e.g., "Got it — [brief reflection].")' : 'Start directly with the question.'}
2. Then ask the EXACT question above. You may lightly adapt phrasing for natural flow (e.g., contractions, word order) but the meaning, scope, and specificity must remain identical.
3. Do NOT add sub-questions, follow-ups, or ask about anything beyond the scope of that question.
4. Do NOT reference other topics, tracks, or data points.
5. Keep your total response to 2-3 sentences maximum.
6. End with the question — nothing after it.

## CONTEXT (for acknowledgment only — do NOT let this change the question you ask)
- Business: ${businessName}
- Industry: ${businessContext.industryVertical}
- Products: ${businessContext.currentProducts.join(', ')}`;
}

/** Build a closing prompt for the Expand interview. */
function buildExpandClosingPrompt(
  businessContext: BusinessContext,
  collectedData: Partial<ExpandDataPoints> | null,
  trackProgress: ExpandTrackProgress,
): string {
  const totalCompleted = getTotalCompleted(trackProgress);
  const cd = collectedData as Record<string, DataPoint | undefined> | null;

  const highlights: string[] = [];
  if (cd?.primaryGoal?.value) highlights.push(`Growth goal: ${cd.primaryGoal.value}`);
  if (cd?.targetExpansion?.value) highlights.push(`Expansion target: ${cd.targetExpansion.value}`);
  if (cd?.topRevenueProduct?.value) highlights.push(`Top product: ${cd.topRevenueProduct.value}`);
  if (cd?.bestCustomerProfile?.value) highlights.push(`Best customer: ${cd.bestCustomerProfile.value}`);
  if (cd?.customerRequests?.value) highlights.push(`Customer demand: ${cd.customerRequests.value}`);

  return `You are an expert business expansion strategist wrapping up a structured interview.

## BUSINESS CONTEXT
- Industry: ${businessContext.industryVertical}
- Business: ${businessContext.businessName || 'their business'}
- Products: ${businessContext.currentProducts.join(', ')}

## INTERVIEW STATUS
Data points collected: ${totalCompleted}/30
Tracks completed: A: ${trackProgress.A.completed}/10, B: ${trackProgress.B.completed}/10, C: ${trackProgress.C.completed}/10

Key insights gathered:
${highlights.map(h => `- ${h}`).join('\n') || '- (limited data collected)'}

YOUR TASK:
1. Briefly summarize 2-3 key insights about their expansion potential (be specific, use their words)
2. Thank them for their time
3. Let them know the research phase is next — we'll analyze adjacent markets, competitor portfolios, customer demand, and pricing to find the best expansion opportunities
4. Keep it warm and concise (4-5 sentences max)
- Do NOT ask another question`;
}

// ---------------------------------------------------------------------------
// Core API Functions
// ---------------------------------------------------------------------------

/** Generate the opening question for an Expand Mode interview. */
export async function generateExpandOpeningQuestion(
  businessContext: BusinessContext,
  startTrack: ExpandTrackId,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<string> {
  const trackQuestions = getQuestionsForTrack(startTrack);
  const firstQuestion = trackQuestions[0];
  const initialProgress = createInitialTrackProgress(startTrack);

  const systemPrompt = buildExpandScriptedPrompt(
    firstQuestion,
    businessContext,
    null,
    null,
    initialProgress,
  );

  const aiParams = getAIParams('interviewQuestion', tier);

  try {
    const response = await openai.responses.create(
      createResponsesParams({
        model: INTERVIEW_MODEL,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please start the expansion discovery interview with your first question.' },
        ],
        max_output_tokens: 500,
      }, aiParams)
    );

    trackUsageFromResponse(response, {
      functionName: 'generateExpandOpeningQuestion',
      model: INTERVIEW_MODEL,
    });

    const text = response.output_text?.trim();
    if (!text) {
      return `Let's start by mapping your current product portfolio. Can you walk me through all the products or services you currently offer, and which one drives the most revenue?`;
    }
    return text;
  } catch (error) {
    console.error('[Expand Interview AI] Error generating opening question:', error);
    throw error;
  }
}

/** Generate the next question for an Expand Mode interview. */
export async function generateExpandNextQuestion(
  businessContext: BusinessContext,
  messages: ChatMessage[],
  collectedData: Partial<ExpandDataPoints> | null,
  trackProgress: ExpandTrackProgress,
  trackOrder: [ExpandTrackId, ExpandTrackId, ExpandTrackId],
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<{ text: string; isClosing: boolean; nextTrack?: ExpandTrackId }> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? null;

  // Determine next question
  const nextQuestion = getNextExpandQuestion(trackOrder, trackProgress);

  if (!nextQuestion) {
    // All tracks complete — closing
    const systemPrompt = buildExpandClosingPrompt(businessContext, collectedData, trackProgress);
    const aiParams = getAIParams('interviewQuestion', tier);

    const conversationHistory = messages.slice(-6).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

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

    trackUsageFromResponse(response, {
      functionName: 'generateExpandNextQuestion_closing',
      model: INTERVIEW_MODEL,
    });

    return {
      text: response.output_text?.trim() || 'Thank you for sharing all of that. We have everything we need to analyze your expansion opportunities. The research phase will begin now.',
      isClosing: true,
    };
  }

  // Generate the next scripted question
  const systemPrompt = buildExpandScriptedPrompt(
    nextQuestion,
    businessContext,
    collectedData,
    lastUserMsg,
    trackProgress,
  );

  const aiParams = getAIParams('interviewQuestion', tier);

  const conversationHistory = messages.slice(-6).map(msg => ({
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
        max_output_tokens: 500,
      }, aiParams)
    );

    trackUsageFromResponse(response, {
      functionName: 'generateExpandNextQuestion',
      model: INTERVIEW_MODEL,
    });

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error('Empty response from AI');
    }

    return {
      text,
      isClosing: false,
      nextTrack: nextQuestion.track !== trackProgress.currentTrack ? nextQuestion.track : undefined,
    };
  } catch (error) {
    console.error('[Expand Interview AI] Error generating question:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Data Extraction
// ---------------------------------------------------------------------------

/** Extract Expand Mode data points from the latest user response. */
export async function extractExpandDataPoints(
  userMessage: string,
  conversationContext: string,
  currentData: Partial<ExpandDataPoints> | null,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<Partial<Record<keyof ExpandDataPoints, DataPoint>>> {
  const extractionPrompt = `You are a data extraction assistant for business expansion interviews. Analyze the user's response and extract business-related information.

Previous conversation context:
${conversationContext}

User's latest response:
"${userMessage}"

Extract ONLY information explicitly stated or clearly implied. Return a JSON object:
{
  "field_name": {
    "value": "extracted value as a string",
    "source": "collected"
  }
}

Available fields (Track A — Product Line Audit):
- currentProducts: List of current products/services
- topRevenueProduct: Highest revenue product/service
- bestMarginProduct: Highest margin product/service
- underperformingProduct: Underperforming or unprofitable products
- customerRequests: What customers frequently request but isn't offered
- targetExpansion: The specific new product, service, or market the business wants to expand into
- avgOrderValue: Average order/contract value
- hasRecurringRevenue: Whether recurring revenue exists and what percentage
- sunsettingProducts: Products being phased out or should be
- failedExpansions: Past expansion attempts and lessons learned
- customerOnboardingTime: How long to deliver value to new customers
- operationalBottleneck: Biggest operational constraint

Available fields (Track B — Customer Intelligence):
- bestCustomerProfile: Profile of ideal/best customers
- topCustomerRevenueConcentration: Revenue concentration in top customers
- customerSpendElsewhere: What customers spend on with other vendors
- topComplaints: Top customer complaints
- churnReasons: Why customers leave
- upsellHistory: Past upsell/cross-sell successes
- referralBehavior: How customers refer others
- wrongFitCustomers: Customers that are a bad fit
- customerBaseTrajectory: Whether customer base is growing/shrinking
- prioritySegment: Priority customer segment for growth

Available fields (Track C — Strategic Context):
- primaryGoal: Primary expansion goal
- availableCapital: Capital available for expansion
- canOperateWithoutNewHire: Whether expansion is possible without new hires
- riskTolerance: Risk appetite for expansion
- timeConstraints: Timeline pressures or windows
- explicitAvoidances: Things they will not do
- competitorConcerns: Competitive threats
- twoYearVision: Where they see the business in 2 years
- suppressedIdea: Expansion idea they haven't mentioned
- worstCaseScenario: Worst-case scenario thinking

Only include fields where you can extract clear, specific information. Return {} if nothing can be extracted.`;

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
      functionName: 'extractExpandDataPoints',
      model: EXTRACTION_MODEL,
    });

    const content = response.output_text;
    if (!content) return {};

    const extracted = JSON.parse(content);
    const result: Partial<Record<keyof ExpandDataPoints, DataPoint>> = {};

    for (const [key, data] of Object.entries(extracted)) {
      if (EXPAND_DATA_POINT_FIELDS.includes(key as (typeof EXPAND_DATA_POINT_FIELDS)[number]) && data && typeof data === 'object') {
        const dataObj = data as { value?: string; source?: string };
        if (dataObj.value) {
          result[key as keyof ExpandDataPoints] = {
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
    console.error('[Expand Interview AI] Error extracting data points:', error);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Merge Utility
// ---------------------------------------------------------------------------

/** Merge new extracted Expand data with existing data. */
export function mergeExpandCollectedData(
  existing: Partial<ExpandDataPoints> | null,
  newData: Partial<Record<keyof ExpandDataPoints, DataPoint>>,
  currentTurn: number
): Partial<ExpandDataPoints> {
  const merged = { ...(existing || {}) };

  for (const [key, dataPoint] of Object.entries(newData)) {
    if (dataPoint && dataPoint.value) {
      merged[key as keyof ExpandDataPoints] = {
        ...dataPoint,
        turn: currentTurn,
      };
    }
  }

  return merged;
}
