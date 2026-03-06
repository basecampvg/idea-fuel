// Zod validators for shared schemas
import { z } from 'zod';

// ============================================
// Shared ID validator (accepts both CUID and UUID formats)
// Old Prisma records use CUIDs, new Drizzle records use UUIDs
// ============================================
export const entityId = z.string().min(1, 'ID is required');

// ============================================
// Project validators (unified: absorbs former Idea validators)
// ============================================
export const PROJECT_TITLE_MAX = 80;
export const PROJECT_DESC_MAX = 5000;
export const PROJECT_DESC_MIN = 10;

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(PROJECT_TITLE_MAX, 'Title too long'),
  description: z.string().max(PROJECT_DESC_MAX, 'Description too long').default(''),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(PROJECT_TITLE_MAX).optional(),
  description: z.string().min(PROJECT_DESC_MIN).max(PROJECT_DESC_MAX).optional(),
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

export const researchEngineSchema = z.enum(['OPENAI', 'PERPLEXITY']);
export type ResearchEngine = z.infer<typeof researchEngineSchema>;

export const startInterviewSchema = z.object({
  projectId: entityId,
  mode: interviewModeSchema.default('LIGHT'),
  researchEngine: researchEngineSchema.default('OPENAI'),
});

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message cannot be empty'),
});

export const sendMessageSchema = z.object({
  interviewId: entityId,
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

export const workHistoryEntrySchema = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
  endDate: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  description: z.string().max(1000).default(''),
  isCurrent: z.boolean().default(false),
});

export const educationEntrySchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  fieldOfStudy: z.string().max(200).default(''),
  graduationYear: z.number().int().min(1950).max(2040).nullable(),
});

export const founderProfileSchema = z.object({
  bio: z.string().max(2000).default(''),
  skills: z.array(z.string().min(1).max(50)).max(20).default([]),
  workHistory: z.array(workHistoryEntrySchema).max(20).default([]),
  education: z.array(educationEntrySchema).max(10).default([]),
});
export type FounderProfileInput = z.infer<typeof founderProfileSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  founderProfile: founderProfileSchema.optional(),
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
  projectId: entityId,
  type: reportTypeSchema,
});

export const updateReportSchema = z.object({
  id: entityId,
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
  'COMPLETE',
  // Legacy phases (kept for backward compatibility)
  'QUERY_GENERATION',
  'DATA_COLLECTION',
]);

export const startResearchSchema = z.object({
  projectId: entityId,
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
  projectId: entityId,
});

export type SparkJobStatusInput = z.infer<typeof sparkJobStatusSchema>;
export type SparkKeywordsInput = z.infer<typeof sparkKeywordsSchema>;
export type SparkResultInput = z.infer<typeof sparkResultSchema>;
export type StartSparkInput = z.infer<typeof startSparkSchema>;

// ============================================
// Assumption validators
// ============================================
export const assumptionCategorySchema = z.enum([
  'PRICING', 'ACQUISITION', 'RETENTION', 'MARKET', 'COSTS', 'FUNDING', 'TIMELINE',
]);
export const assumptionConfidenceSchema = z.enum([
  'USER', 'RESEARCHED', 'AI_ESTIMATE', 'CALCULATED',
]);
export const assumptionValueTypeSchema = z.enum([
  'NUMBER', 'PERCENTAGE', 'CURRENCY', 'TEXT', 'DATE', 'SELECT',
]);
export const assumptionTierSchema = z.enum(['SPARK', 'LIGHT', 'IN_DEPTH']);

// Reserved keys that cannot be used as assumption keys (prototype pollution protection)
const RESERVED_KEYS = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'];

export const assumptionKeySchema = z.string()
  .min(1, 'Key is required')
  .max(64, 'Key too long')
  .regex(/^[a-z][a-z0-9_]*$/, 'Key must be lowercase snake_case')
  .refine((key) => !RESERVED_KEYS.includes(key), 'Reserved key name');

export const updateAssumptionSchema = z.object({
  id: entityId,
  projectId: entityId,
  value: z.string().max(1000).nullable().optional(),
  confidence: assumptionConfidenceSchema.optional(),
  source: z.string().max(500).optional(),
  sourceUrl: z.string().url().max(2000).nullable().optional(),
  formula: z.string().max(500).nullable().optional(),
});
export type UpdateAssumptionInput = z.infer<typeof updateAssumptionSchema>;

export const batchUpdateAssumptionSchema = z.object({
  projectId: entityId,
  updates: z.array(z.object({
    key: assumptionKeySchema,
    value: z.string().max(1000).nullable(),
    confidence: assumptionConfidenceSchema.optional(),
    source: z.string().max(500).optional(),
  })).min(1).max(24),
});
export type BatchUpdateAssumptionInput = z.infer<typeof batchUpdateAssumptionSchema>;

export const createCustomAssumptionSchema = z.object({
  projectId: entityId,
  name: z.string().min(1).max(200),
  key: assumptionKeySchema,
  category: assumptionCategorySchema,
  valueType: assumptionValueTypeSchema,
  unit: z.string().max(20).nullable().optional(),
  value: z.string().max(1000).nullable().optional(),
  formula: z.string().max(500).nullable().optional(),
});
export type CreateCustomAssumptionInput = z.infer<typeof createCustomAssumptionSchema>;

// ============================================
// Pagination validator
// ============================================
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// Agent validators
// ============================================
export const embeddingSourceTypeSchema = z.enum(['REPORT', 'RESEARCH', 'INTERVIEW', 'NOTES', 'SERPAPI']);

export const agentMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    args: z.record(z.unknown()),
  })).optional(),
  toolResults: z.array(z.object({
    toolCallId: z.string(),
    result: z.unknown(),
    isError: z.boolean().optional(),
  })).optional(),
  tokenCount: z.number().optional(),
  timestamp: z.string(),
});

export const agentChatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),  // Block 'system' and 'tool' roles from client
    parts: z.array(z.record(z.unknown())).max(50),
    metadata: z.unknown().optional(),
  })).min(1).max(100),
  projectId: entityId,
  // AI SDK v6 also sends these fields
  id: z.string().optional(),
  trigger: z.string().optional(),
  messageId: z.string().optional(),
});

export const confirmInsightSchema = z.object({
  projectId: entityId,
  conversationId: entityId,
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  prompt: z.string().min(1).max(10000),
  reportId: entityId.optional(),
});
export type ConfirmInsightInput = z.infer<typeof confirmInsightSchema>;

export const reorderInsightsSchema = z.object({
  insightIds: z.array(entityId).min(1).max(100),
});
export type ReorderInsightsInput = z.infer<typeof reorderInsightsSchema>;

// ============================================
// Financial Model validators
// ============================================
export const knowledgeLevelSchema = z.enum(['BEGINNER', 'STANDARD', 'EXPERT']);
export const financialModelStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export const erpProviderSchema = z.enum(['QUICKBOOKS', 'XERO']);
export const erpConnectionStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']);
export const snapshotActionSchema = z.enum(['MANUAL', 'AUTO_SAVE']);
export const templateCategorySchema = z.enum([
  'TECH', 'SERVICES', 'RETAIL', 'FOOD', 'CONSTRUCTION',
  'HEALTHCARE', 'REAL_ESTATE', 'MANUFACTURING', 'NONPROFIT', 'FREELANCER',
]);
export const statementTypeSchema = z.enum(['PL', 'BS', 'CF']);

export const createFinancialModelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  templateSlug: z.string().min(1).max(50).optional(),
  projectId: entityId,
  knowledgeLevel: knowledgeLevelSchema.default('BEGINNER'),
  forecastYears: z.number().int().min(1).max(5).default(5),
  settings: z.record(z.unknown()).optional(),
});
export type CreateFinancialModelInput = z.infer<typeof createFinancialModelSchema>;

export const updateFinancialModelSchema = z.object({
  id: entityId,
  name: z.string().min(1).max(200).optional(),
  knowledgeLevel: knowledgeLevelSchema.optional(),
  forecastYears: z.number().int().min(1).max(5).optional(),
  status: financialModelStatusSchema.optional(),
  settings: z.record(z.unknown()).optional(),
});
export type UpdateFinancialModelInput = z.infer<typeof updateFinancialModelSchema>;

export const createScenarioSchema = z.object({
  modelId: entityId,
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  cloneFromScenarioId: entityId.optional(),
});
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;

export const updateScenarioSchema = z.object({
  id: entityId,
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>;

export const createSnapshotSchema = z.object({
  modelId: entityId,
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
});
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;

export const erpConnectSchema = z.object({
  provider: erpProviderSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  realmId: z.string().optional(),
  tenantId: z.string().optional(),
  companyName: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
});
export type ERPConnectInput = z.infer<typeof erpConnectSchema>;

export const erpSyncSchema = z.object({
  connectionId: entityId,
  modelId: entityId,
});
export type ERPSyncInput = z.infer<typeof erpSyncSchema>;
