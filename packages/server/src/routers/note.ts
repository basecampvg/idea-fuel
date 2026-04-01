/**
 * Note Router — CRUD + AI refinement + promote-to-project
 *
 * Procedures:
 * - list:    Return user's notes sorted by updatedAt desc
 * - get:     Return single note by id (ownership check)
 * - create:  Insert empty note for user, return it
 * - update:  Update content by id (ownership check)
 * - delete:  Delete by id (ownership check), return success
 * - refine:  Read note content, validate >= 50 chars, call refineNote(), save + return
 * - promote: Read note refinement, create project + update note atomically, return projectId
 */

import { eq, and, desc, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  createNoteSchema,
  updateNoteSchema,
  refineNoteSchema,
  promoteNoteSchema,
  deleteNoteSchema,
  extractIdeasSchema,
  NOTE_REFINE_MIN_CHARS,
  NOTE_EXTRACT_MIN_CHARS,
} from '@forge/shared';
import { notes, projects, users } from '../db/schema';
import { refineNote, extractIdeasFromNote } from '../services/note-ai';

export const noteRouter = router({
  /**
   * List all notes for the current user, sorted by updatedAt desc.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, ctx.userId), isNull(notes.promotedProjectId)))
      .orderBy(desc(notes.updatedAt));

    return results;
  }),

  /**
   * Get a single note by id (ownership check).
   */
  get: protectedProcedure
    .input(refineNoteSchema) // { id: string } — reuse the same shape
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.query.notes.findFirst({
        where: and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)),
      });

      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'NOTE_NOT_FOUND',
        });
      }

      return note;
    }),

  /**
   * Create a new empty note for the user.
   */
  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const [note] = await ctx.db
        .insert(notes)
        .values({
          userId: ctx.userId,
          type: input.type ?? 'AI',
        })
        .returning();

      if (!note) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create note',
        });
      }

      return note;
    }),

  /**
   * Update note content by id (ownership check).
   */
  update: protectedProcedure
    .input(updateNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.notes.findFirst({
        where: and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'NOTE_NOT_FOUND',
        });
      }

      await ctx.db
        .update(notes)
        .set({ content: input.content })
        .where(eq(notes.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a note by id (ownership check).
   */
  delete: protectedProcedure
    .input(deleteNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.notes.findFirst({
        where: and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'NOTE_NOT_FOUND',
        });
      }

      await ctx.db.delete(notes).where(eq(notes.id, input.id));

      return { success: true };
    }),

  /**
   * Refine a note using AI.
   * Reads note content, validates >= 50 chars, calls Haiku, saves results.
   */
  refine: protectedProcedure
    .input(refineNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.query.notes.findFirst({
        where: and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)),
        columns: { id: true, content: true, lastRefinedAt: true },
      });

      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'NOTE_NOT_FOUND',
        });
      }

      // Enforce 60-second cooldown between refinements (SUPER_ADMIN bypasses)
      const REFINE_COOLDOWN_MS = 60_000;
      const caller = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { role: true },
      });
      if (caller?.role !== 'SUPER_ADMIN' && note.lastRefinedAt) {
        const elapsed = Date.now() - new Date(note.lastRefinedAt).getTime();
        if (elapsed < REFINE_COOLDOWN_MS) {
          const retryAfter = Math.ceil((REFINE_COOLDOWN_MS - elapsed) / 1000);
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `REFINE_COOLDOWN:${retryAfter}`,
          });
        }
      }

      if (note.content.length < NOTE_REFINE_MIN_CHARS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Note must be at least ${NOTE_REFINE_MIN_CHARS} characters to refine`,
        });
      }

      let refinement;
      try {
        refinement = await refineNote(note.content);
      } catch (error) {
        console.error('[NoteRouter] Refinement failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'REFINEMENT_FAILED',
          cause: error,
        });
      }

      // Save refinement results to the note
      await ctx.db
        .update(notes)
        .set({
          refinedTitle: refinement.title,
          refinedDescription: refinement.description,
          refinedTags: refinement.tags,
          lastRefinedAt: new Date(),
        })
        .where(eq(notes.id, input.id));

      return {
        refinedTitle: refinement.title,
        refinedDescription: refinement.description,
        refinedTags: refinement.tags,
      };
    }),

  /**
   * Promote a refined note to a project.
   * Creates a project from the refinement data and links it to the note (atomic transaction).
   */
  promote: protectedProcedure
    .input(promoteNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.query.notes.findFirst({
        where: and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)),
        columns: {
          id: true,
          refinedTitle: true,
          refinedDescription: true,
          promotedProjectId: true,
        },
      });

      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'NOTE_NOT_FOUND',
        });
      }

      if (!note.refinedTitle || !note.refinedDescription) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'NO_REFINEMENT',
        });
      }

      if (note.promotedProjectId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Note has already been promoted',
        });
      }

      // Create project + mark note as promoted atomically
      const result = await ctx.db.transaction(async (tx) => {
        const [project] = await tx
          .insert(projects)
          .values({
            title: note.refinedTitle!,
            description: note.refinedDescription!,
            userId: ctx.userId,
          })
          .returning({ id: projects.id });

        if (!project) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        // Mark note as promoted so it's filtered from the list
        await tx
          .update(notes)
          .set({ promotedProjectId: project.id })
          .where(eq(notes.id, input.id));

        return { projectId: project.id };
      });

      // Delete the note after the transaction commits
      await ctx.db.delete(notes).where(eq(notes.id, input.id));

      return result;
    }),

  /**
   * Extract multiple business ideas from a quick note using AI.
   * Creates new AI-typed notes for each extracted idea, with refinement data pre-populated.
   */
  extractIdeas: protectedProcedure
    .input(extractIdeasSchema)
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.query.notes.findFirst({
        where: and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)),
        columns: { id: true, content: true, type: true },
      });

      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'NOTE_NOT_FOUND',
        });
      }

      if (note.type !== 'QUICK') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Extract Ideas is only available for Quick Notes',
        });
      }

      if (note.content.length < NOTE_EXTRACT_MIN_CHARS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Note must be at least ${NOTE_EXTRACT_MIN_CHARS} characters to extract ideas`,
        });
      }

      let ideas;
      try {
        ideas = await extractIdeasFromNote(note.content);
      } catch (error) {
        console.error('[NoteRouter] Extraction failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'EXTRACTION_FAILED',
          cause: error,
        });
      }

      // Create new AI notes for each extracted idea in a transaction
      const createdNotes = await ctx.db.transaction(async (tx) => {
        const results = [];
        for (const idea of ideas) {
          const [newNote] = await tx
            .insert(notes)
            .values({
              userId: ctx.userId,
              type: 'AI',
              content: `${idea.title}\n\n${idea.description}`,
              refinedTitle: idea.title,
              refinedDescription: idea.description,
              refinedTags: idea.tags,
              lastRefinedAt: new Date(),
              sourceNoteId: input.id,
            })
            .returning();
          if (newNote) results.push(newNote);
        }
        return results;
      });

      return {
        extractedCount: createdNotes.length,
        noteIds: createdNotes.map((n) => n.id),
      };
    }),
});
