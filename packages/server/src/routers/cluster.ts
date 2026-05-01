/**
 * Cluster Router — CRUD + AI actions for thought collections.
 *
 * Procedures:
 * - list:                Return user's clusters with thought counts, sorted by updatedAt desc
 * - get:                 Return cluster + its thoughts (ownership check)
 * - create:              Create new cluster
 * - update:              Update cluster name/color
 * - delete:              Delete cluster (unpins thoughts via FK set null)
 * - summarize:           AI summary of cluster thoughts
 * - extractTodos:        AI extraction of action items from thoughts
 * - previewCrystallize:  AI extracts the 5 idea fields, returns without inserting
 * - confirmCrystallize:  Insert (possibly user-edited) fields as a new Idea row
 * - promoteToIdea:       DEPRECATED one-shot crystallize, kept for mobile compat
 * - identifyGaps:        AI identification of knowledge gaps in thoughts
 * - generateBrief:       AI generation of a structured brief from thoughts
 * - findContradictions:  AI detection of contradictions across thoughts
 */

import { eq, and, desc, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  createClusterSchema,
  updateClusterSchema,
  deleteClusterSchema,
  getClusterSchema,
  clusterAiActionSchema,
  CLUSTER_MIN_THOUGHTS_FOR_AI,
  CLUSTER_MIN_CHARS_FOR_AI,
} from '@forge/shared';
import { thoughtClusters, thoughts, ideas } from '../db/schema';
import {
  summarizeSandbox,
  extractTodosFromSandbox,
  synthesizeIdea,
  identifyGaps,
  generateBrief,
  findContradictions,
} from '../services/sandbox-ai';
import { recomputeClusterReadiness } from '../services/cluster-readiness';

/** Fetch and validate cluster thoughts for AI actions. Returns thought contents array. */
async function getClusterThoughtsForAi(
  db: any,
  clusterId: string,
  userId: string,
): Promise<string[]> {
  const cluster = await db.query.thoughtClusters.findFirst({
    where: and(eq(thoughtClusters.id, clusterId), eq(thoughtClusters.userId, userId)),
    columns: { id: true },
  });

  if (!cluster) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'CLUSTER_NOT_FOUND',
    });
  }

  const clusterThoughts = await db
    .select({ content: thoughts.content, tags: thoughts.tags })
    .from(thoughts)
    .where(and(eq(thoughts.clusterId, clusterId), eq(thoughts.kind, 'thought')));

  const contents = clusterThoughts
    .map((n: { content: string; tags: string[] | null }) => {
      if (n.content.length === 0) return '';
      const meta = [];
      if (n.tags?.length) meta.push(`Labels: ${n.tags.join(', ')}`);
      const prefix = meta.length > 0 ? `[${meta.join(' | ')}]\n` : '';
      return `${prefix}${n.content}`;
    })
    .filter((c: string) => c.length > 0);

  if (contents.length < CLUSTER_MIN_THOUGHTS_FOR_AI) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Need at least ${CLUSTER_MIN_THOUGHTS_FOR_AI} thoughts with content for AI actions`,
    });
  }

  const totalChars = contents.reduce((sum: number, c: string) => sum + c.length, 0);
  if (totalChars < CLUSTER_MIN_CHARS_FOR_AI) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Need at least ${CLUSTER_MIN_CHARS_FOR_AI} total characters across thoughts for AI actions`,
    });
  }

  return contents;
}

export const clusterRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select({
        id: thoughtClusters.id,
        name: thoughtClusters.name,
        color: thoughtClusters.color,
        userId: thoughtClusters.userId,
        createdAt: thoughtClusters.createdAt,
        updatedAt: thoughtClusters.updatedAt,
        thoughtCount: count(thoughts.id),
      })
      .from(thoughtClusters)
      .leftJoin(thoughts, and(eq(thoughts.clusterId, thoughtClusters.id), eq(thoughts.kind, 'thought')))
      .where(eq(thoughtClusters.userId, ctx.userId))
      .groupBy(thoughtClusters.id)
      .orderBy(desc(thoughtClusters.updatedAt));

    return results;
  }),

  get: protectedProcedure
    .input(getClusterSchema)
    .query(async ({ ctx, input }) => {
      const cluster = await ctx.db.query.thoughtClusters.findFirst({
        where: and(eq(thoughtClusters.id, input.id), eq(thoughtClusters.userId, ctx.userId)),
      });

      if (!cluster) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'CLUSTER_NOT_FOUND',
        });
      }

      const clusterThoughts = await ctx.db
        .select()
        .from(thoughts)
        .where(and(eq(thoughts.clusterId, input.id), eq(thoughts.kind, 'thought')))
        .orderBy(desc(thoughts.updatedAt));

      return { ...cluster, thoughts: clusterThoughts };
    }),

  create: protectedProcedure
    .input(createClusterSchema)
    .mutation(async ({ ctx, input }) => {
      const [cluster] = await ctx.db
        .insert(thoughtClusters)
        .values({
          name: input.name,
          color: input.color ?? null,
          userId: ctx.userId,
        })
        .returning();

      if (!cluster) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create cluster',
        });
      }

      return cluster;
    }),

  update: protectedProcedure
    .input(updateClusterSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.thoughtClusters.findFirst({
        where: and(eq(thoughtClusters.id, input.id), eq(thoughtClusters.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'CLUSTER_NOT_FOUND',
        });
      }

      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.color !== undefined) updates.color = input.color;

      await ctx.db
        .update(thoughtClusters)
        .set(updates)
        .where(eq(thoughtClusters.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(deleteClusterSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.thoughtClusters.findFirst({
        where: and(eq(thoughtClusters.id, input.id), eq(thoughtClusters.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'CLUSTER_NOT_FOUND',
        });
      }

      // FK set null handles unpinning thoughts automatically
      await ctx.db.delete(thoughtClusters).where(eq(thoughtClusters.id, input.id));

      return { success: true };
    }),

  summarize: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
      try {
        const { summary, dimensionCoverage } = await summarizeSandbox(contents);
        await ctx.db
          .update(thoughtClusters)
          .set({ synthesis: summary, dimensionCoverage })
          .where(eq(thoughtClusters.id, input.id));
        await recomputeClusterReadiness(ctx.db, input.id);
        return { summary, dimensionCoverage };
      } catch (error) {
        console.error('[ClusterRouter] Summarize failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'SUMMARIZE_FAILED', cause: error });
      }
    }),

  extractTodos: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
      try {
        const todos = await extractTodosFromSandbox(contents);
        return { todos };
      } catch (error) {
        console.error('[ClusterRouter] ExtractTodos failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'EXTRACT_TODOS_FAILED', cause: error });
      }
    }),

  /**
   * Preview crystallization: runs AI extraction over cluster thoughts and
   * returns the 5 structured fields. Does NOT insert. Mobile shows these in an
   * editable preview screen before the user confirms.
   */
  previewCrystallize: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const [cluster] = await ctx.db
        .select()
        .from(thoughtClusters)
        .where(and(eq(thoughtClusters.id, input.id), eq(thoughtClusters.userId, ctx.userId)));
      if (!cluster) throw new TRPCError({ code: 'NOT_FOUND' });

      const clusterThoughts = await ctx.db
        .select({
          id: thoughts.id,
          content: thoughts.content,
        })
        .from(thoughts)
        .where(and(eq(thoughts.clusterId, input.id), eq(thoughts.kind, 'thought')));

      if (clusterThoughts.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'CLUSTER_EMPTY' });
      }

      try {
        const fields = await synthesizeIdea(clusterThoughts.map((t) => t.content));
        return {
          ...fields,
          sourceThoughtIds: clusterThoughts.map((t) => t.id),
        };
      } catch (error) {
        console.error('[ClusterRouter] previewCrystallize failed:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'CRYSTALLIZE_FAILED' });
      }
    }),

  /**
   * Confirm crystallization: takes the (possibly user-edited) fields from the
   * preview and inserts a new Idea row with provenance. Source cluster and
   * thoughts are intentionally NOT deleted — a cluster can crystallize multiple
   * times.
   */
  confirmCrystallize: protectedProcedure
    .input(
      z.object({
        clusterId: z.string(),
        title: z.string().min(1),
        problemStatement: z.string(),
        targetAudience: z.string(),
        proposedSolution: z.string(),
        uniqueAngle: z.string(),
        pricingHypothesis: z.string(),
        sourceThoughtIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [cluster] = await ctx.db
        .select()
        .from(thoughtClusters)
        .where(and(eq(thoughtClusters.id, input.clusterId), eq(thoughtClusters.userId, ctx.userId)));
      if (!cluster) throw new TRPCError({ code: 'NOT_FOUND' });

      const [idea] = await ctx.db
        .insert(ideas)
        .values({
          title: input.title,
          description: input.problemStatement, // legacy short description gets the problem statement
          problemStatement: input.problemStatement,
          targetAudience: input.targetAudience,
          proposedSolution: input.proposedSolution,
          uniqueAngle: input.uniqueAngle,
          pricingHypothesis: input.pricingHypothesis,
          sourceClusterId: input.clusterId,
          sourceThoughtIds: input.sourceThoughtIds,
          crystallizedAt: new Date(),
          crystallizedBy: ctx.userId,
          validationStatus: 'draft',
          userId: ctx.userId,
        })
        .returning({ id: ideas.id });

      if (!idea) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'CRYSTALLIZE_FAILED' });
      }

      return { ideaId: idea.id };
    }),

  /**
   * @deprecated Use previewCrystallize + confirmCrystallize instead.
   * One-shot crystallize kept for mobile clients on the old API. Returns both
   * `{ projectId }` (legacy) and `{ ideaId }` (new) so existing callers keep
   * working until mobile migrates. Remove after mobile ships the preview flow.
   */
  promoteToIdea: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const [cluster] = await ctx.db
        .select()
        .from(thoughtClusters)
        .where(and(eq(thoughtClusters.id, input.id), eq(thoughtClusters.userId, ctx.userId)));
      if (!cluster) throw new TRPCError({ code: 'NOT_FOUND' });

      const clusterThoughts = await ctx.db
        .select({
          id: thoughts.id,
          content: thoughts.content,
        })
        .from(thoughts)
        .where(and(eq(thoughts.clusterId, input.id), eq(thoughts.kind, 'thought')));
      if (clusterThoughts.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'CLUSTER_EMPTY' });
      }

      try {
        const fields = await synthesizeIdea(clusterThoughts.map((t) => t.content));
        const [idea] = await ctx.db
          .insert(ideas)
          .values({
            title: fields.title,
            description: fields.problemStatement,
            problemStatement: fields.problemStatement,
            targetAudience: fields.targetAudience,
            proposedSolution: fields.proposedSolution,
            uniqueAngle: fields.uniqueAngle,
            pricingHypothesis: fields.pricingHypothesis,
            sourceClusterId: input.id,
            sourceThoughtIds: clusterThoughts.map((t) => t.id),
            crystallizedAt: new Date(),
            crystallizedBy: ctx.userId,
            validationStatus: 'draft',
            userId: ctx.userId,
          })
          .returning({ id: ideas.id });

        if (!idea) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PROMOTE_FAILED' });
        }

        // Old API returned { projectId } — keep that shape for mobile compat.
        return { projectId: idea.id, ideaId: idea.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[ClusterRouter] PromoteToIdea failed:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PROMOTE_FAILED' });
      }
    }),

  identifyGaps: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
      try {
        const gaps = await identifyGaps(contents);
        const gapRecords = gaps.map((text) => ({ id: crypto.randomUUID(), text }));
        await ctx.db
          .update(thoughtClusters)
          .set({ gaps: gapRecords })
          .where(eq(thoughtClusters.id, input.id));
        await recomputeClusterReadiness(ctx.db, input.id);
        return { gaps: gapRecords };
      } catch (error) {
        console.error('[ClusterRouter] IdentifyGaps failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'IDENTIFY_GAPS_FAILED', cause: error });
      }
    }),

  generateBrief: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
      try {
        const brief = await generateBrief(contents);
        await ctx.db
          .update(thoughtClusters)
          .set({ brief })
          .where(eq(thoughtClusters.id, input.id));
        await recomputeClusterReadiness(ctx.db, input.id);
        return { brief };
      } catch (error) {
        console.error('[ClusterRouter] GenerateBrief failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'GENERATE_BRIEF_FAILED', cause: error });
      }
    }),

  findContradictions: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
      try {
        const contradictions = await findContradictions(contents);
        const tensionRecords = contradictions.map((text) => ({
          id: crypto.randomUUID(),
          text,
          resolvedAt: null,
        }));
        await ctx.db
          .update(thoughtClusters)
          .set({ tensions: tensionRecords })
          .where(eq(thoughtClusters.id, input.id));
        await recomputeClusterReadiness(ctx.db, input.id);
        return { contradictions, tensions: tensionRecords };
      } catch (error) {
        console.error('[ClusterRouter] FindContradictions failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'FIND_CONTRADICTIONS_FAILED', cause: error });
      }
    }),

  /**
   * Mark a tension (contradiction) as resolved. Triggers readiness recompute.
   */
  resolveTension: protectedProcedure
    .input(z.object({ clusterId: z.string(), tensionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [cluster] = await ctx.db
        .select()
        .from(thoughtClusters)
        .where(
          and(
            eq(thoughtClusters.id, input.clusterId),
            eq(thoughtClusters.userId, ctx.userId),
          ),
        );
      if (!cluster) throw new TRPCError({ code: 'NOT_FOUND', message: 'CLUSTER_NOT_FOUND' });

      const tensions =
        (cluster.tensions as { id: string; text: string; resolvedAt: Date | null }[]) ?? [];
      const updated = tensions.map((t) =>
        t.id === input.tensionId ? { ...t, resolvedAt: new Date() } : t,
      );

      await ctx.db
        .update(thoughtClusters)
        .set({ tensions: updated })
        .where(eq(thoughtClusters.id, input.clusterId));
      await recomputeClusterReadiness(ctx.db, input.clusterId);

      return { success: true };
    }),
});
