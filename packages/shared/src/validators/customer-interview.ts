// Zod validators for Customer Interview schemas
import { z } from 'zod';

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
});
export type GenerateCustomerInterviewInput = z.infer<typeof generateCustomerInterviewSchema>;

export const regenerateQuestionsSchema = z.object({
  id: entityId,
});
export type RegenerateQuestionsInput = z.infer<typeof regenerateQuestionsSchema>;

export const publishCustomerInterviewSchema = z.object({
  id: entityId,
  gating: customerInterviewGatingSchema,
  password: z.string().min(4).max(100).optional(),
  waitlistEnabled: z.boolean().optional().default(true),
  newsletterEnabled: z.boolean().optional().default(true),
});
export type PublishCustomerInterviewInput = z.infer<typeof publishCustomerInterviewSchema>;

export const closeCustomerInterviewSchema = z.object({
  id: entityId,
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
  sessionToken: z.string().uuid(),
  answers: z.array(interviewAnswerSchema).min(1, 'At least one answer is required').max(20),
  respondentName: z.string().max(200).optional(),
  respondentEmail: z.string().email('Invalid email').max(254).optional(),
  joinedWaitlist: z.boolean().optional().default(false),
  joinedNewsletter: z.boolean().optional().default(false),
  turnstileToken: z.string().min(1),
});
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export const signNdaSchema = z.object({
  uuid: z.string().uuid('Invalid interview UUID'),
  fullName: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').max(254),
  signature: z.string().min(1), // base64 drawn signature or typed name
});
export type SignNdaInput = z.infer<typeof signNdaSchema>;

export const getCustomerInterviewSchema = z.object({
  id: entityId,
});
export type GetCustomerInterviewInput = z.infer<typeof getCustomerInterviewSchema>;

export const listResponsesSchema = z.object({
  customerInterviewId: entityId,
});
export type ListResponsesInput = z.infer<typeof listResponsesSchema>;

export const synthesizeResponsesSchema = z.object({
  customerInterviewId: entityId,
});
export type SynthesizeResponsesInput = z.infer<typeof synthesizeResponsesSchema>;
