/**
 * Agent Router
 *
 * tRPC router for conversation CRUD and Agent Insight management.
 * The actual chat streaming happens via the Next.js API route (/api/agent/chat),
 * but conversation persistence and insight management go through tRPC.
 */

import { z } from 'zod';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { agentConversations, agentInsights, projects, reports } from '../db/schema';

export const agentRouter = router({
  /**
   * Get or create conversation for a project.
   * Each user has one conversation per project (unique constraint).
   */
  getConversation: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
        columns: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      const conversation = await ctx.db.query.agentConversations.findFirst({
        where: and(
          eq(agentConversations.projectId, input.projectId),
          eq(agentConversations.userId, ctx.userId),
        ),
      });

      return conversation ?? null;
    }),

  /**
   * Archive (clear) a conversation.
   */
  archiveConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.query.agentConversations.findFirst({
        where: and(
          eq(agentConversations.id, input.conversationId),
          eq(agentConversations.userId, ctx.userId),
        ),
      });

      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      await ctx.db
        .update(agentConversations)
        .set({ status: 'ARCHIVED' })
        .where(eq(agentConversations.id, input.conversationId));

      return { success: true };
    }),

  /**
   * Confirm and save an agent insight to a report.
   */
  confirmInsight: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        conversationId: z.string().min(1),
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(50000),
        prompt: z.string().max(10000),
        reportId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
        columns: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      // If reportId provided, verify it belongs to this project
      if (input.reportId) {
        const report = await ctx.db.query.reports.findFirst({
          where: and(
            eq(reports.id, input.reportId),
            eq(reports.projectId, input.projectId),
          ),
          columns: { id: true },
        });
        if (!report) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
        }
      }

      // Get current max order for this project's insights
      const maxOrderResult = await ctx.db
        .select({ maxOrder: sql<number>`coalesce(max(${agentInsights.order}), -1)` })
        .from(agentInsights)
        .where(eq(agentInsights.projectId, input.projectId));
      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      const [insight] = await ctx.db.insert(agentInsights).values({
        projectId: input.projectId,
        conversationId: input.conversationId,
        reportId: input.reportId ?? null,
        title: input.title,
        content: input.content,
        prompt: input.prompt,
        order: nextOrder,
      }).returning();

      return insight;
    }),

  /**
   * List insights for a project, optionally filtered by report.
   */
  listInsights: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        reportId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
        columns: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      const conditions = [eq(agentInsights.projectId, input.projectId)];
      if (input.reportId) {
        conditions.push(eq(agentInsights.reportId, input.reportId));
      }

      const insights = await ctx.db.query.agentInsights.findMany({
        where: and(...conditions),
        orderBy: [asc(agentInsights.order)],
      });

      return insights;
    }),

  /**
   * Delete an insight.
   */
  deleteInsight: protectedProcedure
    .input(z.object({ insightId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via project
      const insight = await ctx.db.query.agentInsights.findFirst({
        where: eq(agentInsights.id, input.insightId),
        with: {
          project: { columns: { userId: true } },
        },
      });

      if (!insight || insight.project.userId !== ctx.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Insight not found' });
      }

      await ctx.db.delete(agentInsights).where(eq(agentInsights.id, input.insightId));

      return { success: true };
    }),

  /**
   * Reorder insights by providing an ordered list of IDs.
   */
  reorderInsights: protectedProcedure
    .input(
      z.object({
        insightIds: z.array(z.string().min(1)).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update each insight's order based on its position in the array
      for (let i = 0; i < input.insightIds.length; i++) {
        await ctx.db
          .update(agentInsights)
          .set({ order: i })
          .where(eq(agentInsights.id, input.insightIds[i]));
      }

      return { success: true };
    }),
});
