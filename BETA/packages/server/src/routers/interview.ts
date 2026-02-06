import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { INTERVIEW_SESSION, INTERVIEW_RESUME_MESSAGES } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints, InterviewMode } from '@forge/shared';
import {
  generateNextQuestion,
  extractDataPoints,
  mergeCollectedData,
  generateResumeContext,
} from '../services/interview-ai';
import { runResearchPipeline, type ResearchInput } from '../services/research-ai';
import { logAuditAsync, formatResource } from '../lib/audit';

export const interviewRouter = router({
  /**
   * Get an interview by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    return interview;
  }),

  /**
   * List interviews for an idea
   */
  listByIdea: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const interviews = await ctx.prisma.interview.findMany({
      where: {
        ideaId: input.ideaId,
        userId: ctx.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return interviews;
  }),

  /**
   * Get active (in-progress) interviews for the user
   * Useful for showing "Continue Interview" prompts
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const interviews = await ctx.prisma.interview.findMany({
      where: {
        userId: ctx.userId,
        status: 'IN_PROGRESS',
        isExpired: false,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return interviews;
  }),

  /**
   * Resume an interview - returns resume state with appropriate greeting
   */
  resume: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const now = Date.now();
    const lastActive = interview.lastActiveAt.getTime();
    const timeSinceLastActive = now - lastActive;

    // Check if interview can be resumed
    const canResume =
      interview.status === 'IN_PROGRESS' &&
      !interview.isExpired &&
      timeSinceLastActive < INTERVIEW_SESSION.resumeWindowMs;

    // Determine appropriate resume message
    let resumeMessage: string;
    if (timeSinceLastActive < 60 * 60 * 1000) {
      // < 1 hour
      resumeMessage = INTERVIEW_RESUME_MESSAGES.short;
    } else if (timeSinceLastActive < 24 * 60 * 60 * 1000) {
      // < 24 hours
      resumeMessage = INTERVIEW_RESUME_MESSAGES.medium;
    } else {
      resumeMessage = INTERVIEW_RESUME_MESSAGES.long;
    }

    // Audit log - resume interview (only if actually resuming)
    if (canResume) {
      logAuditAsync({
        userId: ctx.userId,
        action: 'INTERVIEW_RESUME',
        resource: formatResource('interview', interview.id),
        metadata: { ideaId: interview.ideaId, timeSinceLastActive },
      });
    }

    return {
      interview,
      timeSinceLastActive,
      canResume,
      resumeMessage,
    };
  }),

  /**
   * Add a user message to the interview
   * Updates lastActiveAt for auto-save tracking
   */
  addMessage: protectedProcedure
    .input(
      z.object({
        interviewId: z.string().cuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findFirst({
        where: {
          id: input.interviewId,
          userId: ctx.userId,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }

      if (interview.status !== 'IN_PROGRESS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview is not in progress',
        });
      }

      if (interview.isExpired) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview has expired',
        });
      }

      const messages = (interview.messages as unknown as ChatMessage[]) || [];
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: input.content,
        timestamp: new Date().toISOString(),
      };

      const now = new Date();
      const updatedInterview = await ctx.prisma.interview.update({
        where: { id: input.interviewId },
        data: {
          messages: [...messages, newMessage] as unknown as Parameters<
            typeof ctx.prisma.interview.update
          >[0]['data']['messages'],
          lastActiveAt: now,
          lastMessageAt: now,
          currentTurn: interview.currentTurn + 1,
        },
      });

      return {
        interview: updatedInterview,
        message: newMessage,
      };
    }),

  /**
   * Add an AI assistant message to the interview
   * Called after AI generates a response
   */
  addAssistantMessage: protectedProcedure
    .input(
      z.object({
        interviewId: z.string().cuid(),
        content: z.string().min(1),
        collectedData: z.record(z.any()).optional(),
        resumeContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findFirst({
        where: {
          id: input.interviewId,
          userId: ctx.userId,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }

      const messages = (interview.messages as unknown as ChatMessage[]) || [];
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: input.content,
        timestamp: new Date().toISOString(),
      };

      // Merge new collected data with existing
      const existingData = (interview.collectedData as Record<string, unknown>) || {};
      const mergedData = input.collectedData ? { ...existingData, ...input.collectedData } : existingData;

      const updatedInterview = await ctx.prisma.interview.update({
        where: { id: input.interviewId },
        data: {
          messages: [...messages, newMessage] as unknown as Parameters<
            typeof ctx.prisma.interview.update
          >[0]['data']['messages'],
          collectedData: mergedData as unknown as Parameters<
            typeof ctx.prisma.interview.update
          >[0]['data']['collectedData'],
          ...(input.resumeContext && { resumeContext: input.resumeContext }),
        },
      });

      return {
        interview: updatedInterview,
        message: newMessage,
      };
    }),

  /**
   * Chat endpoint - sends user message and gets AI response
   * This combines addMessage + AI generation + addAssistantMessage in one call
   */
  chat: protectedProcedure
    .input(
      z.object({
        interviewId: z.string().cuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get interview with idea context
      const interview = await ctx.prisma.interview.findFirst({
        where: {
          id: input.interviewId,
          userId: ctx.userId,
        },
        include: {
          idea: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }

      if (interview.status !== 'IN_PROGRESS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview is not in progress',
        });
      }

      if (interview.isExpired) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview has expired',
        });
      }

      const messages = (interview.messages as unknown as ChatMessage[]) || [];
      const currentTurn = interview.currentTurn;

      // Get user's subscription tier for AI parameters
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { subscription: true },
      });
      const tier = user?.subscription ?? 'FREE';

      // 2. Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: input.content,
        timestamp: new Date().toISOString(),
      };
      messages.push(userMessage);

      // 3. Build conversation context for data extraction
      const conversationContext = messages
        .slice(-6) // Last 3 exchanges
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      // 4. Extract data points from user response
      const existingData = (interview.collectedData as Partial<InterviewDataPoints>) || {};
      const extractedData = await extractDataPoints(input.content, conversationContext, existingData, tier);
      const mergedData = mergeCollectedData(existingData, extractedData, currentTurn + 1);

      // 5. Generate AI response
      const aiResponse = await generateNextQuestion(
        interview.idea.title,
        interview.idea.description,
        interview.mode as InterviewMode,
        messages,
        mergedData,
        currentTurn + 1,
        interview.maxTurns,
        tier
      );

      // 6. Add assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      messages.push(assistantMessage);

      // 7. Generate resume context for future sessions
      const resumeContext = generateResumeContext(messages, mergedData);

      // 8. Update interview
      const now = new Date();
      const updatedInterview = await ctx.prisma.interview.update({
        where: { id: input.interviewId },
        data: {
          messages: messages as unknown as Parameters<typeof ctx.prisma.interview.update>[0]['data']['messages'],
          collectedData: mergedData as unknown as Parameters<typeof ctx.prisma.interview.update>[0]['data']['collectedData'],
          currentTurn: currentTurn + 1,
          lastActiveAt: now,
          lastMessageAt: now,
          resumeContext,
        },
        include: {
          idea: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });

      return {
        interview: updatedInterview,
        userMessage,
        assistantMessage,
        extractedData: Object.keys(extractedData),
      };
    }),

  /**
   * Complete an interview and generate summary
   * Automatically starts research pipeline
   */
  complete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        idea: true,
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    // Calculate confidence score based on collected data
    const collectedData = (interview.collectedData as Record<string, unknown>) || {};
    const filledFields = Object.values(collectedData).filter((v) => v !== null && v !== undefined).length;
    const totalFields = 42; // Updated: 31 original + 11 new fields
    const confidenceScore = Math.min(100, Math.round((filledFields / totalFields) * 100));

    const summary = `Interview completed with ${interview.currentTurn} turns. ${filledFields}/${totalFields} data points collected.`;

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: {
        status: 'COMPLETE',
        summary,
        confidenceScore,
      },
    });

    // Audit log - complete interview
    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_COMPLETE',
      resource: formatResource('interview', interview.id),
      metadata: { ideaId: interview.ideaId, confidenceScore, turnsUsed: interview.currentTurn },
    });

    // Update idea status to researching
    await ctx.prisma.idea.update({
      where: { id: interview.ideaId },
      data: { status: 'RESEARCHING' },
    });

    // Create research record and start pipeline
    const research = await ctx.prisma.research.create({
      data: {
        ideaId: interview.ideaId,
        status: 'IN_PROGRESS',
        currentPhase: 'QUERY_GENERATION',
        progress: 0,
        startedAt: new Date(),
      },
    });

    // Prepare research input
    const researchInput: ResearchInput = {
      ideaTitle: interview.idea.title,
      ideaDescription: interview.idea.description,
      interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
      interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
    };

    // Get user's subscription tier for AI parameters
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { subscription: true },
    });
    const userTier = user?.subscription ?? 'FREE';

    // Run pipeline in background (non-blocking)
    const researchId = research.id;
    const ideaId = interview.ideaId;
    const prisma = ctx.prisma;

    (async () => {
      try {
        const result = await runResearchPipeline(researchInput, async (phase, progress) => {
          await prisma.research.update({
            where: { id: researchId },
            data: {
              currentPhase: phase as 'QUEUED' | 'QUERY_GENERATION' | 'DATA_COLLECTION' | 'SYNTHESIS' | 'REPORT_GENERATION' | 'COMPLETE',
              progress,
            },
          });
        }, userTier);

        // Save final results
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
            ...(result.scores ? {
              opportunityScore: result.scores.opportunityScore,
              problemScore: result.scores.problemScore,
              feasibilityScore: result.scores.feasibilityScore,
              whyNowScore: result.scores.whyNowScore,
              scoreJustifications: result.scores.justifications as object,
              scoreMetadata: result.scores.metadata as object,
            } : {}),
            ...(result.metrics ? {
              revenuePotential: result.metrics.revenuePotential as object,
              executionDifficulty: result.metrics.executionDifficulty as object,
              gtmClarity: result.metrics.gtmClarity as object,
              founderFit: result.metrics.founderFit as object,
            } : {}),
            // New fields from extended pipeline
            ...(result.userStory ? { userStory: result.userStory as object } : {}),
            keywordTrends: result.keywordTrends as object[],
            ...(result.valueLadder ? { valueLadder: result.valueLadder as object[] } : {}),
            ...(result.actionPrompts ? { actionPrompts: result.actionPrompts as object[] } : {}),
            socialProof: result.socialProof as object,
          },
        });

        // Update idea status to complete
        await prisma.idea.update({
          where: { id: ideaId },
          data: { status: 'COMPLETE' },
        });
      } catch (error) {
        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorPhase: 'SYNTHESIS',
          },
        });
      }
    })();

    return updatedInterview;
  }),

  /**
   * Abandon an interview
   */
  abandon: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: { status: 'ABANDONED' },
    });

    // Audit log - abandon interview
    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_ABANDON',
      resource: formatResource('interview', interview.id),
      metadata: { ideaId: interview.ideaId, turnsCompleted: interview.currentTurn },
    });

    // Revert idea status to captured
    await ctx.prisma.idea.update({
      where: { id: interview.ideaId },
      data: { status: 'CAPTURED' },
    });

    return updatedInterview;
  }),

  /**
   * Mark interview as expired (called by background job)
   */
  markExpired: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const updatedInterview = await ctx.prisma.interview.update({
      where: { id: input.id },
      data: { isExpired: true },
    });

    return updatedInterview;
  }),

  /**
   * Update interview activity (heartbeat for idle detection)
   */
  heartbeat: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.prisma.interview.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
        status: 'IN_PROGRESS',
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Active interview not found',
      });
    }

    await ctx.prisma.interview.update({
      where: { id: input.id },
      data: { lastActiveAt: new Date() },
    });

    return { success: true };
  }),
});
