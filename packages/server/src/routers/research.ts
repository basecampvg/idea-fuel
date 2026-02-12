import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { RESEARCH_PHASE_PROGRESS, SPARK_STATUS_PROGRESS } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints, SparkJobStatus } from '@forge/shared';
import { logAuditAsync, formatResource } from '../lib/audit';
import { enqueueResearchCancel } from '../jobs';
import { research, projects, users, interviews } from '../db/schema';
import { db } from '../db/drizzle';
import {
  runResearchPipeline,
  classifyResearchError,
  logResearchError,
  SlaTracker,
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
  type IntermediateResearchData,
  type ChunkedResearchData,
  type ResearchError,
  type ResearchPhase,
  type SynthesizedInsights,
  type ResearchScores,
  type BusinessMetrics,
  type DeepResearchOutput,
} from '../services/research-ai';
import { runSparkPipeline } from '../services/spark-ai';

export const researchRouter = router({
  /**
   * Get research by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
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
  getByProject: protectedProcedure.input(z.object({ projectId: z.string().uuid() })).query(async ({ ctx, input }) => {
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
  getProgress: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
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
    };
  }),

  /**
   * Start research for a project
   * Called after interview is complete
   */
  start: protectedProcedure.input(z.object({ projectId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
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

    // Create or update research record
    // New pipeline starts with DEEP_RESEARCH phase
    let researchRecord = project.research;
    if (researchRecord) {
      // Restart failed research
      const [updated] = await ctx.db.update(research).set({
        status: 'IN_PROGRESS',
        currentPhase: 'DEEP_RESEARCH', // New 4-phase pipeline starts here
        progress: 0,
        errorMessage: null,
        errorPhase: null,
        retryCount: researchRecord.retryCount + 1,
        startedAt: new Date(),
        completedAt: null,
        notesSnapshot: project.notes, // Snapshot project notes
      }).where(eq(research.id, researchRecord.id)).returning();
      researchRecord = updated;
    } else {
      // Create new research record
      const [created] = await ctx.db.insert(research).values({
        projectId: input.projectId,
        status: 'IN_PROGRESS',
        currentPhase: 'DEEP_RESEARCH', // New 4-phase pipeline starts here
        progress: 0,
        startedAt: new Date(),
        notesSnapshot: project.notes, // Snapshot project notes
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
      metadata: { projectId: input.projectId, isRetry: project.research?.retryCount ? project.research.retryCount > 0 : false },
    });

    // Prepare research input (include project notes as context)
    const notesContext = project.notes ? `## FOUNDER'S NOTES\n${project.notes}` : undefined;

    const researchInput: ResearchInput = {
      ideaTitle: project.title,
      ideaDescription: project.description,
      interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
      interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
      canvasContext: notesContext,
    };

    // Get user's subscription tier for AI parameters
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { subscription: true },
    });
    const userTier = user?.subscription ?? 'FREE';

    // Build existing research data for resume functionality
    // This allows the pipeline to skip completed phases (and chunks within phases)
    const existingResearchData: ExistingResearchData | undefined = project.research ? {
      rawDeepResearch: project.research.rawDeepResearch as ExistingResearchData['rawDeepResearch'],
      researchChunks: project.research.researchChunks as ChunkedResearchData | null, // Chunk progress for resume
      socialProof: project.research.socialProof as ExistingResearchData['socialProof'],
      synthesizedInsights: project.research.synthesizedInsights as ExistingResearchData['synthesizedInsights'],
      opportunityScore: project.research.opportunityScore,
      problemScore: project.research.problemScore,
      feasibilityScore: project.research.feasibilityScore,
      whyNowScore: project.research.whyNowScore,
      scoreJustifications: project.research.scoreJustifications as ExistingResearchData['scoreJustifications'],
      scoreMetadata: project.research.scoreMetadata as ExistingResearchData['scoreMetadata'],
      revenuePotential: project.research.revenuePotential as ExistingResearchData['revenuePotential'],
      executionDifficulty: project.research.executionDifficulty as ExistingResearchData['executionDifficulty'],
      gtmClarity: project.research.gtmClarity as ExistingResearchData['gtmClarity'],
      founderFit: project.research.founderFit as ExistingResearchData['founderFit'],
      marketSizing: project.research.marketSizing as ExistingResearchData['marketSizing'],
      userStory: project.research.userStory as ExistingResearchData['userStory'],
      valueLadder: project.research.valueLadder as ExistingResearchData['valueLadder'],
      actionPrompts: project.research.actionPrompts as ExistingResearchData['actionPrompts'],
      keywordTrends: project.research.keywordTrends as ExistingResearchData['keywordTrends'],
      techStack: project.research.techStack as ExistingResearchData['techStack'],
      businessPlan: project.research.businessPlan,
    } : undefined;

    // Run pipeline in background (non-blocking for MVP)
    // In production, this would be a BullMQ job
    const researchId = researchRecord.id;

    // Run pipeline async without awaiting
    (async () => {
      // Track current phase for accurate error reporting
      let currentPhase: 'QUEUED' | 'DEEP_RESEARCH' | 'SYNTHESIS' | 'SOCIAL_RESEARCH' | 'REPORT_GENERATION' | 'COMPLETE' = 'DEEP_RESEARCH';
      const startTime = Date.now();

      // Initialize SLA tracker for monitoring phase and total execution times
      const slaTracker = new SlaTracker();

      try {
        const result = await runResearchPipeline(researchInput, async (phase, progress, intermediateData?: IntermediateResearchData) => {
          // Track phase for error reporting
          currentPhase = phase as typeof currentPhase;

          // Update SLA tracking when phase changes
          const researchPhase = phase as ResearchPhase;
          if (researchPhase && ['DEEP_RESEARCH', 'SOCIAL_RESEARCH', 'SYNTHESIS', 'REPORT_GENERATION'].includes(researchPhase)) {
            // End previous phase if any
            slaTracker.endPhase();
            // Start new phase
            slaTracker.startPhase(researchPhase);
          }

          // Check SLAs periodically - warn but don't fail (soft limit)
          slaTracker.checkTotalSla();

          // Update progress in database
          // New phases: DEEP_RESEARCH, SYNTHESIS, SOCIAL_RESEARCH, REPORT_GENERATION, COMPLETE
          const updateData: Record<string, unknown> = {
            currentPhase: phase as 'QUEUED' | 'DEEP_RESEARCH' | 'SYNTHESIS' | 'SOCIAL_RESEARCH' | 'REPORT_GENERATION' | 'COMPLETE',
            progress,
          };

          // Save intermediate data for resume capability
          // This allows resuming from the last completed phase (or chunk) if the pipeline fails
          if (intermediateData) {
            if (intermediateData.deepResearch) {
              updateData.rawDeepResearch = intermediateData.deepResearch as object;

              // Extract chunk data from deepResearch for granular resume capability
              // The rawReport contains section markers that indicate which chunks completed
              const rawReport = intermediateData.deepResearch.rawReport;
              const chunkResults: Record<string, string> = {};

              // Parse sections from combined report
              const marketMatch = rawReport.match(/## Market Analysis\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (marketMatch) chunkResults.market = marketMatch[1].trim();

              const competitorMatch = rawReport.match(/## Competitor Analysis\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (competitorMatch) chunkResults.competitors = competitorMatch[1].trim();

              const painpointsMatch = rawReport.match(/## Customer Pain Points\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (painpointsMatch) chunkResults.painpoints = painpointsMatch[1].trim();

              const timingMatch = rawReport.match(/## Timing & Validation\n\n([\s\S]*?)(?=\n\n---\n\n|$)/);
              if (timingMatch) chunkResults.timing = timingMatch[1].trim();

              // Save chunk progress for resume
              if (Object.keys(chunkResults).length > 0) {
                updateData.researchChunks = {
                  chunkResults,
                  citations: intermediateData.deepResearch.citations,
                  sources: intermediateData.deepResearch.sources,
                } as object;
              }
            }
            if (intermediateData.socialProof) {
              updateData.socialProof = intermediateData.socialProof as object;
            }
            if (intermediateData.insights) {
              updateData.synthesizedInsights = intermediateData.insights as object;
            }
            if (intermediateData.scores) {
              updateData.opportunityScore = intermediateData.scores.opportunityScore;
              updateData.problemScore = intermediateData.scores.problemScore;
              updateData.feasibilityScore = intermediateData.scores.feasibilityScore;
              updateData.whyNowScore = intermediateData.scores.whyNowScore;
              updateData.scoreJustifications = intermediateData.scores.justifications as object;
              updateData.scoreMetadata = intermediateData.scores.metadata as object;
            }
            if (intermediateData.metrics) {
              updateData.revenuePotential = intermediateData.metrics.revenuePotential as object;
              updateData.executionDifficulty = intermediateData.metrics.executionDifficulty as object;
              updateData.gtmClarity = intermediateData.metrics.gtmClarity as object;
              updateData.founderFit = intermediateData.metrics.founderFit as object;
            }
            if (intermediateData.marketSizing) {
              updateData.marketSizing = intermediateData.marketSizing as object;
            }
          }

          await db.update(research).set(updateData as typeof research.$inferInsert).where(eq(research.id, researchId));
        }, userTier, existingResearchData);

        // Save final results
        // Include rawDeepResearch for resume capability (allows skipping Phase 1 on restart)
        await db.update(research).set({
          status: 'COMPLETE',
          currentPhase: 'COMPLETE',
          progress: 100,
          completedAt: new Date(),
          generatedQueries: result.queries as object,
          synthesizedInsights: result.insights as object,
          marketAnalysis: result.insights.marketAnalysis as object,
          competitors: result.insights.competitors as object[],
          painPoints: result.insights.painPoints as object[],
          positioning: result.insights.positioning as object,
          whyNow: result.insights.whyNow as object,
          proofSignals: result.insights.proofSignals as object,
          keywords: result.insights.keywords as object,
          // Scores (nullable - may have failed independently)
          ...(result.scores ? {
            opportunityScore: result.scores.opportunityScore,
            problemScore: result.scores.problemScore,
            feasibilityScore: result.scores.feasibilityScore,
            whyNowScore: result.scores.whyNowScore,
            scoreJustifications: result.scores.justifications as object,
            scoreMetadata: result.scores.metadata as object,
          } : {}),
          // Metrics (nullable)
          ...(result.metrics ? {
            revenuePotential: result.metrics.revenuePotential as object,
            executionDifficulty: result.metrics.executionDifficulty as object,
            gtmClarity: result.metrics.gtmClarity as object,
            founderFit: result.metrics.founderFit as object,
          } : {}),
          // Market sizing (nullable)
          ...(result.marketSizing ? { marketSizing: result.marketSizing as object } : {}),
          // Creative generation fields (nullable)
          ...(result.userStory ? { userStory: result.userStory as object } : {}),
          keywordTrends: result.keywordTrends as object[],
          ...(result.valueLadder ? { valueLadder: result.valueLadder as object[] } : {}),
          ...(result.actionPrompts ? { actionPrompts: result.actionPrompts as object[] } : {}),
          socialProof: result.socialProof as object,
          ...(result.techStack ? { techStack: result.techStack as object } : {}),
          // Business plan (nullable - extensive markdown document)
          ...(result.businessPlan ? { businessPlan: result.businessPlan } : {}),
          // Raw deep research output for resume capability
          rawDeepResearch: result.deepResearch as object,
        }).where(eq(research.id, researchId));

        // Update project status to complete
        await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, input.projectId));
      } catch (error) {
        const duration = Date.now() - startTime;

        // Classify the error for better handling and logging
        const classifiedError = classifyResearchError(error, currentPhase, duration);
        logResearchError(classifiedError);

        // Store detailed error info in database
        const errorDetails = {
          type: classifiedError.type,
          retryable: classifiedError.retryable,
          elapsed: classifiedError.elapsed,
          ...(classifiedError.type === 'rate_limit' && { retryAfterMs: classifiedError.retryAfterMs }),
          ...(classifiedError.type === 'transient' && { statusCode: classifiedError.statusCode }),
          ...(classifiedError.type === 'parse_error' && { rawResponsePreview: classifiedError.rawResponse.substring(0, 500) }),
        };

        await db.update(research).set({
          status: 'FAILED',
          errorMessage: `[${classifiedError.type}] ${classifiedError.message}`,
          errorPhase: currentPhase,
        }).where(eq(research.id, researchId));
        // Reset project status so user isn't stuck in RESEARCHING
        await db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, input.projectId)).catch(() => {}); // Best-effort
      }
    })();

    return researchRecord;
  }),

  /**
   * Cancel ongoing research
   */
  cancel: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
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
        id: z.string().uuid(),
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
  reset: protectedProcedure.input(z.object({ projectId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
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
        id: z.string().uuid(),
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
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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
        metadata: { projectId: input.projectId, mode: 'SPARK' },
      });

      // Build enriched description with project notes
      const sparkDescription = project.notes
        ? `${project.description}\n\n## FOUNDER'S NOTES\n${project.notes}`
        : project.description;

      // Run Spark pipeline asynchronously (fire and forget)
      (async () => {
        try {
          const result = await runSparkPipeline(sparkDescription, {
            onStatusChange: async (status: SparkJobStatus) => {
              await db.update(research).set({
                sparkStatus: status,
                progress: SPARK_STATUS_PROGRESS[status]?.start || 0,
              }).where(eq(research.id, researchRecord.id));
            },
            includeTrends: true,
          });

          // Save successful result
          // Note: sparkStatus is already set by onStatusChange (COMPLETE or PARTIAL_COMPLETE)
          // We fetch the current status to preserve it
          const currentResearch = await db.query.research.findFirst({
            where: eq(research.id, researchRecord.id),
            columns: { sparkStatus: true },
          });

          await db.update(research).set({
            // Preserve the status set by the pipeline (COMPLETE or PARTIAL_COMPLETE)
            sparkStatus: currentResearch?.sparkStatus || 'COMPLETE',
            sparkResult: result as object,
            sparkKeywords: result.keywords as object,
            sparkCompletedAt: new Date(),
            progress: currentResearch?.sparkStatus === 'PARTIAL_COMPLETE' ? 90 : 100,
            status: 'COMPLETE', // Research overall is complete even if partial
          }).where(eq(research.id, researchRecord.id));

          // Update project status
          await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, input.projectId));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          await db.update(research).set({
            sparkStatus: 'FAILED',
            sparkError: errorMessage,
            status: 'FAILED',
            errorMessage: `Spark validation failed: ${errorMessage}`,
          }).where(eq(research.id, researchRecord.id));
          // Reset project status so user isn't stuck in RESEARCHING
          await db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, input.projectId)).catch(() => {}); // Best-effort
        }
      })();

      return { jobId: researchRecord.id };
    }),

  /**
   * Get Spark job status and result
   */
  getSparkStatus: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
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
    .input(z.object({ jobId: z.string().uuid() }))
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
    .input(z.object({ researchId: z.string().uuid() }))
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
});
