import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { INTERVIEW_SESSION, INTERVIEW_RESUME_MESSAGES } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints, InterviewMode } from '@forge/shared';
import { interviews, projects, research, users } from '../db/schema';
import { db } from '../db/drizzle';
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
  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const interview = await ctx.db.query.interviews.findFirst({
      where: and(eq(interviews.id, input.id), eq(interviews.userId, ctx.userId)),
      with: {
        project: {
          columns: {
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
   * List interviews for a project
   */
  listByProject: protectedProcedure.input(z.object({ projectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const results = await ctx.db.query.interviews.findMany({
      where: and(eq(interviews.projectId, input.projectId), eq(interviews.userId, ctx.userId)),
      orderBy: desc(interviews.createdAt),
    });

    return results;
  }),

  /**
   * Get active (in-progress) interviews for the user
   * Useful for showing "Continue Interview" prompts
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db.query.interviews.findMany({
      where: and(
        eq(interviews.userId, ctx.userId),
        eq(interviews.status, 'IN_PROGRESS'),
        eq(interviews.isExpired, false),
      ),
      with: {
        project: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: desc(interviews.lastActiveAt),
    });

    return results;
  }),

  /**
   * Resume an interview - returns resume state with appropriate greeting
   */
  resume: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const interview = await ctx.db.query.interviews.findFirst({
      where: and(eq(interviews.id, input.id), eq(interviews.userId, ctx.userId)),
      with: {
        project: {
          columns: {
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
        metadata: { projectId: interview.projectId, timeSinceLastActive },
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
        interviewId: z.string().uuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.interviews.findFirst({
        where: and(eq(interviews.id, input.interviewId), eq(interviews.userId, ctx.userId)),
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
      const [updatedInterview] = await ctx.db
        .update(interviews)
        .set({
          messages: [...messages, newMessage],
          lastActiveAt: now,
          lastMessageAt: now,
          currentTurn: interview.currentTurn + 1,
        })
        .where(eq(interviews.id, input.interviewId))
        .returning();

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
        interviewId: z.string().uuid(),
        content: z.string().min(1),
        collectedData: z.record(z.string(), z.unknown()).optional(),
        resumeContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.query.interviews.findFirst({
        where: and(eq(interviews.id, input.interviewId), eq(interviews.userId, ctx.userId)),
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

      const [updatedInterview] = await ctx.db
        .update(interviews)
        .set({
          messages: [...messages, newMessage],
          collectedData: mergedData,
          ...(input.resumeContext && { resumeContext: input.resumeContext }),
        })
        .where(eq(interviews.id, input.interviewId))
        .returning();

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
        interviewId: z.string().uuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get interview with project context
      const interview = await ctx.db.query.interviews.findFirst({
        where: and(eq(interviews.id, input.interviewId), eq(interviews.userId, ctx.userId)),
        with: {
          project: {
            columns: {
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
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { subscription: true },
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
        interview.project.title,
        interview.project.description,
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
      const [updated] = await ctx.db
        .update(interviews)
        .set({
          messages,
          collectedData: mergedData,
          currentTurn: currentTurn + 1,
          lastActiveAt: now,
          lastMessageAt: now,
          resumeContext,
        })
        .where(eq(interviews.id, input.interviewId))
        .returning();

      // Return with project relation attached
      const updatedInterview = { ...updated, project: interview.project };

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
  complete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.db.query.interviews.findFirst({
      where: and(eq(interviews.id, input.id), eq(interviews.userId, ctx.userId)),
      with: { project: true },
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

    const [updatedInterview] = await ctx.db
      .update(interviews)
      .set({ status: 'COMPLETE', summary, confidenceScore })
      .where(eq(interviews.id, input.id))
      .returning();

    // Audit log - complete interview
    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_COMPLETE',
      resource: formatResource('interview', interview.id),
      metadata: { projectId: interview.projectId, confidenceScore, turnsUsed: interview.currentTurn },
    });

    // Update project status to researching
    await ctx.db.update(projects).set({ status: 'RESEARCHING' }).where(eq(projects.id, interview.projectId));

    // Create research record and start pipeline
    const [researchRecord] = await ctx.db.insert(research).values({
      projectId: interview.projectId,
      status: 'IN_PROGRESS',
      currentPhase: 'DEEP_RESEARCH',
      progress: 0,
      startedAt: new Date(),
      notesSnapshot: interview.project.notes,
    }).returning();

    // Prepare research input
    const researchInput: ResearchInput = {
      ideaTitle: interview.project.title,
      ideaDescription: interview.project.description,
      interviewData: interview.collectedData as Partial<InterviewDataPoints> | null,
      interviewMessages: (interview.messages as unknown as ChatMessage[]) || [],
    };

    // Get user's subscription tier for AI parameters
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { subscription: true },
    });
    const userTier = user?.subscription ?? 'FREE';

    // Run pipeline in background (non-blocking)
    // Use module-level db import for background work (ctx may be garbage collected)
    const researchId = researchRecord.id;
    const projectId = interview.projectId;

    (async () => {
      // Track current phase for accurate error reporting
      let currentPhase: 'QUEUED' | 'DEEP_RESEARCH' | 'SOCIAL_RESEARCH' | 'SYNTHESIS' | 'REPORT_GENERATION' | 'BUSINESS_PLAN_GENERATION' | 'COMPLETE' = 'DEEP_RESEARCH';

      try {
        const result = await runResearchPipeline(researchInput, async (phase, progress) => {
          currentPhase = phase as typeof currentPhase;
          await db
            .update(research)
            .set({ currentPhase: phase as typeof currentPhase, progress })
            .where(eq(research.id, researchId));
        }, userTier);

        // Save final results
        await db
          .update(research)
          .set({
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
            ...(result.userStory ? { userStory: result.userStory as object } : {}),
            keywordTrends: result.keywordTrends as object[],
            ...(result.valueLadder ? { valueLadder: result.valueLadder as object[] } : {}),
            ...(result.actionPrompts ? { actionPrompts: result.actionPrompts as object[] } : {}),
            socialProof: result.socialProof as object,
          })
          .where(eq(research.id, researchId));

        // Update project status to complete
        await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, projectId));
      } catch (error) {
        await db
          .update(research)
          .set({
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorPhase: currentPhase,
          })
          .where(eq(research.id, researchId));
        // Reset project status so user isn't stuck in RESEARCHING
        await db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, projectId)).catch(() => {}); // Best-effort
      }
    })();

    return updatedInterview;
  }),

  /**
   * Abandon an interview
   */
  abandon: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.db.query.interviews.findFirst({
      where: and(eq(interviews.id, input.id), eq(interviews.userId, ctx.userId)),
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const [updatedInterview] = await ctx.db
      .update(interviews)
      .set({ status: 'ABANDONED' })
      .where(eq(interviews.id, input.id))
      .returning();

    // Audit log - abandon interview
    logAuditAsync({
      userId: ctx.userId,
      action: 'INTERVIEW_ABANDON',
      resource: formatResource('interview', interview.id),
      metadata: { projectId: interview.projectId, turnsCompleted: interview.currentTurn },
    });

    // Revert project status to captured (only if still interviewing, not if research started)
    await ctx.db
      .update(projects)
      .set({ status: 'CAPTURED' })
      .where(and(eq(projects.id, interview.projectId), eq(projects.status, 'INTERVIEWING')));

    return updatedInterview;
  }),

  /**
   * Mark interview as expired (called by background job)
   */
  markExpired: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.db.query.interviews.findFirst({
      where: and(eq(interviews.id, input.id), eq(interviews.userId, ctx.userId)),
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    const [updatedInterview] = await ctx.db
      .update(interviews)
      .set({ isExpired: true })
      .where(eq(interviews.id, input.id))
      .returning();

    return updatedInterview;
  }),

  /**
   * Update interview activity (heartbeat for idle detection)
   */
  heartbeat: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const interview = await ctx.db.query.interviews.findFirst({
      where: and(
        eq(interviews.id, input.id),
        eq(interviews.userId, ctx.userId),
        eq(interviews.status, 'IN_PROGRESS'),
      ),
    });

    if (!interview) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Active interview not found',
      });
    }

    await ctx.db
      .update(interviews)
      .set({ lastActiveAt: new Date() })
      .where(eq(interviews.id, input.id));

    return { success: true };
  }),
});
