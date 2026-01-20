// Shared type definitions

export type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED';

// Interview modes - determines depth of discovery
// LIGHTNING: No interview, AI generates from idea description only
// LIGHT: Quick discovery with essential questions
// IN_DEPTH: Comprehensive discovery covering all 31 data points
export type InterviewMode = 'LIGHTNING' | 'LIGHT' | 'IN_DEPTH';

export type ResearchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

// Subscription tiers for users
export type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

// 10 Report types available
export type ReportType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'COMPETITIVE_ANALYSIS'
  | 'WHY_NOW'
  | 'PROOF_SIGNALS'
  | 'KEYWORDS_SEO'
  | 'CUSTOMER_PROFILE'
  | 'VALUE_EQUATION'
  | 'VALUE_LADDER'
  | 'GO_TO_MARKET';

// Report tiers - determined by subscription + interview mode blend
// LIGHTNING mode → BASIC tier only (any subscription)
// LIGHT mode + FREE subscription → BASIC tier
// LIGHT mode + PRO/ENTERPRISE subscription → PRO tier
// IN_DEPTH mode + FREE subscription → PRO tier
// IN_DEPTH mode + PRO/ENTERPRISE subscription → FULL tier
export type ReportTier = 'BASIC' | 'PRO' | 'FULL';

export type ReportStatus = 'DRAFT' | 'GENERATING' | 'COMPLETE' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  subscription: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interview {
  id: string;
  mode: InterviewMode;
  status: InterviewStatus;
  currentTurn: number;
  maxTurns: number;
  messages: ChatMessage[];
  collectedData: InterviewDataPoints | null;
  confidenceScore: number;
  summary: string | null;

  // Auto-save & Resume support
  lastActiveAt: Date;
  lastMessageAt: Date | null;
  resumeContext: string | null; // AI context for seamless resume
  isExpired: boolean;

  ideaId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Resume state for returning users
export interface InterviewResumeState {
  interview: Interview;
  timeSinceLastActive: number; // milliseconds
  canResume: boolean;
  resumeMessage: string; // AI greeting for resume
}

// 31 data points collected during interview
export interface InterviewDataPoints {
  // Core Idea
  idea_core: DataPoint;
  idea_name: DataPoint;

  // Customer & Problem
  customer_segment: DataPoint;
  customer_demographics: DataPoint;
  customer_pain_intensity: DataPoint;
  customer_hangouts: DataPoint;
  problem_statement: DataPoint;
  problem_severity: DataPoint;

  // Solution
  solution_description: DataPoint;
  solution_key_features: DataPoint;
  solution_unique_mechanism: DataPoint;

  // Competition
  competitors_direct: DataPoint;
  differentiation: DataPoint;
  competitive_advantage: DataPoint;
  biggest_competitor_weakness: DataPoint;

  // Business Model
  revenue_model: DataPoint;
  pricing_strategy: DataPoint;
  price_point: DataPoint;

  // Go-to-Market
  gtm_channels: DataPoint;
  gtm_first_customers: DataPoint;
  marketing_strategy: DataPoint;
  target_search_terms: DataPoint;

  // Why Now / Market Timing
  why_now_triggers: DataPoint;
  market_timing_factors: DataPoint;

  // Founder
  founder_background: DataPoint;
  founder_relevant_experience: DataPoint;
  founder_unfair_advantage: DataPoint;

  // Funding & Validation
  funding_needs: DataPoint;
  funding_stage: DataPoint;
  existing_traction: DataPoint;
  validation_done: DataPoint;
}

export interface DataPoint {
  weight: number;
  value: string | null;
  source: 'collected' | 'assumed' | 'inferred';
  question: string | null;
  turn: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO date string for JSON serialization
}

// Research pipeline phases - New 4-phase pipeline with o3-deep-research
export type ResearchPhase =
  | 'QUEUED'
  | 'DEEP_RESEARCH'      // o3-deep-research with web_search (~5-10 min)
  | 'SOCIAL_RESEARCH'    // Domain-filtered social proof search (~1 min)
  | 'SYNTHESIS'          // GPT-5.2 extracts structured data (~1 min)
  | 'REPORT_GENERATION'  // GPT-5.2 generates creative content (~1 min)
  | 'COMPLETE'
  // Legacy phases (kept for backward compatibility)
  | 'QUERY_GENERATION'
  | 'DATA_COLLECTION';

// Research model - long-running background job
export interface Research {
  id: string;
  status: ResearchStatus;
  currentPhase: ResearchPhase;
  progress: number; // 0-100 percentage
  estimatedCompletion: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;

  // Phase-specific data
  generatedQueries: ResearchQueries | null;
  rawData: RawResearchData | null;
  synthesizedInsights: SynthesizedInsights | null;

  // Final consolidated research data
  marketAnalysis: MarketAnalysis | null;
  competitors: CompetitorData[] | null;
  painPoints: PainPoint[] | null;
  positioning: PositioningData | null;
  whyNow: WhyNowData | null;
  proofSignals: ProofSignalsData | null;
  keywords: KeywordsData | null;

  // Error tracking
  errorMessage: string | null;
  errorPhase: ResearchPhase | null;
  retryCount: number;

  ideaId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Generated search queries for research phase
export interface ResearchQueries {
  market: string[];
  competitors: string[];
  customers: string[];
  trends: string[];
  whyNow: string[];
  proofSignals: string[];
  keywords: string[];
  reddit: { subreddits: string[]; searchTerms: string[] };
  googleTrends: string[];
}

// Raw data collected from external APIs
export interface RawResearchData {
  tavily: Record<string, unknown>[];
  apify: Record<string, unknown>[];
  serpApi: Record<string, unknown>[];
  collectedAt: string; // ISO date
}

// AI-synthesized insights from raw data
export interface SynthesizedInsights {
  summary: string;
  keyFindings: string[];
  marketOpportunities: string[];
  competitiveGaps: string[];
  riskFactors: string[];
  synthesizedAt: string; // ISO date
}

export interface MarketAnalysis {
  totalMarketSize: number;
  targetMarketSize: number;
  growthRate: number;
  segments: MarketSegment[];
  trends: string[];
}

export interface MarketSegment {
  name: string;
  size: number;
  growthRate: number;
  description: string;
}

export interface CompetitorData {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  marketShare: number | null;
  pricing: string | null;
}

export interface PainPoint {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSegments: string[];
}

export interface PositioningData {
  valueProposition: string;
  targetAudience: string;
  differentiators: string[];
  competitiveAdvantage: string;
}

// Why Now / Market Timing data
export interface WhyNowData {
  marketTriggers: MarketTrigger[];
  technologyShifts: string[];
  regulatoryChanges: string[];
  consumerBehaviorTrends: string[];
  competitiveLandscapeChanges: string[];
  urgencyScore: number; // 1-10 rating
  summary: string;
}

export interface MarketTrigger {
  trigger: string;
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
  evidence: string[];
}

// Proof Signals / Demand Validation data
export interface ProofSignalsData {
  redditMentions: SocialMention[];
  forumDiscussions: SocialMention[];
  searchTrends: SearchTrend[];
  competitorTraction: CompetitorTraction[];
  marketValidation: string[];
  demandScore: number; // 1-10 rating
  summary: string;
}

export interface SocialMention {
  platform: string;
  title: string;
  content: string;
  url: string;
  engagement: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
}

export interface SearchTrend {
  term: string;
  volume: number;
  trend: 'rising' | 'stable' | 'declining';
  relatedTerms: string[];
}

export interface CompetitorTraction {
  competitor: string;
  signal: string;
  significance: string;
}

// Keywords / SEO data
export interface KeywordsData {
  primaryKeywords: Keyword[];
  secondaryKeywords: Keyword[];
  longTailKeywords: Keyword[];
  contentOpportunities: ContentOpportunity[];
  competitorKeywords: string[];
  summary: string;
}

export interface Keyword {
  term: string;
  searchVolume: number;
  difficulty: number; // 1-100
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  relevanceScore: number; // 1-10
}

export interface ContentOpportunity {
  topic: string;
  keywords: string[];
  competitionLevel: 'low' | 'medium' | 'high';
  potentialTraffic: number;
  recommendation: string;
}

// Report with tiered features
export interface Report {
  id: string;
  type: ReportType;
  tier: ReportTier;
  title: string;
  content: string;
  sections: ReportSections;
  version: number;
  status: ReportStatus;
  pdfUrl: string | null;
  ideaId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sections included in a report based on tier
export interface ReportSections {
  included: string[];  // Section IDs that are included
  locked: string[];    // Section IDs that require higher tier
}

// Helper function type for determining report tier
export type DetermineReportTier = (
  interviewMode: InterviewMode,
  subscriptionTier: SubscriptionTier
) => ReportTier;
