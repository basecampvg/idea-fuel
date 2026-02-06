import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { RESEARCH_PHASE_PROGRESS, SPARK_STATUS_PROGRESS } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints, SparkJobStatus } from '@forge/shared';
import { logAuditAsync, formatResource } from '../lib/audit';
import { serializeCanvasForAI } from '@forge/shared';
import { enqueueResearchCancel } from '../jobs';
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
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const research = await ctx.prisma.research.findFirst({
      where: {
        id: input.id,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });

    if (!research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    // Verify ownership through idea
    if (research.idea.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    return research;
  }),

  /**
   * Get research by idea ID
   */
  getByIdea: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      include: {
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    return idea.research;
  }),

  /**
   * Get research progress/status for polling
   */
  getProgress: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const research = await ctx.prisma.research.findFirst({
      where: {
        id: input.id,
      },
      include: {
        idea: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    if (research.idea.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Calculate estimated completion based on phase
    const phaseProgress = RESEARCH_PHASE_PROGRESS[research.currentPhase];

    return {
      id: research.id,
      status: research.status,
      currentPhase: research.currentPhase,
      progress: research.progress,
      phaseProgress,
      estimatedCompletion: research.estimatedCompletion,
      startedAt: research.startedAt,
      completedAt: research.completedAt,
      errorMessage: research.errorMessage,
      errorPhase: research.errorPhase,
    };
  }),

  /**
   * Start research for an idea
   * Called after interview is complete
   */
  start: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      include: {
        research: true,
        interviews: {
          where: { status: 'COMPLETE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        project: {
          select: { canvas: true },
        },
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    // Check if research already exists and is not failed
    if (idea.research && idea.research.status !== 'FAILED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research already exists for this idea',
      });
    }

    // Require at least one completed interview
    if (idea.interviews.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Complete an interview before starting research',
      });
    }

    const interview = idea.interviews[0];

    // Create or update research record
    // New pipeline starts with DEEP_RESEARCH phase
    let research = idea.research;
    if (research) {
      // Restart failed research
      research = await ctx.prisma.research.update({
        where: { id: research.id },
        data: {
          status: 'IN_PROGRESS',
          currentPhase: 'DEEP_RESEARCH', // New 4-phase pipeline starts here
          progress: 0,
          errorMessage: null,
          errorPhase: null,
          retryCount: research.retryCount + 1,
          startedAt: new Date(),
          completedAt: null,
        },
      });
    } else {
      // Create new research record
      research = await ctx.prisma.research.create({
        data: {
          ideaId: input.ideaId,
          status: 'IN_PROGRESS',
          currentPhase: 'DEEP_RESEARCH', // New 4-phase pipeline starts here
          progress: 0,
          startedAt: new Date(),
        },
      });
    }

    // Update idea status
    await ctx.prisma.idea.update({
      where: { id: input.ideaId },
      data: { status: 'RESEARCHING' },
    });

    // Audit log - start research
    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_START',
      resource: formatResource('research', research.id),
      metadata: { ideaId: input.ideaId, isRetry: idea.research?.retryCount ? idea.research.retryCount > 0 : false },
    });

    // Prepare research input (include canvas context if project has canvas blocks)
    const canvasBlocks = idea.project?.canvas as unknown as import('@forge/shared').CanvasBlock[] | null;
    const canvasContext = canvasBlocks && canvasBlocks.length > 0
      ? serializeCanvasForAI(canvasBlocks)
      : undefined;

    const researchInput: ResearchInput = {
      ideaTitle: idea.title,
      ideaDescription: idea.description,
      interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
      interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
      canvasContext,
    };

    // Get user's subscription tier for AI parameters
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { subscription: true },
    });
    const userTier = user?.subscription ?? 'FREE';

    // Build existing research data for resume functionality
    // This allows the pipeline to skip completed phases (and chunks within phases)
    const existingResearchData: ExistingResearchData | undefined = idea.research ? {
      rawDeepResearch: idea.research.rawDeepResearch as ExistingResearchData['rawDeepResearch'],
      researchChunks: idea.research.researchChunks as ChunkedResearchData | null, // Chunk progress for resume
      socialProof: idea.research.socialProof as ExistingResearchData['socialProof'],
      synthesizedInsights: idea.research.synthesizedInsights as ExistingResearchData['synthesizedInsights'],
      opportunityScore: idea.research.opportunityScore,
      problemScore: idea.research.problemScore,
      feasibilityScore: idea.research.feasibilityScore,
      whyNowScore: idea.research.whyNowScore,
      scoreJustifications: idea.research.scoreJustifications as ExistingResearchData['scoreJustifications'],
      scoreMetadata: idea.research.scoreMetadata as ExistingResearchData['scoreMetadata'],
      revenuePotential: idea.research.revenuePotential as ExistingResearchData['revenuePotential'],
      executionDifficulty: idea.research.executionDifficulty as ExistingResearchData['executionDifficulty'],
      gtmClarity: idea.research.gtmClarity as ExistingResearchData['gtmClarity'],
      founderFit: idea.research.founderFit as ExistingResearchData['founderFit'],
      marketSizing: idea.research.marketSizing as ExistingResearchData['marketSizing'],
      userStory: idea.research.userStory as ExistingResearchData['userStory'],
      valueLadder: idea.research.valueLadder as ExistingResearchData['valueLadder'],
      actionPrompts: idea.research.actionPrompts as ExistingResearchData['actionPrompts'],
      keywordTrends: idea.research.keywordTrends as ExistingResearchData['keywordTrends'],
      techStack: idea.research.techStack as ExistingResearchData['techStack'],
      businessPlan: idea.research.businessPlan,
    } : undefined;

    // Run pipeline in background (non-blocking for MVP)
    // In production, this would be a BullMQ job
    const researchId = research.id;
    const prisma = ctx.prisma;

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

          await prisma.research.update({
            where: { id: researchId },
            data: updateData,
          });
        }, userTier, existingResearchData);

        // Save final results
        // Include rawDeepResearch for resume capability (allows skipping Phase 1 on restart)
        await prisma.research.update({
          where: { id: researchId },
          data: {
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
          },
        });

        // Update idea status to complete
        await prisma.idea.update({
          where: { id: input.ideaId },
          data: { status: 'COMPLETE' },
        });
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

        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'FAILED',
            errorMessage: `[${classifiedError.type}] ${classifiedError.message}`,
            errorPhase: currentPhase,
            // Store structured error info in a JSON field if available
            // errorDetails: errorDetails, // Uncomment if you add this field to schema
          },
        });
      }
    })();

    return research;
  }),

  /**
   * Cancel ongoing research
   */
  cancel: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const research = await ctx.prisma.research.findFirst({
      where: {
        id: input.id,
      },
      include: {
        idea: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Research not found',
      });
    }

    if (research.idea.userId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    if (research.status === 'COMPLETE') {
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

    const updatedResearch = await ctx.prisma.research.update({
      where: { id: input.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Research cancelled by user',
        errorPhase: research.currentPhase,
      },
    });

    // Audit log - cancel research
    logAuditAsync({
      userId: ctx.userId,
      action: 'RESEARCH_CANCEL',
      resource: formatResource('research', research.id),
      metadata: { ideaId: research.ideaId, cancelledAtPhase: research.currentPhase },
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
        id: z.string().cuid(),
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
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findFirst({
        where: {
          id: input.id,
        },
        include: {
          idea: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!research) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      // Build update data based on phase
      const updateData: Record<string, unknown> = {
        currentPhase: input.phase,
        progress: input.progress,
      };

      // Set timestamps
      if (input.phase !== 'QUEUED' && !research.startedAt) {
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

      const updatedResearch = await ctx.prisma.research.update({
        where: { id: input.id },
        data: updateData as Parameters<typeof ctx.prisma.research.update>[0]['data'],
      });

      // If complete, update idea status
      if (input.phase === 'COMPLETE') {
        await ctx.prisma.idea.update({
          where: { id: research.ideaId },
          data: { status: 'COMPLETE' },
        });
      }

      return updatedResearch;
    }),

  /**
   * Reset stuck research (allows restarting interrupted/stuck research)
   * This marks the research as FAILED so it can be restarted via the start endpoint
   */
  reset: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      include: {
        research: true,
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    if (!idea.research) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No research found for this idea',
      });
    }

    // Only allow reset for IN_PROGRESS or PENDING research (stuck states)
    if (idea.research.status === 'COMPLETE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot reset completed research. Use delete and restart instead.',
      });
    }

    // Mark research as failed so it can be restarted
    // Keep idea status as RESEARCHING so user stays on same page and sees failed state
    const updatedResearch = await ctx.prisma.research.update({
      where: { id: idea.research.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Research reset by user (interrupted or stuck)',
        errorPhase: idea.research.currentPhase,
      },
    });

    return updatedResearch;
  }),

  /**
   * Mark research as failed (called by BullMQ workers on error)
   */
  markFailed: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
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
      const research = await ctx.prisma.research.findFirst({
        where: {
          id: input.id,
        },
      });

      if (!research) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      const updatedResearch = await ctx.prisma.research.update({
        where: { id: input.id },
        data: {
          status: 'FAILED',
          errorMessage: input.errorMessage,
          errorPhase: input.errorPhase,
        },
      });

      return updatedResearch;
    }),

  // =============================================================================
  // SPARK PROCEDURES (Quick Validation)
  // =============================================================================

  /**
   * Start Spark validation for an idea
   * Creates a Research record and triggers the 2-step Spark pipeline
   */
  startSpark: protectedProcedure
    .input(z.object({ ideaId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findFirst({
        where: {
          id: input.ideaId,
          userId: ctx.userId,
        },
        include: {
          research: true,
          project: {
            select: { canvas: true },
          },
        },
      });

      if (!idea) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Idea not found',
        });
      }

      // Check if there's already a Spark job running
      const runningStatuses = ['QUEUED', 'RUNNING_KEYWORDS', 'RUNNING_RESEARCH', 'RUNNING_PARALLEL', 'SYNTHESIZING'];
      if (idea.research?.sparkStatus && runningStatuses.includes(idea.research.sparkStatus)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Spark validation already in progress',
        });
      }

      // Create or update research record for Spark
      let research;
      if (idea.research) {
        research = await ctx.prisma.research.update({
          where: { id: idea.research.id },
          data: {
            sparkStatus: 'QUEUED',
            sparkKeywords: Prisma.DbNull,
            sparkResult: Prisma.DbNull,
            sparkStartedAt: new Date(),
            sparkCompletedAt: null,
            sparkError: null,
          },
        });
      } else {
        research = await ctx.prisma.research.create({
          data: {
            ideaId: input.ideaId,
            status: 'IN_PROGRESS',
            currentPhase: 'QUEUED',
            progress: 0,
            sparkStatus: 'QUEUED',
            sparkStartedAt: new Date(),
          },
        });
      }

      // Update idea status
      await ctx.prisma.idea.update({
        where: { id: input.ideaId },
        data: { status: 'RESEARCHING' },
      });

      // Audit log - start Spark research
      logAuditAsync({
        userId: ctx.userId,
        action: 'RESEARCH_START',
        resource: formatResource('research', research.id),
        metadata: { ideaId: input.ideaId, mode: 'SPARK' },
      });

      // Serialize canvas context for Spark pipeline
      const sparkCanvasBlocks = idea.project?.canvas as unknown as import('@forge/shared').CanvasBlock[] | null;
      const sparkCanvasContext = sparkCanvasBlocks && sparkCanvasBlocks.length > 0
        ? serializeCanvasForAI(sparkCanvasBlocks)
        : undefined;

      // Build enriched description with canvas context
      const sparkDescription = sparkCanvasContext
        ? `${idea.description}\n\n## FOUNDER'S CANVAS (structured research notes)\n${sparkCanvasContext}`
        : idea.description;

      // Run Spark pipeline asynchronously (fire and forget)
      (async () => {
        try {
          const result = await runSparkPipeline(sparkDescription, {
            onStatusChange: async (status: SparkJobStatus) => {
              await ctx.prisma.research.update({
                where: { id: research.id },
                data: {
                  sparkStatus: status,
                  progress: SPARK_STATUS_PROGRESS[status]?.start || 0,
                },
              });
            },
            includeTrends: true,
          });

          // Save successful result
          // Note: sparkStatus is already set by onStatusChange (COMPLETE or PARTIAL_COMPLETE)
          // We fetch the current status to preserve it
          const currentResearch = await ctx.prisma.research.findUnique({
            where: { id: research.id },
            select: { sparkStatus: true },
          });

          await ctx.prisma.research.update({
            where: { id: research.id },
            data: {
              // Preserve the status set by the pipeline (COMPLETE or PARTIAL_COMPLETE)
              sparkStatus: currentResearch?.sparkStatus || 'COMPLETE',
              sparkResult: result as unknown as Parameters<typeof ctx.prisma.research.update>[0]['data']['sparkResult'],
              sparkKeywords: result.keywords as unknown as Parameters<typeof ctx.prisma.research.update>[0]['data']['sparkKeywords'],
              sparkCompletedAt: new Date(),
              progress: currentResearch?.sparkStatus === 'PARTIAL_COMPLETE' ? 90 : 100,
              status: 'COMPLETE', // Research overall is complete even if partial
            },
          });

          // Update idea status
          await ctx.prisma.idea.update({
            where: { id: input.ideaId },
            data: { status: 'COMPLETE' },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          await ctx.prisma.research.update({
            where: { id: research.id },
            data: {
              sparkStatus: 'FAILED',
              sparkError: errorMessage,
              status: 'FAILED',
              errorMessage: `Spark validation failed: ${errorMessage}`,
            },
          });
        }
      })();

      return { jobId: research.id };
    }),

  /**
   * Get Spark job status and result
   */
  getSparkStatus: protectedProcedure
    .input(z.object({ jobId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findFirst({
        where: {
          id: input.jobId,
        },
        include: {
          idea: {
            select: {
              userId: true,
              title: true,
              description: true,
            },
          },
        },
      });

      if (!research) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      if (research.idea.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      return {
        jobId: research.id,
        ideaTitle: research.idea.title,
        sparkStatus: research.sparkStatus,
        sparkResult: research.sparkResult,
        sparkKeywords: research.sparkKeywords,
        sparkError: research.sparkError,
        sparkStartedAt: research.sparkStartedAt,
        sparkCompletedAt: research.sparkCompletedAt,
        progress: research.progress,
      };
    }),

  /**
   * Poll Spark job progress (lightweight endpoint for polling)
   */
  pollSpark: protectedProcedure
    .input(z.object({ jobId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findFirst({
        where: {
          id: input.jobId,
        },
        select: {
          id: true,
          sparkStatus: true,
          progress: true,
          sparkError: true,
          sparkStartedAt: true,
          sparkCompletedAt: true,
          idea: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!research) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Research not found',
        });
      }

      if (research.idea.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // Calculate progress based on status
      const statusProgress = research.sparkStatus
        ? SPARK_STATUS_PROGRESS[research.sparkStatus] || { start: 0, end: 0 }
        : { start: 0, end: 0 };

      return {
        jobId: research.id,
        status: research.sparkStatus,
        progress: research.progress,
        statusProgress,
        error: research.sparkError,
        startedAt: research.sparkStartedAt,
        completedAt: research.sparkCompletedAt,
        isComplete: research.sparkStatus === 'COMPLETE' || research.sparkStatus === 'PARTIAL_COMPLETE',
        isPartial: research.sparkStatus === 'PARTIAL_COMPLETE',
        isFailed: research.sparkStatus === 'FAILED',
      };
    }),

  /**
   * Backfill missing fields on a COMPLETE research without re-running expensive Phase 1/2.
   * Re-runs only the specific extraction functions whose data is null.
   */
  backfill: protectedProcedure
    .input(z.object({ researchId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.research.findFirst({
        where: { id: input.researchId },
        include: {
          idea: {
            include: {
              interviews: {
                where: { status: 'COMPLETE' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              project: {
                select: { canvas: true },
              },
            },
          },
        },
      });

      if (!research) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Research not found' });
      }
      if (research.idea.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      if (research.status !== 'COMPLETE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Research must be COMPLETE to backfill. Use restart for failed research.' });
      }

      const rawDeepResearch = research.rawDeepResearch as unknown as DeepResearchOutput | null;
      const hasRawResearch = !!rawDeepResearch?.rawReport;

      // Reconstruct ResearchInput from idea
      const idea = research.idea;
      const interview = idea.interviews[0];
      const backfillCanvasBlocks = idea.project?.canvas as unknown as import('@forge/shared').CanvasBlock[] | null;
      const backfillCanvasContext = backfillCanvasBlocks && backfillCanvasBlocks.length > 0
        ? serializeCanvasForAI(backfillCanvasBlocks)
        : undefined;
      const researchInput: ResearchInput = {
        ideaTitle: idea.title,
        ideaDescription: idea.description || '',
        interviewData: (interview?.collectedData as unknown as ResearchInput['interviewData']) ?? null,
        interviewMessages: (interview?.messages as unknown as Array<{ role: string; content: string }>) ?? [],
        canvasContext: backfillCanvasContext,
      };

      // Get user tier
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { subscription: true },
      });
      const userTier = user?.subscription ?? 'FREE';

      // Determine what's missing
      const missing: string[] = [];
      if (!research.synthesizedInsights) missing.push('insights');
      if (research.opportunityScore == null) missing.push('scores');
      if (!research.revenuePotential) missing.push('metrics');
      if (!research.marketSizing) missing.push('marketSizing');
      if (!research.userStory) missing.push('userStory');
      if (!research.valueLadder) missing.push('valueLadder');
      if (!research.actionPrompts) missing.push('actionPrompts');
      if (!research.techStack) missing.push('techStack');

      if (missing.length === 0) {
        return { backfilled: [], failed: [], skipped: [], message: 'All fields already populated.' };
      }

      // Step 1: Ensure insights exist (dependency for Phase 4 functions)
      let insights = research.synthesizedInsights as unknown as SynthesizedInsights | null;
      if (!insights && hasRawResearch) {
        try {
          insights = await extractInsights(rawDeepResearch!, researchInput, userTier);
          await ctx.prisma.research.update({
            where: { id: input.researchId },
            data: { synthesizedInsights: insights as object },
          });
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
      let scores = research.opportunityScore != null ? {
        opportunityScore: research.opportunityScore!,
        problemScore: research.problemScore!,
        feasibilityScore: research.feasibilityScore!,
        whyNowScore: research.whyNowScore!,
        justifications: research.scoreJustifications as unknown as ResearchScores['justifications'],
        metadata: (research.scoreMetadata || { passCount: 0, maxDeviation: 0, averageConfidence: 0, flagged: false }) as ResearchScores['metadata'],
      } as ResearchScores : null;

      let metrics = research.revenuePotential ? {
        revenuePotential: research.revenuePotential,
        executionDifficulty: research.executionDifficulty || { rating: 'moderate' as const, factors: [], soloFriendly: false },
        gtmClarity: research.gtmClarity || { rating: 'moderate' as const, channels: [], confidence: 0 },
        founderFit: research.founderFit || { percentage: 0, strengths: [], gaps: [] },
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
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: {
                opportunityScore: scores.opportunityScore,
                problemScore: scores.problemScore,
                feasibilityScore: scores.feasibilityScore,
                whyNowScore: scores.whyNowScore,
                scoreJustifications: scores.justifications as object,
                scoreMetadata: scores.metadata as object,
              },
            });
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
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: {
                revenuePotential: metrics.revenuePotential as object,
                executionDifficulty: metrics.executionDifficulty as object,
                gtmClarity: metrics.gtmClarity as object,
                founderFit: metrics.founderFit as object,
              },
            });
          },
        });
      }

      if (missing.includes('marketSizing') && hasRawResearch) {
        tasks.push({
          name: 'marketSizing',
          run: async () => {
            const ms = await extractMarketSizing(rawDeepResearch!, researchInput, insights!, userTier);
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: { marketSizing: ms as object },
            });
          },
        });
      }

      // Phase 4 backfills
      if (missing.includes('userStory')) {
        tasks.push({
          name: 'userStory',
          run: async () => {
            const us = await generateUserStory(researchInput, insights!, userTier);
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: { userStory: us as object },
            });
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
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: { valueLadder: vl as object[] },
            });
          },
        });
      }

      if (missing.includes('actionPrompts')) {
        tasks.push({
          name: 'actionPrompts',
          run: async () => {
            const ap = await generateActionPrompts(researchInput, insights!, userTier);
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: { actionPrompts: ap as object[] },
            });
          },
        });
      }

      if (missing.includes('techStack')) {
        tasks.push({
          name: 'techStack',
          run: async () => {
            const ts = await generateTechStack(researchInput, insights!, userTier);
            await ctx.prisma.research.update({
              where: { id: input.researchId },
              data: { techStack: ts as object },
            });
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
