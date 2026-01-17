import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createDocumentSchema, paginationSchema } from '@forge/shared';
import { TRPCError } from '@trpc/server';

export const documentRouter = router({
  /**
   * List all documents for the current user
   */
  list: protectedProcedure.input(paginationSchema.optional()).query(async ({ ctx, input }) => {
    const { page = 1, limit = 20 } = input ?? {};
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      ctx.prisma.document.findMany({
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
      ctx.prisma.document.count({ where: { userId: ctx.userId } }),
    ]);

    return {
      items: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }),

  /**
   * List documents for a specific idea
   */
  listByIdea: protectedProcedure.input(z.object({ ideaId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const documents = await ctx.prisma.document.findMany({
      where: {
        ideaId: input.ideaId,
        userId: ctx.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  }),

  /**
   * Get a single document by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const document = await ctx.prisma.document.findFirst({
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

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    return document;
  }),

  /**
   * Generate a new document for an idea
   * This will trigger the AI document generation process
   */
  generate: protectedProcedure.input(createDocumentSchema).mutation(async ({ ctx, input }) => {
    // Verify idea ownership
    const idea = await ctx.prisma.idea.findFirst({
      where: {
        id: input.ideaId,
        userId: ctx.userId,
      },
      include: {
        research: true,
        interviews: {
          where: { status: 'COMPLETE' },
        },
      },
    });

    if (!idea) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Idea not found',
      });
    }

    // Create document in generating state
    const document = await ctx.prisma.document.create({
      data: {
        type: input.type,
        title: input.title,
        content: '', // Will be populated by AI
        status: 'GENERATING',
        ideaId: input.ideaId,
        userId: ctx.userId,
      },
    });

    // TODO: Trigger BullMQ job to generate document content with AI
    // For now, we'll simulate with placeholder content
    const placeholderContent = `# ${input.title}\n\nThis document is being generated. AI content generation will be implemented in the next phase.`;

    const updatedDocument = await ctx.prisma.document.update({
      where: { id: document.id },
      data: {
        content: placeholderContent,
        status: 'COMPLETE',
      },
    });

    return updatedDocument;
  }),

  /**
   * Update document content
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        content: z.string(),
        title: z.string().min(1).max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.document.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      const document = await ctx.prisma.document.update({
        where: { id: input.id },
        data: {
          content: input.content,
          title: input.title,
          version: existing.version + 1,
        },
      });

      return document;
    }),

  /**
   * Delete a document
   */
  delete: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.document.findFirst({
      where: {
        id: input.id,
        userId: ctx.userId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    await ctx.prisma.document.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});
