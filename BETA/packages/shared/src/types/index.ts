// Shared type definitions

export type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED';

export type InterviewMode = 'LIGHT' | 'IN_DEPTH';

export type ResearchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

export type DocumentType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'PAIN_POINTS'
  | 'MARKET_ANALYSIS'
  | 'COMPETITOR_ANALYSIS'
  | 'EXECUTIVE_SUMMARY'
  | 'WHY_NOW'
  | 'PROOF_SIGNALS'
  | 'KEYWORDS_SEO'
  | 'CUSTOMER_PROFILE'
  | 'VALUE_EQUATION'
  | 'VALUE_LADDER'
  | 'GO_TO_MARKET';

export type DocumentStatus = 'DRAFT' | 'GENERATING' | 'COMPLETE';

export interface User {
  id: string;
  email: string;
  name: string | null;
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
  ideaId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface Research {
  id: string;
  status: ResearchStatus;
  marketAnalysis: MarketAnalysis | null;
  competitors: CompetitorData[] | null;
  painPoints: PainPoint[] | null;
  positioning: PositioningData | null;
  ideaId: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  content: string;
  version: number;
  status: DocumentStatus;
  ideaId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
