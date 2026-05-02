/**
 * One-off backfill: re-enqueue classify jobs for thoughts that were created
 * with type_source='ai_auto' but never got reclassified (because the worker's
 * Anthropic key was invalid for a window). Targets only thoughts where:
 *   - kind = 'thought'
 *   - type_source = 'ai_auto'
 *   - thought_type = 'observation'
 *   - content length >= 20
 *
 * Safe to re-run; the classify worker is idempotent (it overwrites
 * thought_type and emits a new ai_tagged event each time).
 *
 * Usage:
 *   pnpm --filter @forge/server exec tsx src/scripts/reclassify-stuck-observations.ts
 */

import { db } from '../db/drizzle';
import { thoughts } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getThoughtClassifyQueue } from '../jobs/thought-classify';

async function main() {
  const stuck = await db
    .select({ id: thoughts.id, len: sql<number>`length(${thoughts.content})` })
    .from(thoughts)
    .where(
      and(
        eq(thoughts.kind, 'thought'),
        eq(thoughts.typeSource, 'ai_auto'),
        eq(thoughts.thoughtType, 'observation'),
      ),
    );

  const eligible = stuck.filter((t) => t.len >= 20);
  console.log(`Found ${stuck.length} 'observation' ai_auto thoughts; ${eligible.length} eligible (content >= 20 chars).`);

  if (eligible.length === 0) {
    process.exit(0);
  }

  const q = getThoughtClassifyQueue();
  let enqueued = 0;
  for (const t of eligible) {
    await q.add('classify', { thoughtId: t.id });
    enqueued += 1;
  }
  console.log(`Enqueued ${enqueued} classify jobs.`);

  await q.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('reclassify-stuck-observations failed:', err);
  process.exit(1);
});
