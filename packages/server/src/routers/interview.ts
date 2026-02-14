import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { INTERVIEW_SESSION, INTERVIEW_RESUME_MESSAGES } from '@forge/shared';
import type { ChatMessage, InterviewDataPoints, InterviewMode } from '@forge/shared';
import { interviews, projects, research, users } from '../db/schema';
import {
  generateNextQuestion,
  extractDataPoints,
  mergeCollectedData,
  generateResumeContext,
} from '../services/interview-ai';
import { logAuditAsync, formatResource } from '../lib/audit';
import { enqueueResearchPipeline } from '../jobs';

export const interviewRouter = router({
  /**
   * Get an interview by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
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
  listByProject: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.interviews.findMany({
        where: and(eq(interviews.projectId, input.projectId), eq(interviews.userId, ctx.userId)),
        orderBy: desc(interviews.createdAt),
        limit: input.limit,
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
  resume: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
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
        interviewId: z.string().min(1),
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
        interviewId: z.string().min(1),
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
        interviewId: z.string().min(1),
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
              notes: true,
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

      // 4. Run extraction + question generation in PARALLEL for speed
      // Question gen uses pre-merge data (safe — scripted questions follow fixed order,
      // and dynamic gap-fill with slightly stale data has negligible impact)
      const existingData = (interview.collectedData as Partial<InterviewDataPoints>) || {};

      const [extractedData, { text: aiResponse, isClosing }] = await Promise.all([
        extractDataPoints(input.content, conversationContext, existingData, tier),
        generateNextQuestion(
          interview.project.title,
          interview.project.description,
          interview.mode as InterviewMode,
          messages,
          existingData,
          currentTurn + 1,
          interview.maxTurns,
          tier
        ),
      ]);

      const mergedData = mergeCollectedData(existingData, extractedData, currentTurn + 1);

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

      // 9. Auto-complete if this was the closing turn
      if (isClosing) {
        const filledFields = Object.values(mergedData).filter((v) => v !== null && v !== undefined).length;
        const totalFields = 42;
        const confidenceScore = Math.min(100, Math.round((filledFields / totalFields) * 100));
        const summary = `Interview completed with ${currentTurn + 1} turns. ${filledFields}/${totalFields} data points collected.`;

        const [completedInterview] = await ctx.db
          .update(interviews)
          .set({ status: 'COMPLETE', summary, confidenceScore })
          .where(eq(interviews.id, input.interviewId))
          .returning();

        logAuditAsync({
          userId: ctx.userId,
          action: 'INTERVIEW_COMPLETE',
          resource: formatResource('interview', interview.id),
          metadata: { projectId: interview.projectId, confidenceScore, turnsUsed: currentTurn + 1 },
        });

        // Update project status to researching
        await ctx.db.update(projects).set({ status: 'RESEARCHING' }).where(eq(projects.id, interview.projectId));

        // Create or update research record (handles re-runs after previous failure)
        const existingChatResearch = await ctx.db.query.research.findFirst({
          where: eq(research.projectId, interview.projectId),
        });

        let chatResearchRecord;
        if (existingChatResearch) {
          const [updated] = await ctx.db.update(research).set({
            status: 'IN_PROGRESS',
            currentPhase: 'DEEP_RESEARCH',
            progress: 0,
            errorMessage: null,
            errorPhase: null,
            retryCount: existingChatResearch.retryCount + 1,
            startedAt: new Date(),
            completedAt: null,
            notesSnapshot: interview.project.notes,
          }).where(eq(research.id, existingChatResearch.id)).returning();
          chatResearchRecord = updated;
        } else {
          const [created] = await ctx.db.insert(research).values({
            projectId: interview.projectId,
            status: 'IN_PROGRESS',
            currentPhase: 'DEEP_RESEARCH',
            progress: 0,
            startedAt: new Date(),
            notesSnapshot: interview.project.notes,
          }).returning();
          chatResearchRecord = created;
        }

        // Queue research pipeline job via BullMQ (processed by worker, survives Vercel timeout)
        try {
          await enqueueResearchPipeline({
            researchId: chatResearchRecord.id,
            projectId: interview.projectId,
            userId: ctx.userId,
            interviewId: input.interviewId,
          });
        } catch (queueError) {
          console.error('[Interview.chat] Failed to queue research pipeline:', queueError);
          await ctx.db.update(research).set({
            status: 'FAILED',
            errorMessage: 'Failed to queue research pipeline. Please try again.',
            errorPhase: 'QUEUED',
          }).where(eq(research.id, chatResearchRecord.id));
          await ctx.db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, interview.projectId)).catch(() => {});
        }

        return {
          interview: { ...completedInterview, project: interview.project },
          userMessage,
          assistantMessage,
          extractedData: Object.keys(extractedData),
        };
      }

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
  complete: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
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

    // Create or update research record (handles re-runs after previous failure)
    const existingResearch = await ctx.db.query.research.findFirst({
      where: eq(research.projectId, interview.projectId),
    });

    let researchRecord;
    if (existingResearch) {
      const [updated] = await ctx.db.update(research).set({
        status: 'IN_PROGRESS',
        currentPhase: 'DEEP_RESEARCH',
        progress: 0,
        errorMessage: null,
        errorPhase: null,
        retryCount: existingResearch.retryCount + 1,
        startedAt: new Date(),
        completedAt: null,
        notesSnapshot: interview.project.notes,
        // Clear Spark fields from previous validation run
        sparkStatus: null,
        sparkKeywords: null,
        sparkResult: null,
        sparkStartedAt: null,
        sparkCompletedAt: null,
        sparkError: null,
      }).where(eq(research.id, existingResearch.id)).returning();
      researchRecord = updated;
    } else {
      const [created] = await ctx.db.insert(research).values({
        projectId: interview.projectId,
        status: 'IN_PROGRESS',
        currentPhase: 'DEEP_RESEARCH',
        progress: 0,
        startedAt: new Date(),
        notesSnapshot: interview.project.notes,
      }).returning();
      researchRecord = created;
    }

    // Queue research pipeline job via BullMQ (processed by worker, survives Vercel timeout)
    try {
      await enqueueResearchPipeline({
        researchId: researchRecord.id,
        projectId: interview.projectId,
        userId: ctx.userId,
        interviewId: input.id,
      });
    } catch (queueError) {
      console.error('[Interview.complete] Failed to queue research pipeline:', queueError);
      await ctx.db.update(research).set({
        status: 'FAILED',
        errorMessage: 'Failed to queue research pipeline. Please try again.',
        errorPhase: 'QUEUED',
      }).where(eq(research.id, researchRecord.id));
      await ctx.db.update(projects).set({ status: 'CAPTURED' }).where(eq(projects.id, interview.projectId)).catch(() => {});
    }

    return updatedInterview;
  }),

  /**
   * Abandon an interview
   */
  abandon: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
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
  markExpired: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
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
  heartbeat: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
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
