import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';
import { users, projects } from './schema';

// =============================================================================
// ENUMS
// =============================================================================

export const customerInterviewGatingEnum = pgEnum('CustomerInterviewGating', ['PUBLIC', 'PASSWORD', 'NDA']);
export const customerInterviewStatusEnum = pgEnum('CustomerInterviewStatus', ['DRAFT', 'PUBLISHED', 'CLOSED']);
export const questionTypeEnum = pgEnum('QuestionType', ['FREE_TEXT', 'SCALE', 'MULTIPLE_CHOICE', 'YES_NO']);

// =============================================================================
// CUSTOMER INTERVIEWS
// =============================================================================

export const customerInterviews = pgTable('CustomerInterview', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  projectId: text().notNull(),
  userId: text().notNull(),
  uuid: text().notNull().unique(),
  title: text().notNull(),
  questions: jsonb().notNull().$type<InterviewQuestion[]>(),
  gating: customerInterviewGatingEnum().default('PUBLIC').notNull(),
  password: text(),
  status: customerInterviewStatusEnum().default('DRAFT').notNull(),
  waitlistEnabled: boolean().default(true).notNull(),
  newsletterEnabled: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('CustomerInterview_projectId_idx').using('btree', table.projectId.asc().nullsLast()),
  index('CustomerInterview_userId_idx').using('btree', table.userId.asc().nullsLast()),
  uniqueIndex('CustomerInterview_uuid_key').using('btree', table.uuid.asc().nullsLast()),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'CustomerInterview_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'CustomerInterview_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// INTERVIEW RESPONSES
// =============================================================================

export const interviewResponses = pgTable('InterviewResponse', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  customerInterviewId: text().notNull(),
  sessionToken: text().notNull(),
  answers: jsonb().notNull().$type<InterviewAnswer[]>(),
  respondentName: text(),
  respondentEmail: text(),
  joinedWaitlist: boolean().default(false).notNull(),
  joinedNewsletter: boolean().default(false).notNull(),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('InterviewResponse_customerInterviewId_idx').using('btree', table.customerInterviewId.asc().nullsLast()),
  unique('InterviewResponse_customerInterviewId_sessionToken_key').on(table.customerInterviewId, table.sessionToken),
  foreignKey({
    columns: [table.customerInterviewId],
    foreignColumns: [customerInterviews.id],
    name: 'InterviewResponse_customerInterviewId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// NDA SIGNATURES
// =============================================================================

export const ndaSignatures = pgTable('NdaSignature', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  customerInterviewId: text().notNull(),
  interviewResponseId: text(),
  fullName: text().notNull(),
  email: text().notNull(),
  signature: text().notNull(),
  ipAddress: text().notNull(),
  signedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('NdaSignature_customerInterviewId_idx').using('btree', table.customerInterviewId.asc().nullsLast()),
  foreignKey({
    columns: [table.customerInterviewId],
    foreignColumns: [customerInterviews.id],
    name: 'NdaSignature_customerInterviewId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.interviewResponseId],
    foreignColumns: [interviewResponses.id],
    name: 'NdaSignature_interviewResponseId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
]);
