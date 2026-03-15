import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { RESEARCH_PHASE_PROGRESS, SPARK_STATUS_PROGRESS } from '@forge/shared';
import { logAuditAsync, formatResource } from '../lib/audit';
import { enqueueResearchCancel, enqueueResearchPipeline, enqueueSparkPipeline, enqueueBusinessPlan, enqueueExpandPipeline, getResearchPipelineQueue, getExpandPipelineQueue } from '../jobs';
import { research, projects, users, interviews } from '../db/schema';
import {
  extractInsights,
  extractScores,
  extractBusinessMetrics,
  extractMarketSizing,
  generateUserStory,
  generateValueLadder,
  generateActionPrompts,
  generateTechStack,
  type ResearchInput,
  type ExistingResearchData,
  type SynthesizedInsights,
  type ResearchScores,
  type BusinessMetrics,
  type DeepResearchOutput,
} from '../services/research-ai';

export const researchRouter = router({
  /**
   * Get research by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.research.findFirst({
      where: eq(research.id, input.id),
      with: {
        project: {
          columns: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    // Verify ownership through project
    if (result.project.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    return result;
  }),

  /**
   * Get research by project ID
   */
  getByProject: protectedProcedure.input(z.object({ projectId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      with: {
        research: true,
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return project.research;
  }),

  /**
   * Get research progress/status for polling
   */
  getProgress: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const result = await ctx.db.query.research.findFirst({
      where: eq(research.id, input.id),
      with: {
        project: {
          columns: {
            userId: true,
          },
        },
      },
    });

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    if (result.project.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Calculate estimated completion based on phase
    const phaseProgress = RESEARCH_PHASE_PROGRESS[result.currentPhase];

    // Check queue position when research is waiting to start
    let queuePosition: number | null = null;
    if (result.status === 'PENDING' || (result.status === 'IN_PROGRESS' && result.progress === 0)) {
      try {
        // Check both research and expand queues
        const queues = [getResearchPipelineQueue(), getExpandPipelineQueue()];
        for (const queue of queues) {
          const waitingJobs = await queue.getWaiting();
          const idx = waitingJobs.findIndex((j) => j.data.researchId === result.id);
          if (idx >= 0) {
            queuePosition = idx + 1;
            break;
          }
        }
      } catch {
        // Non-fatal — just skip queue position
      }
    }

    return {
      id: result.id,
      status: result.status,
      currentPhase: result.currentPhase,
      progress: result.progress,
      phaseProgress,
      estimatedCompletion: result.estimatedCompletion,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      errorMessage: result.errorMessage,
      errorPhase: result.errorPhase,
      queuePosition,
    };
  }),

  /**
   * Start research for a project
   * Called after interview is complete
   */
  start: protectedProcedure.input(z.object({ projectId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      with: {
        research: true,
        interviews: {
          where: eq(interviews.status, 'COMPLETE'),
          orderBy: (interviews, { desc }) => desc(interviews.createdAt),
          limit: 1,
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if research already exists and is not failed
    if (project.research && project.research.status !== 'FAILED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this project',
      });
    }

    // Require at least one completed interview
    if (project.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    const interview = project.interviews[0];
    const isExpandMode = project.mode === 'EXPAND';

    // Create or update research record
    let researchRecord = project.research;
    if (researchRecord) {
      // Resume failed research from last completed phase
      let resumePhase: 'DEEP_RESEARCH' | 'SOCIAL_RESEARCH' | 'SYNTHESIS' | 'REPORT_GENERATION' = 'DEEP_RESEARCH';
      let resumeProgress = 0;

      if (!isExpandMode) {
        // Launch mode resume logic
        const rd = researchRecord as Record<string, unknown>;
        if (rd.rawDeepResearch) {
          resumePhase = 'SOCIAL_RESEARCH';
          resumeProgress = 25;
        }
        if (rd.socialProof) {
          resumePhase = 'SYNTHESIS';
          resumeProgress = 50;
        }
        if (rd.synthesizedInsights && rd.opportunityScore != null) {
          resumePhase = 'REPORT_GENERATION';
          resumeProgress = 75;
        }
      }
      // Expand mode: always restart from beginning (no chunked resume for now)

      console.log(`[Research] Resuming from phase ${resumePhase} (progress ${resumeProgress}%) — attempt ${researchRecord.retryCount + 1}`);

      const [updated] = await ctx.db.update(research).set({
        status: 'IN_PROGRESS',
        currentPhase: isExpandMode ? 'QUEUED' : resumePhase,
        progress: isExpandMode ? 0 : resumeProgress,
        errorMessage: null,
        errorPhase: null,
        retryCount: researchRecord.retryCount + 1,
        startedAt: new Date(),
        completedAt: null,
        notesSnapshot: project.notes,
        // Clear Spark fields from previous validation run
        sparkStatus: null,
        sparkKeywords: null,
        sparkResult: null,
        sparkStartedAt: null,
        sparkCompletedAt: null,
        sparkError: null,
      }).where(eq(research.id, researchRecord.id)).returning();
      researchRecord = updated;
    } else {
      // Create new research record
      const [created] = await ctx.db.insert(research).values({
        projectId: input.projectId,
        status: 'IN_PROGRESS',
        currentPhase: isExpandMode ? 'QUEUED' : 'DEEP_RESEARCH',
        progress: 0,
        startedAt: new Date(),
        notesSnapshot: project.notes,
        researchEngine: interview.researchEngine || 'OPENAI',
      }).returning();
      researchRecord = created;
    }

    // Update project status
    await ctx.db.update(projects).set({ status: 'RESEARCHING' }).where(eq(projects.id, input.projectId));

    // Audit log - start research
    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_START',
      resource: formatResource('research', researchRecord.id),
      metadata: { projectId: input.projectId, isRetry: project.research?.retryCount ? project.research.retryCount > 0 : false, mode: isExpandMode ? 'EXPAND' : 'LAUNCH' },
    });

    // Queue the appropriate pipeline based on project mode
    try {
      if (isExpandMode) {
        // Expand Mode: 4-module expand research pipeline
        await enqueueExpandPipeline({
          researchId: researchRecord.id,
          projectId: input.projectId,
          userId: ctx.userId,
        });
      } else {
        // Launch Mode: standard deep research pipeline
        const engine = (interview.researchEngine as 'OPENAI' | 'PERPLEXITY') || 'OPENAI';

        if (engine === 'PERPLEXITY' && !process.env.PERPLEXITY_API_KEY) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Perplexity research engine is not available — PERPLEXITY_API_KEY is not configured. Please switch to OpenAI.',
          });
        }

        await enqueueResearchPipeline({
          researchId: researchRecord.id,
          projectId: input.projectId,
          userId: ctx.userId,
          interviewId: interview.id,
          mode: interview.mode as 'LIGHT' | 'IN_DEPTH' | 'SPARK' | undefined,
          engine,
        });
      }
    } catch (queueError) {
      console.error('[Research] Failed to queue pipeline:', queueError);
      await ctx.db.update(research).set({
        status: 'FAILED',
        errorMessage: 'Failed to queue research pipeline. Please try again.',
        errorPhase: 'QUEUED',
      }).where(eq(research.id, researchRecord.id));
    }

    return researchRecord;
  }),

  /**
   * Cancel ongoing research
   */
  cancel: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const result = await ctx.db.query.research.findFirst({
      where: eq(research.id, input.id),
      with: {
        project: {
          columns: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    if (result.project.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    if (result.status === 'COMPLETE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot cancel completed research',
      });
    }

    // Queue cancellation job to stop any in-flight operations
    try {
      await enqueueResearchCancel({ researchId: input.id });
    } catch (queueError) {
      console.error('[Research] Failed to queue cancel:', queueError);
      // Continue with local cancellation even if queue fails
    }

    const [updatedResearch] = await ctx.db.update(research).set({
      status: 'FAILED',
      errorMessage: 'Research cancelled by user',
      errorPhase: result.currentPhase,
    }).where(eq(research.id, input.id)).returning();

    // Audit log - cancel research
    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_CANCEL',
      resource: formatResource('research', result.id),
      metadata: { projectId: result.projectId, cancelledAtPhase: result.currentPhase },
    });

    return updatedResearch;
  }),

  /**
   * Update research phase (called by BullMQ workers)
   * This is an internal endpoint, but protected for safety
   */
  updatePhase: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        phase: z.enum([
          'QUEUED',
          // New 4-phase pipeline phases
          'DEEP_RESEARCH',
          'SYNTHESIS',
          'SOCIAL_RESEARCH',
          'REPORT_GENERATION',
          'COMPLETE',
          // Legacy phases (for backward compatibility)
          'QUERY_GENERATION',
          'DATA_COLLECTION',
        ]),
        progress: z.number().min(0).max(100),
        data: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.id),
        with: {
          project: {
            columns: {
              userId: true,
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      // Verify ownership through project
      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // Build update data based on phase
      const updateData: Record<string, unknown> = {
        currentPhase: input.phase,
        progress: input.progress,
      };

      // Set timestamps
      if (input.phase !== 'QUEUED' && !result.startedAt) {
        updateData.startedAt = new Date();
        updateData.status = 'IN_PROGRESS';
      }

      if (input.phase === 'COMPLETE') {
        updateData.completedAt = new Date();
        updateData.status = 'COMPLETE';
      }

      // Store phase-specific data
      if (input.data) {
        switch (input.phase) {
          case 'QUERY_GENERATION':
            updateData.generatedQueries = input.data;
            break;
          case 'DATA_COLLECTION':
            updateData.rawData = input.data;
            break;
          case 'SYNTHESIS':
            updateData.synthesizedInsights = input.data;
            // Also update consolidated fields
            if (input.data.marketAnalysis) updateData.marketAnalysis = input.data.marketAnalysis;
            if (input.data.competitors) updateData.competitors = input.data.competitors;
            if (input.data.painPoints) updateData.painPoints = input.data.painPoints;
            if (input.data.positioning) updateData.positioning = input.data.positioning;
            if (input.data.whyNow) updateData.whyNow = input.data.whyNow;
            if (input.data.proofSignals) updateData.proofSignals = input.data.proofSignals;
            if (input.data.keywords) updateData.keywords = input.data.keywords;
            break;
        }
      }

      const [updatedResearch] = await ctx.db.update(research).set(updateData as typeof research.$inferInsert).where(eq(research.id, input.id)).returning();

      // If complete, update project status
      if (input.phase === 'COMPLETE') {
        await ctx.db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, result.projectId));
      }

      return updatedResearch;
    }),

  /**
   * Reset stuck research (allows restarting interrupted/stuck research)
   * This marks the research as FAILED so it can be restarted via the start endpoint
   */
  reset: protectedProcedure.input(z.object({ projectId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      with: {
        research: true,
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    if (!project.research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No research found for this project',
      });
    }

    // Only allow reset for IN_PROGRESS or PENDING research (stuck states)
    if (project.research.status === 'COMPLETE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot reset completed research. Use delete and restart instead.',
      });
    }

    // Mark research as failed so it can be restarted
    // Keep project status as RESEARCHING so user stays on same page and sees failed state
    const [updatedResearch] = await ctx.db.update(research).set({
      status: 'FAILED',
      errorMessage: 'Research reset by user (interrupted or stuck)',
      errorPhase: project.research.currentPhase,
    }).where(eq(research.id, project.research.id)).returning();

    return updatedResearch;
  }),

  /**
   * Mark research as failed (called by BullMQ workers on error)
   */
  markFailed: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        errorMessage: z.string(),
        errorPhase: z.enum([
          'QUEUED',
          // New 4-phase pipeline phases
          'DEEP_RESEARCH',
          'SYNTHESIS',
          'SOCIAL_RESEARCH',
          'REPORT_GENERATION',
          'COMPLETE',
          // Legacy phases (for backward compatibility)
          'QUERY_GENERATION',
          'DATA_COLLECTION',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.id),
        with: {
          project: {
            columns: {
              userId: true,
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      // Verify ownership through project
      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      const [updatedResearch] = await ctx.db.update(research).set({
        status: 'FAILED',
        errorMessage: input.errorMessage,
        errorPhase: input.errorPhase,
      }).where(eq(research.id, input.id)).returning();

      return updatedResearch;
    }),

  // =============================================================================
  // SPARK PROCEDURES (Quick Validation)
  // =============================================================================

  /**
   * Start Spark validation for a project
   * Creates a Research record and triggers the 2-step Spark pipeline
   */
  startSpark: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          research: true,
          interviews: { orderBy: (i, { desc: d }) => [d(i.createdAt)], limit: 1 },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Read engine choice from the interview record (set during startInterview)
      const engine = (project.interviews?.[0]?.researchEngine as 'OPENAI' | 'PERPLEXITY') || 'OPENAI';

      // Validate Perplexity API key if selected
      if (engine === 'PERPLEXITY' && !process.env.PERPLEXITY_API_KEY) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Perplexity research engine is not available — PERPLEXITY_API_KEY is not configured. Please switch to OpenAI.',
        });
      }

      // Check if there's already a Spark job running
      const runningStatuses = ['QUEUED', 'RUNNING_KEYWORDS', 'RUNNING_RESEARCH', 'RUNNING_PARALLEL', 'SYNTHESIZING'];
      if (project.research?.sparkStatus && runningStatuses.includes(project.research.sparkStatus)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Spark validation already in progress',
        });
      }

      // Create or update research record for Spark
      let researchRecord;
      if (project.research) {
        const [updated] = await ctx.db.update(research).set({
          sparkStatus: 'QUEUED',
          sparkKeywords: null,
          sparkResult: null,
          sparkStartedAt: new Date(),
          sparkCompletedAt: null,
          sparkError: null,
          notesSnapshot: project.notes, // Snapshot project notes
          researchEngine: engine,
        }).where(eq(research.id, project.research.id)).returning();
        researchRecord = updated;
      } else {
        const [created] = await ctx.db.insert(research).values({
          projectId: input.projectId,
          status: 'IN_PROGRESS',
          currentPhase: 'QUEUED',
          progress: 0,
          sparkStatus: 'QUEUED',
          sparkStartedAt: new Date(),
          notesSnapshot: project.notes, // Snapshot project notes
          researchEngine: engine,
        }).returning();
        researchRecord = created;
      }

      // Update project status
      await ctx.db.update(projects).set({ status: 'RESEARCHING' }).where(eq(projects.id, input.projectId));

      // Audit log - start Spark research
      logAuditAsync({
        userId: ctx.userId,
        action: 'RESEARCH_START',
        resource: formatResource('research', researchRecord.id),
        metadata: { projectId: input.projectId, mode: 'SPARK', engine },
      });

      // Build enriched description with project notes
      const sparkDescription = project.notes
        ? `${project.description}\n\n## FOUNDER'S NOTES\n${project.notes}`
        : project.description;

      // Queue Spark pipeline job via BullMQ
      // Worker process handles the pipeline (5-15 min)
      try {
        await enqueueSparkPipeline({
          researchId: researchRecord.id,
          projectId: input.projectId,
          userId: ctx.userId,
          description: sparkDescription,
          includeTrends: true,
          engine,
        });
      } catch (queueError) {
        console.error('[Research] Failed to queue Spark pipeline:', queueError);
        await ctx.db.update(research).set({
          sparkStatus: 'FAILED',
          sparkError: 'Failed to queue Spark pipeline. Please try again.',
          status: 'FAILED',
          errorMessage: 'Failed to queue Spark pipeline',
        }).where(eq(research.id, researchRecord.id));
        // Keep project in RESEARCHING so failure UI shows with retry option
      }

      return { jobId: researchRecord.id };
    }),

  /**
   * Get Spark job status and result
   */
  getSparkStatus: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.jobId),
        with: {
          project: {
            columns: {
              userId: true,
              title: true,
              description: true,
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      return {
        jobId: result.id,
        projectTitle: result.project.title,
        sparkStatus: result.sparkStatus,
        sparkResult: result.sparkResult,
        sparkKeywords: result.sparkKeywords,
        sparkError: result.sparkError,
        sparkStartedAt: result.sparkStartedAt,
        sparkCompletedAt: result.sparkCompletedAt,
        progress: result.progress,
      };
    }),

  /**
   * Poll Spark job progress (lightweight endpoint for polling)
   */
  pollSpark: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.jobId),
        columns: {
          id: true,
          sparkStatus: true,
          progress: true,
          sparkError: true,
          sparkStartedAt: true,
          sparkCompletedAt: true,
        },
        with: {
          project: {
            columns: {
              userId: true,
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // Calculate progress based on status
      const statusProgress = result.sparkStatus
        ? SPARK_STATUS_PROGRESS[result.sparkStatus] || { start: 0, end: 0 }
        : { start: 0, end: 0 };

      return {
        jobId: result.id,
        status: result.sparkStatus,
        progress: result.progress,
        statusProgress,
        error: result.sparkError,
        startedAt: result.sparkStartedAt,
        completedAt: result.sparkCompletedAt,
        isComplete: result.sparkStatus === 'COMPLETE' || result.sparkStatus === 'PARTIAL_COMPLETE',
        isPartial: result.sparkStatus === 'PARTIAL_COMPLETE',
        isFailed: result.sparkStatus === 'FAILED',
      };
    }),

  /**
   * Backfill missing fields on a COMPLETE research without re-running expensive Phase 1/2.
   * Re-runs only the specific extraction functions whose data is null.
   */
  backfill: protectedProcedure
    .input(z.object({ researchId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const researchResult = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.researchId),
        with: {
          project: {
            with: {
              interviews: {
                where: eq(interviews.status, 'COMPLETE'),
                orderBy: (interviews, { desc }) => desc(interviews.createdAt),
                limit: 1,
              },
            },
          },
        },
      });

      if (!researchResult) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Research not found' });
      }
      if (researchResult.project.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      if (researchResult.status !== 'COMPLETE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Research must be COMPLETE to backfill. Use restart for failed research.' });
      }

      const rawDeepResearch = researchResult.rawDeepResearch as unknown as DeepResearchOutput | null;
      const hasRawResearch = !!rawDeepResearch?.rawReport;

      // Reconstruct ResearchInput from project
      const project = researchResult.project;
      const interview = project.interviews[0];
      const notesContext = project.notes ? `## FOUNDER'S NOTES\n${project.notes}` : undefined;
      const researchInput: ResearchInput = {
        ideaTitle: project.title,
        ideaDescription: project.description || '',
        interviewData: (interview?.collectedData as unknown as ResearchInput['interviewData']) ?? null,
        interviewMessages: (interview?.messages as unknown as Array<{ role: string; content: string }>) ?? [],
        canvasContext: notesContext,
      };

      // Get user tier
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { subscription: true },
      });
      const userTier = user?.subscription ?? 'FREE';

      // Determine what's missing
      const missing: string[] = [];
      if (!researchResult.synthesizedInsights) missing.push('insights');
      if (researchResult.opportunityScore == null) missing.push('scores');
      if (!researchResult.revenuePotential) missing.push('metrics');
      if (!researchResult.marketSizing) missing.push('marketSizing');
      if (!researchResult.userStory) missing.push('userStory');
      if (!researchResult.valueLadder) missing.push('valueLadder');
      if (!researchResult.actionPrompts) missing.push('actionPrompts');
      if (!researchResult.techStack) missing.push('techStack');

      if (missing.length === 0) {
        return { backfilled: [], failed: [], skipped: [], message: 'All fields already populated.' };
      }

      // Step 1: Ensure insights exist (dependency for Phase 4 functions)
      let insights = researchResult.synthesizedInsights as unknown as SynthesizedInsights | null;
      if (!insights && hasRawResearch) {
        try {
          insights = await extractInsights(rawDeepResearch!, researchInput, userTier);
          await ctx.db.update(research).set({ synthesizedInsights: insights as object }).where(eq(research.id, input.researchId));
        } catch (err) {
          return { backfilled: [], failed: ['insights', ...missing.filter(m => m !== 'insights')], skipped: [], message: 'Cannot backfill: insights extraction failed (required dependency).' };
        }
      } else if (!insights) {
        return { backfilled: [], failed: [], skipped: missing, message: 'Cannot backfill: no raw research data or insights available.' };
      }

      // Step 2: Build tasks for missing fields
      const backfilled: string[] = [];
      const failed: string[] = [];
      const skipped: string[] = [];
      if (!missing.includes('insights')) {
        // Already had insights
      } else {
        backfilled.push('insights');
      }

      // Existing scores/metrics for dependencies
      let scores = researchResult.opportunityScore != null ? {
        opportunityScore: researchResult.opportunityScore!,
        problemScore: researchResult.problemScore!,
        feasibilityScore: researchResult.feasibilityScore!,
        whyNowScore: researchResult.whyNowScore!,
        justifications: researchResult.scoreJustifications as unknown as ResearchScores['justifications'],
        metadata: (researchResult.scoreMetadata || { passCount: 0, maxDeviation: 0, averageConfidence: 0, flagged: false }) as ResearchScores['metadata'],
      } as ResearchScores : null;

      let metrics = researchResult.revenuePotential ? {
        revenuePotential: researchResult.revenuePotential,
        executionDifficulty: researchResult.executionDifficulty || { rating: 'moderate' as const, factors: [], soloFriendly: false },
        gtmClarity: researchResult.gtmClarity || { rating: 'moderate' as const, channels: [], confidence: 0 },
        founderFit: researchResult.founderFit || { percentage: 0, strengths: [], gaps: [] },
      } as BusinessMetrics : null;

      // Phase 3 backfills (require rawDeepResearch)
      type BackfillTask = { name: string; run: () => Promise<void> };
      const tasks: BackfillTask[] = [];
      const needsRawResearch = ['scores', 'metrics', 'marketSizing'];
      if (!hasRawResearch) {
        const phase3Missing = missing.filter(m => needsRawResearch.includes(m));
        if (phase3Missing.length > 0) {
          skipped.push(...phase3Missing);
        }
      }

      if (missing.includes('scores') && hasRawResearch) {
        tasks.push({
          name: 'scores',
          run: async () => {
            scores = await extractScores(rawDeepResearch!, researchInput, insights!, userTier);
            await ctx.db.update(research).set({
              opportunityScore: scores.opportunityScore,
              problemScore: scores.problemScore,
              feasibilityScore: scores.feasibilityScore,
              whyNowScore: scores.whyNowScore,
              scoreJustifications: scores.justifications as object,
              scoreMetadata: scores.metadata as object,
            }).where(eq(research.id, input.researchId));
          },
        });
      }

      if (missing.includes('metrics') && hasRawResearch) {
        tasks.push({
          name: 'metrics',
          run: async () => {
            const placeholderScores = scores ?? {
              opportunityScore: 0, problemScore: 0, feasibilityScore: 0, whyNowScore: 0,
              justifications: {} as ResearchScores['justifications'],
              metadata: {} as ResearchScores['metadata'],
            };
            metrics = await extractBusinessMetrics(rawDeepResearch!, researchInput, insights!, placeholderScores, userTier);
            await ctx.db.update(research).set({
              revenuePotential: metrics.revenuePotential as object,
              executionDifficulty: metrics.executionDifficulty as object,
              gtmClarity: metrics.gtmClarity as object,
              founderFit: metrics.founderFit as object,
            }).where(eq(research.id, input.researchId));
          },
        });
      }

      if (missing.includes('marketSizing') && hasRawResearch) {
        tasks.push({
          name: 'marketSizing',
          run: async () => {
            const ms = await extractMarketSizing(rawDeepResearch!, researchInput, insights!, userTier);
            await ctx.db.update(research).set({ marketSizing: ms as object }).where(eq(research.id, input.researchId));
          },
        });
      }

      // Phase 4 backfills
      if (missing.includes('userStory')) {
        tasks.push({
          name: 'userStory',
          run: async () => {
            const us = await generateUserStory(researchInput, insights!, userTier);
            await ctx.db.update(research).set({ userStory: us as object }).where(eq(research.id, input.researchId));
          },
        });
      }

      if (missing.includes('valueLadder')) {
        tasks.push({
          name: 'valueLadder',
          run: async () => {
            const fallbackMetrics: BusinessMetrics = {
              revenuePotential: { rating: 'medium' as const, estimate: 'Unknown', confidence: 0 },
              executionDifficulty: { rating: 'moderate' as const, factors: [], soloFriendly: false },
              gtmClarity: { rating: 'moderate' as const, channels: [], confidence: 0 },
              founderFit: { percentage: 0, strengths: [], gaps: [] },
            };
            const vl = await generateValueLadder(researchInput, insights!, metrics ?? fallbackMetrics, userTier);
            await ctx.db.update(research).set({ valueLadder: vl as object[] }).where(eq(research.id, input.researchId));
          },
        });
      }

      if (missing.includes('actionPrompts')) {
        tasks.push({
          name: 'actionPrompts',
          run: async () => {
            const ap = await generateActionPrompts(researchInput, insights!, userTier);
            await ctx.db.update(research).set({ actionPrompts: ap as object[] }).where(eq(research.id, input.researchId));
          },
        });
      }

      if (missing.includes('techStack')) {
        tasks.push({
          name: 'techStack',
          run: async () => {
            const ts = await generateTechStack(researchInput, insights!, userTier);
            await ctx.db.update(research).set({ techStack: ts as object }).where(eq(research.id, input.researchId));
          },
        });
      }

      // Run all tasks in parallel with allSettled
      const results = await Promise.allSettled(tasks.map(t => t.run()));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          backfilled.push(tasks[i].name);
        } else {
          failed.push(tasks[i].name);
        }
      });

      const message = failed.length === 0
        ? `Successfully backfilled ${backfilled.length} field(s).`
        : `Backfilled ${backfilled.length}, failed ${failed.length}: ${failed.join(', ')}`;

      return { backfilled, failed, skipped, message };
    }),

  /**
   * Generate business plan on-demand (background via BullMQ)
   * Requires COMPLETE research. One-time generation only.
   */
  generateBusinessPlan: protectedProcedure
    .input(z.object({ researchId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.researchId),
        with: {
          project: {
            columns: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Research not found' });
      }

      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      if (result.status !== 'COMPLETE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Research must be complete before generating a business plan' });
      }

      if (result.businessPlan) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Business plan already exists' });
      }

      if (result.businessPlanStatus === 'GENERATING') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Business plan is already being generated' });
      }

      // Mark as generating
      await ctx.db.update(research).set({
        businessPlanStatus: 'GENERATING',
        businessPlanError: null,
      }).where(eq(research.id, input.researchId));

      // Enqueue background job
      try {
        await enqueueBusinessPlan({
          researchId: input.researchId,
          projectId: result.project.id,
          userId: ctx.userId,
        });
      } catch (queueError) {
        console.error('[Research] Failed to queue business plan:', queueError);
        await ctx.db.update(research).set({
          businessPlanStatus: 'FAILED',
          businessPlanError: 'Failed to queue business plan generation. Please try again.',
        }).where(eq(research.id, input.researchId));
      }

      return { success: true };
    }),

  /**
   * Update business plan cover style preference
   */
  updateBusinessPlanCoverStyle: protectedProcedure
    .input(z.object({
      researchId: z.string().min(1),
      coverStyle: z.enum(['1', '2', '3', '4']),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.researchId),
        columns: { id: true },
        with: { project: { columns: { userId: true } } },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Research not found' });
      }
      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      await ctx.db.update(research).set({
        businessPlanCoverStyle: input.coverStyle,
      }).where(eq(research.id, input.researchId));

      return { success: true };
    }),

  /**
   * Update a single prose section of the business plan
   */
  updateBusinessPlanSection: protectedProcedure
    .input(z.object({
      researchId: z.string().min(1),
      section: z.enum([
        'executiveSummary', 'problemNarrative', 'solutionNarrative',
        'marketNarrative', 'competitiveNarrative', 'businessModelNarrative',
        'gtmStrategy', 'customerProfile', 'financialNarrative',
        'productRoadmap', 'teamOperations', 'riskAnalysis',
        'fundingRequirements', 'exitStrategy',
      ]),
      value: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.researchId),
        columns: { id: true, businessPlan: true },
        with: { project: { columns: { userId: true } } },
      });

      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Research not found' });
      if (result.project.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      if (!result.businessPlan) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No business plan to update' });

      let prose: Record<string, unknown>;
      try {
        prose = JSON.parse(result.businessPlan);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to parse business plan' });
      }

      prose[input.section] = input.value;

      await ctx.db.update(research).set({
        businessPlan: JSON.stringify(prose),
      }).where(eq(research.id, input.researchId));

      return { success: true };
    }),

  /**
   * Update positioning report cover style preference
   */
  updatePositioningCoverStyle: protectedProcedure
    .input(z.object({
      researchId: z.string().min(1),
      coverStyle: z.enum(['1', '2', '3', '4']),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.query.research.findFirst({
        where: eq(research.id, input.researchId),
        columns: { id: true },
        with: { project: { columns: { userId: true } } },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Research not found' });
      }
      if (result.project.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      await ctx.db.update(research).set({
        positioningCoverStyle: input.coverStyle,
      }).where(eq(research.id, input.researchId));

      return { success: true };
    }),
});
