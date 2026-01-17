// Shared type definitions

export type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED';

export type ResearchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

export type DocumentType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'PAIN_POINTS'
  | 'MARKET_ANALYSIS'
  | 'COMPETITOR_ANALYSIS'
  | 'EXECUTIVE_SUMMARY';

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
  status: InterviewStatus;
  messages: ChatMessage[];
  summary: string | null;
  ideaId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
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
