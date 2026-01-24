import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { RESEARCH_PHASE_PROGRESS, SPARK_STATUS_PROGRESS } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints, SparkJobStatus } from '@forge/shared';
import {
  runResearchPipeline,
  classifyResearchError,
  logResearchError,
  SlaTracker,
  type ResearchInput,
  type ExistingResearchData,
  type IntermediateResearchData,
  type ChunkedResearchData,
  type ResearchError,
  type ResearchPhase,
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

    // Prepare research input
    const researchInput: ResearchInput = {
      ideaTitle: idea.title,
      ideaDescription: idea.description,
      interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
      interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
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
        const canResume = existingResearchData?.rawDeepResearch;
        console.log('[Research] Starting NEW 4-phase pipeline with tier:', userTier, canResume ? '(RESUMING)' : '(FRESH START)');
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
          const totalSla = slaTracker.checkTotalSla();
          if (!totalSla.ok) {
            console.warn(`[SLA Warning] Total SLA exceeded: pipeline took ${Math.round(totalSla.elapsed/1000)}s (limit: ${Math.round(totalSla.limit/1000)}s). Continuing execution.`);
          }
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
                console.log('[Research] Saved researchChunks for resume capability:', Object.keys(chunkResults).join(', '));
              }
            }
            if (intermediateData.socialProof) {
              updateData.socialProof = intermediateData.socialProof as object;
              console.log('[Research] Saved socialProof for resume capability');
            }
            if (intermediateData.insights) {
              updateData.synthesizedInsights = intermediateData.insights as object;
              console.log('[Research] Saved synthesizedInsights for resume capability');
            }
            if (intermediateData.scores) {
              updateData.opportunityScore = intermediateData.scores.opportunityScore;
              updateData.problemScore = intermediateData.scores.problemScore;
              updateData.feasibilityScore = intermediateData.scores.feasibilityScore;
              updateData.whyNowScore = intermediateData.scores.whyNowScore;
              updateData.scoreJustifications = intermediateData.scores.justifications as object;
              updateData.scoreMetadata = intermediateData.scores.metadata as object;
              console.log('[Research] Saved scores for resume capability');
            }
            if (intermediateData.metrics) {
              updateData.revenuePotential = intermediateData.metrics.revenuePotential as object;
              updateData.executionDifficulty = intermediateData.metrics.executionDifficulty as object;
              updateData.gtmClarity = intermediateData.metrics.gtmClarity as object;
              updateData.founderFit = intermediateData.metrics.founderFit as object;
              console.log('[Research] Saved metrics for resume capability');
            }
            if (intermediateData.marketSizing) {
              updateData.marketSizing = intermediateData.marketSizing as object;
              console.log('[Research] Saved market sizing (TAM/SAM/SOM) for resume capability');
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
            opportunityScore: result.scores.opportunityScore,
            problemScore: result.scores.problemScore,
            feasibilityScore: result.scores.feasibilityScore,
            whyNowScore: result.scores.whyNowScore,
            scoreJustifications: result.scores.justifications as object,
            scoreMetadata: result.scores.metadata as object,
            revenuePotential: result.metrics.revenuePotential as object,
            executionDifficulty: result.metrics.executionDifficulty as object,
            gtmClarity: result.metrics.gtmClarity as object,
            founderFit: result.metrics.founderFit as object,
            marketSizing: result.marketSizing as object,
            // New fields from extended pipeline
            userStory: result.userStory as object,
            keywordTrends: result.keywordTrends as object[],
            valueLadder: result.valueLadder as object[],
            actionPrompts: result.actionPrompts as object[],
            socialProof: result.socialProof as object,
            techStack: result.techStack as object,
            // Raw deep research output for resume capability
            rawDeepResearch: result.deepResearch as object,
          },
        });

        // Update idea status to complete
        await prisma.idea.update({
          where: { id: input.ideaId },
          data: { status: 'COMPLETE' },
        });

        console.log('[Research] Pipeline completed for idea:', input.ideaId);
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

        // Log additional context for debugging
        console.error('[Research] Classified error:', JSON.stringify(errorDetails, null, 2));
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

    // TODO: Cancel BullMQ job

    const updatedResearch = await ctx.prisma.research.update({
      where: { id: input.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Research cancelled by user',
        errorPhase: research.currentPhase,
      },
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

    console.log('[Research] Reset stuck research for idea:', input.ideaId, 'was at phase:', idea.research.currentPhase);

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

      // Run Spark pipeline asynchronously (fire and forget)
      (async () => {
        try {
          console.log('[Spark] Starting pipeline for idea:', input.ideaId);

          const result = await runSparkPipeline(idea.description, {
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

          console.log('[Spark] Pipeline complete for idea:', input.ideaId);
        } catch (error) {
          console.error('[Spark] Pipeline failed for idea:', input.ideaId, error);

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
});
