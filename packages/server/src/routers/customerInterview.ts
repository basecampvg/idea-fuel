/**
 * Customer Interview Router
 *
 * Protected procedures (require auth):
 * - generate:        Create a new customer interview with AI-generated questions
 * - regenerate:      Replace questions on a DRAFT interview
 * - publish:         Make interview accessible via shareable link
 * - close:           Stop accepting responses
 * - get:             Get interview by ID with response count
 * - getByProject:    Get the latest customer interview for a project
 * - listResponses:   Get all responses for an interview
 * - synthesize:      Generate CUSTOMER_DISCOVERY report from responses
 *
 * Public procedures (no auth):
 * - getByUuid:       Get published interview for respondents
 * - verifyPassword:  Check password for PASSWORD-gated interviews
 * - signNda:         Record NDA signature
 * - submitResponse:  Submit form answers
 */

import { eq, and, desc, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  generateCustomerInterviewSchema,
  regenerateQuestionsSchema,
  publishCustomerInterviewSchema,
  closeCustomerInterviewSchema,
  getCustomerInterviewSchema,
  getCustomerInterviewByUuidSchema,
  verifyPasswordSchema,
  signNdaSchema,
  submitResponseSchema,
  listResponsesSchema,
  synthesizeResponsesSchema,
  CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS,
} from '@forge/shared';
import type { InterviewQuestion, InterviewAnswer, InterviewDataPoints, ChatMessage } from '@forge/shared';
import {
  customerInterviews,
  interviewResponses,
  ndaSignatures,
  reports,
  projects,
  interviews,
} from '../db/schema';
import {
  generateInterviewQuestions,
  synthesizeResponses,
} from '../services/customer-interview-ai';

const BCRYPT_ROUNDS = 10;

export const customerInterviewRouter = router({
  /**
   * Generate a new customer interview with AI-produced questions.
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

      const interviewRecord = project.interviews[0];
      const researchRecord = project.research;

      let generated;
      try {
        generated = await generateInterviewQuestions({
          projectTitle: project.title,
          projectDescription: project.description ?? '',
          cardResult: (project as any).cardResult ?? researchRecord?.sparkResult,
          interviewData: interviewRecord?.collectedData as Partial<InterviewDataPoints> | undefined,
          interviewMessages: interviewRecord?.messages as unknown as ChatMessage[] | undefined,
          synthesizedInsights: researchRecord?.synthesizedInsights,
          painPoints: researchRecord?.painPoints,
          positioning: researchRecord?.positioning,
        });
      } catch (error) {
        console.error('[CustomerInterviewRouter] Question generation failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'QUESTION_GENERATION_FAILED', cause: error });
      }

      const [created] = await ctx.db
        .insert(customerInterviews)
        .values({
          projectId: input.projectId,
          userId: ctx.userId,
          uuid: crypto.randomUUID(),
          title: generated.title,
          questions: generated.questions,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create customer interview' });
      }

      return created;
    }),

  /**
   * Replace questions on a DRAFT interview with freshly generated ones.
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
        projectDescription: project.description ?? '',
        cardResult: (project as any).cardResult ?? researchRecord?.sparkResult,
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
   * Publish a DRAFT interview — makes it accessible via the shareable link.
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

      const hashedPassword = input.password ? await bcrypt.hash(input.password, BCRYPT_ROUNDS) : null;

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
   * Close a published interview to stop accepting responses.
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
   * Get a customer interview by ID with response count.
   */
  get: protectedProcedure
    .input(getCustomerInterviewSchema)
    .query(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(eq(customerInterviews.id, input.id), eq(customerInterviews.userId, ctx.userId)),
        with: {
          responses: { columns: { id: true } },
        },
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CUSTOMER_INTERVIEW_NOT_FOUND' });
      }

      return { ...ci, responseCount: ci.responses.length };
    }),

  /**
   * Get the latest customer interview for a project (or null).
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
          responses: { columns: { id: true } },
        },
      });

      if (!ci) return null;
      return { ...ci, responseCount: ci.responses.length };
    }),

  /**
   * List all responses for an interview (most recent first).
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

      return ctx.db.query.interviewResponses.findMany({
        where: eq(interviewResponses.customerInterviewId, input.customerInterviewId),
        orderBy: desc(interviewResponses.createdAt),
      });
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
        projectDescription: ci.project.description ?? '',
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

      // Upsert report
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

  // ===========================================================================
  // PUBLIC PROCEDURES (for respondents filling out the form)
  // ===========================================================================

  /**
   * Get a published interview by UUID (for respondents — no password hash).
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
          project: { columns: { title: true, description: true } },
        },
      });

      if (!ci || ci.status === 'DRAFT') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      return ci;
    }),

  /**
   * Verify password for a PASSWORD-gated interview.
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
   * Submit a response to a published interview.
   */
  submitResponse: publicProcedure
    .input(submitResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const ci = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true },
      });

      if (!ci) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      // Verify Cloudflare Turnstile token
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      if (turnstileSecret) {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: turnstileSecret, response: input.turnstileToken }),
        });
        const result = await res.json() as { success: boolean };
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'TURNSTILE_FAILED' });
        }
      }

      // Check for duplicate submission (unique constraint on customerInterviewId + sessionToken)
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
});
