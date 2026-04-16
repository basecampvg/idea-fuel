# Build Plan: Resurfacing Engine
**Created:** 2026-04-15
**Spec:** FRD v2.0 Section 4.2 + Supplemental Spec Section 6
**Brainstorm:** plan-build/brainstorm/resurfacing-engine-brainstorm-2026-04-15.md
**Status:** Draft
**Project type:** Existing codebase

## Overview

Build the Resurfacing Engine — IdeaFuel's incubation system that surfaces old thoughts at the right moment. Two MVP mechanisms: (1) time-based Revisit section at the top of the Thoughts stream showing 1-3 thoughts ranked by incubation score, (2) semantic collision detection that identifies when a new thought is similar to an existing one and shows a banner on the detail screen.

## Component Inventory

| # | Component | Inputs | Outputs | Dependencies |
|---|-----------|--------|---------|-------------|
| 1 | Schema migration | — | New columns + enum value | Drizzle, Supabase |
| 2 | Thought embedding function | Thought content (string) | Embedding row in DB | OpenAI API, Embedding table |
| 3 | Thought vector search function | userId, query vector, threshold | Ranked similar thoughts | pgvector, Embedding table |
| 4 | Collision detection worker | thoughtId (from BullMQ job) | ThoughtConnections, collisionIds | Components 2, 3 |
| 5 | Resurfacing tRPC procedures | userId (from session) | Ranked thoughts, dismiss/surface mutations | Thought table |
| 6 | Revisit section UI | getResurfaced query data | User interactions (dismiss, cluster, navigate) | Component 5 |
| 7 | Collision banner UI | getCollision query data | User interactions (view, cluster) | Component 4 |

## Integration Contracts

### Contract 1: Thought Creation → Collision Worker
```
Source: thought.create mutation (packages/server/src/routers/thought.ts:116)
Target: thought-collision BullMQ queue
What flows: { thoughtId: string }
How: After insert + classify enqueue, add: getThoughtCollisionQueue().add('detect', { thoughtId })
Error path: Job fails silently (collision is non-critical). 3 retries with exponential backoff.
```

### Contract 2: Collision Worker → Embedding Service
```
Source: Collision worker (new file)
Target: generateQueryEmbedding() from packages/server/src/lib/embeddings.ts
What flows: thought.content (string) → 1536-dim float array
How: Direct function call (not a queue). Worker fetches thought, calls generateQueryEmbedding(thought.content).
Error path: If OpenAI fails, job retries (BullMQ built-in). Max 3 attempts.
```

### Contract 3: Collision Worker → Thought Vector Search
```
Source: Collision worker
Target: searchThoughtEmbeddings() (new function in vector-search.ts)
What flows: userId (string), embedding (float[1536]), threshold (0.7)
How: Direct function call. SQL query against Embedding table WHERE sourceType='THOUGHT' AND userId=[userId].
Returns: Array of { thoughtId, similarity, content } ordered by similarity desc.
Error path: Returns empty array on failure. Worker continues.
```

### Contract 4: Collision Worker → ThoughtConnection + collisionIds
```
Source: Collision worker
Target: thoughtConnections table, thoughts.collisionIds
What flows: For each match above 0.7: insert ThoughtConnection { thoughtAId, thoughtBId, connectionType: 'collision', strength: similarity, createdBy: 'ai' }. Update both thoughts' collisionIds arrays.
How: Drizzle insert + update in a transaction.
Error path: Transaction rollback. Job retries.
```

### Contract 5: Collision Worker → Store Thought Embedding
```
Source: Collision worker (after detection, regardless of matches)
Target: Embedding table
What flows: { sourceType: 'THOUGHT', sourceId: thoughtId, userId: userId, content: thought.content, embedding: vector }
How: Drizzle insert into Embedding table. No chunking needed (thoughts are short).
Error path: If insert fails, retry. Embedding is needed for future collisions against this thought.
```

### Contract 6: getResurfacedThoughts → Mobile Revisit Section
```
Source: trpc.thought.getResurfaced query
Target: RevisitSection component (ListHeaderComponent in notes/index.tsx)
What flows: Array of 1-3 thoughts with computed incubationScore, sorted desc.
How: tRPC query called on stream mount. Returns thoughts with score, preview content, age.
Error path: Returns empty array → Revisit section hides. No error UI needed.
```

### Contract 7: dismissResurfacedThought → Backoff Scheduling
```
Source: trpc.thought.dismiss mutation
Target: Thought row (dismissCount, nextSurfaceAt, incubationScore)
What flows: { thoughtId, action: 'dismiss' }
How: Increment dismissCount, calculate nextSurfaceAt based on backoff schedule:
  - dismiss 1: now + 3 days
  - dismiss 2: now + 7 days
  - dismiss 3: now + 14 days
  - dismiss 4+: nextSurfaceAt = null (permanent)
Create ThoughtEvent { eventType: 'resurface_action', metadata: { action: 'dismiss' } }.
Error path: Standard tRPC error. Toast on mobile.
```

### Contract 8: getCollisionForThought → Collision Banner
```
Source: trpc.thought.getCollision query
Target: CollisionBanner component (on note detail screen)
What flows: { thoughtId } → { collision: { matchedThoughtId, similarity, preview } | null }
How: Query ThoughtConnections WHERE thoughtAId=thoughtId AND connectionType='collision' AND createdAt > (thought.createdAt - 1 minute). Returns the highest-similarity collision.
Error path: Returns null → banner doesn't render.
```

## End-to-End Flows

### Flow A: Time-Based Resurfacing (Revisit)
```
1. User opens Thoughts stream (notes/index.tsx)
2. Screen mounts → calls trpc.thought.getResurfaced()
3. Server: SELECT thoughts WHERE userId=ctx.userId
     AND isArchived=false AND promotedProjectId IS NULL
     AND createdAt < now() - 24 hours
     AND (nextSurfaceAt IS NULL OR nextSurfaceAt <= now())
     AND dismissCount < 4
4. Server: For each eligible thought, compute incubation score inline:
     score = 0.4 * gaussian(hours_since_last_view, 48, 24)
           + 0.3 * (connection_count / max_connections)
           + 0.15 * type_diversity_bonus
           + 0.15 * (surfaceCount > 0 ? (1 - dismissCount/surfaceCount) : 0.5)
5. Server: Sort by score desc, return top 3
6. Server: For each returned thought, UPDATE lastSurfacedAt=now(), surfaceCount+=1
7. Server: Create ThoughtEvent { eventType: 'resurfaced' } for each
8. Mobile: RevisitSection renders horizontal card strip
9. User swipes/taps:
   - Tap card → router.push to thought detail
   - Tap "Dismiss" → calls trpc.thought.dismiss → card animates out
   - Tap "Cluster" → opens ClusterPicker → calls addToCluster
```

### Flow B: Semantic Collision Detection
```
1. User saves new thought via capture screen
2. Server: thought.create mutation inserts thought, creates event
3. Server: Enqueues thought-collision job { thoughtId }
4. Mobile: Navigates to new thought's detail screen
5. Worker picks up job (typically <5s):
   a. Fetch thought content
   b. Call generateQueryEmbedding(content) → 1536-dim vector
   c. Call searchThoughtEmbeddings(userId, vector, 0.7) → matches
   d. For each match: insert ThoughtConnection(type='collision', strength=similarity)
   e. Update both thoughts' collisionIds
   f. Store embedding in Embedding table (sourceType='THOUGHT')
   g. Create ThoughtEvent { eventType: 'connection_found' }
6. Mobile: Detail screen polls/refetches collision data
   - Option A: useQuery with refetchInterval=5000 for first 30s
   - Option B: Rely on manual pull-to-refresh or screen re-focus
7. CollisionBanner appears if collision found:
   "🔗 This connects to something you captured [X days ago]"
   [View] [Add to Cluster]
```

### Flow C: Dismiss with Exponential Backoff
```
1. User taps "Dismiss" on Revisit card
2. Mobile: calls trpc.thought.dismiss({ thoughtId })
3. Server: Reads current dismissCount
4. Server: Calculates nextSurfaceAt:
   - count 0→1: now + 3 days (259,200,000 ms)
   - count 1→2: now + 7 days
   - count 2→3: now + 14 days
   - count 3→4: null (permanent, never resurface)
5. Server: UPDATE thought SET dismissCount+=1, nextSurfaceAt=calculated
6. Server: Creates ThoughtEvent { eventType: 'resurface_action', metadata: { action: 'dismiss', nextSurfaceAt } }
7. Mobile: Card animates out, list refetches
```

## Convention Guide

Follow existing codebase conventions:
- **Server services:** Pure functions in `packages/server/src/services/` or `packages/server/src/lib/`
- **BullMQ workers:** Queue definition in `packages/server/src/jobs/queues.ts`, worker in `packages/server/src/jobs/workers/`, registration in `packages/server/src/worker.ts`
- **tRPC procedures:** Added to `packages/server/src/routers/thought.ts` (existing router)
- **Mobile components:** Feature-specific components in `packages/mobile/src/components/thought/`
- **Naming:** kebab-case files, PascalCase components, camelCase functions
- **Error handling:** TRPCError for server, Alert/Toast for mobile
- **Haptics:** triggerHaptic('success'|'error'|'light') on user actions
- **Mutations:** Invalidate relevant queries on success

## Issues Found

### Issue 1: Embedding table projectId is NOT NULL
**Problem:** Thought embeddings are user-level, not project-level. The Embedding table requires projectId.
**Fix:** Add nullable `userId` column to Embedding table. Make `projectId` nullable. Migration required.
**Impact:** Existing queries filter by projectId — they'll continue to work (thoughts won't have projectId set).

### Issue 2: No THOUGHT in EmbeddingSourceType enum
**Problem:** The `embedding_source_type` PostgreSQL enum only has REPORT, RESEARCH, INTERVIEW, NOTES, SERPAPI.
**Fix:** ALTER TYPE embedding_source_type ADD VALUE 'THOUGHT'. Must be in the migration.

### Issue 3: searchProjectEmbeddings scoped to projectId
**Problem:** The existing vector search function requires projectId. Thought collision needs userId-scoped search.
**Fix:** Create new function `searchThoughtEmbeddings(userId, embedding, threshold)` in vector-search.ts.

### Issue 4: No nextSurfaceAt field on Thought table
**Problem:** Exponential backoff needs to store when a thought becomes eligible for resurfacing again.
**Fix:** Add `nextSurfaceAt` timestamp column to Thought table. Nullable — null means either "never dismissed" (eligible by default) or "permanently dismissed" (check dismissCount >= 4).

### Issue 5: Collision detection timing for banner
**Problem:** The collision worker runs async. When the user lands on the detail screen, collisions may not be detected yet.
**Fix:** The `getCollision` query returns null initially. The detail screen uses a short refetch interval (5s) for the first 30s after thought creation to catch the collision when it arrives.

## Wiring Checklist

### Infrastructure (Phase 1)
- [ ] Add `THOUGHT` to `embedding_source_type` PostgreSQL enum
- [ ] Add `userId` column (nullable) to Embedding table
- [ ] Make `projectId` nullable on Embedding table
- [ ] Add `nextSurfaceAt` timestamp column to Thought table
- [ ] Run Drizzle migration: `pnpm db:generate && pnpm db:push`
- [ ] Update Drizzle schema.ts with new columns + enum value
- [ ] Create `searchThoughtEmbeddings()` in vector-search.ts
- [ ] Create `thought-collision` queue in queues.ts
- [ ] Create collision worker in jobs/workers/thoughtCollisionWorker.ts
- [ ] Register collision worker in worker.ts

### Server Logic (Phase 2)
- [ ] Add `thought-collision` job enqueue in thought.create mutation (after classify enqueue)
- [ ] Implement collision worker: embed → search → create connections → store embedding
- [ ] Add `getResurfaced` query to thought router (incubation scoring inline)
- [ ] Add `dismiss` mutation to thought router (backoff scheduling)
- [ ] Add `getCollision` query to thought router (for detail screen banner)
- [ ] Create ThoughtEvents for: resurfaced, resurface_action, connection_found

### Mobile UI (Phase 3)
- [ ] Create RevisitSection component (horizontal card scroll)
- [ ] Create RevisitCard component (thought preview + dismiss/cluster actions)
- [ ] Wire RevisitSection into notes/index.tsx as ListHeaderComponent
- [ ] Add getResurfaced query call on stream mount
- [ ] Wire dismiss mutation + card animation
- [ ] Wire cluster action → ClusterPicker (reuse existing)
- [ ] Create CollisionBanner component (for detail screen)
- [ ] Wire CollisionBanner into notes/[id]/index.tsx
- [ ] Add getCollision query with refetchInterval on detail screen
- [ ] Wire "View" action → navigate to matched thought
- [ ] Wire "Add to Cluster" action → ClusterPicker

## Build Order

### Phase 1: Schema + Infrastructure (no UI, no user-facing changes)
**Goal:** Database migration + embedding/search functions + collision worker ready to run.

Files to create/modify:
1. `packages/server/src/db/schema.ts` — Add nextSurfaceAt, userId on Embedding, THOUGHT enum, make projectId nullable
2. Drizzle migration (generate + push)
3. `packages/server/src/lib/vector-search.ts` — Add `searchThoughtEmbeddings()`
4. `packages/server/src/jobs/queues.ts` — Add `thought-collision` queue definition
5. `packages/server/src/jobs/workers/thoughtCollisionWorker.ts` — Full collision worker
6. `packages/server/src/worker.ts` — Register collision worker

### Phase 2: Server Procedures (tRPC endpoints)
**Goal:** All three procedures working and testable.

Files to modify:
1. `packages/server/src/routers/thought.ts` — Add `getResurfaced`, `dismiss`, `getCollision` procedures
2. `packages/server/src/routers/thought.ts` — Add collision job enqueue in `create` mutation

### Phase 3: Mobile UI
**Goal:** Revisit section on stream + collision banner on detail screen.

Files to create/modify:
1. `packages/mobile/src/components/thought/RevisitSection.tsx` — New component
2. `packages/mobile/src/components/thought/RevisitCard.tsx` — New component
3. `packages/mobile/src/components/thought/CollisionBanner.tsx` — New component
4. `packages/mobile/src/components/thought/index.ts` — Export new components
5. `packages/mobile/src/app/(tabs)/notes/index.tsx` — Wire RevisitSection
6. `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx` — Wire CollisionBanner
