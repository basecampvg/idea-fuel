import { Worker, Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { db } from '../db/drizzle';
import { thoughts, thoughtEvents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { classifyThought } from '../services/thought-ai';

export const THOUGHT_CLASSIFY_QUEUE = 'thought-classify';

export function getThoughtClassifyQueue() {
  return new Queue(THOUGHT_CLASSIFY_QUEUE, { connection: createRedisConnection() });
}

export function createThoughtClassifyWorker() {
  return new Worker(
    THOUGHT_CLASSIFY_QUEUE,
    async (job) => {
      const { thoughtId } = job.data as { thoughtId: string };

      const [thought] = await db
        .select({
          id: thoughts.id,
          content: thoughts.content,
          typeSource: thoughts.typeSource,
          kind: thoughts.kind,
        })
        .from(thoughts)
        .where(eq(thoughts.id, thoughtId))
        .limit(1);

      if (!thought) return;
      if (thought.kind !== 'thought') {
        console.log(`[ThoughtClassify] skipping note ${thoughtId}`);
        return;
      }
      if (thought.typeSource === 'user') return;
      if (!thought.content || thought.content.length < 20) {
        console.log(`[ThoughtClassify] skipping short content ${thoughtId}`);
        return;
      }

      const result = await classifyThought(thought.content);

      await db.update(thoughts)
        .set({ thoughtType: result.thoughtType, typeSource: 'ai_auto' })
        .where(eq(thoughts.id, thoughtId));

      await db.insert(thoughtEvents).values({
        thoughtId,
        eventType: 'ai_tagged',
        metadata: { type: result.thoughtType },
      });
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    },
  );
}
