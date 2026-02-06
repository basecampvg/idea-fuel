import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createProjectSchema, updateProjectSchema, updateCanvasSchema, paginationSchema } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { logAuditAsync, formatResource } from '../lib/audit';

export const projectRouter = router({
  /**
   * List all projects for the current user
   */
  list: protectedProcedure.input(paginationSchema.optional()).query(async ({ ctx, input }) => {
    const { page = 1, limit = 20 } = input ?? {};
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      ctx.prisma.project.findMany({
        where: { userId: ctx.userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          ideas: {
            select: {
              id: true,
              status: true,
              title: true,
            },
          },
          _count: {
            select: {
              ideas: true,
              snapshots: true,
            },
          },
        },
      }),
      ctx.prisma.project.count({ where: { userId: ctx.userId } }),
    ]);

    return {
      items: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  /**
   * Get a single project by ID with canvas, ideas, and snapshots
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
      include: {
        ideas: {
          include: {
            interviews: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                mode: true,
                status: true,
                currentTurn: true,
                maxTurns: true,
                confidenceScore: true,
                lastActiveAt: true,
                createdAt: true,
              },
            },
            reports: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                type: true,
                tier: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
            research: true,
          },
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_VIEW',
      resource: formatResource('project', project.id),
    });

    return project;
  }),

  /**
   * Create a new project with an empty canvas
   */
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.create({
      data: {
        title: input.title,
        description: input.description,
        canvas: [],
        userId: ctx.userId,
      },
    });

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_CREATE',
      resource: formatResource('project', project.id),
      metadata: { title: project.title },
    });

    return project;
  }),

  /**
   * Update project title/description
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateProjectSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const project = await ctx.prisma.project.update({
        where: { id: input.id },
        data: input.data,
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'PROJECT_UPDATE',
        resource: formatResource('project', project.id),
        metadata: { changes: input.data },
      });

      return project;
    }),

  /**
   * Update canvas blocks (auto-save target)
   */
  updateCanvas: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        ...updateCanvasSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const project = await ctx.prisma.project.update({
        where: { id: input.id },
        data: {
          canvas: input.blocks as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'CANVAS_UPDATE',
        resource: formatResource('project', project.id),
        metadata: { blockCount: input.blocks.length },
      });

      return project;
    }),

  /**
   * Delete a project (cascades to ideas, snapshots)
   */
  delete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.project.findFirst({
      where: { id: input.id, userId: ctx.userId },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    logAuditAsync({
      userId: ctx.userId,
      action: 'PROJECT_DELETE',
      resource: formatResource('project', input.id),
      metadata: { title: existing.title },
    });

    await ctx.prisma.project.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});
