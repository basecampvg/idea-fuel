/**
 * Customer Interview Router
 *
 * Procedures:
 * - generate:        Create a new customer interview with AI-generated questions
 * - regenerate:      Replace questions on a DRAFT interview
 * - publish:         Make interview accessible via shareable link
 * - close:           Stop accepting responses
 * - get:             Get interview by ID with response count
 * - getByProject:    Get the latest customer interview for a project
 * - listResponses:   Get all responses for an interview
 * - synthesize:      Generate CUSTOMER_DISCOVERY report from responses
 * - getByUuid:       Get published interview for respondents (public)
 * - verifyPassword:  Check password for PASSWORD-gated interviews (public)
 * - signNda:         Record NDA signature (public)
 * - submitResponse:  Submit form answers (public)
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
import {
  customerInterviews,
  interviewResponses,
  ndaSignatures,
  reports,
  projects,
  research,
} from '../db/schema';
import {
  generateInterviewQuestions,
  synthesizeResponses,
} from '../services/customer-interview-ai';

const BCRYPT_ROUNDS = 10;

export const customerInterviewRouter = router({
  /**
   * Generate a new customer interview with AI-produced questions.
   */
  generate: protectedProcedure
    .input(generateCustomerInterviewSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the project
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          research: true,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PROJECT_NOT_FOUND' });
      }

      // Load existing completed interviews for context
      const completedInterviews = await ctx.db.query.customerInterviews.findMany({
        where: and(
          eq(customerInterviews.projectId, input.projectId),
          eq(customerInterviews.status, 'CLOSED'),
        ),
        columns: { id: true, title: true, questions: true },
      });

      // Build context for AI question generation
      const researchData = project.research as Record<string, unknown> | null;

      let generated;
      try {
        generated = await generateInterviewQuestions({
          projectTitle: project.title,
          projectDescription: project.description ?? '',
          synthesizedInsights: researchData?.synthesizedInsights,
          painPoints: researchData?.painPoints,
          positioning: researchData?.positioning,
          interviewData: completedInterviews.length > 0 ? completedInterviews : undefined,
        });
      } catch (error) {
        console.error(
          '[CustomerInterviewRouter] Question generation failed:',
          error instanceof Error ? error.message : error,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'QUESTION_GENERATION_FAILED',
          cause: error,
        });
      }

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (input.password) {
        hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      }

      const [created] = await ctx.db
        .insert(customerInterviews)
        .values({
          id: crypto.randomUUID(),
          uuid: crypto.randomUUID(),
          projectId: input.projectId,
          userId: ctx.userId,
          title: generated.title,
          questions: generated.questions,
          gating: input.gating ?? 'PUBLIC',
          password: hashedPassword,
          status: 'DRAFT',
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create customer interview',
        });
      }

      return created;
    }),

  /**
   * Replace questions on a DRAFT interview with freshly generated ones.
   */
  regenerate: protectedProcedure
    .input(regenerateQuestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      if (interview.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT interviews can have questions regenerated',
        });
      }

      // Load project + research for context
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, interview.projectId),
        with: { research: true },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PROJECT_NOT_FOUND' });
      }

      const completedInterviews = await ctx.db.query.customerInterviews.findMany({
        where: and(
          eq(customerInterviews.projectId, interview.projectId),
          eq(customerInterviews.status, 'CLOSED'),
        ),
        columns: { id: true, title: true, questions: true },
      });

      const researchData = project.research as Record<string, unknown> | null;

      let generated;
      try {
        generated = await generateInterviewQuestions({
          projectTitle: project.title,
          projectDescription: project.description ?? '',
          synthesizedInsights: researchData?.synthesizedInsights,
          painPoints: researchData?.painPoints,
          positioning: researchData?.positioning,
          interviewData: completedInterviews.length > 0 ? completedInterviews : undefined,
        });
      } catch (error) {
        console.error(
          '[CustomerInterviewRouter] Regeneration failed:',
          error instanceof Error ? error.message : error,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'QUESTION_GENERATION_FAILED',
          cause: error,
        });
      }

      await ctx.db
        .update(customerInterviews)
        .set({
          title: generated.title,
          questions: generated.questions,
        })
        .where(eq(customerInterviews.id, input.customerInterviewId));

      return { success: true };
    }),

  /**
   * Publish a DRAFT interview so it's accessible via shareable link.
   */
  publish: protectedProcedure
    .input(publishCustomerInterviewSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        columns: { id: true, status: true, gating: true },
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      if (interview.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT interviews can be published',
        });
      }

      // If gating is PASSWORD, require a password
      if (interview.gating === 'PASSWORD' && !input.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A password is required for PASSWORD-gated interviews',
        });
      }

      const updateValues: Record<string, unknown> = { status: 'PUBLISHED' };

      if (input.password) {
        updateValues.password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      }

      await ctx.db
        .update(customerInterviews)
        .set(updateValues)
        .where(eq(customerInterviews.id, input.customerInterviewId));

      return { success: true };
    }),

  /**
   * Close a published interview to stop accepting responses.
   */
  close: protectedProcedure
    .input(closeCustomerInterviewSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        columns: { id: true, status: true },
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      await ctx.db
        .update(customerInterviews)
        .set({ status: 'CLOSED' })
        .where(eq(customerInterviews.id, input.customerInterviewId));

      return { success: true };
    }),

  /**
   * Get an interview by ID with response count.
   */
  get: protectedProcedure
    .input(getCustomerInterviewSchema)
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      const [{ value: responseCount }] = await ctx.db
        .select({ value: count() })
        .from(interviewResponses)
        .where(eq(interviewResponses.customerInterviewId, input.customerInterviewId));

      return { ...interview, responseCount: responseCount ?? 0 };
    }),

  /**
   * Get the latest customer interview for a project (or null).
   */
  getByProject: protectedProcedure
    .input(generateCustomerInterviewSchema)
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PROJECT_NOT_FOUND' });
      }

      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.projectId, input.projectId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        orderBy: [desc(customerInterviews.createdAt)],
      });

      if (!interview) {
        return null;
      }

      const [{ value: responseCount }] = await ctx.db
        .select({ value: count() })
        .from(interviewResponses)
        .where(eq(interviewResponses.customerInterviewId, interview.id));

      return { ...interview, responseCount: responseCount ?? 0 };
    }),

  /**
   * List all responses for an interview (paginated).
   */
  listResponses: protectedProcedure
    .input(listResponsesSchema)
    .query(async ({ ctx, input }) => {
      // Verify user owns the interview
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
        columns: { id: true },
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      const responses = await ctx.db.query.interviewResponses.findMany({
        where: eq(interviewResponses.customerInterviewId, input.customerInterviewId),
        orderBy: [desc(interviewResponses.createdAt)],
        limit: input.limit,
        offset: (input.page - 1) * input.limit,
      });

      return responses;
    }),

  /**
   * Synthesize responses into a CUSTOMER_DISCOVERY report.
   */
  synthesize: protectedProcedure
    .input(synthesizeResponsesSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.id, input.customerInterviewId),
          eq(customerInterviews.userId, ctx.userId),
        ),
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      const responses = await ctx.db.query.interviewResponses.findMany({
        where: eq(interviewResponses.customerInterviewId, input.customerInterviewId),
        orderBy: [desc(interviewResponses.createdAt)],
      });

      if (responses.length < CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `At least ${CUSTOMER_INTERVIEW_MIN_RESPONSES_FOR_SYNTHESIS} responses are required to synthesize`,
        });
      }

      // Load project + research for context
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, interview.projectId),
        with: { research: true },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PROJECT_NOT_FOUND' });
      }

      const researchData = project.research as Record<string, unknown> | null;

      let synthesis;
      try {
        synthesis = await synthesizeResponses({
          projectTitle: project.title,
          projectDescription: project.description ?? '',
          questions: interview.questions,
          responses: responses.map((r) => ({
            answers: r.answers,
            respondentName: r.respondentName,
          })),
          researchData: researchData
            ? {
                synthesizedInsights: researchData.synthesizedInsights,
                painPoints: researchData.painPoints,
                competitors: researchData.competitors,
                positioning: researchData.positioning,
              }
            : undefined,
        });
      } catch (error) {
        console.error(
          '[CustomerInterviewRouter] Synthesis failed:',
          error instanceof Error ? error.message : error,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'SYNTHESIS_FAILED',
          cause: error,
        });
      }

      // Build markdown content from synthesis sections
      const content = [
        `## Response Overview\n\n${synthesis.responseOverview}`,
        `## Pain Validation\n\n${synthesis.painValidation}`,
        `## Severity & Frequency\n\n${synthesis.severityAndFrequency}`,
        `## Workaround Analysis\n\n${synthesis.workaroundAnalysis}`,
        `## Willingness to Pay\n\n${synthesis.willingnessToPay}`,
        `## Key Quotes\n\n${synthesis.keyQuotes}`,
        `## Research Delta\n\n${synthesis.researchDelta}`,
        `## Confidence Update\n\n${synthesis.confidenceUpdate}`,
        `## Recommended Next Steps\n\n${synthesis.recommendedNextSteps}`,
      ].join('\n\n---\n\n');

      // Upsert the CUSTOMER_DISCOVERY report
      const existingReport = await ctx.db.query.reports.findFirst({
        where: and(
          eq(reports.projectId, interview.projectId),
          eq(reports.type, 'CUSTOMER_DISCOVERY'),
          eq(reports.userId, ctx.userId),
        ),
        columns: { id: true },
      });

      let reportId: string;

      if (existingReport) {
        await ctx.db
          .update(reports)
          .set({
            title: `Customer Discovery — ${interview.title}`,
            content,
            sections: synthesis,
            tier: 'FULL',
            status: 'COMPLETE',
          })
          .where(eq(reports.id, existingReport.id));
        reportId = existingReport.id;
      } else {
        const [newReport] = await ctx.db
          .insert(reports)
          .values({
            id: crypto.randomUUID(),
            projectId: interview.projectId,
            userId: ctx.userId,
            type: 'CUSTOMER_DISCOVERY',
            tier: 'FULL',
            status: 'COMPLETE',
            title: `Customer Discovery — ${interview.title}`,
            content,
            sections: synthesis,
          })
          .returning({ id: reports.id });

        if (!newReport) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create report',
          });
        }

        reportId = newReport.id;
      }

      return { reportId };
    }),

  // ===========================================================================
  // PUBLIC PROCEDURES
  // ===========================================================================

  /**
   * Get a published interview by UUID (for respondents — no password hash).
   */
  getByUuid: publicProcedure
    .input(getCustomerInterviewByUuidSchema)
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: eq(customerInterviews.uuid, input.uuid),
        with: {
          project: {
            columns: { title: true, description: true },
          },
        },
      });

      if (!interview || interview.status === 'DRAFT') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      // Strip password hash before returning
      const { password: _password, ...safeInterview } = interview;

      return safeInterview;
    }),

  /**
   * Verify a respondent's password for PASSWORD-gated interviews.
   */
  verifyPassword: publicProcedure
    .input(verifyPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true, gating: true, password: true },
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      if (interview.gating !== 'PASSWORD' || !interview.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview is not password protected',
        });
      }

      const valid = await bcrypt.compare(input.password, interview.password);

      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'INVALID_PASSWORD' });
      }

      return { success: true };
    }),

  /**
   * Record an NDA signature before the respondent can view the interview.
   */
  signNda: publicProcedure
    .input(signNdaSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true, gating: true },
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      if (interview.gating !== 'NDA') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview does not require NDA signing',
        });
      }

      const [signature] = await ctx.db
        .insert(ndaSignatures)
        .values({
          id: crypto.randomUUID(),
          customerInterviewId: interview.id,
          fullName: input.signerName,
          email: input.signerEmail,
          signature: `${input.signerName} — signed via IdeaFuel`,
          ipAddress: 'unknown',
        })
        .returning({ id: ndaSignatures.id });

      if (!signature) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record NDA signature',
        });
      }

      return { signatureId: signature.id };
    }),

  /**
   * Submit answers to a customer interview.
   */
  submitResponse: publicProcedure
    .input(submitResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.customerInterviews.findFirst({
        where: and(
          eq(customerInterviews.uuid, input.uuid),
          eq(customerInterviews.status, 'PUBLISHED'),
        ),
        columns: { id: true, status: true },
      });

      if (!interview) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'INTERVIEW_NOT_FOUND' });
      }

      // Verify Turnstile token if TURNSTILE_SECRET_KEY is configured
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      if (turnstileSecret) {
        const verifyRes = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: turnstileSecret,
              response: input.passwordToken ?? '',
            }),
          },
        );
        const verifyData = (await verifyRes.json()) as { success: boolean };
        if (!verifyData.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'TURNSTILE_VERIFICATION_FAILED',
          });
        }
      }

      // Determine a session token for dedup — use ndaSignatureId if provided,
      // otherwise fall back to a hash of respondentEmail or a new UUID.
      const sessionToken =
        input.ndaSignatureId ??
        input.respondentEmail ??
        crypto.randomUUID();

      // Check for duplicate submission (customerInterviewId + sessionToken unique)
      const existing = await ctx.db.query.interviewResponses.findFirst({
        where: and(
          eq(interviewResponses.customerInterviewId, interview.id),
          eq(interviewResponses.sessionToken, sessionToken),
        ),
        columns: { id: true },
      });

      if (existing) {
        return { alreadySubmitted: true, responseId: existing.id };
      }

      const [response] = await ctx.db
        .insert(interviewResponses)
        .values({
          id: crypto.randomUUID(),
          customerInterviewId: interview.id,
          sessionToken,
          answers: input.answers,
          respondentEmail: input.respondentEmail,
        })
        .returning({ id: interviewResponses.id });

      if (!response) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save response',
        });
      }

      return { alreadySubmitted: false, responseId: response.id };
    }),
});
