/**
 * Sandbox Router — CRUD + AI actions for note collections.
 *
 * Procedures:
 * - list:              Return user's sandboxes with note counts, sorted by updatedAt desc
 * - get:               Return sandbox + its pinned notes (ownership check)
 * - create:            Create new sandbox
 * - update:            Update sandbox name/color
 * - delete:            Delete sandbox (unpins notes via FK set null)
 * - summarize:         AI summary of sandbox notes
 * - extractTodos:      AI extraction of action items from notes
 * - promoteToIdea:     AI synthesis into a new project
 * - identifyGaps:      AI identification of knowledge gaps in notes
 * - generateBrief:     AI generation of a structured brief from notes
 * - findContradictions: AI detection of contradictions across notes
 */

import { eq, and, desc, count, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createSandboxSchema,
  updateSandboxSchema,
  deleteSandboxSchema,
  getSandboxSchema,
  sandboxAiActionSchema,
  SANDBOX_MIN_NOTES_FOR_AI,
  SANDBOX_MIN_CHARS_FOR_AI,
} from '@forge/shared';
import { sandboxes, notes, projects } from '../db/schema';
import {
  summarizeSandbox,
  extractTodosFromSandbox,
  synthesizeIdea,
  identifyGaps,
  generateBrief,
  findContradictions,
} from '../services/sandbox-ai';

/** Fetch and validate sandbox notes for AI actions. Returns note contents array. */
async function getSandboxNotesForAi(
  db: any,
  sandboxId: string,
  userId: string,
): Promise<string[]> {
  const sandbox = await db.query.sandboxes.findFirst({
    where: and(eq(sandboxes.id, sandboxId), eq(sandboxes.userId, userId)),
    columns: { id: true },
  });

  if (!sandbox) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'SANDBOX_NOT_FOUND',
    });
  }

  const sandboxNotes = await db
    .select({ content: notes.content })
    .from(notes)
    .where(and(eq(notes.sandboxId, sandboxId), isNull(notes.promotedProjectId)));

  const contents = sandboxNotes
    .map((n: { content: string }) => n.content)
    .filter((c: string) => c.length > 0);

  if (contents.length < SANDBOX_MIN_NOTES_FOR_AI) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Need at least ${SANDBOX_MIN_NOTES_FOR_AI} notes with content for AI actions`,
    });
  }

  const totalChars = contents.reduce((sum: number, c: string) => sum + c.length, 0);
  if (totalChars < SANDBOX_MIN_CHARS_FOR_AI) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Need at least ${SANDBOX_MIN_CHARS_FOR_AI} total characters across notes for AI actions`,
    });
  }

  return contents;
}

export const sandboxRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select({
        id: sandboxes.id,
        name: sandboxes.name,
        color: sandboxes.color,
        userId: sandboxes.userId,
        createdAt: sandboxes.createdAt,
        updatedAt: sandboxes.updatedAt,
        noteCount: count(notes.id),
      })
      .from(sandboxes)
      .leftJoin(notes, and(eq(notes.sandboxId, sandboxes.id), isNull(notes.promotedProjectId)))
      .where(eq(sandboxes.userId, ctx.userId))
      .groupBy(sandboxes.id)
      .orderBy(desc(sandboxes.updatedAt));

    return results;
  }),

  get: protectedProcedure
    .input(getSandboxSchema)
    .query(async ({ ctx, input }) => {
      const sandbox = await ctx.db.query.sandboxes.findFirst({
        where: and(eq(sandboxes.id, input.id), eq(sandboxes.userId, ctx.userId)),
      });

      if (!sandbox) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SANDBOX_NOT_FOUND',
        });
      }

      const sandboxNotes = await ctx.db
        .select()
        .from(notes)
        .where(and(eq(notes.sandboxId, input.id), isNull(notes.promotedProjectId)))
        .orderBy(desc(notes.updatedAt));

      return { ...sandbox, notes: sandboxNotes };
    }),

  create: protectedProcedure
    .input(createSandboxSchema)
    .mutation(async ({ ctx, input }) => {
      const [sandbox] = await ctx.db
        .insert(sandboxes)
        .values({
          name: input.name,
          color: input.color ?? null,
          userId: ctx.userId,
        })
        .returning();

      if (!sandbox) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create sandbox',
        });
      }

      return sandbox;
    }),

  update: protectedProcedure
    .input(updateSandboxSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.sandboxes.findFirst({
        where: and(eq(sandboxes.id, input.id), eq(sandboxes.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SANDBOX_NOT_FOUND',
        });
      }

      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.color !== undefined) updates.color = input.color;

      await ctx.db
        .update(sandboxes)
        .set(updates)
        .where(eq(sandboxes.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(deleteSandboxSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.sandboxes.findFirst({
        where: and(eq(sandboxes.id, input.id), eq(sandboxes.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SANDBOX_NOT_FOUND',
        });
      }

      // FK set null handles unpinning notes automatically
      await ctx.db.delete(sandboxes).where(eq(sandboxes.id, input.id));

      return { success: true };
    }),

  summarize: protectedProcedure
    .input(sandboxAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getSandboxNotesForAi(ctx.db, input.id, ctx.userId);
      try {
        const summary = await summarizeSandbox(contents);
        return { summary };
      } catch (error) {
        console.error('[SandboxRouter] Summarize failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'SUMMARIZE_FAILED', cause: error });
      }
    }),

  extractTodos: protectedProcedure
    .input(sandboxAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getSandboxNotesForAi(ctx.db, input.id, ctx.userId);
      try {
        const todos = await extractTodosFromSandbox(contents);
        return { todos };
      } catch (error) {
        console.error('[SandboxRouter] ExtractTodos failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'EXTRACT_TODOS_FAILED', cause: error });
      }
    }),

  promoteToIdea: protectedProcedure
    .input(sandboxAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getSandboxNotesForAi(ctx.db, input.id, ctx.userId);
      try {
        const idea = await synthesizeIdea(contents);
        const [project] = await ctx.db
          .insert(projects)
          .values({
            title: idea.title,
            description: idea.description,
            userId: ctx.userId,
          })
          .returning({ id: projects.id });

        if (!project) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create project' });
        }

        return { projectId: project.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[SandboxRouter] PromoteToIdea failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PROMOTE_FAILED', cause: error });
      }
    }),

  identifyGaps: protectedProcedure
    .input(sandboxAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getSandboxNotesForAi(ctx.db, input.id, ctx.userId);
      try {
        const gaps = await identifyGaps(contents);
        return { gaps };
      } catch (error) {
        console.error('[SandboxRouter] IdentifyGaps failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'IDENTIFY_GAPS_FAILED', cause: error });
      }
    }),

  generateBrief: protectedProcedure
    .input(sandboxAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getSandboxNotesForAi(ctx.db, input.id, ctx.userId);
      try {
        const brief = await generateBrief(contents);
        return { brief };
      } catch (error) {
        console.error('[SandboxRouter] GenerateBrief failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'GENERATE_BRIEF_FAILED', cause: error });
      }
    }),

  findContradictions: protectedProcedure
    .input(sandboxAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getSandboxNotesForAi(ctx.db, input.id, ctx.userId);
      try {
        const contradictions = await findContradictions(contents);
        return { contradictions };
      } catch (error) {
        console.error('[SandboxRouter] FindContradictions failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'FIND_CONTRADICTIONS_FAILED', cause: error });
      }
    }),
});
