/**
 * Thought Router — CRUD + properties + comments + events + connections
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
 * - addComment:        Add a comment to a thought
 * - deleteComment:     Delete a comment (ownership check)
 * - listEvents:        List thought events with cursor pagination
 * - listConnections:   List connections for a thought
 * - linkThought:       Create a manual user_linked connection
 */

import { eq, and, desc, isNull, count, max, lt, sql, or, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { enqueueThoughtCollision } from '../jobs/queues';
import {
  createThoughtSchema,
  updateThoughtPropertiesSchema,
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
  recordSurfaceActionSchema,
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

    // Fetch connection counts per thought in batch
    const thoughtIds = results.map((t) => t.id);
    const connCounts = new Map<string, number>();
    if (thoughtIds.length > 0) {
      const countsA = await ctx.db
        .select({ thoughtId: thoughtConnections.thoughtAId, cnt: count() })
        .from(thoughtConnections)
        .where(inArray(thoughtConnections.thoughtAId, thoughtIds))
        .groupBy(thoughtConnections.thoughtAId);
      const countsB = await ctx.db
        .select({ thoughtId: thoughtConnections.thoughtBId, cnt: count() })
        .from(thoughtConnections)
        .where(inArray(thoughtConnections.thoughtBId, thoughtIds))
        .groupBy(thoughtConnections.thoughtBId);
      for (const r of countsA) connCounts.set(r.thoughtId, (connCounts.get(r.thoughtId) ?? 0) + Number(r.cnt));
      for (const r of countsB) connCounts.set(r.thoughtId, (connCounts.get(r.thoughtId) ?? 0) + Number(r.cnt));
    }

    return results.map((t) => ({ ...t, connectionCount: connCounts.get(t.id) ?? 0 }));
  }),

  /**
   * Get a single thought by id (ownership check) with attachments.
   */
  get: protectedProcedure
    .input(refineNoteSchema) // { id: string }
    .query(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.id), eq(thoughts.userId, ctx.userId)),
        with: { attachments: true, comments: true, cluster: true },
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

      // Enqueue collision detection (fire-and-forget)
      try {
        await enqueueThoughtCollision({ thoughtId: thought.id });
      } catch {
        // Non-critical — don't fail thought creation if queue is down
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
        .set({
          content: input.content,
          ...(input.title !== undefined ? { title: input.title } : {}),
        })
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
   * Remove a connection between two thoughts.
   */
  removeConnection: protectedProcedure
    .input(z.object({ connectionId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db
        .select()
        .from(thoughtConnections)
        .where(eq(thoughtConnections.id, input.connectionId))
        .limit(1);

      if (!connection[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      // Verify the user owns at least one side of the connection
      const ownsThought = await ctx.db.query.thoughts.findFirst({
        where: and(
          eq(thoughts.userId, ctx.userId),
          or(
            eq(thoughts.id, connection[0].thoughtAId),
            eq(thoughts.id, connection[0].thoughtBId),
          ),
        ),
        columns: { id: true },
      });

      if (!ownsThought) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      await ctx.db
        .delete(thoughtConnections)
        .where(eq(thoughtConnections.id, input.connectionId));

      return { success: true };
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

  /**
   * Create a manual (user_linked) connection between two thoughts.
   */
  linkThought: protectedProcedure
    .input(z.object({ thoughtId: entityId, targetThoughtId: entityId }))
    .mutation(async ({ ctx, input }) => {
      const { thoughtId, targetThoughtId } = input;

      if (thoughtId === targetThoughtId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot link a thought to itself' });
      }

      // Verify both thoughts belong to the user
      const [source, target] = await Promise.all([
        ctx.db.query.thoughts.findFirst({
          where: and(eq(thoughts.id, thoughtId), eq(thoughts.userId, ctx.userId)),
        }),
        ctx.db.query.thoughts.findFirst({
          where: and(eq(thoughts.id, targetThoughtId), eq(thoughts.userId, ctx.userId)),
        }),
      ]);

      if (!source || !target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'THOUGHT_NOT_FOUND' });
      }

      // Check for existing connection in either direction
      const existing = await ctx.db
        .select()
        .from(thoughtConnections)
        .where(
          or(
            and(
              eq(thoughtConnections.thoughtAId, thoughtId),
              eq(thoughtConnections.thoughtBId, targetThoughtId),
            ),
            and(
              eq(thoughtConnections.thoughtAId, targetThoughtId),
              eq(thoughtConnections.thoughtBId, thoughtId),
            ),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Connection already exists' });
      }

      const [connection] = await ctx.db
        .insert(thoughtConnections)
        .values({
          thoughtAId: thoughtId,
          thoughtBId: targetThoughtId,
          connectionType: 'user_linked',
          strength: 1,
          createdBy: ctx.userId,
        })
        .returning();

      // Log event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId,
        eventType: 'connected',
        metadata: { targetThoughtId, connectionType: 'user_linked', thoughtNumber: target.thoughtNumber },
      });

      return connection;
    }),

  /**
   * Return the top 3 thoughts eligible for resurfacing, scored by the incubation formula.
   */
  getResurfaceCandidates: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch eligible thoughts (limit 100, ordered by updatedAt desc)
    const eligibleThoughts = await ctx.db
      .select({
        id: thoughts.id,
        content: thoughts.content,
        thoughtType: thoughts.thoughtType,
        maturityLevel: thoughts.maturityLevel,
        thoughtNumber: thoughts.thoughtNumber,
        createdAt: thoughts.createdAt,
        lastSurfacedAt: thoughts.lastSurfacedAt,
        nextSurfaceAt: thoughts.nextSurfaceAt,
        surfaceCount: thoughts.surfaceCount,
        engageCount: thoughts.engageCount,
        dismissCount: thoughts.dismissCount,
      })
      .from(thoughts)
      .where(
        and(
          eq(thoughts.userId, ctx.userId),
          lt(thoughts.createdAt, twentyFourHoursAgo),
          eq(thoughts.isArchived, false),
          isNull(thoughts.promotedProjectId),
          eq(thoughts.resurfaceExcluded, false),
          or(
            isNull(thoughts.nextSurfaceAt),
            lt(thoughts.nextSurfaceAt, now),
          ),
          or(
            isNull(thoughts.lastSurfacedAt),
            lt(thoughts.lastSurfacedAt, oneHourAgo),
          ),
        ),
      )
      .orderBy(desc(thoughts.updatedAt))
      .limit(100);

    if (eligibleThoughts.length === 0) {
      return { candidates: [] };
    }

    const thoughtIds = eligibleThoughts.map((t) => t.id);

    // Fetch connection counts per thought in batch (connections where thought is either side)
    const connectionCountsA = await ctx.db
      .select({
        thoughtId: thoughtConnections.thoughtAId,
        cnt: count(),
      })
      .from(thoughtConnections)
      .where(inArray(thoughtConnections.thoughtAId, thoughtIds))
      .groupBy(thoughtConnections.thoughtAId);

    const connectionCountsB = await ctx.db
      .select({
        thoughtId: thoughtConnections.thoughtBId,
        cnt: count(),
      })
      .from(thoughtConnections)
      .where(inArray(thoughtConnections.thoughtBId, thoughtIds))
      .groupBy(thoughtConnections.thoughtBId);

    // Merge connection counts
    const connMap = new Map<string, number>();
    for (const row of connectionCountsA) {
      connMap.set(row.thoughtId, (connMap.get(row.thoughtId) ?? 0) + Number(row.cnt));
    }
    for (const row of connectionCountsB) {
      connMap.set(row.thoughtId, (connMap.get(row.thoughtId) ?? 0) + Number(row.cnt));
    }

    // Determine max_connections across corpus
    const maxConnections = Math.max(...Array.from(connMap.values()), 0);

    // Fetch type diversity: for each thought, check if any connected thought has a different thoughtType
    // We need the type of each thought and its connections
    const thoughtTypeMap = new Map<string, string>();
    for (const t of eligibleThoughts) {
      thoughtTypeMap.set(t.id, t.thoughtType);
    }

    // Get all connected thought types for our eligible thoughts
    const connectedTypesA = await ctx.db
      .select({
        sourceId: thoughtConnections.thoughtAId,
        connectedType: thoughts.thoughtType,
      })
      .from(thoughtConnections)
      .innerJoin(thoughts, eq(thoughts.id, thoughtConnections.thoughtBId))
      .where(inArray(thoughtConnections.thoughtAId, thoughtIds));

    const connectedTypesB = await ctx.db
      .select({
        sourceId: thoughtConnections.thoughtBId,
        connectedType: thoughts.thoughtType,
      })
      .from(thoughtConnections)
      .innerJoin(thoughts, eq(thoughts.id, thoughtConnections.thoughtAId))
      .where(inArray(thoughtConnections.thoughtBId, thoughtIds));

    // Build diversity map: thoughtId -> { hasDifferentType, hasSameType }
    const diversityMap = new Map<string, { hasDifferentType: boolean; hasSameType: boolean }>();
    const processDiversityRow = (sourceId: string, connectedType: string) => {
      const sourceType = thoughtTypeMap.get(sourceId);
      if (!sourceType) return;
      const current = diversityMap.get(sourceId) ?? { hasDifferentType: false, hasSameType: false };
      if (connectedType !== sourceType) {
        current.hasDifferentType = true;
      } else {
        current.hasSameType = true;
      }
      diversityMap.set(sourceId, current);
    };
    for (const row of connectedTypesA) {
      processDiversityRow(row.sourceId, row.connectedType);
    }
    for (const row of connectedTypesB) {
      processDiversityRow(row.sourceId, row.connectedType);
    }

    // Calculate scores in-memory
    const scored = eligibleThoughts.map((thought) => {
      const connectionCount = connMap.get(thought.id) ?? 0;

      // recency_factor: Gaussian centered at 48h ago, sigma=24h
      const referenceDate = thought.lastSurfacedAt ?? thought.createdAt;
      const hoursSinceLastView = (now.getTime() - referenceDate.getTime()) / (60 * 60 * 1000);
      const recencyFactor = Math.exp(-0.5 * Math.pow((hoursSinceLastView - 48) / 24, 2));

      // connection_density
      const connectionDensity = connectionCount === 0
        ? 0
        : connectionCount / Math.max(maxConnections, 1);

      // type_diversity_bonus
      const diversity = diversityMap.get(thought.id);
      let typeDiversityBonus: number;
      if (!diversity) {
        typeDiversityBonus = 0.0;
      } else if (diversity.hasDifferentType) {
        typeDiversityBonus = 1.0;
      } else {
        typeDiversityBonus = 0.5;
      }

      // engagement_signal
      const surfaceCount = thought.surfaceCount ?? 0;
      const engageCount = thought.engageCount ?? 0;
      const dismissCount = thought.dismissCount ?? 0;
      const engagementSignal = (engageCount - dismissCount) / Math.max(surfaceCount, 1);

      const score =
        0.4 * recencyFactor +
        0.3 * connectionDensity +
        0.15 * typeDiversityBonus +
        0.15 * engagementSignal;

      const daysSinceCapture = Math.floor((now.getTime() - thought.createdAt.getTime()) / (24 * 60 * 60 * 1000));

      return {
        id: thought.id,
        content: thought.content,
        thoughtType: thought.thoughtType,
        maturityLevel: thought.maturityLevel,
        thoughtNumber: thought.thoughtNumber,
        createdAt: thought.createdAt,
        score,
        daysSinceCapture,
        connectionCount,
      };
    });

    // Return top 3 sorted by score descending
    scored.sort((a, b) => b.score - a.score);
    const candidates = scored.slice(0, 3);

    return { candidates };
  }),

  /**
   * Record a user action (dismiss, engage, cluster) on a resurfaced thought.
   */
  recordSurfaceAction: protectedProcedure
    .input(recordSurfaceActionSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: {
          id: true,
          resurfaceExcluded: true,
          surfaceCount: true,
          dismissCount: true,
          engageCount: true,
          dismissStreak: true,
          lastSurfacedAt: true,
        },
      });

      if (!thought) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'THOUGHT_NOT_FOUND' });
      }

      // No-op if already excluded
      if (thought.resurfaceExcluded) {
        return { success: true as const, alreadyExcluded: true as const };
      }

      const now = new Date();
      const newSurfaceCount = (thought.surfaceCount ?? 0) + 1;

      const updates: Record<string, unknown> = {
        lastSurfacedAt: now,
        surfaceCount: newSurfaceCount,
      };

      let newDismissStreak = thought.dismissStreak ?? 0;

      if (input.action === 'dismiss') {
        const newDismissCount = (thought.dismissCount ?? 0) + 1;
        newDismissStreak = newDismissStreak + 1;
        updates.dismissCount = newDismissCount;
        updates.dismissStreak = newDismissStreak;

        if (newDismissStreak >= 4) {
          updates.resurfaceExcluded = true;
          updates.nextSurfaceAt = null;
        } else {
          // Backoff: streak 1 = 3 days, streak 2 = 7 days, streak 3 = 14 days
          const backoffDays = newDismissStreak === 1 ? 3 : newDismissStreak === 2 ? 7 : 14;
          updates.nextSurfaceAt = new Date(now.getTime() + backoffDays * 24 * 60 * 60 * 1000);
        }
      } else {
        // engage or cluster
        updates.engageCount = (thought.engageCount ?? 0) + 1;
        updates.dismissStreak = 0;
        newDismissStreak = 0;
      }

      await ctx.db
        .update(thoughts)
        .set(updates)
        .where(eq(thoughts.id, input.thoughtId));

      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.thoughtId,
        eventType: 'resurface_action',
        metadata: { action: input.action },
      });

      return {
        success: true as const,
        surfaceCount: newSurfaceCount,
        dismissStreak: newDismissStreak,
        lastSurfacedAt: now,
      };
    }),
});
