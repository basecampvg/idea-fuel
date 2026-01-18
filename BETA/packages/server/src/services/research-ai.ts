import { openai } from '../lib/openai';
import { getResearchKnowledge, getContentGuidelines, KNOWLEDGE } from '@forge/shared';
import type { InterviewDataPoints } from '@forge/shared';

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

export interface ResearchScores {
  opportunityScore: number;
  problemScore: number;
  feasibilityScore: number;
  whyNowScore: number;
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
export async function generateSearchQueries(input: ResearchInput): Promise<GeneratedQueries> {
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

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate search queries');
  }

  return JSON.parse(content) as GeneratedQueries;
}

// Phase 2: Synthesize insights from interview data (MVP - no external APIs)
export async function synthesizeInsights(
  input: ResearchInput,
  queries: GeneratedQueries
): Promise<SynthesizedInsights> {
  const { ideaTitle, ideaDescription, interviewData, interviewMessages } = input;

  // Build context from interview
  const interviewContext = interviewMessages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  // Get knowledge-based guardrails
  const researchKnowledge = getResearchKnowledge();

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

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to synthesize insights');
  }

  return JSON.parse(content) as SynthesizedInsights;
}

// Phase 3: Calculate research scores
export async function calculateScores(
  input: ResearchInput,
  insights: SynthesizedInsights
): Promise<ResearchScores> {
  const { ideaTitle, ideaDescription, interviewData } = input;

  // Get scoring criteria from knowledge.json
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

Return a JSON object:
{
  "opportunityScore": number,
  "problemScore": number,
  "feasibilityScore": number,
  "whyNowScore": number
}

Be realistic and data-driven in your scoring. Don't inflate scores - be honest about limitations.`;

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to calculate scores');
  }

  return JSON.parse(content) as ResearchScores;
}

// Phase 4: Calculate business metrics
export async function calculateBusinessMetrics(
  input: ResearchInput,
  insights: SynthesizedInsights,
  scores: ResearchScores
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

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to calculate business metrics');
  }

  return JSON.parse(content) as BusinessMetrics;
}

// Phase 5: Generate user story
export async function generateUserStory(
  input: ResearchInput,
  insights: SynthesizedInsights
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
  "scenario": "A 2-3 paragraph narrative that tells the full story - the protagonist's situation, their struggle with the problem, discovering and using the solution, and the positive outcome. Make it vivid and relatable.",
  "protagonist": "Who the user is (e.g., 'Sarah, a busy marketing manager at a tech startup')",
  "problem": "The specific pain they experience in 1-2 sentences",
  "solution": "How this product/service solves their problem in 1-2 sentences",
  "outcome": "The transformation and results they achieve in 1-2 sentences"
}

Make the story feel real and emotionally resonant. Use specific details.`;

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate user story');
  }

  return JSON.parse(content) as UserStory;
}

// Phase 6: Generate keyword trends with volume/growth data
export async function generateKeywordTrends(
  input: ResearchInput,
  insights: SynthesizedInsights
): Promise<KeywordTrend[]> {
  const { ideaTitle, ideaDescription } = input;

  const prompt = `You are a SEO and market research expert. Generate realistic keyword trend data for this business idea.

BUSINESS IDEA: ${ideaTitle}
${ideaDescription}

KEYWORDS FROM RESEARCH:
Primary: ${insights.keywords.primary.join(', ')}
Secondary: ${insights.keywords.secondary.join(', ')}
Long-tail: ${insights.keywords.longTail.join(', ')}

MARKET ANALYSIS:
${insights.marketAnalysis.growth}

Generate 3-5 keywords with realistic search volume estimates. Return a JSON object:
{
  "keywords": [
    {
      "keyword": "the search term",
      "volume": 12000,
      "growth": 45,
      "trend": [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000]
    }
  ]
}

Guidelines:
- volume: Monthly search volume (100 to 100000 range)
- growth: Year-over-year growth percentage (-20 to +200)
- trend: 12 monthly data points showing the search volume progression over the past year
- Make the numbers realistic for the market size and niche
- Show growth patterns that match the market analysis`;

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate keyword trends');
  }

  const result = JSON.parse(content) as { keywords: KeywordTrend[] };
  return result.keywords;
}

// Phase 7: Generate value ladder (offer tiers)
export async function generateValueLadder(
  input: ResearchInput,
  insights: SynthesizedInsights,
  metrics: BusinessMetrics
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

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate value ladder');
  }

  const result = JSON.parse(content) as { tiers: OfferTier[] };
  return result.tiers;
}

// Phase 8: Generate action prompts
export async function generateActionPrompts(
  input: ResearchInput,
  insights: SynthesizedInsights
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

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate action prompts');
  }

  const result = JSON.parse(content) as { prompts: ActionPrompt[] };
  return result.prompts;
}

// Phase 9: Generate social proof (MVP: AI-simulated)
export async function generateSocialProof(
  input: ResearchInput,
  insights: SynthesizedInsights
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

  const response = await openai.chat.completions.create({
    model: RESEARCH_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 2500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate social proof');
  }

  return JSON.parse(content) as SocialProof;
}

// Main pipeline function - runs all phases
export async function runResearchPipeline(
  input: ResearchInput,
  onProgress?: (phase: string, progress: number) => Promise<void>
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

  // Phase 1: Generate queries
  await onProgress?.('QUERY_GENERATION', 5);
  console.log('[Research Pipeline] Phase 1: Generating search queries...');
  const queries = await generateSearchQueries(input);
  await onProgress?.('QUERY_GENERATION', 10);
  console.log('[Research Pipeline] Queries generated:', Object.keys(queries).length, 'categories');

  // Phase 2: Synthesize insights (MVP - uses interview data, no external APIs)
  await onProgress?.('SYNTHESIS', 15);
  console.log('[Research Pipeline] Phase 2: Synthesizing insights...');
  const insights = await synthesizeInsights(input, queries);
  await onProgress?.('SYNTHESIS', 30);
  console.log('[Research Pipeline] Insights synthesized');

  // Phase 3: Calculate scores
  await onProgress?.('SYNTHESIS', 35);
  console.log('[Research Pipeline] Phase 3: Calculating scores...');
  const scores = await calculateScores(input, insights);
  await onProgress?.('SYNTHESIS', 45);
  console.log('[Research Pipeline] Scores:', scores);

  // Phase 4: Calculate business metrics
  await onProgress?.('SYNTHESIS', 50);
  console.log('[Research Pipeline] Phase 4: Calculating business metrics...');
  const metrics = await calculateBusinessMetrics(input, insights, scores);
  await onProgress?.('SYNTHESIS', 55);
  console.log('[Research Pipeline] Metrics calculated');

  // Phase 5: Generate user story
  await onProgress?.('REPORT_GENERATION', 60);
  console.log('[Research Pipeline] Phase 5: Generating user story...');
  const userStory = await generateUserStory(input, insights);
  await onProgress?.('REPORT_GENERATION', 65);
  console.log('[Research Pipeline] User story generated');

  // Phase 6: Generate keyword trends
  await onProgress?.('REPORT_GENERATION', 70);
  console.log('[Research Pipeline] Phase 6: Generating keyword trends...');
  const keywordTrends = await generateKeywordTrends(input, insights);
  await onProgress?.('REPORT_GENERATION', 75);
  console.log('[Research Pipeline] Keyword trends generated:', keywordTrends.length, 'keywords');

  // Phase 7: Generate value ladder
  await onProgress?.('REPORT_GENERATION', 80);
  console.log('[Research Pipeline] Phase 7: Generating value ladder...');
  const valueLadder = await generateValueLadder(input, insights, metrics);
  await onProgress?.('REPORT_GENERATION', 85);
  console.log('[Research Pipeline] Value ladder generated:', valueLadder.length, 'tiers');

  // Phase 8: Generate action prompts
  await onProgress?.('REPORT_GENERATION', 88);
  console.log('[Research Pipeline] Phase 8: Generating action prompts...');
  const actionPrompts = await generateActionPrompts(input, insights);
  await onProgress?.('REPORT_GENERATION', 92);
  console.log('[Research Pipeline] Action prompts generated:', actionPrompts.length, 'prompts');

  // Phase 9: Generate social proof
  await onProgress?.('REPORT_GENERATION', 95);
  console.log('[Research Pipeline] Phase 9: Generating social proof...');
  const socialProof = await generateSocialProof(input, insights);
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
