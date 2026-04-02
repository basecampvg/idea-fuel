/**
 * Sandbox Router — CRUD + AI actions for note collections.
 *
 * Procedures:
 * - list:    Return user's sandboxes with note counts, sorted by updatedAt desc
 * - get:     Return sandbox + its pinned notes (ownership check)
 * - create:  Create new sandbox
 * - update:  Update sandbox name/color
 * - delete:  Delete sandbox (unpins notes via FK set null)
 */

import { eq, and, desc, count, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createSandboxSchema,
  updateSandboxSchema,
  deleteSandboxSchema,
  getSandboxSchema,
} from '@forge/shared';
import { sandboxes, notes } from '../db/schema';

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
});
