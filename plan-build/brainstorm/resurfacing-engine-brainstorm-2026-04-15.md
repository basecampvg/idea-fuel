# Brainstorm: Resurfacing Engine
**Created:** 2026-04-15
**Spec:** FRD v2.0 Section 4.2 (Incubation / Engineered Resurfacing) + Supplemental Spec Section 6
**Status:** Draft
**Project type:** Existing codebase

## Vision

The Resurfacing Engine is IdeaFuel's core differentiator: it brings old thoughts back at the right moment so they can collide with new ones. Two mechanisms for MVP: (1) time-based resurfacing via a "Revisit" section at the top of the Thoughts stream, and (2) semantic collision detection that alerts users when a newly captured thought is similar to an existing one.

## Existing Context

### Project Structure
- **Server:** tRPC + Drizzle ORM + PostgreSQL (Supabase) + BullMQ + Redis (Upstash)
- **Mobile:** Expo 54 + React Native 0.81, gesture handler + reanimated for swipe UX
- **Workers:** Railway-deployed BullMQ workers (research, spark, report, business plan, thought classify)

### Key Existing Infrastructure

**Embedding pipeline** (`packages/server/src/lib/embeddings.ts`):
- OpenAI `text-embedding-3-small` (1536 dimensions)
- Batch processing, chunking, project-scoped
- `generateQueryEmbedding(query)` — returns single vector for search
- `generateAndStoreEmbeddings(input)` — main entry point

**Vector search** (`packages/server/src/lib/vector-search.ts`):
- `searchProjectEmbeddings()` — cosine similarity search with threshold
- Returns similarity score 0-1, filters above threshold (default 0.7)
- Uses Drizzle `cosineDistance()` with HNSW index

**Embeddings table** (`packages/server/src/db/schema.ts:1006-1026`):
- Columns: id, projectId, sourceType (enum), sourceId, chunkIndex, content, embedding (vector 1536), metadata (jsonb)
- HNSW index on `vector_cosine_ops` for fast search
- Current sourceTypes: REPORT, RESEARCH, INTERVIEW, NOTES, SERPAPI
- **Decision: Add THOUGHT as new sourceType.** sourceId = thoughtId, projectId = null (thoughts are user-level, not project-level)

**Thought creation flow** (`packages/server/src/routers/thought.ts:116-190`):
- Creates thought → creates ThoughtEvent → enqueues `thought-classify` job if no user type
- **Hook point for collision detection:** After insert, enqueue new `thought-collision` job

**Thought schema fields** (already exist):
- `lastSurfacedAt`, `surfaceCount`, `dismissCount`, `reactCount`, `collisionIds`, `incubationScore`
- **Missing:** `nextSurfaceAt` timestamp for backoff scheduling (need to add)

**Thoughts list screen** (`packages/mobile/src/app/(tabs)/notes/index.tsx`):
- FlatList with swipeable cards, gesture handler root
- Fetches via `trpc.thought.list.useQuery()`
- **Hook point for Revisit:** Add section above the FlatList as ListHeaderComponent

**Capture screen** (`packages/mobile/src/app/(tabs)/capture.tsx`):
- On success: haptic + invalidate list + navigate to detail view
- **Collision UX decision:** Show collision banner on the detail screen (async, non-blocking)

**Note detail screen** (`packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`):
- Full thought detail with AIRefinement, Connections, ActivityLog, Comments
- **Hook point for collision banner:** New component above the content sections

## Components Identified

### Component 1: Thought Embedding Service
- **Responsibility:** Generate and store embeddings for individual thoughts
- **Upstream:** Thought creation (router), thought update (router)
- **Downstream:** Collision detection worker, resurfacing score (connection density)
- **External dependencies:** OpenAI API (text-embedding-3-small)
- **Hands test:** PASS — reuses existing `generateQueryEmbedding()` and Embedding table

### Component 2: Thought Collision Worker
- **Responsibility:** On new thought save, find semantically similar existing thoughts (>0.7), create ThoughtConnections, populate collisionIds
- **Upstream:** Thought creation triggers BullMQ job
- **Downstream:** ThoughtConnection table, Thought.collisionIds, collision notification query
- **External dependencies:** OpenAI API (for embedding the new thought), pgvector (for similarity search)
- **Hands test:** PASS — embedding + vector search infrastructure exists

### Component 3: Incubation Scoring (inline query)
- **Responsibility:** Compute incubation score for each eligible thought at query time
- **Upstream:** Called by `getResurfacedThoughts` query
- **Downstream:** Ranked list of 1-3 thoughts for Revisit section
- **External dependencies:** None (pure SQL/JS computation)
- **Hands test:** PASS — all inputs (timestamps, counts, connections) are on the Thought row

### Component 4: Resurfacing tRPC Procedures
- **Responsibility:** Three procedures: `getResurfacedThoughts` (query), `dismissResurfacedThought` (mutation), `surfaceThought` (mutation for logging view)
- **Upstream:** Mobile app calls on stream load
- **Downstream:** Updates Thought fields (lastSurfacedAt, surfaceCount, dismissCount, incubationScore), creates ThoughtEvents
- **External dependencies:** None
- **Hands test:** PASS

### Component 5: Revisit Section UI
- **Responsibility:** Horizontal scrolling card strip at top of thoughts stream showing 1-3 resurfaced thoughts
- **Upstream:** `getResurfacedThoughts` query result
- **Downstream:** User taps → navigate to detail, Dismiss → mutation, Cluster → cluster picker
- **External dependencies:** None
- **Hands test:** PASS — gesture handler + reanimated available, ClusterPicker reusable

### Component 6: Collision Banner UI
- **Responsibility:** Show inline notification on thought detail screen when a collision is detected
- **Upstream:** `getCollisionForThought` query (checks if thought has recent collisions)
- **Downstream:** User taps "View" → navigate to connected thought, "Add to Cluster" → cluster picker
- **External dependencies:** None
- **Hands test:** PASS

## Rough Dependency Map

```
Thought Creation (existing)
    │
    ├── enqueue thought-collision job ──► [Component 2: Collision Worker]
    │                                         │
    │                                         ├── Generate embedding ──► [Component 1: Embedding Service]
    │                                         ├── Vector similarity search (pgvector)
    │                                         ├── Create ThoughtConnections
    │                                         └── Update thought.collisionIds
    │
    └── Navigate to detail screen
              │
              └── [Component 6: Collision Banner] ◄── trpc.thought.getCollision query
                                                        (checks collisionIds populated by worker)

App Open → Thoughts Stream
    │
    └── [Component 5: Revisit Section] ◄── trpc.thought.getResurfaced query
              │                                    │
              │                                    └── [Component 3: Inline Scoring]
              │
              ├── Dismiss → trpc.thought.dismiss mutation [Component 4]
              ├── Cluster → ClusterPicker (existing)
              └── Tap → Navigate to detail
```

## Risk Assessment

### Embedding Table Schema Change
The Embedding table requires `projectId` as NOT NULL. Thought embeddings are user-level, not project-level. Options:
1. Make `projectId` nullable (migration required)
2. Use a sentinel value (hacky)
3. Store userId in projectId field (confusing)

**Recommendation:** Make `projectId` nullable. Add `userId` column. Simple migration, clean semantics.

### Vector Search Scoping
`searchProjectEmbeddings()` filters by `projectId`. Thought collision needs to search across ALL of a user's thought embeddings, not a single project. Need a new search function: `searchThoughtEmbeddings(userId, query, threshold)`.

### Embedding Cost
Each thought generates one embedding call (~$0.00002 per thought at text-embedding-3-small pricing). At 10 thoughts/day = $0.0002/day/user. Negligible.

### Collision Detection Latency
Must complete within 30 seconds (FRD requirement). Embedding generation (~1s) + vector search (~0.5s) + insert connections (~0.5s) = ~2s total. Well within budget even without the async worker — but using the worker keeps the capture flow snappy.

### Missing Schema Field
`nextSurfaceAt` timestamp needed on Thought table for exponential backoff scheduling. The dismiss mutation sets this based on dismiss count: 3d → 7d → 14d → null (permanent).

## Open Questions

1. **Embeddings table projectId nullable migration** — Need to verify no existing queries assume projectId is always set. (Checked: `searchProjectEmbeddings` filters by projectId, won't match null. Safe.)
2. **Should the collision worker also update the collided thought's collisionIds?** — FRD doesn't specify. Recommendation: yes, connections are bidirectional.

## Risks and Concerns

- **Stale embeddings on thought edit:** If a user edits a thought after capture, the embedding becomes stale. The collision worker should re-embed on thought update (or accept staleness for MVP).
- **Cold start:** New users with <5 thoughts won't get meaningful collisions. Revisit section should hide when user has <3 eligible thoughts.
- **Scroll performance:** Horizontal scroll at top of FlatList must not interfere with vertical scroll. Use ListHeaderComponent pattern (existing in codebase).
