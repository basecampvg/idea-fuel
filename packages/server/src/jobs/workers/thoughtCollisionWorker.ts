/**
 * Thought Collision Detection Worker
 *
 * When a new thought is created, this worker:
 * 1. Fetches the thought content
 * 2. Generates an embedding via OpenAI
 * 3. Searches for semantically similar thoughts by the same user
 * 4. Creates ThoughtConnections for matches above the similarity threshold
 * 5. Updates collisionIds on both thoughts
 * 6. Stores the thought's embedding for future collision detection
 */

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis';
import { db } from '../../db/drizzle';
import { eq, sql } from 'drizzle-orm';
import { thoughts, thoughtConnections, thoughtEvents, embeddings } from '../../db/schema';
import { QUEUE_NAMES, type ThoughtCollisionJobData } from '../queues';
import { generateQueryEmbedding } from '../../lib/embeddings';
import { searchThoughtEmbeddings } from '../../lib/vector-search';

const COLLISION_THRESHOLD = 0.7;

export function createThoughtCollisionWorker() {
  const worker = new Worker<ThoughtCollisionJobData>(
    QUEUE_NAMES.THOUGHT_COLLISION,
    async (job: Job<ThoughtCollisionJobData>) => {
      const { thoughtId } = job.data;

      console.log(`[CollisionWorker] Processing thought ${thoughtId}`);

      // 1. Fetch the thought
      const [thought] = await db
        .select({
          id: thoughts.id,
          content: thoughts.content,
          userId: thoughts.userId,
          collisionIds: thoughts.collisionIds,
        })
        .from(thoughts)
        .where(eq(thoughts.id, thoughtId))
        .limit(1);

      if (!thought) {
        console.log(`[CollisionWorker] Thought ${thoughtId} not found, skipping`);
        return { success: false, reason: 'not_found' };
      }

      if (!thought.content || thought.content.length < 10) {
        console.log(`[CollisionWorker] Thought ${thoughtId} content too short, skipping`);
        return { success: false, reason: 'content_too_short' };
      }

      // 2. Generate embedding for the thought content
      const embedding = await generateQueryEmbedding(thought.content);

      // 3. Search for similar thoughts by this user
      const matches = await searchThoughtEmbeddings({
        userId: thought.userId,
        embedding,
        threshold: COLLISION_THRESHOLD,
        excludeThoughtId: thoughtId,
      });

      console.log(`[CollisionWorker] Found ${matches.length} collisions for thought ${thoughtId}`);

      // 4. Create ThoughtConnections and update collisionIds for each match
      if (matches.length > 0) {
        await db.transaction(async (tx) => {
          for (const match of matches) {
            const matchedThoughtId = match.sourceId;

            // Insert ThoughtConnection
            await tx.insert(thoughtConnections).values({
              thoughtAId: thoughtId,
              thoughtBId: matchedThoughtId,
              connectionType: 'collision',
              strength: match.similarity,
              createdBy: 'ai',
            });

            // Update collisionIds on the new thought
            await tx.update(thoughts)
              .set({
                collisionIds: sql`array_append(${thoughts.collisionIds}, ${matchedThoughtId})`,
              })
              .where(eq(thoughts.id, thoughtId));

            // Update collisionIds on the matched thought
            await tx.update(thoughts)
              .set({
                collisionIds: sql`array_append(${thoughts.collisionIds}, ${thoughtId})`,
              })
              .where(eq(thoughts.id, matchedThoughtId));
          }

          // Create a ThoughtEvent for connection discovery
          await tx.insert(thoughtEvents).values({
            thoughtId,
            eventType: 'connection_found',
            metadata: {
              matchCount: matches.length,
              matches: matches.map((m) => ({
                thoughtId: m.sourceId,
                similarity: m.similarity,
              })),
            },
          });
        });
      }

      // 5. Store the thought's embedding for future collision detection
      await db.insert(embeddings).values({
        sourceType: 'THOUGHT',
        sourceId: thoughtId,
        userId: thought.userId,
        projectId: null,
        chunkIndex: 0,
        content: thought.content,
        embedding,
        metadata: { model: 'text-embedding-3-small' },
      });

      console.log(
        `[CollisionWorker] Completed thought ${thoughtId}: ${matches.length} collisions, embedding stored`
      );

      return {
        success: true,
        thoughtId,
        collisionCount: matches.length,
        matchedThoughtIds: matches.map((m) => m.sourceId),
      };
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute to respect OpenAI rate limits
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(
      `[CollisionWorker] Job ${job?.id} failed:`,
      err.message
    );
  });

  return worker;
}
