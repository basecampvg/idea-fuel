import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { generateReportSchema, updateReportSchema, paginationSchema } from '@forge/shared';
import { getReportTier, REPORT_TYPE_LABELS } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import type { ReportType, ReportTier } from '@prisma/client';

export const reportRouter = router({
  /**
   * List all reports for the current user
   */
  list: protectedProcedure.input(paginationSchema.optional()).query(async ({ ctx, input }) => {
    const { page = 1, limit = 20 } = input ?? {};
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      ctx.prisma.report.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          idea: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      ctx.prisma.report.count({ where: { userId: ctx.userId } }),
    ]);

    return {
      items: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  /**
   * List reports for a specific idea
   */
  listByIdea: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const reports = await ctx.prisma.report.findMany({
      where: {
        ideaId: input.ideaId,
        userId: ctx.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }),

  /**
   * Get a single report by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const report = await ctx.prisma.report.findFirst({
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

    if (!report) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    return report;
  }),

  /**
   * Generate a new report for an idea
   * Report tier is automatically determined by interview mode + subscription tier
   */
  generate: protectedProcedure.input(generateReportSchema).mutation(async ({ ctx, input }) => {
    // Verify idea ownership and get related data
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

    // Get user subscription tier
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { subscription: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    // Determine interview mode (default to LIGHT if no interview)
    const interviewMode = idea.interviews[0]?.mode ?? 'LIGHT';

    // Calculate report tier based on interview mode + subscription
    const reportTier = getReportTier(interviewMode, user.subscription) as ReportTier;

    // Get title from labels
    const title = REPORT_TYPE_LABELS[input.type] ?? input.type;

    // Check if report of this type already exists
    const existingReport = await ctx.prisma.report.findFirst({
      where: {
        ideaId: input.ideaId,
        type: input.type as ReportType,
        userId: ctx.userId,
      },
    });

    if (existingReport) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `A ${title} report already exists for this idea`,
      });
    }

    // Create report in generating state
    const report = await ctx.prisma.report.create({
      data: {
        type: input.type as ReportType,
        tier: reportTier,
        title,
        content: '', // Will be populated by AI
        sections: { included: [], locked: [] }, // Will be populated based on tier
        status: 'GENERATING',
        ideaId: input.ideaId,
        userId: ctx.userId,
      },
    });

    // TODO: Trigger BullMQ job to generate report content with AI
    // For now, we'll simulate with placeholder content
    const placeholderContent = `# ${title}\n\n**Tier:** ${reportTier}\n\nThis report is being generated. AI content generation will be implemented in the next phase.\n\n## Based on\n- Interview Mode: ${interviewMode}\n- Subscription: ${user.subscription}`;

    const updatedReport = await ctx.prisma.report.update({
      where: { id: report.id },
      data: {
        content: placeholderContent,
        status: 'COMPLETE',
        sections: {
          included: ['summary', 'analysis', 'recommendations'],
          locked: reportTier === 'FULL' ? [] : ['advanced-analytics', 'appendix'],
        },
      },
    });

    return updatedReport;
  }),

  /**
   * Regenerate a report (creates new version)
   */
  regenerate: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.report.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    // Update to generating state with incremented version
    const report = await ctx.prisma.report.update({
      where: { id: input.id },
      data: {
        status: 'GENERATING',
        version: existing.version + 1,
      },
    });

    // TODO: Trigger BullMQ job to regenerate report

    return report;
  }),

  /**
   * Update report content (manual edits)
   */
  update: protectedProcedure.input(updateReportSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.report.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    const report = await ctx.prisma.report.update({
      where: { id: input.id },
      data: {
        ...(input.content && { content: input.content }),
        ...(input.title && { title: input.title }),
        version: existing.version + 1,
      },
    });

    return report;
  }),

  /**
   * Delete a report
   */
  delete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.report.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    await ctx.prisma.report.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  /**
   * Generate all reports for an idea at once
   */
  generateAll: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    // Verify idea ownership
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

    // Check if research is complete
    if (!idea.research || idea.research.status !== 'COMPLETE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research must be complete before generating all reports',
      });
    }

    // TODO: Trigger BullMQ job to generate all 10 reports in parallel

    return {
      success: true,
      message: 'Report generation queued for all 10 report types',
    };
  }),
});
