// Zod validators for Customer Interview schemas
import { z } from 'zod';

// Reuse shared ID validator pattern (accepts both CUID and UUID formats)
const entityId = z.string().min(1, 'ID is required');

// ============================================
// Enum schemas
// ============================================
export const questionTypeSchema = z.enum(['FREE_TEXT', 'SCALE', 'MULTIPLE_CHOICE', 'YES_NO']);

export const customerInterviewGatingSchema = z.enum(['PUBLIC', 'PASSWORD', 'NDA']);

export const customerInterviewStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);

// ============================================
// Question & Answer schemas
// ============================================
export const interviewQuestionSchema = z.object({
  id: z.string().min(1).max(255),
  text: z.string().min(1, 'Question text is required').max(1000, 'Question text too long'),
  type: questionTypeSchema,
  required: z.boolean(),
  options: z.array(z.string().min(1).max(200)).min(2).max(10).optional(),
});

export const interviewAnswerSchema = z.object({
  questionId: z.string().min(1).max(255),
  value: z.union([z.string().max(5000), z.number().min(1).max(10), z.boolean()]),
});

// ============================================
// Input schemas
// ============================================

export const generateCustomerInterviewSchema = z.object({
  projectId: entityId,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000).optional(),
  gating: customerInterviewGatingSchema.default('PUBLIC'),
  password: z.string().min(4).max(100).optional(),
});
export type GenerateCustomerInterviewInput = z.infer<typeof generateCustomerInterviewSchema>;

export const regenerateQuestionsSchema = z.object({
  customerInterviewId: entityId,
  feedback: z.string().min(1, 'Feedback is required').max(2000, 'Feedback too long').optional(),
});
export type RegenerateQuestionsInput = z.infer<typeof regenerateQuestionsSchema>;

export const publishCustomerInterviewSchema = z.object({
  customerInterviewId: entityId,
  password: z.string().min(4).max(100).optional(),
});
export type PublishCustomerInterviewInput = z.infer<typeof publishCustomerInterviewSchema>;

export const closeCustomerInterviewSchema = z.object({
  customerInterviewId: entityId,
});
export type CloseCustomerInterviewInput = z.infer<typeof closeCustomerInterviewSchema>;

export const getCustomerInterviewByUuidSchema = z.object({
  uuid: z.string().uuid('Invalid interview UUID'),
});
export type GetCustomerInterviewByUuidInput = z.infer<typeof getCustomerInterviewByUuidSchema>;

export const verifyPasswordSchema = z.object({
  uuid: z.string().uuid('Invalid interview UUID'),
  password: z.string().min(1, 'Password is required').max(100),
});
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>;

export const submitResponseSchema = z.object({
  uuid: z.string().uuid('Invalid interview UUID'),
  answers: z.array(interviewAnswerSchema).min(1, 'At least one answer is required').max(12),
  respondentEmail: z.string().email('Invalid email').max(254).optional(),
  completionSeconds: z.number().int().min(0).max(86400).optional(),
  passwordToken: z.string().max(500).optional(),
  ndaSignatureId: entityId.optional(),
});
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export const signNdaSchema = z.object({
  uuid: z.string().uuid('Invalid interview UUID'),
  signerEmail: z.string().email('Invalid email').max(254),
  signerName: z.string().min(1, 'Name is required').max(200),
});
export type SignNdaInput = z.infer<typeof signNdaSchema>;

export const getCustomerInterviewSchema = z.object({
  customerInterviewId: entityId,
});
export type GetCustomerInterviewInput = z.infer<typeof getCustomerInterviewSchema>;

export const listResponsesSchema = z.object({
  customerInterviewId: entityId,
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type ListResponsesInput = z.infer<typeof listResponsesSchema>;

export const synthesizeResponsesSchema = z.object({
  customerInterviewId: entityId,
});
export type SynthesizeResponsesInput = z.infer<typeof synthesizeResponsesSchema>;
