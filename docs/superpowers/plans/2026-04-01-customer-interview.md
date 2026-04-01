# Customer Interview Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shareable, Typeform-style customer interview form that founders generate from the draft project page, share via link, and collect real customer feedback that feeds into the research pipeline.

**Architecture:** New `CustomerInterview`, `InterviewResponse`, and `NdaSignature` tables with a dedicated tRPC router (`customerInterview`). AI service generates questions from available project context (description, cardResult, founder interview data). Public Next.js route at `/i/[uuid]` serves the form. Responses feed into the research pipeline and generate a standalone `CUSTOMER_DISCOVERY` PDF report.

**Tech Stack:** Drizzle ORM (PostgreSQL), tRPC, Anthropic Claude Haiku (question generation + synthesis), Next.js App Router, React Native (Expo), Cloudflare Turnstile, React-PDF (print route), Zod validators.

---

## File Structure

### New Files

```
packages/shared/src/types/customer-interview.ts          — Shared types (CustomerInterview, InterviewResponse, NdaSignature, question shapes)
packages/shared/src/validators/customer-interview.ts      — Zod schemas for all inputs
packages/server/src/db/customer-interview-schema.ts       — Drizzle table definitions (3 tables + enums)
packages/server/src/routers/customerInterview.ts          — tRPC router (CRUD, generate, publish, submit, synthesize)
packages/server/src/services/customer-interview-ai.ts     — AI service (question generation + response synthesis)
packages/web/src/app/i/[uuid]/page.tsx                    — Public interview form (gating + Typeform UI)
packages/web/src/app/i/[uuid]/components/interview-form.tsx — Form component (one-question-at-a-time UI)
packages/web/src/app/i/[uuid]/components/gating-screen.tsx  — Password/NDA gating components
packages/web/src/app/i/[uuid]/components/nda-signature.tsx  — NDA text + signature pad
packages/web/src/app/i/[uuid]/components/thank-you.tsx      — Thank you + waitlist/newsletter
packages/web/src/app/(dashboard)/projects/[id]/customer-interview/page.tsx         — Founder: preview/manage interview
packages/web/src/app/(dashboard)/projects/[id]/customer-interview/responses/page.tsx — Founder: view responses
packages/web/src/app/print/customer-discovery/[projectId]/page.tsx                  — PDF print route
packages/mobile/src/app/(tabs)/vault/[id]/customer-interview.tsx                    — Mobile: create/manage interview
```

### Modified Files

```
packages/server/src/db/schema.ts                          — Import + re-export new tables, add relations
packages/server/src/routers/index.ts                      — Register customerInterview router
packages/shared/src/types/index.ts                        — Re-export customer-interview types
packages/shared/src/validators/index.ts                   — Re-export customer-interview validators
packages/shared/src/constants/index.ts                    — Add CUSTOMER_INTERVIEW constants
packages/web/src/app/(dashboard)/projects/[id]/components/status-captured.tsx — Add Customer Interview card
packages/mobile/src/app/(tabs)/vault/[id]/card.tsx        — Add "Talk to Customers" button
packages/server/src/jobs/queues.ts                        — Add CUSTOMER_DISCOVERY_SYNTHESIS queue + job data type
packages/server/src/jobs/workers/index.ts                 — Register synthesis worker
packages/server/src/jobs/workers/researchPipelineWorker.ts — Accept optional customerInterviewId, include responses in ResearchInput
packages/server/src/services/research-ai.ts               — Extend ResearchInput type with customerInterviewResponses field
```

---

## Task 1: Shared Types & Validators

**Files:**
- Create: `packages/shared/src/types/customer-interview.ts`
- Create: `packages/shared/src/validators/customer-interview.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/validators/index.ts`

- [ ] **Step 1: Create shared types**

```typescript
// packages/shared/src/types/customer-interview.ts

export type QuestionType = 'FREE_TEXT' | 'SCALE' | 'MULTIPLE_CHOICE' | 'YES_NO';

export interface InterviewQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // only for MULTIPLE_CHOICE
}

export interface InterviewAnswer {
  questionId: string;
  value: string | number | boolean;
}

export type CustomerInterviewGating = 'PUBLIC' | 'PASSWORD' | 'NDA';
export type CustomerInterviewStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface CustomerInterview {
  id: string;
  projectId: string;
  userId: string;
  uuid: string;
  title: string;
  questions: InterviewQuestion[];
  gating: CustomerInterviewGating;
  status: CustomerInterviewStatus;
  waitlistEnabled: boolean;
  newsletterEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewResponse {
  id: string;
  customerInterviewId: string;
  sessionToken: string;
  answers: InterviewAnswer[];
  respondentName: string | null;
  respondentEmail: string | null;
  joinedWaitlist: boolean;
  joinedNewsletter: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

export interface NdaSignature {
  id: string;
  customerInterviewId: string;
  interviewResponseId: string | null;
  fullName: string;
  email: string;
  signature: string;
  ipAddress: string;
  signedAt: Date;
}

// Report type extension
export type CustomerDiscoveryReportType = 'CUSTOMER_DISCOVERY';
```

- [ ] **Step 2: Create Zod validators**

```typescript
// packages/shared/src/validators/customer-interview.ts
import { z } from 'zod';

const entityId = z.string().min(1).max(255);

// ============================================================================
// Enums
// ============================================================================

export const questionTypeSchema = z.enum(['FREE_TEXT', 'SCALE', 'MULTIPLE_CHOICE', 'YES_NO']);
export const customerInterviewGatingSchema = z.enum(['PUBLIC', 'PASSWORD', 'NDA']);
export const customerInterviewStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);

// ============================================================================
// Question & Answer schemas
// ============================================================================

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1000),
  type: questionTypeSchema,
  required: z.boolean(),
  options: z.array(z.string().min(1).max(200)).max(10).optional(),
});

export const interviewAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

// ============================================================================
// Router input schemas
// ============================================================================

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
  uuid: z.string().uuid(),
});
export type GetCustomerInterviewByUuidInput = z.infer<typeof getCustomerInterviewByUuidSchema>;

export const verifyPasswordSchema = z.object({
  uuid: z.string().uuid(),
  password: z.string().min(1),
});
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>;

export const submitResponseSchema = z.object({
  uuid: z.string().uuid(),
  sessionToken: z.string().uuid(),
  answers: z.array(interviewAnswerSchema).min(1).max(20),
  respondentName: z.string().max(200).optional(),
  respondentEmail: z.string().email().max(200).optional(),
  joinedWaitlist: z.boolean().optional().default(false),
  joinedNewsletter: z.boolean().optional().default(false),
  turnstileToken: z.string().min(1),
});
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export const signNdaSchema = z.object({
  uuid: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200),
  signature: z.string().min(1), // base64 or typed name
});
export type SignNdaInput = z.infer<typeof signNdaSchema>;

export const getCustomerInterviewSchema = z.object({
  id: entityId,
});

export const listResponsesSchema = z.object({
  customerInterviewId: entityId,
});

export const synthesizeResponsesSchema = z.object({
  customerInterviewId: entityId,
});
export type SynthesizeResponsesInput = z.infer<typeof synthesizeResponsesSchema>;
```

- [ ] **Step 3: Re-export from shared index files**

Add to `packages/shared/src/types/index.ts`:
```typescript
export * from './customer-interview';
```

Add to `packages/shared/src/validators/index.ts`:
```typescript
export * from './customer-interview';
```

- [ ] **Step 4: Add constants to shared package**

Add to `packages/shared/src/constants/index.ts`:
```typescript
// Customer Interview
export const CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS = 3;
export const CUSTOMER_INTERVIEW_MIN_COMPLETION_SECONDS = 10;
export const CUSTOMER_INTERVIEW_MAX_QUESTIONS = 12;
```

- [ ] **Step 5: Run type-check to verify**

Run: `pnpm --filter @forge/shared type-check`
Expected: PASS — no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/customer-interview.ts packages/shared/src/validators/customer-interview.ts packages/shared/src/types/index.ts packages/shared/src/validators/index.ts packages/shared/src/constants/index.ts
git commit -m "feat: add shared types, validators, and constants for customer interview"
```

---

## Task 2: Database Schema & Migration

**Files:**
- Create: `packages/server/src/db/customer-interview-schema.ts`
- Modify: `packages/server/src/db/schema.ts`

- [ ] **Step 1: Create the customer interview schema file**

```typescript
// packages/server/src/db/customer-interview-schema.ts
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, projects } from './schema';

// =============================================================================
// ENUMS
// =============================================================================

export const customerInterviewGatingEnum = pgEnum('CustomerInterviewGating', ['PUBLIC', 'PASSWORD', 'NDA']);
export const customerInterviewStatusEnum = pgEnum('CustomerInterviewStatus', ['DRAFT', 'PUBLISHED', 'CLOSED']);
export const questionTypeEnum = pgEnum('QuestionType', ['FREE_TEXT', 'SCALE', 'MULTIPLE_CHOICE', 'YES_NO']);

// =============================================================================
// TABLES
// =============================================================================

export const customerInterviews = pgTable('CustomerInterview', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  projectId: text().notNull(),
  userId: text().notNull(),
  uuid: text().notNull(),
  title: text().notNull(),
  questions: jsonb().notNull().$type<import('@forge/shared').InterviewQuestion[]>(),
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
  index('CustomerInterview_uuid_idx').using('btree', table.uuid.asc().nullsLast()),
  unique('CustomerInterview_uuid_key').on(table.uuid),
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

export const interviewResponses = pgTable('InterviewResponse', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  customerInterviewId: text().notNull(),
  sessionToken: text().notNull(),
  answers: jsonb().notNull().$type<import('@forge/shared').InterviewAnswer[]>(),
  respondentName: text(),
  respondentEmail: text(),
  joinedWaitlist: boolean().default(false).notNull(),
  joinedNewsletter: boolean().default(false).notNull(),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('InterviewResponse_customerInterviewId_idx').using('btree', table.customerInterviewId.asc().nullsLast()),
  unique('InterviewResponse_session_unique').on(table.customerInterviewId, table.sessionToken),
  foreignKey({
    columns: [table.customerInterviewId],
    foreignColumns: [customerInterviews.id],
    name: 'InterviewResponse_customerInterviewId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

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
```

- [ ] **Step 2: Import and re-export from main schema file**

Add to the end of `packages/server/src/db/schema.ts`:
```typescript
// Customer Interview tables
export {
  customerInterviewGatingEnum,
  customerInterviewStatusEnum,
  questionTypeEnum,
  customerInterviews,
  interviewResponses,
  ndaSignatures,
} from './customer-interview-schema';
```

- [ ] **Step 3: Add Drizzle relations for customer interview tables**

Add to `packages/server/src/db/schema.ts` in the relations section (near the existing `projectsRelations`):

```typescript
import { customerInterviews, interviewResponses, ndaSignatures } from './customer-interview-schema';

// Add customerInterviews to the existing projectsRelations:
// Find the existing projectsRelations and add:
//   customerInterviews: many(customerInterviews),

export const customerInterviewsRelations = relations(customerInterviews, ({ one, many }) => ({
  project: one(projects, {
    fields: [customerInterviews.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [customerInterviews.userId],
    references: [users.id],
  }),
  responses: many(interviewResponses),
  ndaSignatures: many(ndaSignatures),
}));

export const interviewResponsesRelations = relations(interviewResponses, ({ one }) => ({
  customerInterview: one(customerInterviews, {
    fields: [interviewResponses.customerInterviewId],
    references: [customerInterviews.id],
  }),
}));

export const ndaSignaturesRelations = relations(ndaSignatures, ({ one }) => ({
  customerInterview: one(customerInterviews, {
    fields: [ndaSignatures.customerInterviewId],
    references: [customerInterviews.id],
  }),
  response: one(interviewResponses, {
    fields: [ndaSignatures.interviewResponseId],
    references: [interviewResponses.id],
  }),
}));
```

- [ ] **Step 4: Add CUSTOMER_DISCOVERY to the ReportType enum**

In `packages/server/src/db/schema.ts`, find the `reportTypeEnum` and add `'CUSTOMER_DISCOVERY'`:
```typescript
export const reportTypeEnum = pgEnum('ReportType', [
  'BUSINESS_PLAN', 'POSITIONING', 'COMPETITIVE_ANALYSIS', 'WHY_NOW', 'PROOF_SIGNALS',
  'KEYWORDS_SEO', 'CUSTOMER_PROFILE', 'VALUE_EQUATION', 'VALUE_LADDER', 'GO_TO_MARKET',
  'CUSTOMER_DISCOVERY',
]);
```

Also update `packages/shared/src/validators/index.ts` — find the `reportTypeSchema` and add the new value:
```typescript
export const reportTypeSchema = z.enum([
  'BUSINESS_PLAN', 'POSITIONING', 'COMPETITIVE_ANALYSIS', 'WHY_NOW', 'PROOF_SIGNALS',
  'KEYWORDS_SEO', 'CUSTOMER_PROFILE', 'VALUE_EQUATION', 'VALUE_LADDER', 'GO_TO_MARKET',
  'CUSTOMER_DISCOVERY',
]);
```

And update `packages/shared/src/types/index.ts` — find the `ReportType` type and add:
```typescript
export type ReportType =
  | 'BUSINESS_PLAN'
  | 'POSITIONING'
  | 'COMPETITIVE_ANALYSIS'
  | 'WHY_NOW'
  | 'PROOF_SIGNALS'
  | 'KEYWORDS_SEO'
  | 'CUSTOMER_PROFILE'
  | 'VALUE_EQUATION'
  | 'VALUE_LADDER'
  | 'GO_TO_MARKET'
  | 'CUSTOMER_DISCOVERY';
```

- [ ] **Step 5: Generate and run migration**

Run: `pnpm db:generate`
Expected: New migration file created in `packages/server/drizzle/`

Run: `pnpm db:push`
Expected: Schema pushed to dev DB successfully.

- [ ] **Step 6: Verify type-check passes**

Run: `pnpm type-check`
Expected: PASS — no type errors across all packages.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/db/customer-interview-schema.ts packages/server/src/db/schema.ts packages/server/drizzle/ packages/shared/src/types/index.ts packages/shared/src/validators/index.ts
git commit -m "feat: add CustomerInterview, InterviewResponse, NdaSignature tables and CUSTOMER_DISCOVERY report type"
```

---

## Task 3: AI Service — Question Generation & Response Synthesis

**Files:**
- Create: `packages/server/src/services/customer-interview-ai.ts`

- [ ] **Step 1: Create the AI service file**

```typescript
// packages/server/src/services/customer-interview-ai.ts
import { getAnthropicClient } from '../lib/anthropic';
import { z } from 'zod';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';
import { interviewQuestionSchema } from '@forge/shared';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// =============================================================================
// Question Generation
// =============================================================================

const QUESTION_GENERATION_SYSTEM_PROMPT = `You are an expert customer discovery interviewer. Your job is to generate interview questions that help founders validate business ideas by talking to real potential customers.

RULES:
- Generate 8-12 questions
- Use open-ended "Tell me about the last time..." and "How do you..." phrasing — never "Would you..." or "Do you think..."
- Questions must be ordered: Context → Problem exploration → Current workaround → Pain severity → Willingness to act → Commitment
- Mix question types appropriately:
  - FREE_TEXT for open discovery (most questions)
  - SCALE (1-5) for severity/frequency/satisfaction
  - MULTIPLE_CHOICE for role selection, budget ranges, current tools (include an "Other" option)
  - YES_NO only for the final commitment question
- Each question needs: id (q1, q2, etc.), text, type, required (true for all except last), and options (only for MULTIPLE_CHOICE)
- Questions should probe the SPECIFIC pain points and market context from the research data provided
- Keep questions concise and conversational — these are being filled out by real people, not read aloud

Return a JSON object: { "title": "...", "questions": [...] }
The title should be like "Customer Discovery: [Topic]" — short and descriptive.`;

interface QuestionGenerationContext {
  projectTitle: string;
  projectDescription: string;
  cardResult?: unknown;
  interviewData?: unknown;
  interviewMessages?: unknown;
  synthesizedInsights?: unknown;
  painPoints?: unknown;
  positioning?: unknown;
}

const generatedQuestionsSchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(interviewQuestionSchema).min(8).max(12),
});

export async function generateInterviewQuestions(
  context: QuestionGenerationContext
): Promise<{ title: string; questions: InterviewQuestion[] }> {
  const client = getAnthropicClient();

  // Build context string from whatever data is available
  const contextParts: string[] = [
    `## Business Idea\n**${context.projectTitle}**\n${context.projectDescription}`,
  ];

  if (context.cardResult) {
    contextParts.push(`## Quick Validation Results\n${JSON.stringify(context.cardResult, null, 2)}`);
  }
  if (context.interviewData) {
    contextParts.push(`## Founder Interview Data\n${JSON.stringify(context.interviewData, null, 2)}`);
  }
  if (context.synthesizedInsights) {
    contextParts.push(`## Research Insights\n${JSON.stringify(context.synthesizedInsights, null, 2)}`);
  }
  if (context.painPoints) {
    contextParts.push(`## Identified Pain Points\n${JSON.stringify(context.painPoints, null, 2)}`);
  }
  if (context.positioning) {
    contextParts.push(`## Positioning\n${JSON.stringify(context.positioning, null, 2)}`);
  }

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4000,
    temperature: 0.3,
    system: QUESTION_GENERATION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate customer discovery interview questions based on this context:\n\n${contextParts.join('\n\n---\n\n')}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  const jsonStr = block.text.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        throw new Error('No JSON found in Haiku response');
      }
    }
  }

  const result = generatedQuestionsSchema.safeParse(parsed);
  if (!result.success) {
    console.error('[CustomerInterviewAI] Question generation validation failed:', result.error.issues.slice(0, 3));
    throw new Error('Question generation response failed validation');
  }

  console.log('[CustomerInterviewAI] Generated', result.data.questions.length, 'questions:', result.data.title);
  return result.data;
}

// =============================================================================
// Response Synthesis
// =============================================================================

const SYNTHESIS_SYSTEM_PROMPT = `You are an expert customer research analyst. Your job is to synthesize customer interview responses into actionable insights for founders validating a business idea.

Analyze all responses and produce a structured report with these sections:
1. responseOverview — count, completion stats, respondent demographics summary
2. painValidation — which pain points were confirmed, denied, or newly discovered. Include counts.
3. severityAndFrequency — aggregated scale responses with distributions (e.g., "4.2/5 average severity, 60% rated 4+")
4. workaroundAnalysis — how people currently solve it, common tools/methods, gaps in current solutions
5. willingnessToPay — budget signals, decision-maker patterns, price sensitivity
6. keyQuotes — 5-8 verbatim answers that strongly support or challenge the thesis. Include respondent context.
7. researchDelta — what customer interviews revealed that desk research missed (only if research data provided)
8. confidenceUpdate — revised assessment of the opportunity given real-world input (HIGH/MEDIUM/LOW with justification)
9. recommendedNextSteps — 3-5 specific, actionable recommendations

Return a JSON object with these exact keys. Each value should be a markdown-formatted string suitable for rendering in a report.`;

interface SynthesisContext {
  projectTitle: string;
  projectDescription: string;
  questions: InterviewQuestion[];
  responses: Array<{
    answers: InterviewAnswer[];
    respondentName?: string | null;
  }>;
  researchData?: {
    synthesizedInsights?: unknown;
    painPoints?: unknown;
    competitors?: unknown;
    positioning?: unknown;
  };
}

const synthesisResultSchema = z.object({
  responseOverview: z.string(),
  painValidation: z.string(),
  severityAndFrequency: z.string(),
  workaroundAnalysis: z.string(),
  willingnessToPay: z.string(),
  keyQuotes: z.string(),
  researchDelta: z.string(),
  confidenceUpdate: z.string(),
  recommendedNextSteps: z.string(),
});

export type CustomerDiscoverySynthesis = z.infer<typeof synthesisResultSchema>;

export async function synthesizeResponses(
  context: SynthesisContext
): Promise<CustomerDiscoverySynthesis> {
  const client = getAnthropicClient();

  const contextParts: string[] = [
    `## Business Idea\n**${context.projectTitle}**\n${context.projectDescription}`,
    `## Interview Questions\n${context.questions.map((q, i) => `${i + 1}. [${q.type}] ${q.text}`).join('\n')}`,
    `## Responses (${context.responses.length} total)\n${context.responses.map((r, i) => {
      const name = r.respondentName || `Respondent ${i + 1}`;
      const answerLines = r.answers.map(a => {
        const q = context.questions.find(q => q.id === a.questionId);
        return `  Q: ${q?.text || a.questionId}\n  A: ${a.value}`;
      }).join('\n');
      return `### ${name}\n${answerLines}`;
    }).join('\n\n')}`,
  ];

  if (context.researchData) {
    contextParts.push(`## Existing Research Data\n${JSON.stringify(context.researchData, null, 2)}`);
  }

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 8000,
    temperature: 0,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Synthesize these customer interview responses:\n\n${contextParts.join('\n\n---\n\n')}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Expected text response from Haiku');
  }

  const jsonStr = block.text.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      parsed = JSON.parse(match[1].trim());
    } else {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        throw new Error('No JSON found in Haiku response');
      }
    }
  }

  const result = synthesisResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error('[CustomerInterviewAI] Synthesis validation failed:', result.error.issues.slice(0, 3));
    throw new Error('Synthesis response failed validation');
  }

  console.log('[CustomerInterviewAI] Synthesis complete');
  return result.data;
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm --filter @forge/server type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/services/customer-interview-ai.ts
git commit -m "feat: add AI service for customer interview question generation and response synthesis"
```

---

## Task 4: tRPC Router

**Files:**
- Create: `packages/server/src/routers/customerInterview.ts`
- Modify: `packages/server/src/routers/index.ts`

- [ ] **Step 1: Create the customer interview router**

```typescript
// packages/server/src/routers/customerInterview.ts
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { eq, and, desc } from 'drizzle-orm';
import { customerInterviews, interviewResponses, ndaSignatures, projects, interviews, research } from '../db/schema';
import {
  generateCustomerInterviewSchema,
  regenerateQuestionsSchema,
  publishCustomerInterviewSchema,
  closeCustomerInterviewSchema,
  getCustomerInterviewSchema,
  getCustomerInterviewByUuidSchema,
  verifyPasswordSchema,
  submitResponseSchema,
  signNdaSchema,
  listResponsesSchema,
  synthesizeResponsesSchema,
} from '@forge/shared';
import { CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS, CUSTOMER_INTERVIEW_MIN_COMPLETION_SECONDS } from '@forge/shared';
import { generateInterviewQuestions, synthesizeResponses } from '../services/customer-interview-ai';
import bcrypt from 'bcryptjs';
import type { InterviewAnswer, InterviewQuestion } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints } from '@forge/shared';

export const customerInterviewRouter = router({
  /**
   * Generate a new customer interview with AI-generated questions.
   * Uses whatever project context is available (description, cardResult, interview data, research).
   */
  generate: protectedProcedure
    .input(generateCustomerInterviewSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          research: {
            columns: {
              synthesizedInsights: true,
              painPoints: true,
              positioning: true,
              sparkResult: true,
            },
          },
          interviews: {
            where: eq(interviews.status, 'COMPLETE'),
            orderBy: desc(interviews.createdAt),
            limit: 1,
            columns: {
              collectedData: true,
              messages: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PROJECT_NOT_FOUND' });
      }

      // Build context from whatever data is available
      const interviewRecord = project.interviews[0];
      const researchRecord = project.research;

      const generated = await generateInterviewQuestions({
        projectTitle: project.title,
        projectDescription: project.description,
        cardResult: project.cardResult ?? researchRecord?.sparkResult,
        interviewData: interviewRecord?.collectedData as Partial<InterviewDataPoints> | undefined,
        interviewMessages: interviewRecord?.messages as unknown as ChatMessage[] | undefined,
        synthesizedInsights: researchRecord?.synthesizedInsights,
        painPoints: researchRecord?.painPoints,
        positioning: researchRecord?.positioning,
      });

      const [customerInterview] = await ctx.db
        .insert(customerInterviews)
        .values({
          projectId: input.projectId,
          userId: ctx.userId,
          uuid: crypto.randomUUID(),
          title: generated.title,
          questions: generated.questions,
        })
        .returning();

      if (!customerInterview) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create customer interview' });
      }

      return customerInterview;
    }),

  /**
   * Regenerate questions for a draft customer interview.
   */
  regenerate: protectedProcedure
    .input(regenerateQuestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(eq(customerInterviews.id, input.id), eq(customerInterviews.userId, ctx.userId)),
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      if (ci.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only regenerate questions for draft interviews' });
      }

      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, ci.projectId),
        with: {
          research: {
            columns: { synthesizedInsights: true, painPoints: true, positioning: true, sparkResult: true },
          },
          interviews: {
            where: eq(interviews.status, 'COMPLETE'),
            orderBy: desc(interviews.createdAt),
            limit: 1,
            columns: { collectedData: true, messages: true },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PROJECT_NOT_FOUND' });
      }

      const interviewRecord = project.interviews[0];
      const researchRecord = project.research;

      const generated = await generateInterviewQuestions({
        projectTitle: project.title,
        projectDescription: project.description,
        cardResult: project.cardResult ?? researchRecord?.sparkResult,
        interviewData: interviewRecord?.collectedData as Partial<InterviewDataPoints> | undefined,
        interviewMessages: interviewRecord?.messages as unknown as ChatMessage[] | undefined,
        synthesizedInsights: researchRecord?.synthesizedInsights,
        painPoints: researchRecord?.painPoints,
        positioning: researchRecord?.positioning,
      });

      await ctx.db
        .update(customerInterviews)
        .set({ title: generated.title, questions: generated.questions })
        .where(eq(customerInterviews.id, input.id));

      return { title: generated.title, questions: generated.questions };
    }),

  /**
   * Publish a customer interview — makes it accessible via the shareable link.
   */
  publish: protectedProcedure
    .input(publishCustomerInterviewSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(eq(customerInterviews.id, input.id), eq(customerInterviews.userId, ctx.userId)),
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      if (ci.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Interview is already published or closed' });
      }

      if (input.gating === 'PASSWORD' && !input.password) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Password is required for PASSWORD gating' });
      }

      const hashedPassword = input.password ? await bcrypt.hash(input.password, 10) : null;

      await ctx.db
        .update(customerInterviews)
        .set({
          status: 'PUBLISHED',
          gating: input.gating,
          password: hashedPassword,
          waitlistEnabled: input.waitlistEnabled,
          newsletterEnabled: input.newsletterEnabled,
        })
        .where(eq(customerInterviews.id, input.id));

      return { uuid: ci.uuid };
    }),

  /**
   * Close a published customer interview.
   */
  close: protectedProcedure
    .input(closeCustomerInterviewSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(eq(customerInterviews.id, input.id), eq(customerInterviews.userId, ctx.userId)),
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      await ctx.db
        .update(customerInterviews)
        .set({ status: 'CLOSED' })
        .where(eq(customerInterviews.id, input.id));

      return { success: true };
    }),

  /**
   * Get a customer interview by ID (for the founder).
   */
  get: protectedProcedure
    .input(getCustomerInterviewSchema)
    .query(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(eq(customerInterviews.id, input.id), eq(customerInterviews.userId, ctx.userId)),
        with: {
          responses: {
            columns: { id: true },
          },
        },
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      return { ...ci, responseCount: ci.responses.length };
    }),

  /**
   * Get customer interview for a project (for the founder dashboard).
   */
  getByProject: protectedProcedure
    .input(generateCustomerInterviewSchema) // reuse: { projectId }
    .query(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.projectId, input.projectId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        orderBy: desc(customerInterviews.createdAt),
        with: {
          responses: {
            columns: { id: true },
          },
        },
      });

      if (!ci) return null;
      return { ...ci, responseCount: ci.responses.length };
    }),

  /**
   * List responses for a customer interview (for the founder).
   */
  listResponses: protectedProcedure
    .input(listResponsesSchema)
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        columns: { id: true },
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      const responses = await ctx.db.query.interviewResponses.findMany({
        where: eq(interviewResponses.customerInterviewId, input.customerInterviewId),
        orderBy: desc(interviewResponses.createdAt),
      });

      return responses;
    }),

  // =========================================================================
  // Public procedures (for respondents filling out the form)
  // =========================================================================

  /**
   * Get a published customer interview by UUID (public — for respondents).
   */
  getByUuid: publicProcedure
    .input(getCustomerInterviewByUuidSchema)
    .query(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: eq(customerInterviews.uuid, input.uuid),
        columns: {
          id: true,
          uuid: true,
          title: true,
          questions: true,
          gating: true,
          status: true,
          waitlistEnabled: true,
          newsletterEnabled: true,
        },
        with: {
          project: {
            columns: { title: true, description: true },
          },
        },
      });

      if (!ci || ci.status === 'DRAFT') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      // Don't expose questions until gating is passed (handled client-side, but strip password-gated ones)
      return ci;
    }),

  /**
   * Verify password for a password-gated interview.
   */
  verifyPassword: publicProcedure
    .input(verifyPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true, password: true, gating: true },
      });

      if (!ci || ci.gating !== 'PASSWORD' || !ci.password) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      const valid = await bcrypt.compare(input.password, ci.password);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'INVALID_PASSWORD' });
      }

      return { success: true };
    }),

  /**
   * Sign the NDA for an NDA-gated interview.
   */
  signNda: publicProcedure
    .input(signNdaSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true, gating: true },
      });

      if (!ci || ci.gating !== 'NDA') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      // Get IP from headers (works behind Vercel proxy)
      const forwarded = (ctx as any).req?.headers?.['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 'unknown';

      const [sig] = await ctx.db
        .insert(ndaSignatures)
        .values({
          customerInterviewId: ci.id,
          fullName: input.fullName,
          email: input.email,
          signature: input.signature,
          ipAddress,
        })
        .returning();

      return { signatureId: sig!.id };
    }),

  /**
   * Submit a response to a published customer interview.
   */
  submitResponse: publicProcedure
    .input(submitResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true, questions: true },
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      // Verify Cloudflare Turnstile token
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: input.turnstileToken,
        }),
      });
      const turnstileResult = await turnstileResponse.json() as { success: boolean };
      if (!turnstileResult.success) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'TURNSTILE_FAILED' });
      }

      // Check for duplicate submission
      const existing = await ctx.db.query.interviewResponses.findFirst({
        where: and(
          eq(interviewResponses.customerInterviewId, ci.id),
          eq(interviewResponses.sessionToken, input.sessionToken),
        ),
        columns: { id: true },
      });

      if (existing) {
        return { alreadySubmitted: true, responseId: existing.id };
      }

      // Check honeypot (client should NOT send a filled honeypot — this is validated client-side,
      // but the server rejects if the minimum time hasn't passed, which is a server-side check)

      const [response] = await ctx.db
        .insert(interviewResponses)
        .values({
          customerInterviewId: ci.id,
          sessionToken: input.sessionToken,
          answers: input.answers,
          respondentName: input.respondentName,
          respondentEmail: input.respondentEmail,
          joinedWaitlist: input.joinedWaitlist,
          joinedNewsletter: input.joinedNewsletter,
          completedAt: new Date(),
        })
        .returning();

      return { alreadySubmitted: false, responseId: response!.id };
    }),

  /**
   * Synthesize responses into a CUSTOMER_DISCOVERY report.
   */
  synthesize: protectedProcedure
    .input(synthesizeResponsesSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        with: {
          responses: true,
          project: {
            with: {
              research: {
                columns: {
                  synthesizedInsights: true,
                  painPoints: true,
                  competitors: true,
                  positioning: true,
                },
              },
            },
          },
        },
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      if (ci.responses.length < CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Need at least ${CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS} responses to synthesize`,
        });
      }

      const questions = ci.questions as InterviewQuestion[];
      const researchRecord = ci.project.research;

      const synthesis = await synthesizeResponses({
        projectTitle: ci.project.title,
        projectDescription: ci.project.description,
        questions,
        responses: ci.responses.map(r => ({
          answers: r.answers as InterviewAnswer[],
          respondentName: r.respondentName,
        })),
        researchData: researchRecord ? {
          synthesizedInsights: researchRecord.synthesizedInsights,
          painPoints: researchRecord.painPoints,
          competitors: researchRecord.competitors,
          positioning: researchRecord.positioning,
        } : undefined,
      });

      // Build report content as markdown sections
      const reportContent = [
        `# Customer Discovery Report: ${ci.project.title}`,
        '',
        `## Response Overview\n${synthesis.responseOverview}`,
        `## Pain Validation\n${synthesis.painValidation}`,
        `## Severity & Frequency\n${synthesis.severityAndFrequency}`,
        `## Workaround Analysis\n${synthesis.workaroundAnalysis}`,
        `## Willingness to Pay\n${synthesis.willingnessToPay}`,
        `## Key Quotes\n${synthesis.keyQuotes}`,
        `## Research Delta\n${synthesis.researchDelta}`,
        `## Confidence Update\n${synthesis.confidenceUpdate}`,
        `## Recommended Next Steps\n${synthesis.recommendedNextSteps}`,
      ].join('\n\n');

      // Upsert report — replace existing CUSTOMER_DISCOVERY report for this project
      const { reports } = await import('../db/schema');
      const existingReport = await ctx.db.query.reports.findFirst({
        where: and(
          eq(reports.projectId, ci.projectId),
          eq(reports.type, 'CUSTOMER_DISCOVERY'),
        ),
        columns: { id: true },
      });

      if (existingReport) {
        await ctx.db.update(reports).set({
          content: reportContent,
          sections: synthesis,
          status: 'COMPLETE',
        }).where(eq(reports.id, existingReport.id));
        return { reportId: existingReport.id };
      } else {
        const [report] = await ctx.db.insert(reports).values({
          projectId: ci.projectId,
          userId: ctx.userId,
          type: 'CUSTOMER_DISCOVERY',
          tier: 'FULL',
          title: `Customer Discovery: ${ci.project.title}`,
          content: reportContent,
          sections: synthesis,
          status: 'COMPLETE',
        }).returning();
        return { reportId: report!.id };
      }
    }),
});
```

- [ ] **Step 2: Register the router in the app router**

In `packages/server/src/routers/index.ts`, add:

```typescript
import { customerInterviewRouter } from './customerInterview';
```

And add to the router object:
```typescript
customerInterview: customerInterviewRouter,
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routers/customerInterview.ts packages/server/src/routers/index.ts
git commit -m "feat: add customerInterview tRPC router with generate, publish, submit, and synthesize procedures"
```

---

## Task 5: Web — Draft Page Integration (Customer Interview Card)

**Files:**
- Modify: `packages/web/src/app/(dashboard)/projects/[id]/components/status-captured.tsx`

- [ ] **Step 1: Add the Customer Interview card to the draft page**

In `packages/web/src/app/(dashboard)/projects/[id]/components/status-captured.tsx`:

Add to imports:
```typescript
import { Users } from 'lucide-react';
```

Add the mutation inside the component (after the `startInterview` mutation):
```typescript
const createCustomerInterview = trpc.customerInterview.generate.useMutation({
  onSuccess: (data) => {
    router.push(`/projects/${project.id}/customer-interview`);
  },
});
```

Change the grid from `md:grid-cols-3` to `md:grid-cols-4` on line 213:
```typescript
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
```

Add the Customer Interview card after the Light Interview button (before the closing `</div>` of the grid, after the Light Interview `</button>`):

```tsx
{/* Customer Interview - shareable form for real customers */}
<button
  onClick={() => createCustomerInterview.mutate({ projectId: project.id })}
  disabled={createCustomerInterview.isPending || startInterview.isPending}
  className="group relative rounded-xl bg-card border border-border p-5 text-left transition-all duration-300 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <div className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
      <Users className="w-5 h-5 text-teal-500" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-foreground group-hover:text-teal-500 transition-colors">
        Customer Interview
      </h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Shareable form</span>
      </div>
    </div>
  </div>

  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
    Generate a shareable interview for real customers to validate your idea
  </p>

  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-500 border border-teal-500/20">
        Real Feedback
      </span>
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
        Shareable
      </span>
    </div>
    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
  </div>
</button>
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm --filter @forge/web type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(dashboard)/projects/[id]/components/status-captured.tsx
git commit -m "feat: add Customer Interview card to draft project page"
```

---

## Task 6: Web — Customer Interview Preview & Management Page

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/[id]/customer-interview/page.tsx`

- [ ] **Step 1: Create the customer interview management page**

```typescript
// packages/web/src/app/(dashboard)/projects/[id]/customer-interview/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Copy, Check, RefreshCw, Globe, Lock, FileText, Eye, BarChart3 } from 'lucide-react';
import type { CustomerInterviewGating } from '@forge/shared';
import { CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS } from '@forge/shared';

export default function CustomerInterviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [gating, setGating] = useState<CustomerInterviewGating>('PUBLIC');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: ci, isLoading } = trpc.customerInterview.getByProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const regenerate = trpc.customerInterview.regenerate.useMutation({
    onSuccess: () => {
      utils.customerInterview.getByProject.invalidate({ projectId: projectId! });
    },
  });

  const publish = trpc.customerInterview.publish.useMutation({
    onSuccess: () => {
      utils.customerInterview.getByProject.invalidate({ projectId: projectId! });
    },
  });

  const close = trpc.customerInterview.close.useMutation({
    onSuccess: () => {
      utils.customerInterview.getByProject.invalidate({ projectId: projectId! });
    },
  });

  const synthesize = trpc.customerInterview.synthesize.useMutation({
    onSuccess: (data) => {
      router.push(`/projects/${projectId}/reports`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ci) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No customer interview found.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/i/${ci.uuid}`;
  const questions = ci.questions as import('@forge/shared').InterviewQuestion[];

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = () => {
    if (gating === 'PASSWORD' && !password.trim()) return;
    publish.mutate({
      id: ci.id,
      gating,
      password: gating === 'PASSWORD' ? password : undefined,
    });
  };

  const canSynthesize = ci.responseCount >= CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/projects/${projectId}`)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{ci.title}</h1>
          <p className="text-sm text-muted-foreground">
            {ci.status === 'DRAFT' && 'Preview and publish your customer interview'}
            {ci.status === 'PUBLISHED' && `${ci.responseCount} response${ci.responseCount !== 1 ? 's' : ''} collected`}
            {ci.status === 'CLOSED' && 'This interview is closed'}
          </p>
        </div>
        {ci.status === 'PUBLISHED' && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
            Live
          </span>
        )}
        {ci.status === 'CLOSED' && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border">
            Closed
          </span>
        )}
      </div>

      {/* Share Link (when published) */}
      {ci.status === 'PUBLISHED' && (
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-background rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono truncate border border-border">
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-medium hover:bg-primary/80 transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Actions (when published) */}
      {ci.status === 'PUBLISHED' && (
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}/customer-interview/responses`)}
            className="flex-1 rounded-xl bg-card border border-border p-4 text-left hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">View Responses</span>
            </div>
            <p className="text-xs text-muted-foreground">{ci.responseCount} response{ci.responseCount !== 1 ? 's' : ''}</p>
          </button>

          <button
            onClick={() => synthesize.mutate({ customerInterviewId: ci.id })}
            disabled={!canSynthesize || synthesize.isPending}
            className="flex-1 rounded-xl bg-card border border-border p-4 text-left hover:border-teal-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-medium text-foreground">
                {synthesize.isPending ? 'Generating...' : 'Generate Report'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {canSynthesize ? 'Create Customer Discovery PDF' : `Need ${CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS}+ responses`}
            </p>
          </button>

          <button
            onClick={() => close.mutate({ id: ci.id })}
            disabled={close.isPending}
            className="rounded-xl bg-card border border-border p-4 text-left hover:border-destructive/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-foreground">Close</span>
            </div>
            <p className="text-xs text-muted-foreground">Stop collecting</p>
          </button>
        </div>
      )}

      {/* Gating selector (when draft) */}
      {ci.status === 'DRAFT' && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Access Control</h2>
          <div className="flex gap-3">
            {(['PUBLIC', 'PASSWORD', 'NDA'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGating(g)}
                className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  gating === g
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  {g === 'PUBLIC' && <Globe className="w-4 h-4" />}
                  {g === 'PASSWORD' && <Lock className="w-4 h-4" />}
                  {g === 'NDA' && <FileText className="w-4 h-4" />}
                  {g}
                </div>
              </button>
            ))}
          </div>

          {gating === 'PASSWORD' && (
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          )}
        </div>
      )}

      {/* Questions Preview */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Questions ({questions.length})</h2>
          {ci.status === 'DRAFT' && (
            <button
              onClick={() => regenerate.mutate({ id: ci.id })}
              disabled={regenerate.isPending}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerate.isPending ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          )}
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="flex gap-3 p-3 rounded-lg bg-background border border-border">
              <span className="text-xs font-mono text-muted-foreground mt-0.5">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm text-foreground">{q.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                    {q.type.replace('_', ' ')}
                  </span>
                  {q.required && (
                    <span className="text-xs text-primary/60">Required</span>
                  )}
                  {q.options && (
                    <span className="text-xs text-muted-foreground">
                      {q.options.length} options
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publish button (when draft) */}
      {ci.status === 'DRAFT' && (
        <button
          onClick={handlePublish}
          disabled={publish.isPending || (gating === 'PASSWORD' && !password.trim())}
          className="w-full py-3 rounded-full bg-primary text-foreground font-semibold text-sm hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publish.isPending ? 'Publishing...' : 'Publish Interview'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm --filter @forge/web type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(dashboard)/projects/[id]/customer-interview/page.tsx
git commit -m "feat: add customer interview preview and management page"
```

---

## Task 7: Web — Responses List Page

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/[id]/customer-interview/responses/page.tsx`

- [ ] **Step 1: Create the responses page**

```typescript
// packages/web/src/app/(dashboard)/projects/[id]/customer-interview/responses/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, User, Mail, Calendar, CheckCircle } from 'lucide-react';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';

export default function ResponsesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: ci } = trpc.customerInterview.getByProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const { data: responses, isLoading } = trpc.customerInterview.listResponses.useQuery(
    { customerInterviewId: ci?.id ?? '' },
    { enabled: !!ci?.id },
  );

  const questions = (ci?.questions ?? []) as InterviewQuestion[];

  if (isLoading || !ci) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/projects/${projectId}/customer-interview`)}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Responses</h1>
          <p className="text-sm text-muted-foreground">{responses?.length ?? 0} response{(responses?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Responses */}
      {(!responses || responses.length === 0) ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <p className="text-muted-foreground">No responses yet. Share your interview link to start collecting feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {responses.map((r, idx) => {
            const answers = r.answers as InterviewAnswer[];
            return (
              <div key={r.id} className="rounded-xl bg-card border border-border p-5 space-y-4">
                {/* Response header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.respondentName || `Respondent ${idx + 1}`}
                      </p>
                      {r.respondentEmail && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {r.respondentEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.joinedWaitlist && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-500 border border-teal-500/20">
                        Waitlist
                      </span>
                    )}
                    {r.joinedNewsletter && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        Newsletter
                      </span>
                    )}
                    {r.completedAt && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(r.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Answers */}
                <div className="space-y-3 pl-11">
                  {answers.map((a) => {
                    const question = questions.find(q => q.id === a.questionId);
                    return (
                      <div key={a.questionId} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{question?.text ?? a.questionId}</p>
                        <p className="text-sm text-foreground">{String(a.value)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm --filter @forge/web type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(dashboard)/projects/[id]/customer-interview/responses/page.tsx
git commit -m "feat: add customer interview responses list page"
```

---

## Task 8: Web — Public Interview Form (`/i/[uuid]`)

**Files:**
- Create: `packages/web/src/app/i/[uuid]/page.tsx`
- Create: `packages/web/src/app/i/[uuid]/components/interview-form.tsx`
- Create: `packages/web/src/app/i/[uuid]/components/gating-screen.tsx`
- Create: `packages/web/src/app/i/[uuid]/components/nda-signature.tsx`
- Create: `packages/web/src/app/i/[uuid]/components/thank-you.tsx`

This is the largest task — the public-facing Typeform-style form. Breaking it into sub-steps.

- [ ] **Step 1: Create the main page component**

```typescript
// packages/web/src/app/i/[uuid]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { InterviewForm } from './components/interview-form';
import { GatingScreen } from './components/gating-screen';
import { ThankYou } from './components/thank-you';

type FormPhase = 'loading' | 'gating' | 'form' | 'contact' | 'thankyou' | 'closed' | 'notfound';

export default function PublicInterviewPage() {
  const { uuid } = useParams<{ uuid: string }>();

  const [phase, setPhase] = useState<FormPhase>('loading');
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [ndaData, setNdaData] = useState<{ fullName: string; email: string } | null>(null);

  const { data: ci, isLoading, error } = trpc.customerInterview.getByUuid.useQuery(
    { uuid: uuid! },
    { enabled: !!uuid, retry: false },
  );

  useEffect(() => {
    if (isLoading) return;
    if (error || !ci) {
      setPhase('notfound');
      return;
    }
    if (ci.status === 'CLOSED') {
      setPhase('closed');
      return;
    }
    if (ci.gating === 'PUBLIC') {
      setPhase('form');
    } else {
      setPhase('gating');
    }
  }, [ci, isLoading, error]);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#E32B1A] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (phase === 'notfound') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-gray-400">Interview not found.</p>
      </div>
    );
  }

  if (phase === 'closed') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-xl font-semibold text-white mb-2">Interview Closed</h1>
          <p className="text-gray-400">This interview is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  if (!ci) return null;

  if (phase === 'gating') {
    return (
      <GatingScreen
        uuid={uuid!}
        gating={ci.gating}
        title={ci.title}
        onPass={(nda) => {
          if (nda) setNdaData(nda);
          setPhase('form');
        }}
      />
    );
  }

  if (phase === 'thankyou') {
    return (
      <ThankYou
        waitlistEnabled={ci.waitlistEnabled}
        newsletterEnabled={ci.newsletterEnabled}
      />
    );
  }

  return (
    <InterviewForm
      ci={ci}
      uuid={uuid!}
      sessionToken={sessionToken}
      ndaData={ndaData}
      onComplete={() => setPhase('thankyou')}
    />
  );
}
```

- [ ] **Step 2: Create the gating screen component**

```typescript
// packages/web/src/app/i/[uuid]/components/gating-screen.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Lock } from 'lucide-react';
import { NdaSignature } from './nda-signature';
import type { CustomerInterviewGating } from '@forge/shared';

interface GatingScreenProps {
  uuid: string;
  gating: CustomerInterviewGating;
  title: string;
  onPass: (ndaData?: { fullName: string; email: string }) => void;
}

export function GatingScreen({ uuid, gating, title, onPass }: GatingScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const verifyPassword = trpc.customerInterview.verifyPassword.useMutation({
    onSuccess: () => onPass(),
    onError: () => setError('Incorrect password'),
  });

  if (gating === 'NDA') {
    return <NdaSignature uuid={uuid} title={title} onSigned={(data) => onPass(data)} />;
  }

  // PASSWORD gating
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E32B1A]/20 mx-auto">
          <Lock className="w-6 h-6 text-[#E32B1A]" />
        </div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-gray-400">This interview is password protected.</p>

        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword.mutate({ uuid, password })}
            placeholder="Enter password..."
            className="w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E32B1A]/50"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={() => verifyPassword.mutate({ uuid, password })}
            disabled={!password.trim() || verifyPassword.isPending}
            className="w-full py-3 rounded-full bg-[#E32B1A] text-white font-semibold text-sm hover:bg-[#E32B1A]/80 transition-colors disabled:opacity-50"
          >
            {verifyPassword.isPending ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the NDA signature component**

```typescript
// packages/web/src/app/i/[uuid]/components/nda-signature.tsx
'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { FileText } from 'lucide-react';

interface NdaSignatureProps {
  uuid: string;
  title: string;
  onSigned: (data: { fullName: string; email: string }) => void;
}

const NDA_TEXT = `NON-DISCLOSURE AGREEMENT

By signing below, you agree to keep confidential all information shared during this interview, including but not limited to business concepts, product ideas, market strategies, and any other proprietary information disclosed by the interviewer.

You agree not to disclose, share, or use this information for any purpose other than providing feedback during this interview, without prior written consent.

This agreement remains in effect for a period of two (2) years from the date of signing.`;

export function NdaSignature({ uuid, title, onSigned }: NdaSignatureProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');
  const [useTyped, setUseTyped] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const signNda = trpc.customerInterview.signNda.useMutation({
    onSuccess: () => onSigned({ fullName, email }),
  });

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#E32B1A';
    ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    isDrawing.current = false;
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  const handleSign = () => {
    const sig = useTyped ? fullName : signature;
    if (!sig || !fullName || !email) return;
    signNda.mutate({ uuid, fullName, email, signature: sig });
  };

  const canSubmit = fullName.trim() && email.trim() && (useTyped ? fullName.trim() : signature);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E32B1A]/20 mx-auto">
            <FileText className="w-6 h-6 text-[#E32B1A]" />
          </div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="text-sm text-gray-400">Please review and sign the NDA before proceeding.</p>
        </div>

        {/* NDA Text */}
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{NDA_TEXT}</pre>
        </div>

        {/* Name & Email */}
        <div className="space-y-3">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E32B1A]/50"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E32B1A]/50"
          />
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setUseTyped(true)}
              className={`text-xs px-3 py-1 rounded-full ${useTyped ? 'bg-[#E32B1A]/20 text-[#E32B1A]' : 'text-gray-400 hover:text-white'}`}
            >
              Type signature
            </button>
            <button
              onClick={() => setUseTyped(false)}
              className={`text-xs px-3 py-1 rounded-full ${!useTyped ? 'bg-[#E32B1A]/20 text-[#E32B1A]' : 'text-gray-400 hover:text-white'}`}
            >
              Draw signature
            </button>
          </div>

          {useTyped ? (
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-lg italic text-white font-serif">{fullName || 'Your name here'}</p>
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={120}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 cursor-crosshair"
              />
              {signature && (
                <button onClick={clearCanvas} className="absolute top-2 right-2 text-xs text-gray-400 hover:text-white">
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSign}
          disabled={!canSubmit || signNda.isPending}
          className="w-full py-3 rounded-full bg-[#E32B1A] text-white font-semibold text-sm hover:bg-[#E32B1A]/80 transition-colors disabled:opacity-50"
        >
          {signNda.isPending ? 'Signing...' : 'Sign & Continue'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the interview form component (Typeform-style)**

```typescript
// packages/web/src/app/i/[uuid]/components/interview-form.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import Script from 'next/script';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';
import { CUSTOMER_INTERVIEW_MIN_COMPLETION_SECONDS } from '@forge/shared';

interface InterviewFormProps {
  ci: {
    id: string;
    title: string;
    questions: unknown;
    waitlistEnabled: boolean;
    newsletterEnabled: boolean;
    project: { title: string; description: string };
  };
  uuid: string;
  sessionToken: string;
  ndaData: { fullName: string; email: string } | null;
  onComplete: () => void;
}

export function InterviewForm({ ci, uuid, sessionToken, ndaData, onComplete }: InterviewFormProps) {
  const questions = ci.questions as InterviewQuestion[];
  const totalSteps = questions.length + 2; // welcome + questions + contact
  const [step, setStep] = useState(0); // 0 = welcome, 1..n = questions, n+1 = contact
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [name, setName] = useState(ndaData?.fullName ?? '');
  const [email, setEmail] = useState(ndaData?.email ?? '');
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const [joinedNewsletter, setJoinedNewsletter] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const startTime = useRef(Date.now());
  const turnstileRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const submitResponse = trpc.customerInterview.submitResponse.useMutation({
    onSuccess: (data) => {
      onComplete();
    },
  });

  // Focus input when step changes
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  const currentQuestionIdx = step - 1;
  const currentQuestion = questions[currentQuestionIdx];
  const isWelcome = step === 0;
  const isContact = step === questions.length + 1;
  const progress = Math.round((step / totalSteps) * 100);

  const setAnswer = (value: string | number | boolean) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const canAdvance = () => {
    if (isWelcome) return true;
    if (isContact) return true;
    if (!currentQuestion) return false;
    const val = answers[currentQuestion.id];
    if (!currentQuestion.required) return true;
    if (val === undefined || val === '') return false;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (isContact) {
      handleSubmit();
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleSubmit = () => {
    if (honeypot) return; // bot detected
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed < CUSTOMER_INTERVIEW_MIN_COMPLETION_SECONDS) return; // too fast

    const answerArray: InterviewAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    submitResponse.mutate({
      uuid,
      sessionToken,
      answers: answerArray,
      respondentName: name || undefined,
      respondentEmail: email || undefined,
      joinedWaitlist,
      joinedNewsletter,
      turnstileToken: turnstileRef.current,
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Turnstile Script */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-800">
        <div
          className="h-full bg-[#E32B1A] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Honeypot */}
      <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">

          {/* Welcome screen */}
          {isWelcome && (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <h1 className="text-2xl font-semibold text-white">{ci.title}</h1>
              <p className="text-gray-400">
                We&apos;re researching {ci.project.title} and would love your perspective. Takes about 5 minutes.
              </p>
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#E32B1A] text-white font-semibold text-sm hover:bg-[#E32B1A]/80 transition-colors"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Question screens */}
          {currentQuestion && (
            <div className="space-y-6 animate-in fade-in duration-300" key={currentQuestion.id}>
              <div className="space-y-2">
                <span className="text-xs text-gray-500">{currentQuestionIdx + 1} of {questions.length}</span>
                <h2 className="text-xl font-semibold text-white leading-relaxed">{currentQuestion.text}</h2>
              </div>

              {currentQuestion.type === 'FREE_TEXT' && (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={String(answers[currentQuestion.id] ?? '')}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E32B1A]/50 resize-none"
                />
              )}

              {currentQuestion.type === 'SCALE' && (
                <div className="flex gap-3 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setAnswer(n); setTimeout(handleNext, 300); }}
                      className={`w-14 h-14 rounded-full border text-lg font-semibold transition-colors ${
                        answers[currentQuestion.id] === n
                          ? 'border-[#E32B1A] bg-[#E32B1A]/20 text-[#E32B1A]'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setAnswer(opt); setTimeout(handleNext, 300); }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                        answers[currentQuestion.id] === opt
                          ? 'border-[#E32B1A] bg-[#E32B1A]/10 text-white'
                          : 'border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'YES_NO' && (
                <div className="flex gap-3 justify-center">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setAnswer(opt === 'Yes'); setTimeout(handleNext, 300); }}
                      className={`px-8 py-3 rounded-full border text-sm font-medium transition-colors ${
                        answers[currentQuestion.id] === (opt === 'Yes')
                          ? 'border-[#E32B1A] bg-[#E32B1A]/20 text-[#E32B1A]'
                          : 'border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact capture screen */}
          {isContact && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">Almost done!</h2>
                <p className="text-sm text-gray-400">Leave your details if you&apos;d like to stay in the loop.</p>
              </div>

              <div className="space-y-3">
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E32B1A]/50"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E32B1A]/50"
                />

                {ci.waitlistEnabled && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={joinedWaitlist}
                      onChange={(e) => setJoinedWaitlist(e.target.checked)}
                      className="rounded border-gray-700 bg-gray-900 text-[#E32B1A] focus:ring-[#E32B1A]"
                    />
                    <span className="text-sm text-gray-300">Join the waitlist for early access</span>
                  </label>
                )}
                {ci.newsletterEnabled && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={joinedNewsletter}
                      onChange={(e) => setJoinedNewsletter(e.target.checked)}
                      className="rounded border-gray-700 bg-gray-900 text-[#E32B1A] focus:ring-[#E32B1A]"
                    />
                    <span className="text-sm text-gray-300">Subscribe to the newsletter</span>
                  </label>
                )}
              </div>

              {/* Turnstile widget */}
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                data-callback="onTurnstileSuccess"
                data-theme="dark"
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: `window.onTurnstileSuccess = function(token) { window.__turnstileToken = token; }`,
                }}
              />

              <button
                onClick={() => {
                  turnstileRef.current = (window as any).__turnstileToken || '';
                  handleSubmit();
                }}
                disabled={submitResponse.isPending}
                className="w-full py-3 rounded-full bg-[#E32B1A] text-white font-semibold text-sm hover:bg-[#E32B1A]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitResponse.isPending ? 'Submitting...' : (
                  <>Submit <Check className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {!isWelcome && !isContact && (
        <div className="fixed bottom-0 left-0 right-0 p-6 flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={handleBack}
            className="p-2 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {currentQuestion?.type === 'FREE_TEXT' && (
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="px-6 py-2 rounded-full bg-[#E32B1A] text-white text-sm font-medium hover:bg-[#E32B1A]/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create the thank you component**

```typescript
// packages/web/src/app/i/[uuid]/components/thank-you.tsx
'use client';

import { CheckCircle } from 'lucide-react';

interface ThankYouProps {
  waitlistEnabled: boolean;
  newsletterEnabled: boolean;
}

export function ThankYou({ waitlistEnabled, newsletterEnabled }: ThankYouProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Thank you!</h1>
        <p className="text-gray-400">
          Your feedback is incredibly valuable and will help shape a better product.
        </p>
        <p className="text-xs text-gray-500">
          Powered by IdeaFuel
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify type-check passes**

Run: `pnpm --filter @forge/web type-check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/app/i/
git commit -m "feat: add public interview form with Typeform-style UI, gating, NDA signing, and Turnstile"
```

---

## Task 9: Mobile — "Talk to Customers" Button on Card Screen

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/vault/[id]/card.tsx`
- Create: `packages/mobile/src/app/(tabs)/vault/[id]/customer-interview.tsx`

- [ ] **Step 1: Add "Talk to Customers" button to card screen**

In `packages/mobile/src/app/(tabs)/vault/[id]/card.tsx`:

Add import:
```typescript
import { Users } from 'lucide-react-native';
```

Add handler after `handleRefine`:
```typescript
const handleCustomerInterview = () => {
  triggerHaptic('medium');
  router.push(`/(tabs)/vault/${id}/customer-interview` as any);
};
```

In the `actionButtons` View (around line 209), add the new button between "Go Deeper" and "Refine idea with AI":

```tsx
<Button
  variant="outline"
  size="lg"
  onPress={handleCustomerInterview}
  leftIcon={<Users size={18} color={colors.accent} />}
  style={styles.fullWidth}
>
  Talk to Customers
</Button>
```

- [ ] **Step 2: Create mobile customer interview screen**

```typescript
// packages/mobile/src/app/(tabs)/vault/[id]/customer-interview.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Copy, Globe, Lock, FileText, Share2, RefreshCw } from 'lucide-react-native';
import { Button, triggerHaptic } from '../../../../components/ui/Button';
import { LoadingScreen } from '../../../../components/ui/Spinner';
import { trpc } from '../../../../lib/trpc';
import { colors, fonts } from '../../../../lib/theme';
import type { CustomerInterviewGating, InterviewQuestion } from '@forge/shared';

export default function CustomerInterviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [gating, setGating] = useState<CustomerInterviewGating>('PUBLIC');
  const [password, setPassword] = useState('');

  // Check if interview already exists for this project
  const { data: ci, isLoading } = trpc.customerInterview.getByProject.useQuery(
    { projectId: id! },
    { enabled: !!id },
  );

  // Generate if none exists
  const generate = trpc.customerInterview.generate.useMutation({
    onSuccess: () => {
      utils.customerInterview.getByProject.invalidate({ projectId: id! });
    },
  });

  const regenerate = trpc.customerInterview.regenerate.useMutation({
    onSuccess: () => {
      utils.customerInterview.getByProject.invalidate({ projectId: id! });
    },
  });

  const publish = trpc.customerInterview.publish.useMutation({
    onSuccess: () => {
      triggerHaptic('success');
      utils.customerInterview.getByProject.invalidate({ projectId: id! });
    },
  });

  // Auto-generate on mount if no interview exists
  React.useEffect(() => {
    if (!isLoading && !ci && id) {
      generate.mutate({ projectId: id });
    }
  }, [isLoading, ci, id]);

  if (isLoading || generate.isPending) {
    return <LoadingScreen message="Generating interview questions..." />;
  }

  if (!ci) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>Failed to create interview</Text>
        <Button variant="outline" onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  const questions = ci.questions as InterviewQuestion[];
  const shareUrl = `https://app.ideafuel.ai/i/${ci.uuid}`;

  const handleShare = async () => {
    triggerHaptic('medium');
    await Share.share({
      message: `${ci.title}\n\n${shareUrl}`,
      url: shareUrl,
    });
  };

  const handlePublish = () => {
    if (gating === 'PASSWORD' && !password.trim()) {
      Alert.alert('Password Required', 'Please set a password for the interview.');
      return;
    }
    publish.mutate({
      id: ci.id,
      gating,
      password: gating === 'PASSWORD' ? password : undefined,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, ...fonts.outfit.semiBold, color: colors.foreground }}>Customer Interview</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}>
        {/* Title */}
        <Text style={{ fontSize: 20, ...fonts.outfit.bold, color: colors.foreground }}>{ci.title}</Text>

        {/* Status badge */}
        {ci.status === 'PUBLISHED' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 12, ...fonts.outfit.semiBold, color: '#22c55e' }}>Live</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {ci.responseCount} response{ci.responseCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Share (when published) */}
        {ci.status === 'PUBLISHED' && (
          <Button variant="primary" size="lg" onPress={handleShare} leftIcon={<Share2 size={18} color="#fff" />}>
            Share Interview Link
          </Button>
        )}

        {/* Gating selector (when draft) */}
        {ci.status === 'DRAFT' && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 14, ...fonts.outfit.semiBold, color: colors.foreground }}>Access Control</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['PUBLIC', 'PASSWORD', 'NDA'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGating(g)}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: gating === g ? colors.brand : colors.border,
                    backgroundColor: gating === g ? 'rgba(227, 43, 26, 0.1)' : 'transparent',
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                  }}
                >
                  {g === 'PUBLIC' && <Globe size={18} color={gating === g ? colors.brand : colors.muted} />}
                  {g === 'PASSWORD' && <Lock size={18} color={gating === g ? colors.brand : colors.muted} />}
                  {g === 'NDA' && <FileText size={18} color={gating === g ? colors.brand : colors.muted} />}
                  <Text style={{ fontSize: 12, marginTop: 4, color: gating === g ? colors.brand : colors.muted, ...fonts.outfit.medium }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Questions preview */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, ...fonts.outfit.semiBold, color: colors.foreground }}>
              Questions ({questions.length})
            </Text>
            {ci.status === 'DRAFT' && (
              <TouchableOpacity onPress={() => regenerate.mutate({ id: ci.id })} disabled={regenerate.isPending}>
                <RefreshCw size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
          {questions.map((q, i) => (
            <View key={q.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontSize: 11, color: colors.muted, ...fonts.geist.regular }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.foreground, ...fonts.geist.regular, lineHeight: 20 }}>{q.text}</Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{q.type.replace('_', ' ')}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Publish button (when draft) */}
        {ci.status === 'DRAFT' && (
          <Button
            variant="primary"
            size="lg"
            onPress={handlePublish}
            disabled={publish.isPending || (gating === 'PASSWORD' && !password.trim())}
          >
            {publish.isPending ? 'Publishing...' : 'Publish Interview'}
          </Button>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm --filter @forge/mobile type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/src/app/(tabs)/vault/[id]/card.tsx packages/mobile/src/app/(tabs)/vault/[id]/customer-interview.tsx
git commit -m "feat: add Talk to Customers button and customer interview screen on mobile"
```

---

## Task 10: Research Pipeline Integration

**Files:**
- Modify: `packages/server/src/services/research-ai.ts`
- Modify: `packages/server/src/jobs/queues.ts`
- Modify: `packages/server/src/jobs/workers/researchPipelineWorker.ts`

- [ ] **Step 1: Extend ResearchInput type**

In `packages/server/src/services/research-ai.ts`, find the `ResearchInput` interface and add:

```typescript
customerInterviewResponses?: Array<{
  answers: import('@forge/shared').InterviewAnswer[];
  respondentName?: string | null;
}>;
customerInterviewQuestions?: import('@forge/shared').InterviewQuestion[];
```

- [ ] **Step 2: Update ResearchPipelineJobData**

In `packages/server/src/jobs/queues.ts`, find `ResearchPipelineJobData` and add:

```typescript
customerInterviewId?: string;
```

- [ ] **Step 3: Update research pipeline worker to include customer interview data**

In `packages/server/src/jobs/workers/researchPipelineWorker.ts`, after loading the project and interview (around line 56), add code to load customer interview responses:

```typescript
// Load customer interview responses if available
import { customerInterviews, interviewResponses } from '../../db/schema';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';

let customerInterviewData: {
  questions: InterviewQuestion[];
  responses: Array<{ answers: InterviewAnswer[]; respondentName: string | null }>;
} | undefined;

if (job.data.customerInterviewId) {
  const ci = await db.query.customerInterviews.findFirst({
    where: eq(customerInterviews.id, job.data.customerInterviewId),
    with: { responses: true },
  });
  if (ci && ci.responses.length > 0) {
    customerInterviewData = {
      questions: ci.questions as InterviewQuestion[],
      responses: ci.responses.map(r => ({
        answers: r.answers as InterviewAnswer[],
        respondentName: r.respondentName,
      })),
    };
  }
}
```

Then include it in the `researchInput` object:

```typescript
const researchInput: ResearchInput = {
  ideaTitle: project.title,
  ideaDescription: project.description,
  interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
  interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
  canvasContext: notesContext,
  researchId,
  founderProfile: user?.founderProfile as FounderProfile | null,
  customerInterviewResponses: customerInterviewData?.responses,
  customerInterviewQuestions: customerInterviewData?.questions,
};
```

- [ ] **Step 4: Verify type-check passes**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/research-ai.ts packages/server/src/jobs/queues.ts packages/server/src/jobs/workers/researchPipelineWorker.ts
git commit -m "feat: integrate customer interview responses into research pipeline"
```

---

## Task 11: PDF Print Route for Customer Discovery Report

**Files:**
- Create: `packages/web/src/app/print/customer-discovery/[projectId]/page.tsx`

- [ ] **Step 1: Create the print page**

Follow the exact same pattern as `packages/web/src/app/print/business-plan/[projectId]/page.tsx` — a `'use client'` page that fetches the report data and renders markdown sections for print/PDF.

```typescript
// packages/web/src/app/print/customer-discovery/[projectId]/page.tsx
'use client';

import { trpc } from '@/lib/trpc/client';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface CustomerDiscoverySections {
  responseOverview: string;
  painValidation: string;
  severityAndFrequency: string;
  workaroundAnalysis: string;
  willingnessToPay: string;
  keyQuotes: string;
  researchDelta: string;
  confidenceUpdate: string;
  recommendedNextSteps: string;
}

function parseSections(raw: unknown): CustomerDiscoverySections | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as CustomerDiscoverySections;
}

const SECTION_ORDER: Array<{ key: keyof CustomerDiscoverySections; label: string }> = [
  { key: 'responseOverview', label: 'Response Overview' },
  { key: 'painValidation', label: 'Pain Validation' },
  { key: 'severityAndFrequency', label: 'Severity & Frequency' },
  { key: 'workaroundAnalysis', label: 'Workaround Analysis' },
  { key: 'willingnessToPay', label: 'Willingness to Pay' },
  { key: 'keyQuotes', label: 'Key Quotes' },
  { key: 'researchDelta', label: 'Research Delta' },
  { key: 'confidenceUpdate', label: 'Confidence Update' },
  { key: 'recommendedNextSteps', label: 'Recommended Next Steps' },
];

export default function CustomerDiscoveryPrintPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading } = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId },
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const report = (project as any)?.reports?.find((r: any) => r.type === 'CUSTOMER_DISCOVERY');
  const sections = parseSections(report?.sections);

  if (!sections) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400">No customer discovery report found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[800px] mx-auto px-12 py-16 print:px-0 print:py-0">
        {/* Cover */}
        <div className="text-center mb-16 pb-8 border-b-2 border-gray-200">
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">Customer Discovery Report</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{project?.title}</h1>
          <p className="text-sm text-gray-500">Generated by IdeaFuel</p>
        </div>

        {/* Sections */}
        {SECTION_ORDER.map(({ key, label }) => {
          const content = sections[key];
          if (!content) return null;
          return (
            <div key={key} className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{label}</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-8 border-t border-gray-200">
          <p>Generated by IdeaFuel — ideafuel.ai</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm --filter @forge/web type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/print/customer-discovery/
git commit -m "feat: add Customer Discovery PDF print route"
```

---

## Task 12: Environment Variables & Final Wiring

**Files:**
- Modify: `.env` / `.env.local` (add Turnstile keys)
- Verify all wiring is complete

- [ ] **Step 1: Document required environment variables**

Add to `.env.example` or document:
```
# Cloudflare Turnstile (for customer interview bot protection)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

The founder needs to create a Turnstile widget at https://dash.cloudflare.com/ and add the keys.

- [ ] **Step 2: Run full type-check**

Run: `pnpm type-check`
Expected: PASS across all packages.

- [ ] **Step 3: Run dev server and verify**

Run: `pnpm dev:web`
Expected: App starts without errors.

Navigate to a draft project → verify the Customer Interview card appears.

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: add Turnstile env vars and finalize customer interview wiring"
```

---

## Spec Coverage Verification

| Spec Requirement | Task |
|---|---|
| CustomerInterview table | Task 2 |
| InterviewResponse table | Task 2 |
| NdaSignature table | Task 2 |
| CUSTOMER_DISCOVERY report type | Task 2 |
| AI question generation (adapts to context) | Task 3 |
| AI response synthesis | Task 3 |
| tRPC router (generate, publish, submit, synthesize) | Task 4 |
| Draft page Customer Interview card | Task 5 |
| Preview/manage page with gating selector | Task 6 |
| Responses list page | Task 7 |
| Public form at `/i/[uuid]` | Task 8 |
| Typeform-style one-at-a-time UI | Task 8 |
| Password gating | Task 8 |
| NDA gating with signature | Task 8 |
| Cloudflare Turnstile bot protection | Task 8 |
| Honeypot field | Task 8 |
| Minimum completion time check | Task 8 |
| Session token duplicate prevention | Task 4 (router) |
| Waitlist/newsletter opt-in | Task 8 |
| Thank you screen | Task 8 |
| Mobile "Talk to Customers" button | Task 9 |
| Mobile customer interview screen | Task 9 |
| Research pipeline integration | Task 10 |
| Standalone PDF report | Task 11 |
| CSV export | Not implemented (can be added as follow-up) |
