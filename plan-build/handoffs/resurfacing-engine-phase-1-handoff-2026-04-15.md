# Phase 1 Handoff: Schema + Infrastructure
**Plan:** plan-build/planning/resurfacing-engine-plan-2026-04-15.md
**Phase:** 1 — Schema + Infrastructure
**Status:** COMPLETE
**Builder:** Claude Opus 4.6
**Date:** 2026-04-15

## Checklist Status

- [x] Add `THOUGHT` to `embedding_source_type` PostgreSQL enum
- [x] Add `userId` column (nullable) to Embedding table
- [x] Make `projectId` nullable on Embedding table
- [x] Add `nextSurfaceAt` timestamp column to Thought table
- [ ] Run Drizzle migration: `pnpm db:generate && pnpm db:push` — **SKIPPED per instructions: user will run manually**
- [x] Update Drizzle schema.ts with new columns + enum value
- [x] Create `searchThoughtEmbeddings()` in vector-search.ts
- [x] Create `thought-collision` queue in queues.ts
- [x] Create collision worker in jobs/workers/thoughtCollisionWorker.ts
- [x] Register collision worker in worker.ts

## Files Modified

| File | Change |
|------|--------|
| `packages/server/src/db/schema.ts` | Added `THOUGHT` to `embeddingSourceTypeEnum`; added `userId` (nullable text) and `Embedding_userId_idx` index to Embedding table; made `projectId` nullable; added `Embedding_userId_fkey` foreign key; added `nextSurfaceAt` timestamp to Thought table; added user relation to `embeddingsRelations` |
| `packages/server/src/lib/vector-search.ts` | Added `searchThoughtEmbeddings()` function with `ThoughtSearchOptions` and `ThoughtSearchResult` interfaces |
| `packages/server/src/jobs/queues.ts` | Added `THOUGHT_COLLISION` to `QUEUE_NAMES`; added `ThoughtCollisionJobData` interface; added `_thoughtCollisionQueue` lazy variable; added `getThoughtCollisionQueue()` and `enqueueThoughtCollision()` functions; added queue to `getQueueStats()` lookup |
| `packages/server/src/jobs/workers/index.ts` | Added export for `createThoughtCollisionWorker` |
| `packages/server/src/worker.ts` | Imported and instantiated `createThoughtCollisionWorker`; added to `allWorkers` array; added console.log entry |

## Files Created

| File | Purpose |
|------|---------|
| `packages/server/src/jobs/workers/thoughtCollisionWorker.ts` | Full collision detection worker: fetches thought, generates embedding, searches for similar thoughts, creates ThoughtConnections, updates collisionIds, stores embedding |

## Key Symbols Introduced

| Symbol | File | Description |
|--------|------|-------------|
| `searchThoughtEmbeddings()` | vector-search.ts | User-scoped vector search filtered by sourceType='THOUGHT' and userId. Accepts pre-computed embedding vector (not a query string). Returns `ThoughtSearchResult[]`. |
| `ThoughtSearchOptions` | vector-search.ts | Interface: `{ userId, embedding, threshold?, limit?, excludeThoughtId? }` |
| `ThoughtSearchResult` | vector-search.ts | Interface: `{ id, sourceId, content, similarity }` |
| `QUEUE_NAMES.THOUGHT_COLLISION` | queues.ts | Queue name constant: `'thought-collision'` |
| `ThoughtCollisionJobData` | queues.ts | Interface: `{ thoughtId: string }` |
| `getThoughtCollisionQueue()` | queues.ts | Lazy-initialized BullMQ queue getter |
| `enqueueThoughtCollision()` | queues.ts | Convenience function to enqueue a collision detection job |
| `createThoughtCollisionWorker()` | thoughtCollisionWorker.ts | Creates and returns the BullMQ worker instance |
| `COLLISION_THRESHOLD` | thoughtCollisionWorker.ts | Constant: `0.7` (minimum similarity to create a connection) |
| `thoughts.nextSurfaceAt` | schema.ts | Nullable timestamp column for exponential backoff scheduling |
| `embeddings.userId` | schema.ts | Nullable text column for user-scoped thought embeddings |

## Deviations from Plan

1. **Migration not run:** Per build instructions, Drizzle migration commands (`pnpm db:generate && pnpm db:push`) were NOT executed. The schema.ts file is updated and ready for migration. User must run `pnpm db:generate && pnpm db:push` before testing.

2. **searchThoughtEmbeddings takes pre-computed embedding vector:** Unlike `searchProjectEmbeddings` which takes a query string and generates the embedding internally, `searchThoughtEmbeddings` takes a pre-computed `number[]` embedding. This avoids double-computing the embedding in the collision worker (which needs the vector both for search and for storage).

3. **Collision worker includes rate limiter:** Added a `limiter: { max: 10, duration: 60000 }` to the worker config (matching the embedding worker pattern) to respect OpenAI embedding API rate limits.

## Open Issues

1. **Migration required:** The PostgreSQL enum `ALTER TYPE` for adding `THOUGHT` needs special handling in Drizzle. Drizzle may generate an `ALTER TYPE ... ADD VALUE` statement which cannot run inside a transaction. If migration fails, you may need to manually run `ALTER TYPE "EmbeddingSourceType" ADD VALUE 'THOUGHT';` directly in SQL before pushing the rest of the migration.

2. **Existing embeddings have NOT NULL projectId:** The schema change makes `projectId` nullable, but the existing foreign key cascade behavior (ON DELETE CASCADE) means if a project is deleted, its embeddings are still deleted. Thought embeddings (projectId=null) won't be affected by project deletions since the FK is nullable.

## What Phase 2 Needs

Phase 2 (Server Procedures) should:
1. **Run the migration first** (`pnpm db:generate && pnpm db:push`)
2. Add `enqueueThoughtCollision({ thoughtId })` call in the `thought.create` mutation (after the existing classify enqueue)
3. Implement `getResurfaced` tRPC query using `thoughts.nextSurfaceAt` and inline incubation scoring
4. Implement `dismiss` tRPC mutation using `thoughts.nextSurfaceAt` and `thoughts.dismissCount`
5. Implement `getCollision` tRPC query using `thoughtConnections` table
6. All new queue/worker/search infrastructure from Phase 1 is ready to use via imports from `../jobs/queues` and `../lib/vector-search`

## Type-Check Verification

All modified and created files pass TypeScript compilation with zero new errors. Pre-existing blog script TS4058 errors are unrelated.
