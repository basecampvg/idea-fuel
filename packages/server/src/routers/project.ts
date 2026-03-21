import { z } from 'zod';
import { eq, and, desc, count, inArray, sql } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { createProjectSchema, updateProjectSchema, startInterviewSchema, businessContextSchema, canAccessExpandPipeline } from '@forge/shared';
import type { ChatMessage, InterviewMode, BusinessContext, SubscriptionTier } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { projects, interviews, reports, research, users } from '../db/schema';
import { generateOpeningQuestion } from '../services/interview-ai';
import { classifyBusinessContext } from '../services/expand-classification';
import { seedExpandAssumptions } from '../services/expand-assumption-seeder';
import { generateExpandOpeningQuestion, createInitialTrackProgress } from '../services/expand-interview-ai';
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

export const projectRouter = router({
  /**
   * List all projects for the current user
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

      const conditions = [eq(projects.userId, ctx.userId)];
      if (phase) {
        conditions.push(inArray(projects.status, [...PHASE_STATUS_MAP[phase]]));
      }
      const whereClause = and(...conditions);

      const [items, [{ value: total }]] = await Promise.all([
        ctx.db
          .select({
            id: projects.id,
            title: projects.title,
            description: projects.description,
            notes: projects.notes,
            mode: projects.mode,
            status: projects.status,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
            _count: {
              interviews: sql<number>`(SELECT count(*) FROM "Interview" WHERE "projectId" = ${projects.id})`.mapWith(Number),
              reports: sql<number>`(SELECT count(*) FROM "Report" WHERE "projectId" = ${projects.id})`.mapWith(Number),
            },
            // Inline research fields via LEFT JOIN subquery (avoids separate query)
            research: {
              status: research.status,
              currentPhase: research.currentPhase,
              progress: research.progress,
            },
          })
          .from(projects)
          .leftJoin(research, eq(research.projectId, projects.id))
          .where(whereClause)
          .orderBy(desc(projects.updatedAt))
          .offset(skip)
          .limit(limit),
        ctx.db.select({ value: count() }).from(projects).where(whereClause),
      ]);

      const itemsWithResearch = items.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        notes: p.notes,
        mode: p.mode,
        status: p.status,
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
   * Get a single project by ID with all related data
   */
  get: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)),
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

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return project;
  }),

  /**
   * Create a new project (starts as a draft idea with status CAPTURED)
   * For EXPAND mode: runs AI classification inline and seeds vertical-specific assumptions
   */
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    // Gate EXPAND mode behind SCALE/TESTER subscription
    if (input.mode === 'EXPAND') {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { subscription: true },
      });
      const tier = (user?.subscription as SubscriptionTier) ?? 'FREE';
      if (!canAccessExpandPipeline(tier)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Expand mode requires a Scale subscription. Please upgrade to access the Expand pipeline.',
        });
      }
    }

    const results = await ctx.db.insert(projects).values({
      title: input.title,
      description: input.description,
      mode: input.mode,
      businessContext: input.businessContext ?? null,
      userId: ctx.userId,
    }).returning();

    const project = results[0];
    if (!project) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create project' });
    }

    // For EXPAND mode: run AI classification and seed assumptions
    let classification = null;
    if (input.mode === 'EXPAND' && input.businessContext) {
      classification = await classifyBusinessContext(input.businessContext);

      // Merge classification into businessContext and update project
      const enrichedContext = { ...input.businessContext, classification };
      await ctx.db
        .update(projects)
        .set({ businessContext: enrichedContext })
        .where(eq(projects.id, project.id));

      // Seed vertical-specific assumptions from classification
      await seedExpandAssumptions(ctx.db as any, project.id, classification);
    }

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_CREATE',
      resource: formatResource('project', project.id),
      metadata: { title: project.title, mode: input.mode },
    });

    return {
      ...project,
      businessContext: classification
        ? { ...input.businessContext, classification }
        : project.businessContext,
    };
  }),

  /**
   * Update business context and re-run classification (Expand Mode only)
   */
  updateBusinessContext: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      businessContext: businessContextSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      if (existing.mode !== 'EXPAND') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Business context is only available for Expand Mode projects' });
      }

      // Re-run classification with updated context
      const classification = await classifyBusinessContext(input.businessContext);
      const enrichedContext = { ...input.businessContext, classification };

      const [updated] = await ctx.db
        .update(projects)
        .set({ businessContext: enrichedContext })
        .where(eq(projects.id, input.id))
        .returning();

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', input.id),
        metadata: { action: 'update_business_context' },
      });

      return updated;
    }),

  /**
   * Update project title, description, or notes
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: updateProjectSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const results = await ctx.db
        .update(projects)
        .set(input.data)
        .where(eq(projects.id, input.id))
        .returning();

      const project = results[0];
      if (!project) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update project' });
      }

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', project.id),
        metadata: { changes: input.data },
      });

      return project;
    }),

  /**
   * Delete a project (cascades to interviews, reports, research)
   */
  delete: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_DELETE',
      resource: formatResource('project', input.id),
      metadata: { title: existing.title },
    });

    await ctx.db.delete(projects).where(eq(projects.id, input.id));

    return { success: true };
  }),

  /**
   * Start an interview for a project
   * Supports SPARK, LIGHT, and IN_DEPTH modes
   * SPARK: Skips interview, triggers quick validation pipeline
   * LIGHT/IN_DEPTH: Creates interactive interview with AI-generated opening question
   */
  startInterview: protectedProcedure.input(startInterviewSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      columns: {
        id: true,
        title: true,
        description: true,
        notes: true,
        mode: true,
        businessContext: true,
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
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
          summary: 'Spark mode - quick validation from project description.',
          researchEngine: input.researchEngine || 'OPENAI',
        }).returning();

        await tx.update(projects).set({ status: 'RESEARCHING' }).where(eq(projects.id, input.projectId));

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

    // For EXPAND mode projects, use Expand interview flow with track-based questions
    if (project.mode === 'EXPAND') {
      const businessContext = project.businessContext as BusinessContext;
      if (!businessContext) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Business context is required for Expand Mode interviews',
        });
      }

      const classification = businessContext.classification;
      const startTrack = classification?.interviewTrackOrder?.[0] ?? 'A';

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { subscription: true },
      });
      const tier = user?.subscription ?? 'FREE';

      const openingQuestion = await generateExpandOpeningQuestion(businessContext, startTrack, tier);
      const trackProgress = createInitialTrackProgress(startTrack);

      const openingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: openingQuestion,
        timestamp: new Date().toISOString(),
      };

      const expandInterview = await ctx.db.transaction(async (tx) => {
        const [created] = await tx.insert(interviews).values({
          projectId: input.projectId,
          userId: ctx.userId,
          mode: 'IN_DEPTH',
          status: 'IN_PROGRESS',
          currentTurn: 0,
          maxTurns: 30,
          messages: [openingMessage],
          expandTrackProgress: trackProgress,
          lastActiveAt: new Date(),
          researchEngine: input.researchEngine || 'OPENAI',
        }).returning();

        await tx.update(projects).set({ status: 'INTERVIEWING' }).where(eq(projects.id, input.projectId));

        return created;
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'INTERVIEW_START',
        resource: formatResource('interview', expandInterview.id),
        metadata: { projectId: input.projectId, mode: 'EXPAND', startTrack },
      });

      return {
        interview: expandInterview,
        skipToResearch: false,
      };
    }

    // For LIGHT and IN_DEPTH modes (Launch Mode), create an active interview with opening question
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { subscription: true },
    });
    const tier = user?.subscription ?? 'FREE';

    const openingQuestion = await generateOpeningQuestion(project.title, project.description, mode as InterviewMode, tier);

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

      await tx.update(projects).set({ status: 'INTERVIEWING' }).where(eq(projects.id, input.projectId));

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
   * Start research for a project (after interview completion)
   * Creates a Research record, snapshots notes, and queues the pipeline
   */
  startResearch: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)),
      with: {
        interviews: {
          where: eq(interviews.status, 'COMPLETE'),
          limit: 1,
        },
        research: true,
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    if (project.research) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this project',
      });
    }

    if (project.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    const latestInterview = project.interviews[0];
    const engine = (latestInterview?.researchEngine as 'OPENAI' | 'PERPLEXITY') || 'OPENAI';

    // Create research record and update project status atomically
    const researchRecord = await ctx.db.transaction(async (tx) => {
      const [created] = await tx.insert(research).values({
        projectId: input.id,
        status: 'PENDING',
        currentPhase: 'QUEUED',
        progress: 0,
        notesSnapshot: project.notes,
        researchEngine: engine,
      }).returning();

      await tx.update(projects).set({ status: 'RESEARCHING' }).where(eq(projects.id, input.id));

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
