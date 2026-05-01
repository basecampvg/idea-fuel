import { z } from 'zod';
import { eq, and, desc, count, inArray, sql } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { createProjectSchema, updateProjectSchema, startInterviewSchema } from '@forge/shared';
import type { ChatMessage, InterviewMode } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { ideas, interviews, reports, research, users, projectAttachments } from '../db/schema';
import { generateOpeningQuestion } from '../services/interview-ai';
import { logAuditAsync, formatResource } from '../lib/audit';
import { enqueueResearchPipeline } from '../jobs';

// Default max turns by interview mode
const MAX_TURNS_BY_MODE = {
  SPARK: 0,      // Quick validation - no interview, triggers Spark pipeline
  LIGHT: 10,     // 6 scripted + 2-3 dynamic + close
  IN_DEPTH: 18,  // 10 scripted + 5-7 dynamic + close
} as const;

// Phase filter maps status values to sidebar sections
const PHASE_STATUS_MAP = {
  draft: ['CAPTURED'] as const,
  active: ['INTERVIEWING', 'RESEARCHING', 'COMPLETE'] as const,
} as const;

export const ideaRouter = router({
  /**
   * List all ideas for the current user
   * Supports phase filter: 'draft' (CAPTURED) or 'active' (INTERVIEWING+RESEARCHING+COMPLETE)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          phase: z.enum(['draft', 'active']).optional(),
          limit: z.number().min(1).max(100).optional(),
          page: z.number().min(1).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { phase, page = 1, limit = 20 } = input ?? {};
      const skip = (page - 1) * limit;

      const conditions = [eq(ideas.userId, ctx.userId)];
      if (phase) {
        conditions.push(inArray(ideas.status, [...PHASE_STATUS_MAP[phase]]));
      }
      const whereClause = and(...conditions);

      const [items, [{ value: total }]] = await Promise.all([
        ctx.db
          .select({
            id: ideas.id,
            title: ideas.title,
            description: ideas.description,
            notes: ideas.notes,
            status: ideas.status,
            cardResult: ideas.cardResult,
            problemStatement: ideas.problemStatement,
            targetAudience: ideas.targetAudience,
            proposedSolution: ideas.proposedSolution,
            uniqueAngle: ideas.uniqueAngle,
            pricingHypothesis: ideas.pricingHypothesis,
            sourceClusterId: ideas.sourceClusterId,
            sourceThoughtIds: ideas.sourceThoughtIds,
            crystallizedAt: ideas.crystallizedAt,
            crystallizedBy: ideas.crystallizedBy,
            validationStatus: ideas.validationStatus,
            createdAt: ideas.createdAt,
            updatedAt: ideas.updatedAt,
            _count: {
              interviews: sql<number>`(SELECT count(*) FROM "Interview" WHERE "projectId" = ${ideas.id})`.mapWith(Number),
              reports: sql<number>`(SELECT count(*) FROM "Report" WHERE "projectId" = ${ideas.id})`.mapWith(Number),
            },
            // Inline research fields via LEFT JOIN subquery (avoids separate query)
            research: {
              status: research.status,
              currentPhase: research.currentPhase,
              progress: research.progress,
            },
          })
          .from(ideas)
          .leftJoin(research, eq(research.projectId, ideas.id))
          .where(whereClause)
          .orderBy(desc(ideas.updatedAt))
          .offset(skip)
          .limit(limit),
        ctx.db.select({ value: count() }).from(ideas).where(whereClause),
      ]);

      const itemsWithResearch = items.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        notes: p.notes,
        status: p.status,
        cardResult: p.cardResult,
        problemStatement: p.problemStatement,
        targetAudience: p.targetAudience,
        proposedSolution: p.proposedSolution,
        uniqueAngle: p.uniqueAngle,
        pricingHypothesis: p.pricingHypothesis,
        sourceClusterId: p.sourceClusterId,
        sourceThoughtIds: p.sourceThoughtIds,
        crystallizedAt: p.crystallizedAt,
        crystallizedBy: p.crystallizedBy,
        validationStatus: p.validationStatus,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        _count: p._count,
        research: p.research?.status ? p.research : null,
      }));

      return {
        items: itemsWithResearch,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get a single idea by ID with all related data
   */
  get: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const idea = await ctx.db.query.ideas.findFirst({
      where: and(eq(ideas.id, input.id), eq(ideas.userId, ctx.userId)),
      with: {
        interviews: {
          orderBy: desc(interviews.createdAt),
          columns: {
            id: true,
            mode: true,
            status: true,
            currentTurn: true,
            maxTurns: true,
            confidenceScore: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
        reports: {
          orderBy: desc(reports.createdAt),
          columns: {
            id: true,
            type: true,
            tier: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    return idea;
  }),

  /**
   * Create a new idea (starts as a draft idea with status CAPTURED)
   */
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const idea = await ctx.db.transaction(async (tx) => {
      const results = await tx.insert(ideas).values({
        title: input.title,
        description: input.description,
        userId: ctx.userId,
      }).returning();

      const created = results[0];
      if (!created) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create idea' });
      }

      if (input.attachments && input.attachments.length > 0) {
        await tx.insert(projectAttachments).values(
          input.attachments.map((att) => ({
            projectId: created.id,
            userId: ctx.userId,
            storagePath: att.storagePath,
            fileName: att.fileName,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            order: att.order,
            aiConsent: input.aiConsentForImages ?? false,
          }))
        );
      }

      return created;
    });

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_CREATE',
      resource: formatResource('project', idea.id),
      metadata: {
        title: idea.title,
        attachmentCount: input.attachments?.length ?? 0,
      },
    });

    return idea;
  }),

  /**
   * Update idea title, description, or notes
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: updateProjectSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.ideas.findFirst({
        where: and(eq(ideas.id, input.id), eq(ideas.userId, ctx.userId)),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Idea not found',
        });
      }

      const results = await ctx.db
        .update(ideas)
        .set(input.data)
        .where(eq(ideas.id, input.id))
        .returning();

      const idea = results[0];
      if (!idea) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update idea' });
      }

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', idea.id),
        metadata: { changes: input.data },
      });

      return idea;
    }),

  /**
   * Delete an idea (cascades to interviews, reports, research)
   */
  delete: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.ideas.findFirst({
      where: and(eq(ideas.id, input.id), eq(ideas.userId, ctx.userId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_DELETE',
      resource: formatResource('project', input.id),
      metadata: { title: existing.title },
    });

    await ctx.db.delete(ideas).where(eq(ideas.id, input.id));

    return { success: true };
  }),

  /**
   * Start an interview for an idea
   * Supports SPARK, LIGHT, and IN_DEPTH modes
   * SPARK: Skips interview, triggers quick validation pipeline
   * LIGHT/IN_DEPTH: Creates interactive interview with AI-generated opening question
   */
  startInterview: protectedProcedure.input(startInterviewSchema).mutation(async ({ ctx, input }) => {
    const idea = await ctx.db.query.ideas.findFirst({
      where: and(eq(ideas.id, input.projectId), eq(ideas.userId, ctx.userId)),
      columns: {
        id: true,
        title: true,
        description: true,
        notes: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    const mode = input.mode ?? 'LIGHT';
    const maxTurns = MAX_TURNS_BY_MODE[mode];

    // For SPARK mode, skip interview and trigger Spark quick validation
    if (mode === 'SPARK') {
      const interview = await ctx.db.transaction(async (tx) => {
        const [created] = await tx.insert(interviews).values({
          projectId: input.projectId,
          userId: ctx.userId,
          mode: 'SPARK',
          status: 'COMPLETE',
          currentTurn: 0,
          maxTurns: 0,
          messages: [],
          collectedData: null,
          confidenceScore: 0,
          summary: 'Spark mode - quick validation from idea description.',
          researchEngine: input.researchEngine || 'OPENAI',
        }).returning();

        await tx.update(ideas).set({ status: 'RESEARCHING' }).where(eq(ideas.id, input.projectId));

        return created;
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'INTERVIEW_START',
        resource: formatResource('interview', interview.id),
        metadata: { projectId: input.projectId, mode: 'SPARK' },
      });

      return {
        interview,
        skipToResearch: true,
        mode: 'SPARK',
      };
    }

    // For LIGHT and IN_DEPTH modes, create an active interview with opening question
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { subscription: true },
    });
    const tier = user?.subscription ?? 'FREE';

    const openingQuestion = await generateOpeningQuestion(idea.title, idea.description, mode as InterviewMode, tier);

    const openingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: openingQuestion,
      timestamp: new Date().toISOString(),
    };

    const interview = await ctx.db.transaction(async (tx) => {
      const [created] = await tx.insert(interviews).values({
        projectId: input.projectId,
        userId: ctx.userId,
        mode,
        status: 'IN_PROGRESS',
        currentTurn: 0,
        maxTurns,
        messages: [openingMessage],
        lastActiveAt: new Date(),
        researchEngine: input.researchEngine || 'OPENAI',
      }).returning();

      await tx.update(ideas).set({ status: 'INTERVIEWING' }).where(eq(ideas.id, input.projectId));

      return created;
    });

    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_START',
      resource: formatResource('interview', interview.id),
      metadata: { projectId: input.projectId, mode },
    });

    return {
      interview,
      skipToResearch: false,
    };
  }),

  /**
   * Start research for an idea (after interview completion)
   * Creates a Research record, snapshots notes, and queues the pipeline
   */
  startResearch: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const idea = await ctx.db.query.ideas.findFirst({
      where: and(eq(ideas.id, input.id), eq(ideas.userId, ctx.userId)),
      with: {
        interviews: {
          where: eq(interviews.status, 'COMPLETE'),
          limit: 1,
        },
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    if (idea.research) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this idea',
      });
    }

    if (idea.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    const latestInterview = idea.interviews[0];
    const engine = (latestInterview?.researchEngine as 'OPENAI' | 'PERPLEXITY') || 'OPENAI';

    // Create research record and update idea status atomically
    const researchRecord = await ctx.db.transaction(async (tx) => {
      const [created] = await tx.insert(research).values({
        projectId: input.id,
        status: 'PENDING',
        currentPhase: 'QUEUED',
        progress: 0,
        notesSnapshot: idea.notes,
        researchEngine: engine,
      }).returning();

      await tx.update(ideas).set({ status: 'RESEARCHING' }).where(eq(ideas.id, input.id));

      return created;
    });

    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_START',
      resource: formatResource('research', researchRecord.id),
      metadata: { projectId: input.id },
    });

    // Queue research pipeline job
    try {
      await enqueueResearchPipeline({
        researchId: researchRecord.id,
        projectId: input.id,
        userId: ctx.userId,
        interviewId: latestInterview?.id,
        mode: latestInterview?.mode as 'LIGHT' | 'IN_DEPTH' | 'SPARK' | undefined,
        engine,
      });
    } catch (queueError) {
      console.error('[Research] Failed to queue pipeline:', queueError);
      // Mark research as failed so it doesn't stay stuck in PENDING
      await ctx.db
        .update(research)
        .set({
          status: 'FAILED',
          errorMessage: 'Failed to queue research pipeline',
          errorPhase: 'QUEUED',
        })
        .where(eq(research.id, researchRecord.id));
    }

    return researchRecord;
  }),
});
