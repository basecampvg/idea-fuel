// Shared type definitions

// =============================================================================
// Project Types (Unified: absorbs former Idea + Canvas types)
// =============================================================================

// Project status enum (matches Prisma ProjectStatus)
export type ProjectStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

// Derived display status for sidebar grouping
export type ProjectDisplayStatus = 'Draft' | 'Active' | 'Complete';

export interface Project {
  id: string;
  title: string;
  description: string;
  notes: string | null;
  status: ProjectStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Pipeline Types
// =============================================================================

export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED';

// Interview modes - determines depth of discovery
// SPARK: Quick validation - demand signals, TAM, keywords, Reddit/FB discovery
// LIGHT: Quick discovery with essential questions
// IN_DEPTH: Comprehensive discovery covering all 31 data points
export type InterviewMode = 'SPARK' | 'LIGHT' | 'IN_DEPTH';

// Spark job status for quick validation pipeline
// Pipeline: QUEUED → RUNNING_KEYWORDS → RUNNING_PARALLEL (Call 2+3) → SYNTHESIZING → COMPLETE
export type SparkJobStatus =
  | 'QUEUED'
  | 'RUNNING_KEYWORDS'
  | 'RUNNING_RESEARCH'    // Legacy: single deep research call
  | 'RUNNING_PARALLEL'    // New: Both demand + TAM calls running in parallel
  | 'SYNTHESIZING'        // New: GPT-5.2 merging results
  | 'ENRICHING'           // Legacy: kept for backward compatibility
  | 'COMPLETE'
  | 'FAILED'
  | 'PARTIAL_COMPLETE';   // New: One call succeeded, one failed

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
// SPARK mode → BASIC tier only (any subscription) - quick validation
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

  projectId: string;
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

// 42 data points collected during interview
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
  problem_trigger: DataPoint;       // What triggers the problem / when it becomes urgent
  problem_cost: DataPoint;          // Cost of the problem today (time, money, risk)
  problem_frequency: DataPoint;     // How often the customer feels the pain

  // Solution
  solution_description: DataPoint;
  solution_key_features: DataPoint;
  solution_unique_mechanism: DataPoint;
  solution_mvp: DataPoint;          // Smallest version that delivers core value

  // Competition
  competitors_direct: DataPoint;
  differentiation: DataPoint;
  competitive_advantage: DataPoint;
  biggest_competitor_weakness: DataPoint;

  // Business Model
  revenue_model: DataPoint;
  pricing_strategy: DataPoint;
  price_point: DataPoint;
  value_metric: DataPoint;          // Per seat, usage, outcome, workflow
  sales_motion: DataPoint;          // Self-serve, sales-led, product-led, partners

  // Go-to-Market
  gtm_channels: DataPoint;
  gtm_first_customers: DataPoint;
  marketing_strategy: DataPoint;
  target_search_terms: DataPoint;
  beachhead_market: DataPoint;      // Precisely defined SAM / initial segment
  market_wedge: DataPoint;          // Narrow entry point that expands later

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
  key_assumptions: DataPoint;       // 3-5 assumptions that must be true

  // Execution & Defensibility
  execution_risks: DataPoint;       // Biggest risks in next 90 days
  moat_formation: DataPoint;        // What prevents well-funded competitors from copying
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

  projectId: string;
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
  projectId: string;
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

// =============================================================================
// TAM/SAM/SOM Market Sizing Data
// =============================================================================

export interface MarketSizingData {
  tam: MarketMetric;
  sam: MarketMetric;
  som: MarketMetric;
  segments: MarketSegmentBreakdown[];
  geographicBreakdown?: GeographicBreakdown[];
  assumptions: MarketAssumption[];
  sources: MarketSource[];
  methodology: string;
  lastUpdated: string; // ISO date
}

export interface MarketMetric {
  value: number;           // Dollar value in millions
  formattedValue: string;  // e.g., "$4.2B"
  growthRate: number;      // CAGR percentage
  confidence: 'high' | 'medium' | 'low';
  timeframe: string;       // e.g., "2024-2028"
}

export interface MarketSegmentBreakdown {
  name: string;
  tamContribution: number;  // Percentage of TAM
  samContribution: number;  // Percentage of SAM
  somContribution: number;  // Percentage of SOM
  description: string;
}

export interface GeographicBreakdown {
  region: string;
  percentage: number;
  notes?: string;
}

export interface MarketAssumption {
  level: 'tam' | 'sam' | 'som';
  assumption: string;
  impact: 'high' | 'medium' | 'low';
}

export interface MarketSource {
  title: string;
  url: string;
  date?: string;
  reliability: 'primary' | 'secondary' | 'estimate';
}

// =============================================================================
// Tech Stack Recommendations
// =============================================================================

export type BusinessType = 'saas' | 'ecommerce' | 'service' | 'content';

export interface TechStackData {
  businessType: BusinessType;
  businessTypeConfidence: 'high' | 'medium' | 'low';
  businessTypeReasoning: string;

  layers: {
    frontend: TechRecommendation[];
    backend: TechRecommendation[];
    database: TechRecommendation[];
    hosting: TechRecommendation[];
    devops: TechRecommendation[];
    thirdParty: TechRecommendation[];
  };

  estimatedMonthlyCost: {
    min: number;
    max: number;
    breakdown: CostBreakdown[];
  };

  scalabilityNotes: string;
  securityConsiderations: string[];
  summary: string;
}

export interface TechRecommendation {
  name: string;
  category: string;
  purpose: string;
  alternatives: string[];
  complexity: 'low' | 'medium' | 'high';
  monthlyEstimate?: string;
  learnMoreUrl?: string;
}

export interface CostBreakdown {
  category: string;
  item: string;
  estimate: string;
}

// =============================================================================
// Spark Quick Validation Types
// =============================================================================

// Keywords generated in Step A (gpt-4o-mini)
export interface SparkKeywords {
  phrases: string[];      // 6 keyword phrases
  synonyms: string[];     // 10-20 synonym terms
  query_plan: {
    general_search: string[];
    reddit_search: string[];
    facebook_groups_search: string[];
  };
  expanded_queries?: string[];   // LLM-generated search variations
  expansion_notes?: string;      // Brief explanation of angles covered
}

// Evidence for trend signal
export interface SparkTrendEvidence {
  claim: string;
  source_url: string;
}

// Reddit thread from search
export interface SparkRedditThread {
  title: string;
  subreddit: string;
  url: string;
  signal: string;  // Demand signal description
  // Enhanced fields (optional for backward compatibility)
  upvotes?: number;
  comments?: number;
  posted?: string;  // e.g., "2 months ago"
}

// Reddit section of Spark result
export interface SparkRedditData {
  top_threads: SparkRedditThread[];
  recurring_pains: string[];
  willingness_to_pay_clues: string[];
}

// Facebook group from search
export interface SparkFacebookGroup {
  name: string;
  members: string;  // e.g., "12.5K members"
  privacy: 'public' | 'private' | 'unknown';
  url: string;
  fit_score: number;  // 0-3 topical alignment + size + activity
  why_relevant?: string;  // Enhanced: explanation of why this group fits
}

// TAM estimate with assumptions
export interface SparkTAM {
  currency: string;  // "USD"
  low: number;
  base: number;
  high: number;
  method: string;  // "topdown+bottomup"
  assumptions: string[];
  citations: Array<{ label: string; url: string }>;
}

// Next experiment suggestion
export interface SparkNextExperiment {
  hypothesis: string;
  test: string;
  success_metric: string;
  timebox: string;
}

// Keyword trend data from Google Trends (SerpAPI)
export interface SparkKeywordTrend {
  keyword: string;
  volume: number;  // Average interest (0-100 normalized)
  growth: 'rising' | 'stable' | 'declining';
  trend: Array<{ date: string; value: number }>;  // Timeseries data
}

// Competitor from competitive landscape research
export interface SparkCompetitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
  website?: string;
  pricing_model?: string;
}

// Full Spark result from Step B (o4-mini-deep-research)
export interface SparkResult {
  idea: string;
  keywords: SparkKeywords;
  trend_signal: {
    direction: 'rising' | 'flat' | 'declining' | 'unknown';
    evidence: SparkTrendEvidence[];
  };
  reddit: SparkRedditData;
  facebook_groups: SparkFacebookGroup[];
  tam: SparkTAM;
  competitors?: SparkCompetitor[];  // Optional competitive landscape data
  market_gaps?: string[];  // Market opportunities from competitor analysis
  verdict: 'proceed' | 'watchlist' | 'drop';
  summary?: string;  // AI-generated 2-4 sentence findings summary
  next_experiment: SparkNextExperiment;
  keyword_trends?: SparkKeywordTrend[];  // Optional Google Trends data
  data_quality?: DataQualityReport;  // Per-section confidence scoring
}

// =============================================================================
// Data Quality / Confidence Scoring Types
// =============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface SectionQuality {
  section: string;
  confidence: ConfidenceLevel;
  queriesRun: number;
  resultsFound: number;
  details: string;
}

export interface DataQualityReport {
  overall: ConfidenceLevel;
  sections: SectionQuality[];
  summary: string;
  queriedTopics: string[];
}

// Query expansion metadata
export type QuerySource = 'template' | 'llm_generated' | 'serp_rising';

export interface QueryVariation {
  query: string;
  source: QuerySource;
  category?: string;  // e.g., "problem-framing", "purchase-intent"
}
