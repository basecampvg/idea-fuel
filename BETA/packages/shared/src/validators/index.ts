// Zod validators for shared schemas
import { z } from 'zod';

// Idea validators
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

// Interview validators
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message cannot be empty'),
});

export const sendMessageSchema = z.object({
  interviewId: z.string().cuid(),
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// User validators
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Document validators
export const createDocumentSchema = z.object({
  ideaId: z.string().cuid(),
  type: z.enum([
    'BUSINESS_PLAN',
    'POSITIONING',
    'PAIN_POINTS',
    'MARKET_ANALYSIS',
    'COMPETITOR_ANALYSIS',
    'EXECUTIVE_SUMMARY',
  ]),
  title: z.string().min(1).max(200),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// Pagination validator
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
