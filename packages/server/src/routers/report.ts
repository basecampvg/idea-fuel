import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { generateReportSchema, updateReportSchema, paginationSchema } from '@forge/shared';
import { getReportTier, REPORT_TYPE_LABELS } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { reports, projects, users, interviews } from '../db/schema';
import type { ReportType, ReportTier } from '../db/schema';
import { generatePDFBuffer, getPDFFilename } from '../lib/pdf';
import { logAuditAsync, formatResource } from '../lib/audit';
import { enqueueReportGeneration } from '../jobs';

export const reportRouter = router({
  /**
   * List all reports for the current user
   */
  list: protectedProcedure.input(paginationSchema.optional()).query(async ({ ctx, input }) => {
    const { page = 1, limit = 20 } = input ?? {};
    const skip = (page - 1) * limit;

    const [items, [{ value: total }]] = await Promise.all([
      ctx.db.query.reports.findMany({
        where: eq(reports.userId, ctx.userId),
        orderBy: desc(reports.createdAt),
        offset: skip,
        limit,
        with: {
          project: {
            columns: {
              id: true,
              title: true,
            },
          },
        },
      }),
      ctx.db.select({ value: count() }).from(reports).where(eq(reports.userId, ctx.userId)),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  /**
   * List reports for a specific project
   */
  listByProject: protectedProcedure.input(z.object({ projectId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const results = await ctx.db.query.reports.findMany({
      where: and(eq(reports.projectId, input.projectId), eq(reports.userId, ctx.userId)),
      orderBy: desc(reports.createdAt),
    });

    return results;
  }),

  /**
   * Get a single report by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const report = await ctx.db.query.reports.findFirst({
      where: and(eq(reports.id, input.id), eq(reports.userId, ctx.userId)),
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

    if (!report) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    // Audit log - view report
    logAuditAsync({
      userId: ctx.userId,
      action: 'REPORT_VIEW',
      resource: formatResource('report', report.id),
      metadata: { reportType: report.type, projectId: report.projectId },
    });

    return report;
  }),

  /**
   * Generate a new report for a project
   * Report tier is automatically determined by interview mode + subscription tier
   */
  generate: protectedProcedure.input(generateReportSchema).mutation(async ({ ctx, input }) => {
    // Verify project ownership and get related data
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      with: {
        research: true,
        interviews: {
          where: eq(interviews.status, 'COMPLETE'),
          orderBy: desc(interviews.createdAt),
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

    // Get user subscription tier
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { subscription: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    // Determine interview mode (default to LIGHT if no interview)
    const interviewMode = project.interviews[0]?.mode ?? 'LIGHT';

    // Calculate report tier based on interview mode + subscription
    const reportTier = getReportTier(interviewMode, user.subscription) as ReportTier;

    // Get title from labels
    const title = REPORT_TYPE_LABELS[input.type] ?? input.type;

    // Check if report of this type already exists
    const existingReport = await ctx.db.query.reports.findFirst({
      where: and(
        eq(reports.projectId, input.projectId),
        eq(reports.type, input.type as ReportType),
        eq(reports.userId, ctx.userId),
      ),
    });

    if (existingReport) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `A ${title} report already exists for this project`,
      });
    }

    // Create report in generating state
    const [report] = await ctx.db.insert(reports).values({
      type: input.type as ReportType,
      tier: reportTier,
      title,
      content: '',
      sections: { included: [], locked: [] },
      status: 'GENERATING',
      projectId: input.projectId,
      userId: ctx.userId,
    }).returning();

    // Queue report generation job
    try {
      await enqueueReportGeneration({
        reportId: report.id,
        projectId: input.projectId,
        userId: ctx.userId,
        reportType: input.type,
        tier: reportTier,
      });
    } catch (queueError) {
      // If queue fails, log error but don't fail the request
      // The report is created in GENERATING state, user can retry
      console.error('[Report] Failed to queue generation:', queueError);
    }

    // Audit log - generate report
    logAuditAsync({
      userId: ctx.userId,
      action: 'REPORT_GENERATE',
      resource: formatResource('report', report.id),
      metadata: { reportType: input.type, tier: reportTier, projectId: input.projectId, queued: true },
    });

    return report;
  }),

  /**
   * Regenerate a report (creates new version)
   */
  regenerate: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.reports.findFirst({
      where: and(eq(reports.id, input.id), eq(reports.userId, ctx.userId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    // Update to generating state with incremented version
    const [report] = await ctx.db
      .update(reports)
      .set({
        status: 'GENERATING',
        version: existing.version + 1,
      })
      .where(eq(reports.id, input.id))
      .returning();

    // Queue report regeneration job
    try {
      await enqueueReportGeneration({
        reportId: report.id,
        projectId: existing.projectId,
        userId: ctx.userId,
        reportType: existing.type,
        tier: existing.tier,
      });
    } catch (queueError) {
      console.error('[Report] Failed to queue regeneration:', queueError);
    }

    return report;
  }),

  /**
   * Update report content (manual edits)
   */
  update: protectedProcedure.input(updateReportSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.reports.findFirst({
      where: and(eq(reports.id, input.id), eq(reports.userId, ctx.userId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    const [report] = await ctx.db
      .update(reports)
      .set({
        ...(input.content && { content: input.content }),
        ...(input.title && { title: input.title }),
        version: existing.version + 1,
      })
      .where(eq(reports.id, input.id))
      .returning();

    return report;
  }),

  /**
   * Delete a report
   */
  delete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.reports.findFirst({
      where: and(eq(reports.id, input.id), eq(reports.userId, ctx.userId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      });
    }

    await ctx.db.delete(reports).where(eq(reports.id, input.id));

    return { success: true };
  }),

  /**
   * Generate all reports for a project at once
   */
  generateAll: protectedProcedure.input(z.object({ projectId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    // Verify project ownership
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      with: {
        research: true,
        interviews: {
          where: eq(interviews.status, 'COMPLETE'),
          orderBy: desc(interviews.createdAt),
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

    // Check if research is complete
    if (!project.research || project.research.status !== 'COMPLETE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Research must be complete before generating all reports',
      });
    }

    // Get user subscription for tier calculation
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { subscription: true },
    });

    // Get latest interview mode
    const interviewMode = project.interviews[0]?.mode ?? 'LIGHT';
    const reportTier = getReportTier(interviewMode, user?.subscription ?? 'FREE') as ReportTier;

    // Create and queue all report types
    const reportTypes = Object.keys(REPORT_TYPE_LABELS);
    const createdReports = [];
    const queuedCount = { success: 0, failed: 0 };

    for (const reportType of reportTypes) {
      // Check if report already exists
      const existing = await ctx.db.query.reports.findFirst({
        where: and(
          eq(reports.projectId, input.projectId),
          eq(reports.type, reportType as ReportType),
          eq(reports.userId, ctx.userId),
        ),
      });

      if (existing) {
        continue; // Skip existing reports
      }

      const title = REPORT_TYPE_LABELS[reportType] ?? reportType;

      // Create report in generating state
      const [report] = await ctx.db.insert(reports).values({
        type: reportType as ReportType,
        tier: reportTier,
        title,
        content: '',
        sections: { included: [], locked: [] },
        status: 'GENERATING',
        projectId: input.projectId,
        userId: ctx.userId,
      }).returning();

      createdReports.push(report);

      // Queue generation job
      try {
        await enqueueReportGeneration({
          reportId: report.id,
          projectId: input.projectId,
          userId: ctx.userId,
          reportType,
          tier: reportTier,
        });
        queuedCount.success++;
      } catch (queueError) {
        console.error(`[Report] Failed to queue ${reportType}:`, queueError);
        queuedCount.failed++;
      }
    }

    return {
      success: true,
      message: `Queued ${queuedCount.success} reports for generation`,
      created: createdReports.length,
      queued: queuedCount.success,
      failed: queuedCount.failed,
    };
  }),

  /**
   * Generate PDF for a report
   * Returns base64-encoded PDF data and filename
   */
  downloadPDF: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        reportType: z.enum([
          'BUSINESS_PLAN',
          'POSITIONING',
          'COMPETITIVE_ANALYSIS',
          'WHY_NOW',
          'PROOF_SIGNALS',
          'KEYWORDS_SEO',
          'CUSTOMER_PROFILE',
          'VALUE_EQUATION',
          'VALUE_LADDER',
          'GO_TO_MARKET',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get project with research data
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: { research: true },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Get or create report for this type
      let report = await ctx.db.query.reports.findFirst({
        where: and(
          eq(reports.projectId, input.projectId),
          eq(reports.type, input.reportType as ReportType),
          eq(reports.userId, ctx.userId),
        ),
      });

      // If no report exists, create a basic one
      if (!report) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.userId),
          columns: { subscription: true },
        });

        const interviewMode = 'LIGHT'; // Default
        const reportTier = getReportTier(interviewMode, user?.subscription ?? 'FREE') as ReportTier;
        const title = REPORT_TYPE_LABELS[input.reportType] ?? input.reportType;

        [report] = await ctx.db.insert(reports).values({
          type: input.reportType as ReportType,
          tier: reportTier,
          title,
          content: JSON.stringify({
            executiveSummary: project.description,
          }),
          sections: { included: ['summary'], locked: [] },
          status: 'COMPLETE',
          projectId: input.projectId,
          userId: ctx.userId,
        }).returning();
      }

      // Generate PDF
      try {
        const pdfBuffer = await generatePDFBuffer({
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
          },
          report: {
            id: report.id,
            type: report.type as ReportType,
            tier: report.tier as ReportTier,
            title: report.title,
            content: report.content,
            sections: report.sections,
          },
          research: project.research ?? null,
        });

        const filename = getPDFFilename(project.title, input.reportType);

        // Audit log - download PDF
        logAuditAsync({
          userId: ctx.userId,
          action: 'REPORT_DOWNLOAD',
          resource: formatResource('report', report.id),
          metadata: { reportType: input.reportType, projectId: input.projectId, filename },
        });

        return {
          success: true,
          filename,
          contentType: 'application/pdf',
          data: pdfBuffer.toString('base64'),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate PDF: ${errorMessage}`,
        });
      }
    }),
});
