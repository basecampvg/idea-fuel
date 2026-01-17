// Zod validators for shared schemas
import { z } from 'zod';

// ============================================
// Idea validators
// ============================================
export const createIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
});

export const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  status: z.enum(['CAPTURED', 'INTERVIEWING', 'RESEARCHING', 'COMPLETE']).optional(),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

// ============================================
// Interview validators
// ============================================
export const interviewModeSchema = z.enum(['LIGHTNING', 'LIGHT', 'IN_DEPTH']);
export const interviewStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETE', 'ABANDONED']);

export const startInterviewSchema = z.object({
  ideaId: z.string().cuid(),
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
// Report validators (replacing Document)
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
  ideaId: z.string().cuid(),
  type: reportTypeSchema,
  // Tier is automatically determined by interview mode + subscription
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
  'QUERY_GENERATION',
  'DATA_COLLECTION',
  'SYNTHESIS',
  'REPORT_GENERATION',
  'COMPLETE',
]);

export const startResearchSchema = z.object({
  ideaId: z.string().cuid(),
});

export type ResearchStatusInput = z.infer<typeof researchStatusSchema>;
export type ResearchPhaseInput = z.infer<typeof researchPhaseSchema>;
export type StartResearchInput = z.infer<typeof startResearchSchema>;

// ============================================
// Pagination validator
// ============================================
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// Legacy exports for backwards compatibility
// TODO: Remove after migration complete
// ============================================
export const createDocumentSchema = generateReportSchema;
export type CreateDocumentInput = GenerateReportInput;
