import { openai, getAIParams, createResponsesParams } from '../lib/openai';
import type { SubscriptionTier } from '@prisma/client';
import { getResearchKnowledge, getContentGuidelines, KNOWLEDGE } from '../lib/knowledge';
import type { InterviewDataPoints } from '@forge/shared';
import {
  getTrendData,
  compareTrends,
  batchGetTrendData,
  isSerpApiConfigured,
  type TrendData,
  type TrendComparison,
} from '../lib/serpapi';

// Model for research tasks
const RESEARCH_MODEL = 'gpt-5.2';

// Types for research pipeline
export interface ResearchInput {
  ideaTitle: string;
  ideaDescription: string;
  interviewData: Partial<InterviewDataPoints> | null;
  interviewMessages: Array<{ role: string; content: string }>;
}

export interface GeneratedQueries {
  marketQueries: string[];
  competitorQueries: string[];
  customerQueries: string[];
  trendQueries: string[];
}

export interface SynthesizedInsights {
  marketAnalysis: {
    size: string;
    growth: string;
    trends: string[];
    opportunities: string[];
    threats: string[];
  };
  competitors: Array<{
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    positioning: string;
  }>;
  painPoints: Array<{
    problem: string;
    severity: 'high' | 'medium' | 'low';
    currentSolutions: string[];
    gaps: string[];
  }>;
  positioning: {
    uniqueValueProposition: string;
    targetAudience: string;
    differentiators: string[];
    messagingPillars: string[];
  };
  whyNow: {
    marketTriggers: string[];
    timingFactors: string[];
    urgencyScore: number;
  };
  proofSignals: {
    demandIndicators: string[];
    validationOpportunities: string[];
    riskFactors: string[];
  };
  keywords: {
    primary: string[];
    secondary: string[];
    longTail: string[];
  };
}

// Individual score with justification
export interface ScoreWithJustification {
  score: number;
  justification: string;
  confidence: 'high' | 'medium' | 'low';
}

// Raw scores from a single AI pass (internal)
interface RawScorePass {
  opportunityScore: number;
  opportunityJustification: string;
  problemScore: number;
  problemJustification: string;
  feasibilityScore: number;
  feasibilityJustification: string;
  whyNowScore: number;
  whyNowJustification: string;
}

// Final validated scores with justifications and metadata
export interface ResearchScores {
  opportunityScore: number;
  problemScore: number;
  feasibilityScore: number;
  whyNowScore: number;
  // Justifications explaining WHY each score was given
  justifications: {
    opportunity: ScoreWithJustification;
    problem: ScoreWithJustification;
    feasibility: ScoreWithJustification;
    whyNow: ScoreWithJustification;
  };
  // Metadata about scoring reliability
  metadata: {
    passCount: number;           // Number of scoring passes run
    maxDeviation: number;        // Largest deviation between passes
    averageConfidence: number;   // 0-100, based on pass consistency
    flagged: boolean;            // True if scores had high variance
    flagReason?: string;         // Explanation if flagged
  };
}

export interface BusinessMetrics {
  revenuePotential: {
    rating: 'high' | 'medium' | 'low';
    estimate: string;
    confidence: number;
  };
  executionDifficulty: {
    rating: 'easy' | 'moderate' | 'hard';
    factors: string[];
    soloFriendly: boolean;
  };
  gtmClarity: {
    rating: 'clear' | 'moderate' | 'unclear';
    channels: string[];
    confidence: number;
  };
  founderFit: {
    percentage: number;
    strengths: string[];
    gaps: string[];
  };
}

// User Story - AI-generated narrative about the problem/solution
export interface UserStory {
  scenario: string;
  protagonist: string;
  problem: string;
  solution: string;
  outcome: string;
}

// Keyword Trends - for the chart display
export interface KeywordTrend {
  keyword: string;
  volume: number;
  growth: number;
  trend: number[];
}

// Value Ladder - offer tiers
export interface OfferTier {
  tier: 'lead_magnet' | 'frontend' | 'core' | 'backend';
  label: string;
  title: string;
  price: string;
  description: string;
}

// Action Prompts - copyable prompts for users
export interface ActionPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
}

// Social Proof - from social media (MVP: AI-simulated)
export interface SocialProofPost {
  platform: 'reddit' | 'facebook' | 'twitter';
  author: string;
  content: string;
  url: string;
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    upvotes?: number;
  };
  date: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
}

export interface SocialProof {
  posts: SocialProofPost[];
  summary: string;
  painPointsValidated: string[];
  demandSignals: string[];
}

// Phase 1: Generate search queries from interview data
export async function generateSearchQueries(
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<GeneratedQueries> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  const prompt = `You are a market research expert. Based on the business idea and interview data, generate targeted search queries for comprehensive market research.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

Generate search queries in these categories:
1. Market queries - to understand market size, trends, and dynamics
2. Competitor queries - to find and analyze competitors
3. Customer queries - to understand target customer behavior and needs
4. Trend queries - to identify market timing and emerging opportunities

Return a JSON object with this structure:
{
  "marketQueries": ["query1", "query2", ...],
  "competitorQueries": ["query1", "query2", ...],
  "customerQueries": ["query1", "query2", ...],
  "trendQueries": ["query1", "query2", ...]
}

Generate 3-5 specific, actionable queries per category.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('searchQueries', tier);

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 1000,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to generate search queries');
  }

  return JSON.parse(content) as GeneratedQueries;
}

// Phase 2: Synthesize insights from interview data (MVP - no external APIs)
export async function synthesizeInsights(
  input: ResearchInput,
  queries: GeneratedQueries,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SynthesizedInsights> {
  console.log('[synthesizeInsights] Starting...');
  const { ideaTitle, ideaDescription, interviewData, interviewMessages } = input;

  // Build context from interview
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  console.log('[synthesizeInsights] Interview context length:', interviewContext.length);

  // Get knowledge-based guardrails
  console.log('[synthesizeInsights] Getting research knowledge...');
  const researchKnowledge = getResearchKnowledge();
  console.log('[synthesizeInsights] Research knowledge length:', researchKnowledge.length);

  const prompt = `${researchKnowledge}

---

You are a senior business analyst conducting market research synthesis. Based on the business idea, interview insights, and research queries, synthesize comprehensive market insights.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

COLLECTED DATA FROM INTERVIEW:
${JSON.stringify(interviewData, null, 2)}

INTERVIEW TRANSCRIPT:
${interviewContext}

RESEARCH QUERIES TO CONSIDER:
${JSON.stringify(queries, null, 2)}

Synthesize insights and return a JSON object with this exact structure:
{
  "marketAnalysis": {
    "size": "Estimated market size description",
    "growth": "Growth trajectory description",
    "trends": ["trend1", "trend2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  },
  "competitors": [
    {
      "name": "Competitor name or type",
      "description": "Brief description",
      "strengths": ["strength1"],
      "weaknesses": ["weakness1"],
      "positioning": "How they position themselves"
    }
  ],
  "painPoints": [
    {
      "problem": "Problem description",
      "severity": "high|medium|low",
      "currentSolutions": ["solution1"],
      "gaps": ["gap1"]
    }
  ],
  "positioning": {
    "uniqueValueProposition": "Clear UVP statement",
    "targetAudience": "Specific target description",
    "differentiators": ["diff1", "diff2"],
    "messagingPillars": ["pillar1", "pillar2"]
  },
  "whyNow": {
    "marketTriggers": ["trigger1"],
    "timingFactors": ["factor1"],
    "urgencyScore": 75
  },
  "proofSignals": {
    "demandIndicators": ["indicator1"],
    "validationOpportunities": ["opportunity1"],
    "riskFactors": ["risk1"]
  },
  "keywords": {
    "primary": ["keyword1"],
    "secondary": ["keyword1"],
    "longTail": ["long tail phrase"]
  }
}

Be specific and actionable. Use the interview data to inform your analysis.`;

  console.log('[synthesizeInsights] Prompt length:', prompt.length);
  console.log('[synthesizeInsights] Calling OpenAI API with model:', RESEARCH_MODEL);

  // Get tier-based AI parameters
  const aiParams = getAIParams('synthesizeInsights', tier);
  console.log('[synthesizeInsights] Tier:', tier, '| Reasoning:', aiParams.reasoning, '| Verbosity:', aiParams.verbosity);

  // Start a heartbeat to show the API call is in progress
  const startTime = Date.now();
  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[synthesizeInsights] Still waiting for API response... (${elapsed}s elapsed)`);
  }, 10000); // Log every 10 seconds

  try {
    // Use Responses API for GPT-5.2 reasoning support
    const response = await openai.responses.create(
      createResponsesParams({
        model: RESEARCH_MODEL,
        input: prompt,
        response_format: { type: 'json_object' },
        max_output_tokens: 3000,
      }, aiParams)
    );

    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[synthesizeInsights] API response received after ${elapsed}s`);
    console.log('[synthesizeInsights] Usage:', response.usage);

    const content = response.output_text;
    if (!content) {
      console.error('[synthesizeInsights] No content in response');
      throw new Error('Failed to synthesize insights');
    }

    console.log('[synthesizeInsights] Content length:', content.length);
    const parsed = JSON.parse(content) as SynthesizedInsights;
    console.log('[synthesizeInsights] Successfully parsed response');
    return parsed;
  } catch (error) {
    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[synthesizeInsights] Error after ${elapsed}s:`, error);
    throw error;
  }
}

// Helper: Clamp score to valid 0-100 range
function clampScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 50; // Default to middle if invalid
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Helper: Calculate standard deviation
function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n);
}

// Helper: Run a single scoring pass
async function runSingleScoringPass(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier,
  passNumber: number
): Promise<RawScorePass> {
  const { ideaTitle, ideaDescription, interviewData } = input;
  const { scoringCriteria } = KNOWLEDGE.research;

  const prompt = `You are evaluating a business idea based on research insights. Score the following dimensions from 0-100.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

RESEARCH INSIGHTS:
${JSON.stringify(insights, null, 2)}

## SCORING CRITERIA

Use these criteria to determine scores:

**Opportunity Score (0-100):**
${Object.entries(scoringCriteria.opportunityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Problem Score (0-100):**
${Object.entries(scoringCriteria.problemScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Feasibility Score (0-100):**
${Object.entries(scoringCriteria.feasibilityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Why Now Score (0-100):**
${Object.entries(scoringCriteria.whyNowScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

IMPORTANT: For each score, you MUST provide a justification explaining:
1. What specific evidence from the data supports this score
2. What factors pulled the score up or down
3. What uncertainties or gaps exist in the data

Return a JSON object with this EXACT structure:
{
  "opportunityScore": number (0-100),
  "opportunityJustification": "2-3 sentences explaining why this score",
  "problemScore": number (0-100),
  "problemJustification": "2-3 sentences explaining why this score",
  "feasibilityScore": number (0-100),
  "feasibilityJustification": "2-3 sentences explaining why this score",
  "whyNowScore": number (0-100),
  "whyNowJustification": "2-3 sentences explaining why this score"
}

Be realistic and data-driven in your scoring. Don't inflate scores - be honest about limitations.
This is scoring pass ${passNumber} - evaluate independently without bias.`;

  const aiParams = getAIParams('calculateScores', tier);

  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 1500,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error(`Failed to calculate scores (pass ${passNumber})`);
  }

  return JSON.parse(content) as RawScorePass;
}

// Phase 3: Calculate research scores with multi-pass validation
export async function calculateScores(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<ResearchScores> {
  const PASS_COUNT = 3; // Number of scoring passes
  const DEVIATION_THRESHOLD = 15; // Flag if any score deviates more than this

  console.log(`[calculateScores] Running ${PASS_COUNT} scoring passes for reliability...`);

  // Run multiple passes in parallel for efficiency
  const passPromises = Array.from({ length: PASS_COUNT }, (_, i) =>
    runSingleScoringPass(input, insights, tier, i + 1)
  );

  const passes = await Promise.all(passPromises);
  console.log(`[calculateScores] All ${PASS_COUNT} passes complete`);

  // Extract scores from each pass
  const opportunityScores = passes.map(p => clampScore(p.opportunityScore));
  const problemScores = passes.map(p => clampScore(p.problemScore));
  const feasibilityScores = passes.map(p => clampScore(p.feasibilityScore));
  const whyNowScores = passes.map(p => clampScore(p.whyNowScore));

  // Calculate averages
  const avgOpportunity = Math.round(opportunityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgProblem = Math.round(problemScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgFeasibility = Math.round(feasibilityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgWhyNow = Math.round(whyNowScores.reduce((a, b) => a + b, 0) / PASS_COUNT);

  // Calculate deviations
  const deviations = [
    Math.max(...opportunityScores) - Math.min(...opportunityScores),
    Math.max(...problemScores) - Math.min(...problemScores),
    Math.max(...feasibilityScores) - Math.min(...feasibilityScores),
    Math.max(...whyNowScores) - Math.min(...whyNowScores),
  ];
  const maxDeviation = Math.max(...deviations);

  // Calculate confidence based on consistency
  const avgStdDev = (
    standardDeviation(opportunityScores) +
    standardDeviation(problemScores) +
    standardDeviation(feasibilityScores) +
    standardDeviation(whyNowScores)
  ) / 4;

  // Lower std dev = higher confidence (0-100 scale)
  // stdDev of 0 = 100% confidence, stdDev of 20+ = ~50% confidence
  const averageConfidence = Math.round(Math.max(50, 100 - avgStdDev * 2.5));

  // Determine confidence level for each score based on its specific deviation
  const getConfidenceLevel = (scores: number[]): 'high' | 'medium' | 'low' => {
    const dev = Math.max(...scores) - Math.min(...scores);
    if (dev <= 5) return 'high';
    if (dev <= 12) return 'medium';
    return 'low';
  };

  // Check if flagging is needed
  const flagged = maxDeviation > DEVIATION_THRESHOLD;
  const flagReason = flagged
    ? `Scores varied by up to ${maxDeviation} points between passes, indicating uncertainty. Review justifications carefully.`
    : undefined;

  if (flagged) {
    console.warn(`[calculateScores] WARNING: High variance detected (max deviation: ${maxDeviation})`);
    console.log(`[calculateScores] Opportunity: ${opportunityScores.join(', ')} → avg ${avgOpportunity}`);
    console.log(`[calculateScores] Problem: ${problemScores.join(', ')} → avg ${avgProblem}`);
    console.log(`[calculateScores] Feasibility: ${feasibilityScores.join(', ')} → avg ${avgFeasibility}`);
    console.log(`[calculateScores] WhyNow: ${whyNowScores.join(', ')} → avg ${avgWhyNow}`);
  }

  // Use the justification from the pass closest to the average for each score
  const findBestJustification = (scores: number[], avg: number, getJustification: (p: RawScorePass) => string): string => {
    let minDiff = Infinity;
    let bestIdx = 0;
    scores.forEach((score, idx) => {
      const diff = Math.abs(score - avg);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    return getJustification(passes[bestIdx]);
  };

  const result: ResearchScores = {
    opportunityScore: avgOpportunity,
    problemScore: avgProblem,
    feasibilityScore: avgFeasibility,
    whyNowScore: avgWhyNow,
    justifications: {
      opportunity: {
        score: avgOpportunity,
        justification: findBestJustification(opportunityScores, avgOpportunity, p => p.opportunityJustification),
        confidence: getConfidenceLevel(opportunityScores),
      },
      problem: {
        score: avgProblem,
        justification: findBestJustification(problemScores, avgProblem, p => p.problemJustification),
        confidence: getConfidenceLevel(problemScores),
      },
      feasibility: {
        score: avgFeasibility,
        justification: findBestJustification(feasibilityScores, avgFeasibility, p => p.feasibilityJustification),
        confidence: getConfidenceLevel(feasibilityScores),
      },
      whyNow: {
        score: avgWhyNow,
        justification: findBestJustification(whyNowScores, avgWhyNow, p => p.whyNowJustification),
        confidence: getConfidenceLevel(whyNowScores),
      },
    },
    metadata: {
      passCount: PASS_COUNT,
      maxDeviation,
      averageConfidence,
      flagged,
      flagReason,
    },
  };

  console.log(`[calculateScores] Final scores: O=${avgOpportunity}, P=${avgProblem}, F=${avgFeasibility}, W=${avgWhyNow}`);
  console.log(`[calculateScores] Confidence: ${averageConfidence}%, Flagged: ${flagged}`);

  return result;
}

// Phase 4: Calculate business metrics
export async function calculateBusinessMetrics(
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<BusinessMetrics> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  const prompt = `You are evaluating business viability metrics for a startup idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

RESEARCH INSIGHTS:
${JSON.stringify(insights, null, 2)}

SCORES:
${JSON.stringify(scores, null, 2)}

Evaluate these business metrics and return a JSON object:
{
  "revenuePotential": {
    "rating": "high|medium|low",
    "estimate": "Revenue estimate description (e.g., '$10K-50K MRR potential')",
    "confidence": 0-100
  },
  "executionDifficulty": {
    "rating": "easy|moderate|hard",
    "factors": ["factor1", "factor2"],
    "soloFriendly": true|false
  },
  "gtmClarity": {
    "rating": "clear|moderate|unclear",
    "channels": ["channel1", "channel2"],
    "confidence": 0-100
  },
  "founderFit": {
    "percentage": 0-100,
    "strengths": ["strength1"],
    "gaps": ["gap1"]
  }
}

Be realistic and consider the founder's background if mentioned in the interview data.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('businessMetrics', tier);

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 1000,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to calculate business metrics');
  }

  return JSON.parse(content) as BusinessMetrics;
}

// Phase 5: Generate user story
export async function generateUserStory(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<UserStory> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  // Get content guidelines from knowledge.json
  const userStoryGuidelines = KNOWLEDGE.contentGuidelines.userStory;

  const prompt = `You are a storytelling expert. Create a compelling user story that illustrates the problem and solution for this business idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

TARGET AUDIENCE: ${insights.positioning.targetAudience}
PAIN POINTS: ${JSON.stringify(insights.painPoints, null, 2)}
SOLUTION VALUE: ${insights.positioning.uniqueValueProposition}

## QUALITY GUIDELINES
${userStoryGuidelines.requirements.map(r => `- ${r}`).join('\n')}

GOOD EXAMPLE: "${userStoryGuidelines.example.good}"
BAD EXAMPLE (avoid this): "${userStoryGuidelines.example.bad}"

Create a relatable, specific user story. Return a JSON object:
{
  "scenario": "A concise narrative (MAX 200 WORDS) that tells the full story - the protagonist's situation, their struggle with the problem, discovering and using the solution, and the positive outcome. Make it vivid and relatable but keep it tight.",
  "protagonist": "Who the user is (e.g., 'Sarah, a busy marketing manager at a tech startup')",
  "problem": "The specific pain they experience in 1-2 sentences",
  "solution": "How this product/service solves their problem in 1-2 sentences",
  "outcome": "The transformation and results they achieve in 1-2 sentences"
}

Make the story feel real and emotionally resonant. Use specific details.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('userStory', tier);

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 1500,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to generate user story');
  }

  return JSON.parse(content) as UserStory;
}

// Keyword trends configuration
const MIN_KEYWORD_VOLUME = 500;    // Minimum volume threshold for keyword trends
const TARGET_KEYWORD_COUNT = 5;    // Target number of solid results
const MAX_RETRY_BATCHES = 3;       // Maximum batch attempts to prevent infinite loops

// Phase 6: Generate keyword trends with volume/growth data
// Uses SerpAPI for real Google Trends data only - no AI fallback
// Implements retry loop to fetch keywords until TARGET_KEYWORD_COUNT solid results
export async function generateKeywordTrends(
  _input: ResearchInput,
  insights: SynthesizedInsights,
  _tier: SubscriptionTier = 'ENTERPRISE'
): Promise<KeywordTrend[]> {
  if (!isSerpApiConfigured()) {
    console.log('[Research Pipeline] SerpAPI not configured - skipping keyword trends');
    return [];
  }

  // Build full keyword pool in priority order (primary → secondary → longTail)
  const allKeywords = [
    ...insights.keywords.primary,
    ...insights.keywords.secondary,
    ...insights.keywords.longTail,
  ];

  // Remove duplicates while preserving priority order
  const keywordPool = [...new Set(allKeywords)];

  if (keywordPool.length === 0) {
    console.log('[Research Pipeline] No keywords available for trend research');
    return [];
  }

  const solidResults: KeywordTrend[] = [];
  const triedKeywords = new Set<string>();
  let batchCount = 0;

  console.log(
    `[Research Pipeline] Starting keyword trends loop. Pool: ${keywordPool.length} keywords, Target: ${TARGET_KEYWORD_COUNT}`
  );

  // Keep fetching batches until we have enough solid results or exhaust options
  while (solidResults.length < TARGET_KEYWORD_COUNT && batchCount < MAX_RETRY_BATCHES) {
    batchCount++;

    // Get next batch of untried keywords (fetch a few extra to account for filtering)
    const batchSize = Math.min(5, TARGET_KEYWORD_COUNT - solidResults.length + 2);
    const nextBatch = keywordPool.filter((kw) => !triedKeywords.has(kw)).slice(0, batchSize);

    if (nextBatch.length === 0) {
      console.log('[Research Pipeline] Exhausted all available keywords');
      break;
    }

    // Mark keywords as tried
    nextBatch.forEach((kw) => triedKeywords.add(kw));

    console.log(`[Research Pipeline] Batch ${batchCount}: Trying ${nextBatch.length} keywords...`);

    try {
      // 5 minute timeout per batch
      const results = await Promise.race([
        batchGetTrendData(nextBatch, {
          geo: 'US',
          timeRange: 'today 5-y',
          delayMs: 500,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SerpAPI batch timeout')), 300000)
        ),
      ]);

      for (const [keyword, result] of results) {
        if (result instanceof Error) {
          console.warn(`[Research Pipeline] SerpAPI error for "${keyword}":`, result.message);
          continue;
        }

        const trendData = result as TrendData;
        const timelineValues = trendData.interestOverTime.map((p) => p.value);
        const trend = timelineValues.length > 0 ? timelineValues : Array(60).fill(50);

        // Calculate growth: compare first year avg vs last year avg
        const dataLength = trend.length;
        const yearSize = Math.min(12, Math.floor(dataLength / 2));
        const firstYear = trend.slice(0, yearSize);
        const lastYear = trend.slice(-yearSize);
        const firstAvg = firstYear.reduce((a, b) => a + b, 0) / firstYear.length;
        const lastAvg = lastYear.reduce((a, b) => a + b, 0) / lastYear.length;

        let growth: number;
        if (firstAvg > 0) {
          growth = Math.round(((lastAvg - firstAvg) / firstAvg) * 100);
        } else if (lastAvg > 0) {
          growth = 500; // Emerging trend indicator
        } else {
          growth = 0;
        }

        const avgInterest = trendData.averageInterest;
        const estimatedVolume = estimateSearchVolume(avgInterest, keyword);

        // Only add if meets volume threshold
        if (estimatedVolume >= MIN_KEYWORD_VOLUME) {
          solidResults.push({
            keyword,
            volume: estimatedVolume,
            growth,
            trend: trend.map((v) => Math.round((v / 100) * estimatedVolume)),
          });
          console.log(`[Research Pipeline] ✓ "${keyword}" - Volume: ${estimatedVolume}`);

          // Early exit if we've reached our target
          if (solidResults.length >= TARGET_KEYWORD_COUNT) {
            break;
          }
        } else {
          console.log(
            `[Research Pipeline] ✗ "${keyword}" - Volume ${estimatedVolume} below threshold (${MIN_KEYWORD_VOLUME})`
          );
        }
      }
    } catch (error) {
      console.error(`[Research Pipeline] Batch ${batchCount} failed:`, error);
      // Continue to next batch on error
    }
  }

  console.log(
    `[Research Pipeline] Completed with ${solidResults.length} solid results after ${batchCount} batch(es)`
  );
  return solidResults;
}

/**
 * Interpolate an array of values to exactly 12 points
 */
function interpolateTo12Points(values: number[]): number[] {
  if (values.length === 12) return values;
  if (values.length === 0) return Array(12).fill(0);

  const result: number[] = [];
  const step = (values.length - 1) / 11;

  for (let i = 0; i < 12; i++) {
    const index = i * step;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex || upperIndex >= values.length) {
      result.push(values[lowerIndex]);
    } else {
      const fraction = index - lowerIndex;
      result.push(
        Math.round(values[lowerIndex] * (1 - fraction) + values[upperIndex] * fraction)
      );
    }
  }

  return result;
}

/**
 * Estimate monthly search volume from Google Trends interest score (0-100)
 * This is a rough approximation since Google Trends doesn't provide absolute volumes
 */
function estimateSearchVolume(interest: number, keyword: string): number {
  // Base multiplier - higher interest suggests higher volume
  // This is a heuristic based on typical keyword volume ranges
  const wordCount = keyword.split(' ').length;

  // Long-tail keywords (3+ words) typically have lower volume
  let baseMultiplier: number;
  if (wordCount >= 4) {
    baseMultiplier = 100; // Long-tail: 0-10,000
  } else if (wordCount >= 2) {
    baseMultiplier = 500; // Mid-tail: 0-50,000
  } else {
    baseMultiplier = 2000; // Head terms: 0-200,000
  }

  // Scale by interest (0-100 from Google Trends)
  const volume = Math.round((interest / 100) * baseMultiplier * (50 + Math.random() * 50));

  // Ensure minimum volume
  return Math.max(volume, 100);
}

// Phase 7: Generate value ladder (offer tiers)
export async function generateValueLadder(
  input: ResearchInput,
  insights: SynthesizedInsights,
  metrics: BusinessMetrics,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<OfferTier[]> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  const prompt = `You are a business strategist specializing in pricing and offer design. Create a value ladder for this business idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

REVENUE MODEL FROM INTERVIEW:
${JSON.stringify(interviewData?.revenue_model || 'Not specified', null, 2)}

PRICING INFO FROM INTERVIEW:
${JSON.stringify(interviewData?.pricing_strategy || 'Not specified', null, 2)}
${JSON.stringify(interviewData?.price_point || 'Not specified', null, 2)}

REVENUE POTENTIAL: ${metrics.revenuePotential.estimate}
TARGET AUDIENCE: ${insights.positioning.targetAudience}

Create a 3-4 tier value ladder. Return a JSON object:
{
  "tiers": [
    {
      "tier": "lead_magnet",
      "label": "LEAD MAGNET",
      "title": "Free Tool/Resource Name",
      "price": "Free",
      "description": "A compelling free offer that demonstrates value (50-100 chars)"
    },
    {
      "tier": "frontend",
      "label": "FRONTEND",
      "title": "Entry-Level Product Name",
      "price": "$XX/month or $XX one-time",
      "description": "Low-friction entry point (50-100 chars)"
    },
    {
      "tier": "core",
      "label": "CORE",
      "title": "Main Product Name",
      "price": "$XXX/month or $XXX one-time",
      "description": "Your main revenue driver (50-100 chars)"
    },
    {
      "tier": "backend",
      "label": "BACKEND",
      "title": "Premium/Enterprise Offer",
      "price": "$XXXX+ or Custom",
      "description": "High-ticket offer for serious customers (50-100 chars)"
    }
  ]
}

Make prices realistic for the market and value delivered.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('valueLadder', tier);

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 1500,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to generate value ladder');
  }

  const result = JSON.parse(content) as { tiers: OfferTier[] };
  return result.tiers;
}

// Phase 8: Generate action prompts
export async function generateActionPrompts(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<ActionPrompt[]> {
  const { ideaTitle, ideaDescription } = input;

  const prompt = `You are a startup advisor. Generate actionable AI prompts that the founder can copy and use to build their business.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

POSITIONING: ${insights.positioning.uniqueValueProposition}
TARGET AUDIENCE: ${insights.positioning.targetAudience}
GTM CHANNELS: ${insights.positioning.messagingPillars.join(', ')}

Generate 4-5 useful prompts. Return a JSON object:
{
  "prompts": [
    {
      "id": "landing-page",
      "title": "Landing Page Copy",
      "description": "Generate compelling landing page content",
      "prompt": "Write a high-converting landing page for [product]. Target audience: [audience]. Key value proposition: [UVP]. Include: headline, subheadline, 3 benefit sections, social proof section, and CTA.",
      "category": "marketing"
    },
    {
      "id": "ad-copy",
      "title": "Ad Creatives",
      "description": "Create Facebook/Google ad copy",
      "prompt": "...",
      "category": "marketing"
    }
  ]
}

Categories: marketing, sales, product, content, strategy
Fill in the [brackets] with specific details from the business idea.
Make prompts immediately usable - specific and actionable.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('actionPrompts', tier);

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 4000,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to generate action prompts');
  }

  const result = JSON.parse(content) as { prompts: ActionPrompt[] };
  return result.prompts;
}

// Phase 9: Generate social proof (MVP: AI-simulated)
export async function generateSocialProof(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SocialProof> {
  const { ideaTitle, ideaDescription } = input;

  // Get social proof guidelines from knowledge.json
  const socialProofGuidelines = KNOWLEDGE.socialProof;

  const prompt = `You are simulating social media research data. Generate realistic-looking social media posts that represent what real people might be saying about the problem this business solves.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

PAIN POINTS:
${JSON.stringify(insights.painPoints, null, 2)}

TARGET AUDIENCE: ${insights.positioning.targetAudience}

## AUTHENTICITY REQUIREMENTS
${socialProofGuidelines.requirements.map(r => `- ${r}`).join('\n')}

Generate simulated social proof data. Return a JSON object:
{
  "posts": [
    {
      "platform": "reddit",
      "author": "u/realistic_username",
      "content": "A realistic post about the pain point (100-200 chars). Should sound like real people venting or asking for solutions.",
      "url": "https://reddit.com/r/relevant_subreddit/comments/abc123",
      "engagement": {
        "upvotes": 234,
        "comments": 45
      },
      "date": "2024-01-15",
      "sentiment": "negative",
      "relevanceScore": 85
    },
    {
      "platform": "twitter",
      "author": "@realistic_handle",
      "content": "Tweet about the problem or a workaround (under 280 chars)",
      "url": "https://twitter.com/handle/status/123456",
      "engagement": {
        "likes": 89,
        "comments": 12,
        "shares": 23
      },
      "date": "2024-02-20",
      "sentiment": "neutral",
      "relevanceScore": 72
    }
  ],
  "summary": "A 2-3 sentence summary of what people are saying online about this problem. Highlight common themes.",
  "painPointsValidated": ["Pain point 1 that is confirmed by social data", "Pain point 2"],
  "demandSignals": ["Signal 1 indicating market demand", "Signal 2"]
}

Generate 4-6 realistic posts across reddit, twitter, and facebook.
Make the content sound authentic - including typos, casual language, and real frustrations.
Dates should be within the last 6 months.`;

  // Get tier-based AI parameters
  const aiParams = getAIParams('socialProof', tier);

  // Use Responses API for GPT-5.2 reasoning support
  const response = await openai.responses.create(
    createResponsesParams({
      model: RESEARCH_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 2500,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to generate social proof');
  }

  return JSON.parse(content) as SocialProof;
}

// Main pipeline function - runs all phases
export async function runResearchPipeline(
  input: ResearchInput,
  onProgress?: (phase: string, progress: number) => Promise<void>,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<{
  queries: GeneratedQueries;
  insights: SynthesizedInsights;
  scores: ResearchScores;
  metrics: BusinessMetrics;
  userStory: UserStory;
  keywordTrends: KeywordTrend[];
  valueLadder: OfferTier[];
  actionPrompts: ActionPrompt[];
  socialProof: SocialProof;
}> {
  console.log('[Research Pipeline] Starting for:', input.ideaTitle);
  console.log('[Research Pipeline] Using tier:', tier);

  // Phase 1: Generate queries
  await onProgress?.('QUERY_GENERATION', 5);
  console.log('[Research Pipeline] Phase 1: Generating search queries...');
  const queries = await generateSearchQueries(input, tier);
  await onProgress?.('QUERY_GENERATION', 10);
  console.log('[Research Pipeline] Queries generated:', Object.keys(queries).length, 'categories');

  // Phase 2: Synthesize insights (MVP - uses interview data, no external APIs)
  await onProgress?.('SYNTHESIS', 15);
  console.log('[Research Pipeline] Phase 2: Synthesizing insights...');
  const insights = await synthesizeInsights(input, queries, tier);
  await onProgress?.('SYNTHESIS', 30);
  console.log('[Research Pipeline] Insights synthesized');

  // Phase 3: Calculate scores
  await onProgress?.('SYNTHESIS', 35);
  console.log('[Research Pipeline] Phase 3: Calculating scores...');
  const scores = await calculateScores(input, insights, tier);
  await onProgress?.('SYNTHESIS', 45);
  console.log('[Research Pipeline] Scores:', scores);

  // Phase 4: Calculate business metrics
  await onProgress?.('SYNTHESIS', 50);
  console.log('[Research Pipeline] Phase 4: Calculating business metrics...');
  const metrics = await calculateBusinessMetrics(input, insights, scores, tier);
  await onProgress?.('SYNTHESIS', 55);
  console.log('[Research Pipeline] Metrics calculated');

  // Phase 5: Generate user story
  await onProgress?.('REPORT_GENERATION', 60);
  console.log('[Research Pipeline] Phase 5: Generating user story...');
  const userStory = await generateUserStory(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 65);
  console.log('[Research Pipeline] User story generated');

  // Phase 6: Generate keyword trends
  await onProgress?.('REPORT_GENERATION', 70);
  console.log('[Research Pipeline] Phase 6: Generating keyword trends...');
  const keywordTrends = await generateKeywordTrends(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 75);
  console.log('[Research Pipeline] Keyword trends generated:', keywordTrends.length, 'keywords');

  // Phase 7: Generate value ladder
  await onProgress?.('REPORT_GENERATION', 80);
  console.log('[Research Pipeline] Phase 7: Generating value ladder...');
  const valueLadder = await generateValueLadder(input, insights, metrics, tier);
  await onProgress?.('REPORT_GENERATION', 85);
  console.log('[Research Pipeline] Value ladder generated:', valueLadder.length, 'tiers');

  // Phase 8: Generate action prompts
  await onProgress?.('REPORT_GENERATION', 88);
  console.log('[Research Pipeline] Phase 8: Generating action prompts...');
  const actionPrompts = await generateActionPrompts(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 92);
  console.log('[Research Pipeline] Action prompts generated:', actionPrompts.length, 'prompts');

  // Phase 9: Generate social proof
  await onProgress?.('REPORT_GENERATION', 95);
  console.log('[Research Pipeline] Phase 9: Generating social proof...');
  const socialProof = await generateSocialProof(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 98);
  console.log('[Research Pipeline] Social proof generated:', socialProof.posts.length, 'posts');

  await onProgress?.('COMPLETE', 100);
  console.log('[Research Pipeline] Complete!');

  return {
    queries,
    insights,
    scores,
    metrics,
    userStory,
    keywordTrends,
    valueLadder,
    actionPrompts,
    socialProof,
  };
}
