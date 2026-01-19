import { openai, getAIParams, createResponsesParams, createResponsesParamsWithWebSearch } from '../lib/openai';
import type { SubscriptionTier } from '@prisma/client';
import { getResearchKnowledge, KNOWLEDGE } from '../lib/knowledge';
import type { InterviewDataPoints } from '@forge/shared';
import {
  batchGetTrendData,
  isSerpApiConfigured,
  type TrendData,
} from '../lib/serpapi';
import {
  deepResearchClient,
  DEEP_RESEARCH_MODEL,
  DEEP_RESEARCH_MODEL_MINI,
  SEARCH_DOMAINS,
  createDeepResearchParams,
  parseDeepResearchResponse,
  type DeepResearchResult,
} from '../lib/deep-research';

// Model for post-processing tasks (interpreting research, generating reports)
const REPORT_MODEL = 'gpt-5.2';

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

// Social Proof - from real web search
export interface SocialProofPost {
  platform: 'reddit' | 'facebook' | 'twitter' | 'hackernews' | 'indiehackers' | 'producthunt' | 'linkedin';
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
  sources: string[]; // Real URLs from web search
}

// Deep Research Output - raw research from o3-deep-research
export interface DeepResearchOutput {
  rawReport: string;
  citations: Array<{ title: string; url: string; snippet?: string }>;
  sources: string[];
  searchQueriesUsed: string[];
}

// =============================================================================
// PHASE 1: DEEP RESEARCH (o3-deep-research with web_search)
// =============================================================================

/**
 * Run deep market research using o3-deep-research model with real web search.
 * This replaces the old query generation + synthesis phases with a single
 * comprehensive research call that searches the web for real market data.
 *
 * @param input Research input with idea and interview data
 * @param tier Subscription tier (FREE uses mini model, PRO/ENTERPRISE use full)
 * @returns Deep research output with raw report and citations
 */
export async function runDeepResearch(
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<DeepResearchOutput> {
  const { ideaTitle, ideaDescription, interviewData, interviewMessages } = input;

  console.log('[Deep Research] Starting comprehensive market research...');
  console.log('[Deep Research] Tier:', tier);

  // Select model based on tier (FREE uses cheaper mini model)
  const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
  console.log('[Deep Research] Using model:', model);

  // Build interview context
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  // Get knowledge-based research guidelines
  const researchKnowledge = getResearchKnowledge();

  // System prompt for the research analyst
  const systemPrompt = `${researchKnowledge}

---

You are a senior market research analyst conducting comprehensive research for a business idea validation.
Your task is to research the market opportunity, competitive landscape, customer pain points, and timing factors.

## RESEARCH OBJECTIVES
1. **Market Analysis** - Size the market, identify growth trends, key players, and market dynamics
2. **Competitive Landscape** - Find direct and indirect competitors, analyze their positioning, strengths, weaknesses
3. **Customer Pain Points** - Validate the problems being solved, find evidence of real customer frustration
4. **Why Now** - Identify market triggers, timing factors, and urgency indicators
5. **Proof Signals** - Find demand indicators, validation opportunities, and risk factors

## OUTPUT REQUIREMENTS
Provide a comprehensive research report with:
- Specific data points and statistics with sources
- Named competitors with their positioning and market share estimates
- Real examples of customer pain points from forums, reviews, or articles
- Market timing analysis with supporting evidence
- Actionable insights for a startup entering this market

Be thorough but focus on actionable intelligence. Cite your sources.`;

  // User query with all context
  const userQuery = `## BUSINESS IDEA
**Title:** ${ideaTitle}
**Description:** ${ideaDescription}

## INTERVIEW INSIGHTS
The founder has provided the following information through an AI interview:

${JSON.stringify(interviewData, null, 2)}

## INTERVIEW TRANSCRIPT
${interviewContext}

---

Please conduct comprehensive market research for this business idea. Search for:
1. Market size and growth data for this industry/niche
2. Existing competitors and alternatives (both direct and indirect)
3. Evidence of customer pain points (forum posts, reviews, complaints)
4. Market timing factors (recent changes, emerging trends, regulatory shifts)
5. Validation signals (demand indicators, successful similar products)

Provide specific, actionable insights with citations to help validate this business opportunity.`;

  // Create deep research request
  const researchDomains = [...SEARCH_DOMAINS.market, ...SEARCH_DOMAINS.competitor];

  const startTime = Date.now();
  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Deep Research] Still researching... (${elapsed}s elapsed)`);
  }, 30000); // Log every 30 seconds

  try {
    const params = createDeepResearchParams({
      model,
      systemPrompt,
      userQuery,
      domains: researchDomains,
    });

    console.log('[Deep Research] Calling API with web_search tool...');
    console.log('[Deep Research] Domains:', researchDomains.length, 'market + competitor domains');

    const response = await deepResearchClient.responses.create(params);

    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Deep Research] Research complete after ${elapsed}s`);

    // Parse the response to extract report and citations
    const result = parseDeepResearchResponse(response);

    console.log('[Deep Research] Report length:', result.content.length, 'chars');
    console.log('[Deep Research] Citations found:', result.citations.length);
    console.log('[Deep Research] Sources:', result.sources.length);

    return {
      rawReport: result.content,
      citations: result.citations,
      sources: result.sources,
      searchQueriesUsed: [], // Populated by the model during execution
    };
  } catch (error) {
    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[Deep Research] Error after ${elapsed}s:`, error);
    throw error;
  }
}

// =============================================================================
// PHASE 2: STRUCTURE EXTRACTION (GPT-5.2 post-processing)
// =============================================================================

/**
 * Extract structured insights from deep research report.
 * Uses GPT-5.2 to parse the raw research into SynthesizedInsights format.
 */
export async function extractInsights(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SynthesizedInsights> {
  console.log('[Extract Insights] Parsing deep research into structured format...');

  const prompt = `You are extracting structured data from a comprehensive market research report.

## ORIGINAL BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## DEEP RESEARCH REPORT
${deepResearch.rawReport}

## SOURCES CITED
${deepResearch.citations.map((c, i) => `[${i + 1}] ${c.title}: ${c.url}`).join('\n')}

---

Extract the key insights and return a structured JSON object with this exact format:
{
  "marketAnalysis": {
    "size": "Market size with specific numbers if available (e.g., '$4.2B in 2024, projected $8.1B by 2028')",
    "growth": "Growth trajectory with CAGR or % if available",
    "trends": ["trend1", "trend2", "trend3"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  },
  "competitors": [
    {
      "name": "Actual competitor name from research",
      "description": "What they do",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "positioning": "How they position in market"
    }
  ],
  "painPoints": [
    {
      "problem": "Specific pain point with evidence",
      "severity": "high|medium|low",
      "currentSolutions": ["How people currently solve this"],
      "gaps": ["What's missing from current solutions"]
    }
  ],
  "positioning": {
    "uniqueValueProposition": "Clear UVP based on research gaps",
    "targetAudience": "Specific target description",
    "differentiators": ["diff1", "diff2"],
    "messagingPillars": ["pillar1", "pillar2"]
  },
  "whyNow": {
    "marketTriggers": ["Recent market change or event"],
    "timingFactors": ["Why this is the right time"],
    "urgencyScore": 0-100
  },
  "proofSignals": {
    "demandIndicators": ["Evidence of demand from research"],
    "validationOpportunities": ["How to validate further"],
    "riskFactors": ["Identified risks"]
  },
  "keywords": {
    "primary": ["main keywords from research"],
    "secondary": ["related keywords"],
    "longTail": ["long tail phrases"]
  }
}

Use ONLY information from the research report. Be specific and cite findings where relevant.`;

  const aiParams = getAIParams('extractInsights', tier);

  const response = await openai.responses.create(
    createResponsesParams({
      model: REPORT_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 3500,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to extract insights from deep research');
  }

  console.log('[Extract Insights] Successfully parsed insights');
  return JSON.parse(content) as SynthesizedInsights;
}

/**
 * Calculate research scores from deep research report.
 * Uses multi-pass validation for reliability.
 */
export async function extractScores(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<ResearchScores> {
  const { scoringCriteria } = KNOWLEDGE.research;
  const PASS_COUNT = 3;
  const DEVIATION_THRESHOLD = 15;

  console.log(`[Extract Scores] Running ${PASS_COUNT} scoring passes...`);

  // Run scoring pass
  const runPass = async (passNumber: number): Promise<RawScorePass> => {
    const prompt = `You are scoring a business idea based on deep market research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## RESEARCH FINDINGS
${deepResearch.rawReport.substring(0, 4000)}... [truncated for scoring]

## STRUCTURED INSIGHTS
${JSON.stringify(insights, null, 2)}

## SCORING CRITERIA

**Opportunity Score (0-100):**
${Object.entries(scoringCriteria.opportunityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Problem Score (0-100):**
${Object.entries(scoringCriteria.problemScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Feasibility Score (0-100):**
${Object.entries(scoringCriteria.feasibilityScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

**Why Now Score (0-100):**
${Object.entries(scoringCriteria.whyNowScore).map(([range, desc]) => `  ${range}: ${desc}`).join('\n')}

IMPORTANT: Provide justification for each score explaining:
1. What evidence supports this score
2. What factors pulled the score up or down
3. What uncertainties exist

Return JSON:
{
  "opportunityScore": number (0-100),
  "opportunityJustification": "2-3 sentences",
  "problemScore": number (0-100),
  "problemJustification": "2-3 sentences",
  "feasibilityScore": number (0-100),
  "feasibilityJustification": "2-3 sentences",
  "whyNowScore": number (0-100),
  "whyNowJustification": "2-3 sentences"
}

This is pass ${passNumber} - evaluate independently based on the research data.`;

    const aiParams = getAIParams('extractScores', tier);

    const response = await openai.responses.create(
      createResponsesParams({
        model: REPORT_MODEL,
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
  };

  // Run passes in parallel
  const passes = await Promise.all(
    Array.from({ length: PASS_COUNT }, (_, i) => runPass(i + 1))
  );

  // Calculate averages and deviations (reusing existing logic)
  const opportunityScores = passes.map(p => clampScore(p.opportunityScore));
  const problemScores = passes.map(p => clampScore(p.problemScore));
  const feasibilityScores = passes.map(p => clampScore(p.feasibilityScore));
  const whyNowScores = passes.map(p => clampScore(p.whyNowScore));

  const avgOpportunity = Math.round(opportunityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgProblem = Math.round(problemScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgFeasibility = Math.round(feasibilityScores.reduce((a, b) => a + b, 0) / PASS_COUNT);
  const avgWhyNow = Math.round(whyNowScores.reduce((a, b) => a + b, 0) / PASS_COUNT);

  const deviations = [
    Math.max(...opportunityScores) - Math.min(...opportunityScores),
    Math.max(...problemScores) - Math.min(...problemScores),
    Math.max(...feasibilityScores) - Math.min(...feasibilityScores),
    Math.max(...whyNowScores) - Math.min(...whyNowScores),
  ];
  const maxDeviation = Math.max(...deviations);

  const avgStdDev = (
    standardDeviation(opportunityScores) +
    standardDeviation(problemScores) +
    standardDeviation(feasibilityScores) +
    standardDeviation(whyNowScores)
  ) / 4;

  const averageConfidence = Math.round(Math.max(50, 100 - avgStdDev * 2.5));

  const getConfidenceLevel = (scores: number[]): 'high' | 'medium' | 'low' => {
    const dev = Math.max(...scores) - Math.min(...scores);
    if (dev <= 5) return 'high';
    if (dev <= 12) return 'medium';
    return 'low';
  };

  const flagged = maxDeviation > DEVIATION_THRESHOLD;
  const flagReason = flagged
    ? `Scores varied by up to ${maxDeviation} points between passes.`
    : undefined;

  const findBestJustification = (
    scores: number[],
    avg: number,
    getJustification: (p: RawScorePass) => string
  ): string => {
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

  console.log(`[Extract Scores] Final: O=${avgOpportunity}, P=${avgProblem}, F=${avgFeasibility}, W=${avgWhyNow}`);

  return {
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
}

/**
 * Extract business metrics from deep research report.
 */
export async function extractBusinessMetrics(
  deepResearch: DeepResearchOutput,
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<BusinessMetrics> {
  console.log('[Extract Metrics] Calculating business metrics from research...');

  const prompt = `You are evaluating business viability metrics based on deep market research.

## BUSINESS IDEA
**Title:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}

## RESEARCH FINDINGS
${deepResearch.rawReport.substring(0, 3000)}...

## RESEARCH SCORES
${JSON.stringify(scores, null, 2)}

## MARKET INSIGHTS
${JSON.stringify(insights.marketAnalysis, null, 2)}

Evaluate business metrics and return JSON:
{
  "revenuePotential": {
    "rating": "high|medium|low",
    "estimate": "Specific revenue estimate based on market data (e.g., '$10K-50K MRR potential')",
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

Base estimates on the actual market data from research.`;

  const aiParams = getAIParams('extractMetrics', tier);

  const response = await openai.responses.create(
    createResponsesParams({
      model: REPORT_MODEL,
      input: prompt,
      response_format: { type: 'json_object' },
      max_output_tokens: 1000,
    }, aiParams)
  );

  const content = response.output_text;
  if (!content) {
    throw new Error('Failed to extract business metrics');
  }

  console.log('[Extract Metrics] Successfully calculated metrics');
  return JSON.parse(content) as BusinessMetrics;
}

// =============================================================================
// PHASE 3: SOCIAL PROOF (o3-deep-research with social domain filtering)
// =============================================================================

/**
 * Fetch real social proof using o3-deep-research with web search filtered to social platforms.
 * Searches Reddit, Twitter, HackerNews, IndieHackers, ProductHunt, LinkedIn
 * for real discussions about the pain points.
 *
 * Uses o3-deep-research (or o4-mini for FREE tier) for comprehensive social proof gathering.
 */
export async function fetchSocialProof(
  input: ResearchInput,
  insights: SynthesizedInsights,
  tier: SubscriptionTier = 'ENTERPRISE'
): Promise<SocialProof> {
  console.log('[Social Proof] Using o3-deep-research to search social platforms...');
  console.log('[Social Proof] Tier:', tier);
  console.log('[Social Proof] Domains:', SEARCH_DOMAINS.social.join(', '));

  // Select model based on tier (same as deep research)
  const model = tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL;
  console.log('[Social Proof] Using model:', model);

  const painPointsList = insights.painPoints
    .map((p) => `- ${p.problem} (${p.severity} severity)`)
    .join('\n');

  const systemPrompt = `You are a social media researcher specializing in finding real discussions about specific pain points.
Your task is to search social platforms and find authentic posts where real people discuss problems, frustrations, or needs related to the given business idea.

## SEARCH FOCUS
- Reddit (r/entrepreneur, r/smallbusiness, r/startups, industry-specific subreddits)
- Twitter/X (relevant hashtags and discussions)
- HackerNews (Show HN, Ask HN, comments)
- IndieHackers (discussions, milestones, problems)
- ProductHunt (discussions, comments on similar products)
- LinkedIn (posts, articles, comments)

## OUTPUT REQUIREMENTS
For each relevant post, capture:
1. Platform and author username
2. Actual post content (verbatim where possible)
3. Direct URL to the post
4. Engagement metrics (upvotes, likes, comments)
5. Date posted
6. Sentiment toward the problem
7. Relevance score (0-100)

Focus on finding posts that:
- Express genuine frustration with a problem
- Ask for solutions or alternatives
- Discuss workarounds they've tried
- Validate that the pain point is real

Be thorough in your search. Find 4-10 highly relevant posts.`;

  const userQuery = `## TARGET PAIN POINTS TO VALIDATE
${painPointsList}

## BUSINESS CONTEXT
**Business Idea:** ${input.ideaTitle}
**Description:** ${input.ideaDescription}
**Target Audience:** ${insights.positioning.targetAudience}
**Market Size:** ${insights.marketAnalysis.size}

---

Search social media platforms for real posts where people discuss these pain points.
Find authentic discussions that validate (or invalidate) these problems exist.

Return your findings as JSON:
{
  "posts": [
    {
      "platform": "reddit|twitter|hackernews|indiehackers|producthunt|linkedin",
      "author": "username or handle",
      "content": "The actual post content (100-300 chars, verbatim if possible)",
      "url": "https://actual-url-to-post",
      "engagement": { "upvotes": 123, "comments": 45, "likes": 67 },
      "date": "YYYY-MM-DD",
      "sentiment": "negative|neutral|positive",
      "relevanceScore": 0-100
    }
  ],
  "summary": "2-3 sentence summary of what the social proof reveals",
  "painPointsValidated": ["List of pain points confirmed by real discussions"],
  "demandSignals": ["Specific demand signals found (e.g., 'people asking for X', 'willing to pay for Y')"]
}`;

  // Convert readonly array to mutable array for the API call
  const socialDomains = [...SEARCH_DOMAINS.social];

  const startTime = Date.now();
  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Social Proof] Still searching social platforms... (${elapsed}s elapsed)`);
  }, 15000);

  try {
    const params = createDeepResearchParams({
      model,
      systemPrompt,
      userQuery,
      domains: socialDomains,
      background: false, // Social proof is typically faster, no need for background
      reasoningSummary: 'auto',
    });

    const response = await deepResearchClient.responses.create(params);

    clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Social Proof] Search complete after ${elapsed}s`);

    // Parse the response
    const result = parseDeepResearchResponse(response);

    // Try to extract JSON from the response content
    let socialProofData: Omit<SocialProof, 'sources'>;
    try {
      // The model should return JSON, but might wrap it in markdown
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        socialProofData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('[Social Proof] Could not parse JSON from response, using structured extraction');
      // Fallback: create structure from raw response
      socialProofData = {
        posts: [],
        summary: result.content.substring(0, 500),
        painPointsValidated: [],
        demandSignals: [],
      };
    }

    console.log('[Social Proof] Found', socialProofData.posts?.length || 0, 'posts');
    console.log('[Social Proof] Citations:', result.citations.length);

    return {
      ...socialProofData,
      posts: socialProofData.posts || [],
      summary: socialProofData.summary || 'Social proof search completed.',
      painPointsValidated: socialProofData.painPointsValidated || [],
      demandSignals: socialProofData.demandSignals || [],
      sources: result.sources,
    };
  } catch (error) {
    clearInterval(heartbeat);
    console.error('[Social Proof] Search failed:', error);
    // Fallback to empty social proof rather than failing the pipeline
    return {
      posts: [],
      summary: 'Social proof search encountered an error. Manual research recommended.',
      painPointsValidated: [],
      demandSignals: [],
      sources: [],
    };
  }
}

// =============================================================================
// PHASE 4: CREATIVE GENERATION (GPT-5.2 report writing)
// =============================================================================

// User Story, Value Ladder, Action Prompts - moved below for organization

// =============================================================================
// LEGACY FUNCTIONS (kept for backward compatibility during migration)
// =============================================================================

// Phase 1: Generate search queries from interview data
// @deprecated Use runDeepResearch instead
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
      model: REPORT_MODEL,
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
  console.log('[synthesizeInsights] Calling OpenAI API with model:', REPORT_MODEL);

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
        model: REPORT_MODEL,
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
      model: REPORT_MODEL,
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
      model: REPORT_MODEL,
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
      model: REPORT_MODEL,
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
      model: REPORT_MODEL,
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
      model: REPORT_MODEL,
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
      model: REPORT_MODEL,
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

// =============================================================================
// MAIN PIPELINE - New 4-Phase Architecture
// =============================================================================

/**
 * Main research pipeline with o3-deep-research integration.
 *
 * NEW ARCHITECTURE:
 * - Phase 1 (0-30%): Deep Research - o3-deep-research for market/competitor research
 * - Phase 2 (30-55%): Social Proof - o3-deep-research with social domain filtering
 * - Phase 3 (55-80%): Synthesis - GPT-5.2 for structured data extraction
 * - Phase 4 (80-100%): Creative Generation - GPT-5.2 for report writing
 *
 * Both Phase 1 and 2 use o3-deep-research for real web search with citations.
 * Phase 3 and 4 use GPT-5.2 for reasoning and report generation.
 */
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
  deepResearch?: DeepResearchOutput; // New: raw research data
}> {
  console.log('[Research Pipeline] Starting NEW 4-phase pipeline for:', input.ideaTitle);
  console.log('[Research Pipeline] Using tier:', tier);
  console.log('[Research Pipeline] o3-deep-research model:', tier === 'FREE' ? DEEP_RESEARCH_MODEL_MINI : DEEP_RESEARCH_MODEL);

  // =========================================================================
  // PHASE 1: DEEP MARKET RESEARCH (0-30%)
  // Uses o3-deep-research with web_search for market and competitor research
  // =========================================================================
  await onProgress?.('DEEP_RESEARCH', 5);
  console.log('[Research Pipeline] === PHASE 1: Deep Market Research (o3-deep-research) ===');

  const deepResearch = await runDeepResearch(input, tier);
  await onProgress?.('DEEP_RESEARCH', 30);
  console.log('[Research Pipeline] Market research complete:', deepResearch.citations.length, 'citations');

  // =========================================================================
  // PHASE 2: SOCIAL PROOF RESEARCH (30-55%)
  // Uses o3-deep-research with web_search filtered to social platforms
  // =========================================================================
  await onProgress?.('SOCIAL_RESEARCH', 35);
  console.log('[Research Pipeline] === PHASE 2: Social Proof Research (o3-deep-research) ===');

  // First extract basic insights from deep research (needed for social proof targeting)
  const preliminaryInsights = await extractInsights(deepResearch, input, tier);
  await onProgress?.('SOCIAL_RESEARCH', 40);

  const socialProof = await fetchSocialProof(input, preliminaryInsights, tier);
  await onProgress?.('SOCIAL_RESEARCH', 55);
  console.log('[Research Pipeline] Social proof gathered:', socialProof.posts.length, 'posts');

  // =========================================================================
  // PHASE 3: SYNTHESIS & SCORING (55-80%)
  // Uses GPT-5.2 for structured data extraction with reasoning
  // =========================================================================
  await onProgress?.('SYNTHESIS', 60);
  console.log('[Research Pipeline] === PHASE 3: Synthesis (GPT-5.2 reasoning) ===');

  // Enrich insights with social proof data
  const insights = preliminaryInsights;

  // Run scores and metrics in parallel with GPT-5.2 reasoning
  const [scores, metrics] = await Promise.all([
    extractScores(deepResearch, input, insights, tier),
    extractBusinessMetrics(deepResearch, input, insights, { opportunityScore: 0, problemScore: 0, feasibilityScore: 0, whyNowScore: 0, justifications: {} as ResearchScores['justifications'], metadata: {} as ResearchScores['metadata'] }, tier),
  ]);
  await onProgress?.('SYNTHESIS', 80);
  console.log('[Research Pipeline] Scores and metrics calculated with GPT-5.2 reasoning');

  // =========================================================================
  // PHASE 4: CREATIVE GENERATION (80-100%)
  // Uses GPT-5.2 for user story, value ladder, action prompts
  // =========================================================================
  await onProgress?.('REPORT_GENERATION', 85);
  console.log('[Research Pipeline] === PHASE 4: Creative Generation (GPT-5.2) ===');

  // Run creative generation in parallel
  const [userStory, valueLadder, actionPrompts] = await Promise.all([
    generateUserStory(input, insights, tier),
    generateValueLadder(input, insights, metrics, tier),
    generateActionPrompts(input, insights, tier),
  ]);
  await onProgress?.('REPORT_GENERATION', 95);
  console.log('[Research Pipeline] User story, value ladder, action prompts generated');

  // Keyword trends (uses SerpAPI for Google Trends - keep this separate)
  const keywordTrends = await generateKeywordTrends(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 98);
  console.log('[Research Pipeline] Keyword trends:', keywordTrends.length, 'keywords');

  await onProgress?.('COMPLETE', 100);
  console.log('[Research Pipeline] === COMPLETE ===');

  // Generate empty queries for backward compatibility
  // (no longer used in new pipeline but kept for API compatibility)
  const queries: GeneratedQueries = {
    marketQueries: [],
    competitorQueries: [],
    customerQueries: [],
    trendQueries: [],
  };

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
    deepResearch, // Include raw research for debugging/display
  };
}

// =============================================================================
// LEGACY PIPELINE (for fallback if deep research is disabled)
// =============================================================================

/**
 * Original 9-phase pipeline using GPT-5.2 only.
 * @deprecated Use runResearchPipeline which uses o3-deep-research
 */
export async function runLegacyResearchPipeline(
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
  console.log('[Legacy Pipeline] Starting 9-phase pipeline for:', input.ideaTitle);
  console.log('[Legacy Pipeline] Using tier:', tier);

  // Phase 1: Generate queries
  await onProgress?.('QUERY_GENERATION', 5);
  const queries = await generateSearchQueries(input, tier);
  await onProgress?.('QUERY_GENERATION', 10);

  // Phase 2: Synthesize insights
  await onProgress?.('SYNTHESIS', 15);
  const insights = await synthesizeInsights(input, queries, tier);
  await onProgress?.('SYNTHESIS', 30);

  // Phase 3: Calculate scores
  await onProgress?.('SYNTHESIS', 35);
  const scores = await calculateScores(input, insights, tier);
  await onProgress?.('SYNTHESIS', 45);

  // Phase 4: Calculate business metrics
  await onProgress?.('SYNTHESIS', 50);
  const metrics = await calculateBusinessMetrics(input, insights, scores, tier);
  await onProgress?.('SYNTHESIS', 55);

  // Phase 5: Generate user story
  await onProgress?.('REPORT_GENERATION', 60);
  const userStory = await generateUserStory(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 65);

  // Phase 6: Generate keyword trends
  await onProgress?.('REPORT_GENERATION', 70);
  const keywordTrends = await generateKeywordTrends(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 75);

  // Phase 7: Generate value ladder
  await onProgress?.('REPORT_GENERATION', 80);
  const valueLadder = await generateValueLadder(input, insights, metrics, tier);
  await onProgress?.('REPORT_GENERATION', 85);

  // Phase 8: Generate action prompts
  await onProgress?.('REPORT_GENERATION', 88);
  const actionPrompts = await generateActionPrompts(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 92);

  // Phase 9: Generate social proof (simulated)
  await onProgress?.('REPORT_GENERATION', 95);
  const socialProof = await generateSocialProof(input, insights, tier);
  await onProgress?.('REPORT_GENERATION', 98);

  await onProgress?.('COMPLETE', 100);

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
