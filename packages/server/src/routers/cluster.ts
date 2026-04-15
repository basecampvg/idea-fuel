/**
 * Cluster Router — CRUD + AI actions for thought collections.
 *
 * Procedures:
 * - list:              Return user's clusters with thought counts, sorted by updatedAt desc
 * - get:               Return cluster + its thoughts (ownership check)
 * - create:            Create new cluster
 * - update:            Update cluster name/color
 * - delete:            Delete cluster (unpins thoughts via FK set null)
 * - summarize:         AI summary of cluster thoughts
 * - extractTodos:      AI extraction of action items from thoughts
 * - promoteToIdea:     AI synthesis into a new project
 * - identifyGaps:      AI identification of knowledge gaps in thoughts
 * - generateBrief:     AI generation of a structured brief from thoughts
 * - findContradictions: AI detection of contradictions across thoughts
 */

import { eq, and, desc, count, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
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
import { thoughtClusters, thoughts, projects } from '../db/schema';
import {
  summarizeSandbox,
  extractTodosFromSandbox,
  synthesizeIdea,
  identifyGaps,
  generateBrief,
  findContradictions,
} from '../services/sandbox-ai';

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
    .select({ content: thoughts.content })
    .from(thoughts)
    .where(and(eq(thoughts.clusterId, clusterId), isNull(thoughts.promotedProjectId)));

  const contents = clusterThoughts
    .map((n: { content: string }) => n.content)
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
      .leftJoin(thoughts, and(eq(thoughts.clusterId, thoughtClusters.id), isNull(thoughts.promotedProjectId)))
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
        .where(and(eq(thoughts.clusterId, input.id), isNull(thoughts.promotedProjectId)))
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
        const summary = await summarizeSandbox(contents);
        return { summary };
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

  promoteToIdea: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
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
        console.error('[ClusterRouter] PromoteToIdea failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PROMOTE_FAILED', cause: error });
      }
    }),

  identifyGaps: protectedProcedure
    .input(clusterAiActionSchema)
    .mutation(async ({ ctx, input }) => {
      const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
      try {
        const gaps = await identifyGaps(contents);
        return { gaps };
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
        return { contradictions };
      } catch (error) {
        console.error('[ClusterRouter] FindContradictions failed:', error instanceof Error ? error.message : error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'FIND_CONTRADICTIONS_FAILED', cause: error });
      }
    }),
});
