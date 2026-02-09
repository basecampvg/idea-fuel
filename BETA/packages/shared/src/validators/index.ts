// Zod validators for shared schemas
import { z } from 'zod';

// ============================================
// Project validators (unified: absorbs former Idea validators)
// ============================================
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').default(''),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  notes: z.string().max(50000).nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ============================================
// Interview validators
// ============================================
export const interviewModeSchema = z.enum(['SPARK', 'LIGHT', 'IN_DEPTH']);
export const sparkJobStatusSchema = z.enum([
  'QUEUED',
  'RUNNING_KEYWORDS',
  'RUNNING_RESEARCH',    // Legacy
  'RUNNING_PARALLEL',    // Parallel deep research
  'SYNTHESIZING',        // GPT-5.2 merging results
  'ENRICHING',           // Legacy
  'COMPLETE',
  'FAILED',
  'PARTIAL_COMPLETE',    // One call succeeded, one failed
]);
export const interviewStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETE', 'ABANDONED']);

export const startInterviewSchema = z.object({
  projectId: z.string().cuid(),
  mode: interviewModeSchema.default('LIGHT'),
});

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message cannot be empty'),
});

export const sendMessageSchema = z.object({
  interviewId: z.string().cuid(),
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
});

export type InterviewModeInput = z.infer<typeof interviewModeSchema>;
export type StartInterviewInput = z.infer<typeof startInterviewSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ============================================
// User validators
// ============================================
export const subscriptionTierSchema = z.enum(['FREE', 'PRO', 'ENTERPRISE']);

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type SubscriptionTierInput = z.infer<typeof subscriptionTierSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================
// Report validators
// ============================================
export const reportTypeSchema = z.enum([
  'BUSINESS_PLAN',
  'POSITIONING',
  'COMPETITIVE_ANALYSIS',
  'WHY_NOW',
  'PROOF_SIGNALS',
  'KEYWORDS_SEO',
  'CUSTOMER_PROFILE',
  'VALUE_EQUATION',
  'VALUE_LADDER',
  'GO_TO_MARKET',
]);

export const reportTierSchema = z.enum(['BASIC', 'PRO', 'FULL']);
export const reportStatusSchema = z.enum(['DRAFT', 'GENERATING', 'COMPLETE', 'FAILED']);

export const generateReportSchema = z.object({
  projectId: z.string().cuid(),
  type: reportTypeSchema,
});

export const updateReportSchema = z.object({
  id: z.string().cuid(),
  content: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
});

export type ReportTypeInput = z.infer<typeof reportTypeSchema>;
export type ReportTierInput = z.infer<typeof reportTierSchema>;
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;

// ============================================
// Research validators
// ============================================
export const researchStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED']);
export const researchPhaseSchema = z.enum([
  'QUEUED',
  'DEEP_RESEARCH',
  'SOCIAL_RESEARCH',
  'SYNTHESIS',
  'REPORT_GENERATION',
  'BUSINESS_PLAN_GENERATION',
  'COMPLETE',
  // Legacy phases (kept for backward compatibility)
  'QUERY_GENERATION',
  'DATA_COLLECTION',
]);

export const startResearchSchema = z.object({
  projectId: z.string().cuid(),
});

export type ResearchStatusInput = z.infer<typeof researchStatusSchema>;
export type ResearchPhaseInput = z.infer<typeof researchPhaseSchema>;
export type StartResearchInput = z.infer<typeof startResearchSchema>;

// ============================================
// Data quality / confidence scoring validators
// ============================================
export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const sectionQualitySchema = z.object({
  section: z.string(),
  confidence: confidenceLevelSchema,
  queriesRun: z.number(),
  resultsFound: z.number(),
  details: z.string(),
});

export const dataQualityReportSchema = z.object({
  overall: confidenceLevelSchema,
  sections: z.array(sectionQualitySchema),
  summary: z.string(),
  queriedTopics: z.array(z.string()),
});

// ============================================
// Spark validators (quick validation)
// ============================================
export const sparkKeywordsSchema = z.object({
  phrases: z.array(z.string()).min(1).max(10),
  synonyms: z.array(z.string()),
  query_plan: z.object({
    general_search: z.array(z.string()),
    reddit_search: z.array(z.string()),
    facebook_groups_search: z.array(z.string()),
  }),
  expanded_queries: z.array(z.string()).optional(),
  expansion_notes: z.string().optional(),
});

export const sparkKeywordTrendSchema = z.object({
  keyword: z.string(),
  volume: z.number(),
  growth: z.enum(['rising', 'stable', 'declining']),
  trend: z.array(z.object({
    date: z.string(),
    value: z.number(),
  })),
});

export const sparkCompetitorSchema = z.object({
  name: z.string(),
  description: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  positioning: z.string(),
  website: z.string().optional(),
  pricing_model: z.string().optional(),
});

export const sparkResultSchema = z.object({
  idea: z.string(),
  keywords: sparkKeywordsSchema,
  trend_signal: z.object({
    direction: z.enum(['rising', 'flat', 'declining', 'unknown']),
    evidence: z.array(z.object({
      claim: z.string(),
      source_url: z.string(),
    })),
  }),
  reddit: z.object({
    top_threads: z.array(z.object({
      title: z.string(),
      subreddit: z.string(),
      url: z.string(),
      signal: z.string(),
      upvotes: z.number().optional(),
      comments: z.number().optional(),
      posted: z.string().optional(),
    })),
    recurring_pains: z.array(z.string()),
    willingness_to_pay_clues: z.array(z.string()),
  }),
  facebook_groups: z.array(z.object({
    name: z.string(),
    members: z.string(),
    privacy: z.enum(['public', 'private', 'unknown']),
    url: z.string(),
    fit_score: z.number().min(0).max(3),
    why_relevant: z.string().optional(),
  })),
  tam: z.object({
    currency: z.string(),
    low: z.number(),
    base: z.number(),
    high: z.number(),
    method: z.string(),
    assumptions: z.array(z.string()),
    citations: z.array(z.object({
      label: z.string(),
      url: z.string(),
    })),
  }),
  competitors: z.array(sparkCompetitorSchema).optional(),
  market_gaps: z.array(z.string()).optional(),
  verdict: z.enum(['proceed', 'watchlist', 'drop']),
  summary: z.string().optional(),
  next_experiment: z.object({
    hypothesis: z.string(),
    test: z.string(),
    success_metric: z.string(),
    timebox: z.string(),
  }),
  keyword_trends: z.array(sparkKeywordTrendSchema).optional(),
  data_quality: dataQualityReportSchema.optional(),
});

export const startSparkSchema = z.object({
  projectId: z.string().cuid(),
});

export type SparkJobStatusInput = z.infer<typeof sparkJobStatusSchema>;
export type SparkKeywordsInput = z.infer<typeof sparkKeywordsSchema>;
export type SparkResultInput = z.infer<typeof sparkResultSchema>;
export type StartSparkInput = z.infer<typeof startSparkSchema>;

// ============================================
// Pagination validator
// ============================================
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
