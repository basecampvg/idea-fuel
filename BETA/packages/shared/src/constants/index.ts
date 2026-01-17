// Shared constants

export const APP_NAME = 'Forge Automation';
export const APP_VERSION = '0.1.0';

// Status labels for display
export const IDEA_STATUS_LABELS: Record<string, string> = {
  CAPTURED: 'Captured',
  INTERVIEWING: 'In Interview',
  RESEARCHING: 'Researching',
  COMPLETE: 'Complete',
};

export const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  ABANDONED: 'Abandoned',
};

export const RESEARCH_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BUSINESS_PLAN: 'Business Plan',
  POSITIONING: 'Positioning Statement',
  PAIN_POINTS: 'Pain Points Analysis',
  MARKET_ANALYSIS: 'Market Analysis',
  COMPETITOR_ANALYSIS: 'Competitor Analysis',
  EXECUTIVE_SUMMARY: 'Executive Summary',
};

// AI configuration
export const AI_CONFIG = {
  maxTokens: 4096,
  temperature: 0.7,
  interviewSystemPrompt: `You are a skilled business consultant conducting a discovery interview. Your goal is to understand the user's business idea deeply by asking insightful questions. Be conversational, supportive, and thorough. Ask one question at a time and build on previous answers.`,
  researchSystemPrompt: `You are a business research analyst. Provide detailed, data-driven analysis based on the given business idea and interview findings. Be specific, cite realistic market data, and provide actionable insights.`,
};

// Interview flow
export const INTERVIEW_TOPICS = [
  'problem_statement',
  'target_audience',
  'solution_overview',
  'unique_value',
  'revenue_model',
  'competition',
  'resources_needed',
  'timeline',
] as const;

export type InterviewTopic = (typeof INTERVIEW_TOPICS)[number];

// Rate limiting
export const RATE_LIMITS = {
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // requests per window
  },
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // AI requests per window
  },
};
