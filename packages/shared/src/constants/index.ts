// Shared constants

// Re-export subscription constants
export * from './subscription';

export const APP_NAME = 'Forge Automation';
export const APP_VERSION = '0.1.0';

// Project status labels (unified lifecycle: CAPTURED=draft, rest=project)
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  CAPTURED: 'Draft',
  INTERVIEWING: 'Interviewing',
  RESEARCHING: 'Researching',
  COMPLETE: 'Complete',
};

export const PROJECT_STATUS_DESCRIPTIONS: Record<string, string> = {
  CAPTURED: 'Idea captured — ready to research',
  INTERVIEWING: 'Interview in progress',
  RESEARCHING: 'Research pipeline running',
  COMPLETE: 'Research and reports are ready',
};

// Derived display status for sidebar sections
export const PROJECT_DISPLAY_STATUS: Record<string, string> = {
  CAPTURED: 'Draft',
  INTERVIEWING: 'Active',
  RESEARCHING: 'Active',
  COMPLETE: 'Complete',
};

export const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  ABANDONED: 'Abandoned',
};

export const INTERVIEW_MODE_LABELS: Record<string, string> = {
  SPARK: 'Spark',
  LIGHT: 'Light Interview',
  IN_DEPTH: 'In-Depth Interview',
};

export const INTERVIEW_MODE_DESCRIPTIONS: Record<string, string> = {
  SPARK: 'Quick validation - demand signals & market sizing',
  LIGHT: 'Quick discovery with essential questions',
  IN_DEPTH: 'Comprehensive discovery covering all 31 data points',
};

export const RESEARCH_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
};

// Research pipeline phases
// NEW 4-PHASE PIPELINE (o3-deep-research integration):
// - Phase 1: DEEP_RESEARCH - o3-deep-research for market/competitor research (0-30%)
// - Phase 2: SOCIAL_RESEARCH - o3-deep-research with social domain filtering (30-55%)
// - Phase 3: SYNTHESIS - GPT-5.2 for structured data extraction (55-80%)
// - Phase 4: REPORT_GENERATION - GPT-5.2 for creative content (80-100%)
export const RESEARCH_PHASE_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  // New 4-phase pipeline phases (in execution order)
  DEEP_RESEARCH: 'Market Research',
  SOCIAL_RESEARCH: 'Social Proof',
  SYNTHESIS: 'Analyzing Data',
  REPORT_GENERATION: 'Generating Reports',
  BUSINESS_PLAN_GENERATION: 'Writing Business Plan',
  COMPLETE: 'Complete',
  // Legacy phases (kept for backward compatibility)
  QUERY_GENERATION: 'Generating Queries',
  DATA_COLLECTION: 'Collecting Data',
};

export const RESEARCH_PHASE_DESCRIPTIONS: Record<string, string> = {
  QUEUED: 'Your research is queued and will begin shortly',
  // New 4-phase pipeline descriptions (in execution order)
  DEEP_RESEARCH: 'AI is researching market size, competitors, and trends with real web search',
  SOCIAL_RESEARCH: 'Finding real discussions on Reddit, Twitter, HackerNews, and more',
  SYNTHESIS: 'Extracting structured insights and calculating scores with GPT-5.2 reasoning',
  REPORT_GENERATION: 'Creating your personalized business reports',
  BUSINESS_PLAN_GENERATION: 'AI is writing a comprehensive business plan',
  COMPLETE: 'All research and reports are ready',
  // Legacy descriptions
  QUERY_GENERATION: 'AI is generating targeted search queries for your business',
  DATA_COLLECTION: 'Gathering market data, competitor info, and proof signals',
};

// Estimated duration per phase (for progress bar calculations)
// o3-deep-research phases take longer; GPT-5.2 phases are fast
export const RESEARCH_PHASE_DURATION_MINUTES: Record<string, number> = {
  QUEUED: 0,
  // New 4-phase pipeline durations (8-15 min total)
  DEEP_RESEARCH: 5, // o3-deep-research market research
  SOCIAL_RESEARCH: 5, // o3-deep-research social proof search
  SYNTHESIS: 1, // GPT-5.2 extraction
  REPORT_GENERATION: 1, // GPT-5.2 creative generation
  BUSINESS_PLAN_GENERATION: 2, // GPT-5.2 business plan
  COMPLETE: 0,
  // Legacy durations
  QUERY_GENERATION: 5,
  DATA_COLLECTION: 180,
};

// Progress percentage ranges per phase (in execution order)
export const RESEARCH_PHASE_PROGRESS: Record<string, { start: number; end: number }> = {
  QUEUED: { start: 0, end: 0 },
  // New 4-phase pipeline progress ranges
  DEEP_RESEARCH: { start: 0, end: 30 },
  SOCIAL_RESEARCH: { start: 30, end: 55 },
  SYNTHESIS: { start: 55, end: 80 },
  REPORT_GENERATION: { start: 80, end: 90 },
  BUSINESS_PLAN_GENERATION: { start: 90, end: 100 },
  COMPLETE: { start: 100, end: 100 },
  // Legacy progress ranges
  QUERY_GENERATION: { start: 0, end: 5 },
  DATA_COLLECTION: { start: 5, end: 60 },
};

// Spark job status labels (quick validation pipeline)
export const SPARK_STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  RUNNING_KEYWORDS: 'Generating Keywords',
  RUNNING_RESEARCH: 'Researching',           // Legacy
  RUNNING_PARALLEL: 'Researching',           // New: parallel execution
  SYNTHESIZING: 'Analyzing Results',         // New: GPT-5.2 synthesis
  ENRICHING: 'Enriching',                    // Legacy
  COMPLETE: 'Complete',
  PARTIAL_COMPLETE: 'Partial Complete',      // New: one call succeeded
  FAILED: 'Failed',
};

export const SPARK_STATUS_DESCRIPTIONS: Record<string, string> = {
  QUEUED: 'Your validation is queued and will begin shortly',
  RUNNING_KEYWORDS: 'AI is generating keyword phrases and search queries',
  RUNNING_RESEARCH: 'Searching Reddit, Facebook Groups, and calculating market size',  // Legacy
  RUNNING_PARALLEL: 'Searching community signals and estimating market size',          // New
  SYNTHESIZING: 'AI is analyzing findings and generating verdict',                     // New
  ENRICHING: 'Enriching results with deeper analysis',                                 // Legacy
  COMPLETE: 'Quick validation complete',
  PARTIAL_COMPLETE: 'Validation complete with partial data',                           // New
  FAILED: 'Validation failed - please try again',
};

// Spark progress percentage ranges
export const SPARK_STATUS_PROGRESS: Record<string, { start: number; end: number }> = {
  QUEUED: { start: 0, end: 0 },
  RUNNING_KEYWORDS: { start: 0, end: 10 },
  RUNNING_RESEARCH: { start: 10, end: 90 },   // Legacy: single call
  RUNNING_PARALLEL: { start: 10, end: 75 },   // New: parallel calls (demand + TAM)
  SYNTHESIZING: { start: 75, end: 95 },       // New: GPT-5.2 synthesis
  ENRICHING: { start: 90, end: 95 },          // Legacy
  COMPLETE: { start: 100, end: 100 },
  PARTIAL_COMPLETE: { start: 90, end: 90 },   // New: partial success
  FAILED: { start: 0, end: 0 },
};

// Spark verdict labels and colors
export const SPARK_VERDICT_LABELS: Record<string, string> = {
  proceed: 'Proceed',
  watchlist: 'Watchlist',
  drop: 'Drop',
};

export const SPARK_VERDICT_DESCRIPTIONS: Record<string, string> = {
  proceed: 'Strong signals - worth pursuing further',
  watchlist: 'Mixed signals - monitor for changes',
  drop: 'Weak signals - consider pivoting',
};

// Subscription tier labels
export const SUBSCRIPTION_TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export const SUBSCRIPTION_TIER_DESCRIPTIONS: Record<string, string> = {
  FREE: 'Basic reports with core insights',
  PRO: 'Pro-level reports with enhanced analysis',
  ENTERPRISE: 'Full reports with all premium features',
};

// Report type labels (10 report types)
export const REPORT_TYPE_LABELS: Record<string, string> = {
  BUSINESS_PLAN: 'Business Plan',
  POSITIONING: 'Positioning Statement',
  COMPETITIVE_ANALYSIS: 'Competitive Analysis',
  WHY_NOW: 'Why Now Analysis',
  PROOF_SIGNALS: 'Proof Signals',
  KEYWORDS_SEO: 'Keywords & SEO Strategy',
  CUSTOMER_PROFILE: 'Customer Profile',
  VALUE_EQUATION: 'Value Equation',
  VALUE_LADDER: 'Value Ladder',
  GO_TO_MARKET: 'Go-to-Market Strategy',
};

export const REPORT_TYPE_DESCRIPTIONS: Record<string, string> = {
  BUSINESS_PLAN: 'Comprehensive business plan with market analysis and financials',
  POSITIONING: 'Brand positioning, messaging framework, and differentiation',
  COMPETITIVE_ANALYSIS: 'SWOT analysis, competitor profiles, and market positioning',
  WHY_NOW: 'Market timing analysis and urgency factors',
  PROOF_SIGNALS: 'Demand validation evidence from research',
  KEYWORDS_SEO: 'Search strategy and content opportunities',
  CUSTOMER_PROFILE: 'Detailed persona with demographics and psychographics',
  VALUE_EQUATION: 'Value proposition breakdown and benefits analysis',
  VALUE_LADDER: 'Product/service tier strategy and pricing tiers',
  GO_TO_MARKET: 'Launch timeline, channel strategy, and acquisition plan',
};

// Report tier labels
export const REPORT_TIER_LABELS: Record<string, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
  FULL: 'Full',
};

export const REPORT_TIER_DESCRIPTIONS: Record<string, string> = {
  BASIC: 'Core insights and essential analysis',
  PRO: 'Enhanced analysis with deeper research',
  FULL: 'Comprehensive report with all premium sections',
};

// Report status labels
export const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  GENERATING: 'Generating',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
};

// Report tier determination matrix
// Maps [InterviewMode][SubscriptionTier] → ReportTier
export const REPORT_TIER_MATRIX: Record<string, Record<string, string>> = {
  SPARK: {
    FREE: 'BASIC',
    PRO: 'BASIC',
    ENTERPRISE: 'BASIC',
  },
  LIGHT: {
    FREE: 'BASIC',
    PRO: 'PRO',
    ENTERPRISE: 'PRO',
  },
  IN_DEPTH: {
    FREE: 'PRO',
    PRO: 'FULL',
    ENTERPRISE: 'FULL',
  },
};

// Helper to determine report tier
export const getReportTier = (
  interviewMode: string,
  subscriptionTier: string
): string => {
  return REPORT_TIER_MATRIX[interviewMode]?.[subscriptionTier] ?? 'BASIC';
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

// Interview session timeouts and auto-save
export const INTERVIEW_SESSION = {
  // Auto-save happens automatically on each message (built into the flow)

  // Session timeout - interview can be resumed within this window
  resumeWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Idle warning - show "still there?" prompt after this
  idleWarningMs: 10 * 60 * 1000, // 10 minutes

  // Idle timeout - auto-pause interview after this (user can still resume)
  idleTimeoutMs: 30 * 60 * 1000, // 30 minutes

  // Expiration - mark interview as expired/abandoned after this
  expirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Resume messages based on time away
export const INTERVIEW_RESUME_MESSAGES = {
  short: "Welcome back! Let's continue where we left off.", // < 1 hour
  medium: "Welcome back! It's been a little while. Let me remind you where we were...", // 1-24 hours
  long: "Welcome back! It's been a few days. Here's a quick summary of what we've covered so far...", // > 24 hours
};

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
