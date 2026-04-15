/**
 * Thought Router — CRUD + properties + reactions + comments + events
 *
 * Replaces the note router with the new Thought data model.
 *
 * Procedures:
 * - list:              Return user's non-archived thoughts sorted by updatedAt desc
 * - get:               Return single thought by id (ownership check) with attachments
 * - create:            Insert thought, assign thoughtNumber, optionally enqueue auto-classify
 * - update:            Update content by id (ownership check)
 * - delete:            Delete by id (ownership check), clean up storage files
 * - refine:            AI refinement (no type guard). Creates ThoughtEvent 'refined'.
 * - promote:           Promote refined thought to project
 * - extractIdeas:      Extract business ideas (no type restriction)
 * - addToCluster:      Assign thought to a cluster
 * - removeFromCluster: Remove thought from cluster
 * - addAttachments:    Add image attachments to a thought
 * - removeAttachment:  Remove a single attachment
 * - updateProperties:  Update maturityLevel, thoughtType, confidenceLevel
 * - addReaction:       Add/toggle emoji reaction
 * - removeReaction:    Remove emoji reaction
 * - addComment:        Add a comment to a thought
 * - deleteComment:     Delete a comment (ownership check)
 * - listEvents:        List thought events with cursor pagination
 */

import { eq, and, desc, isNull, count, max, lt, sql, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  createThoughtSchema,
  updateThoughtPropertiesSchema,
  addReactionSchema,
  removeReactionSchema,
  addThoughtCommentSchema,
  deleteThoughtCommentSchema,
  listThoughtEventsSchema,
  addToClusterSchema,
  removeFromClusterSchema,
  updateNoteSchema,
  refineNoteSchema,
  promoteNoteSchema,
  deleteNoteSchema,
  extractIdeasSchema,
  addNoteAttachmentsSchema,
  removeNoteAttachmentSchema,
  NOTE_REFINE_MIN_CHARS,
  NOTE_EXTRACT_MIN_CHARS,
  entityId,
} from '@forge/shared';
import {
  thoughts,
  thoughtClusters,
  thoughtAttachments,
  thoughtEvents,
  thoughtComments,
  thoughtConnections,
  projects,
  users,
  projectAttachments,
} from '../db/schema';
import { refineNote, extractIdeasFromNote } from '../services/note-ai';
import { supabase, ATTACHMENT_BUCKET } from '../lib/supabase';

export const thoughtRouter = router({
  /**
   * List all non-archived thoughts for the current user, sorted by updatedAt desc.
   * Excludes promoted thoughts.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select()
      .from(thoughts)
      .where(
        and(
          eq(thoughts.userId, ctx.userId),
          eq(thoughts.isArchived, false),
          isNull(thoughts.promotedProjectId),
        ),
      )
      .orderBy(desc(thoughts.updatedAt));

    return results;
  }),

  /**
   * Get a single thought by id (ownership check) with attachments.
   */
  get: protectedProcedure
    .input(refineNoteSchema) // { id: string }
    .query(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        with: { attachments: true, comments: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      // Map attachments to include public URLs
      const SUPABASE_URL = process.env.SUPABASE_URL;
      return {
        ...thought,
        attachments: (thought.attachments ?? []).map((a) => ({
          ...a,
          publicUrl: SUPABASE_URL
            ? `${SUPABASE_URL}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${a.storagePath}`
            : null,
        })),
      };
    }),

  /**
   * Create a new thought for the user.
   * Assigns a sequential thoughtNumber. If thoughtType is provided, sets typeSource to 'user'.
   * If omitted, sets typeSource to 'ai_auto' and enqueues auto-classify job.
   * Creates a ThoughtEvent with eventType 'created'.
   */
  create: protectedProcedure
    .input(createThoughtSchema)
    .mutation(async ({ ctx, input }) => {
      // If clusterId provided, verify ownership
      if (input.clusterId) {
        const cluster = await ctx.db.query.thoughtClusters.findFirst({
          where: and(
            eq(thoughtClusters.id, input.clusterId),
            eq(thoughtClusters.userId, ctx.userId),
          ),
          columns: { id: true },
        });
        if (!cluster) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'CLUSTER_NOT_FOUND',
          });
        }
      }

      // Get next thoughtNumber for user
      const [maxResult] = await ctx.db
        .select({ maxNum: max(thoughts.thoughtNumber) })
        .from(thoughts)
        .where(eq(thoughts.userId, ctx.userId));
      const nextNumber = (maxResult?.maxNum ?? 0) + 1;

      const hasUserType = !!input.thoughtType;

      const [thought] = await ctx.db
        .insert(thoughts)
        .values({
          userId: ctx.userId,
          content: input.content ?? '',
          thoughtType: input.thoughtType ?? 'observation',
          typeSource: hasUserType ? 'user' : 'ai_auto',
          captureMethod: input.captureMethod ?? 'quick_text',
          thoughtNumber: nextNumber,
          clusterId: input.clusterId ?? null,
          updatedAt: new Date(),
        })
        .returning();

      if (!thought) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create thought',
        });
      }

      // Create 'created' event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: thought.id,
        eventType: 'created',
        metadata: { captureMethod: input.captureMethod ?? 'quick_text' },
      });

      // Enqueue auto-classify job if no user-provided type
      if (!hasUserType) {
        try {
          const { getThoughtClassifyQueue } = await import('../jobs/thought-classify');
          await getThoughtClassifyQueue().add('classify', { thoughtId: thought.id });
        } catch {
          /* Queue not set up yet */
        }
      }

      return thought;
    }),

  /**
   * Update thought content by id (ownership check).
   */
  update: protectedProcedure
    .input(updateNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      await ctx.db
        .update(thoughts)
        .set({ content: input.content })
        .where(eq(thoughts.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a thought by id (ownership check).
   */
  delete: protectedProcedure
    .input(deleteNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      // Clean up storage files before deleting the thought
      const attachments = await ctx.db
        .select({ storagePath: thoughtAttachments.storagePath })
        .from(thoughtAttachments)
        .where(eq(thoughtAttachments.thoughtId, input.id));

      if (attachments.length > 0 && supabase) {
        try {
          await supabase.storage
            .from(ATTACHMENT_BUCKET)
            .remove(attachments.map((a) => a.storagePath));
        } catch (err) {
          console.warn('[ThoughtRouter] Failed to delete storage files for thought', input.id, err);
        }
      }

      await ctx.db.delete(thoughts).where(eq(thoughts.id, input.id));

      return { success: true };
    }),

  /**
   * Refine a thought using AI.
   * No type guard (unlike note.refine which required type !== 'QUICK').
   * Creates ThoughtEvent 'refined'.
   */
  refine: protectedProcedure
    .input(refineNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        columns: { id: true, content: true, lastRefinedAt: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      // Enforce 60-second cooldown between refinements (SUPER_ADMIN bypasses)
      const REFINE_COOLDOWN_MS = 60_000;
      const caller = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { role: true },
      });
      if (caller?.role !== 'SUPER_ADMIN' && thought.lastRefinedAt) {
        const elapsed = Date.now() - new Date(thought.lastRefinedAt).getTime();
        if (elapsed < REFINE_COOLDOWN_MS) {
          const retryAfter = Math.ceil((REFINE_COOLDOWN_MS - elapsed) / 1000);
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `REFINE_COOLDOWN:${retryAfter}`,
          });
        }
      }

      if (thought.content.length < NOTE_REFINE_MIN_CHARS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Thought must be at least ${NOTE_REFINE_MIN_CHARS} characters to refine`,
        });
      }

      // Fetch image attachments and construct public URLs
      const attRows = await ctx.db
        .select({ storagePath: thoughtAttachments.storagePath })
        .from(thoughtAttachments)
        .where(eq(thoughtAttachments.thoughtId, input.id));

      const SUPABASE_URL = process.env.SUPABASE_URL;
      const imageUrls =
        attRows.length > 0 && SUPABASE_URL
          ? attRows.map(
              (a) =>
                `${SUPABASE_URL}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${a.storagePath}`,
            )
          : undefined;

      let refinement;
      try {
        refinement = await refineNote(thought.content, imageUrls);
      } catch (error) {
        console.error(
          '[ThoughtRouter] Refinement failed:',
          error instanceof Error ? error.message : error,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'REFINEMENT_FAILED',
          cause: error,
        });
      }

      // Save refinement results
      await ctx.db
        .update(thoughts)
        .set({
          refinedTitle: refinement.title,
          refinedDescription: refinement.description,
          refinedTags: refinement.tags,
          lastRefinedAt: new Date(),
        })
        .where(eq(thoughts.id, input.id));

      // Create 'refined' event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.id,
        eventType: 'refined',
      });

      return {
        refinedTitle: refinement.title,
        refinedDescription: refinement.description,
        refinedTags: refinement.tags,
      };
    }),

  /**
   * Promote a refined thought to a project.
   */
  promote: protectedProcedure
    .input(promoteNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        columns: {
          id: true,
          refinedTitle: true,
          refinedDescription: true,
          promotedProjectId: true,
        },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      if (!thought.refinedTitle || !thought.refinedDescription) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'NO_REFINEMENT',
        });
      }

      if (thought.promotedProjectId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Thought has already been promoted',
        });
      }

      // Create project + mark thought as promoted atomically
      const result = await ctx.db.transaction(async (tx) => {
        const [project] = await tx
          .insert(projects)
          .values({
            title: thought.refinedTitle!,
            description: thought.refinedDescription!,
            userId: ctx.userId,
          })
          .returning({ id: projects.id });

        if (!project) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        // Copy up to the first 5 thought attachments as project attachments
        const thoughtAtts = await tx
          .select()
          .from(thoughtAttachments)
          .where(eq(thoughtAttachments.thoughtId, input.id))
          .orderBy(thoughtAttachments.order)
          .limit(5);

        if (thoughtAtts.length > 0) {
          await tx.insert(projectAttachments).values(
            thoughtAtts.map((att, idx) => ({
              projectId: project.id,
              userId: ctx.userId,
              storagePath: att.storagePath,
              fileName: att.fileName,
              mimeType: att.mimeType,
              sizeBytes: att.sizeBytes,
              order: idx,
            })),
          );
        }

        // Mark thought as promoted
        await tx
          .update(thoughts)
          .set({ promotedProjectId: project.id })
          .where(eq(thoughts.id, input.id));

        return { projectId: project.id };
      });

      // Delete the thought after the transaction commits
      await ctx.db.delete(thoughts).where(eq(thoughts.id, input.id));

      return result;
    }),

  /**
   * Extract multiple business ideas from a thought using AI.
   * No type restriction (unlike note.extractIdeas which required type === 'QUICK').
   */
  extractIdeas: protectedProcedure
    .input(extractIdeasSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        columns: { id: true, content: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      if (thought.content.length < NOTE_EXTRACT_MIN_CHARS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Thought must be at least ${NOTE_EXTRACT_MIN_CHARS} characters to extract ideas`,
        });
      }

      let ideas;
      try {
        ideas = await extractIdeasFromNote(thought.content);
      } catch (error) {
        console.error(
          '[ThoughtRouter] Extraction failed:',
          error instanceof Error ? error.message : error,
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'EXTRACTION_FAILED',
          cause: error,
        });
      }

      // Create new thoughts for each extracted idea in a transaction
      const createdThoughts = await ctx.db.transaction(async (tx) => {
        // Get the current max thoughtNumber inside the transaction
        const [maxRes] = await tx
          .select({ maxNum: max(thoughts.thoughtNumber) })
          .from(thoughts)
          .where(eq(thoughts.userId, ctx.userId));
        let nextNum = (maxRes?.maxNum ?? 0) + 1;

        const results = [];
        for (const idea of ideas) {
          const [newThought] = await tx
            .insert(thoughts)
            .values({
              userId: ctx.userId,
              content: `${idea.title}\n\n${idea.description}`,
              thoughtType: 'observation',
              typeSource: 'ai_auto',
              refinedTitle: idea.title,
              refinedDescription: idea.description,
              refinedTags: idea.tags,
              lastRefinedAt: new Date(),
              sourceThoughtId: input.id,
              thoughtNumber: nextNum++,
              updatedAt: new Date(),
            })
            .returning();
          if (newThought) results.push(newThought);
        }
        return results;
      });

      return {
        extractedCount: createdThoughts.length,
        thoughtIds: createdThoughts.map((t) => t.id),
      };
    }),

  /**
   * Add a thought to a cluster.
   */
  addToCluster: protectedProcedure
    .input(addToClusterSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify thought ownership
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      // Verify cluster ownership
      const cluster = await ctx.db.query.thoughtClusters.findFirst({
        where: and(
          eq(thoughtClusters.id, input.clusterId),
          eq(thoughtClusters.userId, ctx.userId),
        ),
        columns: { id: true },
      });

      if (!cluster) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'CLUSTER_NOT_FOUND',
        });
      }

      await ctx.db
        .update(thoughts)
        .set({ clusterId: input.clusterId })
        .where(eq(thoughts.id, input.thoughtId));

      // Create 'clustered' event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.thoughtId,
        eventType: 'clustered',
        metadata: { clusterId: input.clusterId },
      });

      return { success: true };
    }),

  /**
   * Remove a thought from its cluster.
   */
  removeFromCluster: protectedProcedure
    .input(removeFromClusterSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true, clusterId: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      const previousClusterId = thought.clusterId;

      await ctx.db
        .update(thoughts)
        .set({ clusterId: null })
        .where(eq(thoughts.id, input.thoughtId));

      // Create 'unclustered' event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.thoughtId,
        eventType: 'unclustered',
        metadata: { previousClusterId },
      });

      return { success: true };
    }),

  /**
   * Add image attachments to a thought.
   */
  addAttachments: protectedProcedure
    .input(addNoteAttachmentsSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.noteId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      // Count existing attachments to enforce the 10-attachment limit
      const [existing] = await ctx.db
        .select({ total: count() })
        .from(thoughtAttachments)
        .where(eq(thoughtAttachments.thoughtId, input.noteId));

      const existingCount = existing?.total ?? 0;
      if (existingCount + input.attachments.length > 10) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot exceed 10 attachments per thought (currently ${existingCount})`,
        });
      }

      await ctx.db.insert(thoughtAttachments).values(
        input.attachments.map((att) => ({
          thoughtId: input.noteId,
          userId: ctx.userId,
          storagePath: att.storagePath,
          fileName: att.fileName,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          order: att.order,
        })),
      );

      return { success: true };
    }),

  /**
   * Remove a single attachment from a thought.
   */
  removeAttachment: protectedProcedure
    .input(removeNoteAttachmentSchema)
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.db.query.thoughtAttachments.findFirst({
        where: and(
          eq(thoughtAttachments.id, input.attachmentId),
          eq(thoughtAttachments.userId, ctx.userId),
        ),
      });

      if (!attachment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ATTACHMENT_NOT_FOUND',
        });
      }

      // Delete from Supabase Storage
      if (supabase) {
        const { error } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove([attachment.storagePath]);

        if (error) {
          console.warn(
            '[ThoughtRouter] Failed to delete storage file',
            attachment.storagePath,
            error,
          );
        }
      }

      // Delete the DB row
      await ctx.db
        .delete(thoughtAttachments)
        .where(eq(thoughtAttachments.id, input.attachmentId));

      return { success: true };
    }),

  /**
   * Update thought properties: maturityLevel, thoughtType, confidenceLevel.
   * Creates ThoughtEvent entries for each changed field.
   */
  updateProperties: protectedProcedure
    .input(updateThoughtPropertiesSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        columns: {
          id: true,
          maturityLevel: true,
          thoughtType: true,
          confidenceLevel: true,
        },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      // Build the update set
      const updates: Record<string, unknown> = {};
      const events: { eventType: string; metadata: Record<string, unknown> }[] = [];

      if (input.maturityLevel && input.maturityLevel !== thought.maturityLevel) {
        updates.maturityLevel = input.maturityLevel;
        events.push({
          eventType: 'maturity_changed',
          metadata: { from: thought.maturityLevel, to: input.maturityLevel },
        });
      }

      if (input.thoughtType && input.thoughtType !== thought.thoughtType) {
        updates.thoughtType = input.thoughtType;
        updates.typeSource = 'user';
        events.push({
          eventType: 'type_changed',
          metadata: { from: thought.thoughtType, to: input.thoughtType },
        });
      }

      if (input.confidenceLevel && input.confidenceLevel !== thought.confidenceLevel) {
        updates.confidenceLevel = input.confidenceLevel;
        events.push({
          eventType: 'confidence_changed',
          metadata: { from: thought.confidenceLevel, to: input.confidenceLevel },
        });
      }

      if (input.maturityNotes !== undefined) {
        updates.maturityNotes = input.maturityNotes;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db
          .update(thoughts)
          .set(updates)
          .where(eq(thoughts.id, input.id));
      }

      // Create events for each changed property
      if (events.length > 0) {
        await ctx.db.insert(thoughtEvents).values(
          events.map((e) => ({
            thoughtId: input.id,
            eventType: e.eventType,
            metadata: e.metadata,
          })),
        );
      }

      return { success: true };
    }),

  /**
   * Add an emoji reaction to a thought.
   * Reads current reactions array, adds emoji if not present, updates reactCount.
   */
  addReaction: protectedProcedure
    .input(addReactionSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true, reactions: true, reactCount: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      const currentReactions = (thought.reactions as string[]) ?? [];

      // Only add if not already present
      if (!currentReactions.includes(input.emoji)) {
        const updatedReactions = [...currentReactions, input.emoji];
        await ctx.db
          .update(thoughts)
          .set({
            reactions: updatedReactions,
            reactCount: (thought.reactCount ?? 0) + 1,
          })
          .where(eq(thoughts.id, input.thoughtId));

        // Create 'reaction_added' event
        await ctx.db.insert(thoughtEvents).values({
          thoughtId: input.thoughtId,
          eventType: 'reaction_added',
          metadata: { emoji: input.emoji },
        });
      }

      return { success: true };
    }),

  /**
   * Remove an emoji reaction from a thought.
   * Removes emoji from reactions array and decrements reactCount.
   */
  removeReaction: protectedProcedure
    .input(removeReactionSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true, reactions: true, reactCount: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      const currentReactions = (thought.reactions as string[]) ?? [];
      const updatedReactions = currentReactions.filter((r) => r !== input.emoji);

      if (updatedReactions.length !== currentReactions.length) {
        await ctx.db
          .update(thoughts)
          .set({
            reactions: updatedReactions,
            reactCount: Math.max(0, (thought.reactCount ?? 0) - 1),
          })
          .where(eq(thoughts.id, input.thoughtId));
      }

      return { success: true };
    }),

  /**
   * Add a comment to a thought.
   * Creates ThoughtEvent 'commented'.
   */
  addComment: protectedProcedure
    .input(addThoughtCommentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify thought ownership
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      const [comment] = await ctx.db
        .insert(thoughtComments)
        .values({
          thoughtId: input.thoughtId,
          userId: ctx.userId,
          content: input.content,
          updatedAt: new Date(),
        })
        .returning();

      // Create 'commented' event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.thoughtId,
        eventType: 'commented',
        metadata: { commentId: comment?.id },
      });

      return comment;
    }),

  /**
   * Delete a comment (ownership check on userId).
   */
  deleteComment: protectedProcedure
    .input(deleteThoughtCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.query.thoughtComments.findFirst({
        where: and(
          eq(thoughtComments.id, input.commentId),
          eq(thoughtComments.userId, ctx.userId),
        ),
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'COMMENT_NOT_FOUND',
        });
      }

      await ctx.db
        .delete(thoughtComments)
        .where(eq(thoughtComments.id, input.commentId));

      return { success: true };
    }),

  /**
   * List events for a thought with cursor-based pagination.
   */
  listEvents: protectedProcedure
    .input(listThoughtEventsSchema)
    .query(async ({ ctx, input }) => {
      // Verify thought ownership
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!thought) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'THOUGHT_NOT_FOUND',
        });
      }

      const events = await ctx.db
        .select()
        .from(thoughtEvents)
        .where(
          input.cursor
            ? and(
                eq(thoughtEvents.thoughtId, input.thoughtId),
                lt(thoughtEvents.id, input.cursor),
              )
            : eq(thoughtEvents.thoughtId, input.thoughtId),
        )
        .orderBy(desc(thoughtEvents.createdAt))
        .limit(input.limit);

      const nextCursor =
        events.length === input.limit ? events[events.length - 1]?.id : undefined;

      return {
        events,
        nextCursor,
      };
    }),

  /**
   * List all connections for a thought, enriched with the linked thought's summary.
   */
  listConnections: protectedProcedure
    .input(z.object({ thoughtId: entityId }))
    .query(async ({ ctx, input }) => {
      const { thoughtId } = input;

      // Verify ownership
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!thought) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'THOUGHT_NOT_FOUND' });
      }

      // Get connections where this thought is either side
      const connections = await ctx.db
        .select()
        .from(thoughtConnections)
        .where(
          or(
            eq(thoughtConnections.thoughtAId, thoughtId),
            eq(thoughtConnections.thoughtBId, thoughtId),
          ),
        )
        .orderBy(desc(thoughtConnections.createdAt));

      // For each connection, fetch the OTHER thought's summary
      const enriched = await Promise.all(
        connections.map(async (conn) => {
          const otherId = conn.thoughtAId === thoughtId ? conn.thoughtBId : conn.thoughtAId;
          const [other] = await ctx.db
            .select({
              id: thoughts.id,
              content: thoughts.content,
              thoughtType: thoughts.thoughtType,
              maturityLevel: thoughts.maturityLevel,
              thoughtNumber: thoughts.thoughtNumber,
              createdAt: thoughts.createdAt,
            })
            .from(thoughts)
            .where(eq(thoughts.id, otherId))
            .limit(1);

          return {
            ...conn,
            linkedThought: other ?? null,
          };
        }),
      );

      return enriched;
    }),

  /**
   * Duplicate a thought, resetting maturityLevel to 'spark' and confidenceLevel to 'untested'.
   */
  duplicate: protectedProcedure
    .input(z.object({ id: entityId }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
      });

      if (!original) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'THOUGHT_NOT_FOUND' });
      }

      // Get next thoughtNumber
      const [maxResult] = await ctx.db
        .select({ maxNum: max(thoughts.thoughtNumber) })
        .from(thoughts)
        .where(eq(thoughts.userId, ctx.userId));
      const nextNumber = (maxResult?.maxNum ?? 0) + 1;

      const [duplicate] = await ctx.db
        .insert(thoughts)
        .values({
          userId: ctx.userId,
          content: original.content,
          thoughtType: original.thoughtType,
          typeSource: original.typeSource,
          tags: original.tags,
          maturityLevel: 'spark', // Always reset to spark
          confidenceLevel: 'untested', // Always reset
          captureMethod: original.captureMethod,
          thoughtNumber: nextNumber,
          sourceThoughtId: original.id,
          updatedAt: new Date(),
        })
        .returning();

      if (!duplicate) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to duplicate thought' });
      }

      // Log event on the duplicate
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: duplicate.id,
        eventType: 'created',
        metadata: { captureMethod: 'duplicate', sourceThoughtId: original.id },
      });

      return duplicate;
    }),
});
