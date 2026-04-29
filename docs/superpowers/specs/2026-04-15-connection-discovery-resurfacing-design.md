# Design: Connection Discovery & Resurfacing Engine

**Created:** 2026-04-15
**Status:** Approved
**FRD Reference:** ThoughtCapture_IdeationFlow_FRD_v2.md, Sections 4.2, 6, 8

## Problem Statement

The IdeaFuel mobile app captures thoughts but never brings them back. Old thoughts sit dormant, and new thoughts are saved without any awareness of related existing ones. The FRD identifies this as the single biggest missing feature and the single largest competitive differentiator: engineered incubation through resurfacing and semantic collision detection.

## Scope

### In scope (this build)

- Wire up the existing `thoughtCollisionWorker` to run on every new thought creation
- Show an inline collision card on the Capture screen when a semantic match is found
- Build the incubation score calculation endpoint (full FRD formula)
- Build the Revisit section at the top of the Stream view with dismiss/engage/cluster actions
- Dismiss backoff logic (3d -> 7d -> 14d -> permanent exclusion)
- Add `dismissStreak` field to thoughts table

### Out of scope

- Cross-Cluster Pollination (FRD Phase 2, Mechanism 3)
- Push notifications for resurfacing (FRD specifies 1/day max; deferring)
- Maturity coaching / auto-promotion nudges (cut from scope)
- Capture streaks / gamification

## Users and Roles

Single role: authenticated IdeaFuel mobile app user. All features are per-user; users never see each other's thoughts or connections.

---

## Feature 1: Connection Discovery

### What exists today

| Component | Status |
|---|---|
| `thoughtCollisionWorker.ts` | Built. Generates embedding, searches similar thoughts, creates ThoughtConnection records for matches > 0.7, stores embedding for future detection. |
| `enqueueThoughtCollision()` in `queues.ts` | Built. Queue function defined with retry logic. |
| `searchThoughtEmbeddings()` in `vector-search.ts` | Built. Cosine similarity search against pgvector. |
| `generateQueryEmbedding()` in `embeddings.ts` | Built. OpenAI text-embedding-3-small. |
| `ConnectionsSection` component | Built. Displays connections in thought detail with type badges, previews, and navigation. |
| `thought.listConnections` endpoint | Built. Returns connections for a thought. |
| **Trigger in `thought.create`** | **MISSING. `enqueueThoughtCollision()` is never called.** |
| **Inline collision card on Capture screen** | **MISSING.** |

### Server changes

**`thought.create` mutation** (`packages/server/src/routers/thought.ts`):
After the thought is inserted and the response is ready to return, call:
```typescript
enqueueThoughtCollision({ thoughtId: newThought.id });
```
This is fire-and-forget. The mutation returns immediately; the worker processes async via BullMQ.

No changes needed to the collision worker, embedding pipeline, or vector search.

### Mobile changes: Collision Inline Card

**Location:** Capture screen (`packages/mobile/src/app/(tabs)/capture.tsx`)

**Current behavior:** After `createThought` succeeds, the app immediately navigates to `/(tabs)/thoughts/${newThought.id}`.

**New behavior:**
1. After `createThought` succeeds, show a "Thought saved" confirmation state on the Capture screen (replace the input area with a success message).
2. Begin polling `thought.listConnections({ id: newThought.id })` every 5 seconds, for up to 30 seconds (6 attempts max).
3. **If collision found:** Display an inline card below the confirmation:
   - Matched thought content preview (80 chars)
   - Relative time ("captured 3 days ago")
   - Connection strength score
   - Two action buttons:
     - **"View Together"** — navigates to the new thought's detail view (ConnectionsSection already displays the connection there)
     - **"Add to Cluster"** — opens ClusterPicker for the new thought
4. **If no collision after 30s:** Auto-navigate to thought detail (current behavior).
5. **If user taps the confirmation area or takes any action:** Navigate to thought detail.

**Component:** New `CollisionCard` component, rendered conditionally on the Capture screen during the post-save polling state.

### Data flow

```
User saves thought
  -> thought.create mutation
    -> inserts thought
    -> enqueueThoughtCollision({ thoughtId })
    -> returns newThought to client

Client enters polling state
  -> polls thought.listConnections every 5s

Worker (async, ~5-15s):
  -> fetches thought content
  -> generates embedding via OpenAI
  -> searches pgvector for similar thoughts (threshold: 0.7)
  -> creates ThoughtConnection records
  -> stores embedding for future detection

Client receives connection
  -> shows CollisionCard inline
  -> user acts or dismisses -> navigates to thought detail
```

### Edge cases

- **Content too short (< 10 chars):** Worker skips collision check. No error, no card shown. User navigates to detail after brief confirmation.
- **No existing thoughts:** Worker finds no matches. Polling returns empty. User navigates to detail after 30s or earlier tap.
- **Worker failure:** BullMQ retries 3 times with exponential backoff. Client polling times out at 30s and navigates normally. Silent failure — user sees normal flow.
- **Multiple collisions:** Worker creates connections for all matches > 0.7. Inline card shows only the highest-similarity match (first connection returned). All connections visible in thought detail's ConnectionsSection.
- **App backgrounded during polling:** Cancel polling interval. On foreground, navigate to thought detail (don't resume polling). Prevents wasted API calls and battery drain.
- **Rapid consecutive saves:** If user creates a second thought while polling is active for the first, cancel the first polling interval and start fresh for the new thought.

---

## Feature 2: Resurfacing Engine

### Server: `thought.getResurfaceCandidates` endpoint

A protected procedure that returns the top 3 thoughts eligible for resurfacing, scored by the FRD's incubation formula.

**Eligibility filter:** A thought qualifies if ALL of:
- `createdAt` is 24+ hours ago
- `isArchived` is false
- `promotedProjectId` is null
- `resurfaceExcluded` is false (not permanently dismissed)
- `nextSurfaceAt` is null OR `nextSurfaceAt` < now (backoff window expired)
- `lastSurfacedAt` is null OR `lastSurfacedAt` < 1 hour ago

**Incubation score formula** (FRD Section 4.2.3):
```
score = (0.4 * recency_factor)
      + (0.3 * connection_density)
      + (0.15 * type_diversity_bonus)
      + (0.15 * engagement_signal)

where:
  recency_factor      = gaussian(hours_since_last_view, peak=48, sigma=24)
                       = exp(-0.5 * ((hours - 48) / 24)^2)
  connection_density   = count(connections for this thought) / max(max_connections_across_all_user_thoughts, 1)
                         If a thought has 0 connections, connection_density = 0.
  type_diversity_bonus = 1.0 if connected to a thought of a different thoughtType, else 0.5
                         0.0 if no connections (thoughts not in the connections result set get 0.0)
  engagement_signal    = (engageCount - dismissCount) / max(surfaceCount, 1)
```

**Implementation approach:**
1. Fetch all eligible thoughts for the user (with a reasonable limit, e.g., 100 most recent eligible)
2. Fetch connection counts per thought in a single query
3. Determine `max_connections` across the user's corpus
4. For each thought with connections, check if any connected thought has a different `thoughtType` (batch query)
5. Calculate scores in-memory
6. Return top 3 sorted by score descending

**Response shape:**
```typescript
{
  candidates: Array<{
    id: string;
    content: string;
    thoughtType: string;
    maturityLevel: string;
    thoughtNumber: number;
    createdAt: Date;
    score: number;
    daysSinceCapture: number;
    connectionCount: number;
  }>
}
```

### Server: `thought.recordSurfaceAction` mutation

**Input:** `{ thoughtId: string, action: 'dismiss' | 'engage' | 'cluster' }`

Note: The action is named `engage` (not `react`) to avoid confusion with the `reactions` jsonb field on thoughts which tracks emoji reactions. The `reactCount` field on the schema is renamed to `engageCount` for consistency.

**Validation:**
- Thought must exist and belong to the authenticated user (standard ownership check, throw NOT_FOUND otherwise)
- If thought is already `resurfaceExcluded`, the action is a no-op — return success without incrementing counts
- Returns the updated thought fields (`surfaceCount`, `dismissStreak`, `lastSurfacedAt`) so the client can confirm

**Behavior:**
- Updates `lastSurfacedAt` to now
- Increments `surfaceCount` by 1
- If action is `dismiss`:
  - Increments `dismissCount` by 1
  - Increments `dismissStreak` by 1
  - Sets `nextSurfaceAt` based on streak:
    - streak 1: now + 3 days
    - streak 2: now + 7 days
    - streak 3: now + 14 days
    - streak 4+: sets `resurfaceExcluded = true` (permanent)
- If action is `engage` or `cluster`:
  - Increments `engageCount` by 1 (renamed from `reactCount` to avoid confusion with emoji `reactions` field)
  - Resets `dismissStreak` to 0 (positive engagement breaks the dismiss chain)
- Creates a `ThoughtEvent` with eventType `resurfaced` and metadata `{ action }`

### Schema changes

**Already in schema** (no changes needed):
- `lastSurfacedAt`, `surfaceCount`, `dismissCount`, `nextSurfaceAt` — all exist on the thoughts table

**Rename existing field:**
- `reactCount` -> `engageCount` — avoids confusion with the `reactions` jsonb field. Requires a column rename migration.

**Add to `thoughts` table:**
- `dismissStreak` — integer, default 0. Tracks consecutive dismisses for backoff calculation.
- `resurfaceExcluded` — boolean, default false. Permanently excludes a thought from resurfacing after 4+ dismisses.

**Add index:**
- Composite index on `(userId, resurfaceExcluded, nextSurfaceAt)` for efficient eligibility filtering in `getResurfaceCandidates`.

All new fields have defaults — existing rows get `dismissStreak=0`, `resurfaceExcluded=false` automatically. Generate a Drizzle migration for the additions, rename, and index.

**RLS:** No new RLS policies needed. New fields are on the existing `thoughts` table, which already has row-level security scoped to `userId`.

---

## Feature 3: Revisit Section (Mobile UI)

### Component: `RevisitSection`

**Location:** Rendered as `ListHeaderComponent` of the existing FlatList in the Stream view (`packages/mobile/src/app/(tabs)/thoughts/index.tsx`). Scrolls naturally with the stream.

**Layout:** Horizontal ScrollView of 1-3 compact cards.
- Section header: "Revisit" label (left-aligned)
- Cards are visually distinct from stream cards: slightly elevated, subtle surface background tint
- If no candidates, the section doesn't render (no empty state)

**Card contents:**
- Thought content preview (2 lines, ~80 chars)
- Relative time since capture ("3 days ago")
- Thought type chip (problem/solution/what_if/observation/question)
- Maturity dot (spark/developing/hypothesis/conviction)
- Three action buttons: Dismiss, Engage, Cluster

**Actions:**
- **Dismiss:** Calls `thought.recordSurfaceAction({ thoughtId, action: 'dismiss' })`. Card animates out (FadeOut). Haptic feedback.
- **Engage:** Calls `recordSurfaceAction({ action: 'engage' })`. Navigates to Capture screen with the resurfaced thought as context (see Engage -> Capture wiring below). Card animates out.
- **Cluster:** Opens ClusterPicker modal. On selection, calls `thought.addToCluster({ thoughtId, clusterId })` then `recordSurfaceAction({ action: 'cluster' })`. Card animates out.

### Engage -> Capture wiring

When the user taps "Engage" on a Revisit card, the app navigates to the Capture screen with a `linkedThoughtId` route param:
```typescript
router.push({ pathname: '/(tabs)/capture', params: { linkedThoughtId: thought.id } });
```

The Capture screen reads this param via `useLocalSearchParams`. When present:
- A small reference card appears above the text input showing the linked thought's content preview
- After `thought.create` succeeds for the new thought, call `thought.linkThought({ thoughtId: newThought.id, targetThoughtId: linkedThoughtId })` to create a `user_linked` connection
- The `linkedThoughtId` param is optional — when absent, the Capture screen behaves exactly as it does today (no changes to the normal flow)

### Data fetching and caching

- On Stream view mount/focus, check AsyncStorage for `lastResurfaceFetch` timestamp.
- If 1+ hour since last fetch (or no timestamp), call `thought.getResurfaceCandidates`.
- Store response in local state AND cache timestamp in AsyncStorage.
- Navigating away and back within the hour uses cached state (tRPC query cache handles this via `staleTime: 60 * 60 * 1000`).
- When a card is dismissed/actioned, remove it from local state immediately (optimistic). No re-fetch until next hour.

### Integration with existing Stream

The Stream FlatList currently renders `SwipeableThoughtCard` items with `renderNoteItem`. The Revisit section is injected via `ListHeaderComponent`:

```tsx
<FlatList
  data={notes}
  renderItem={renderNoteItem}
  ListHeaderComponent={
    resurfaceCandidates.length > 0 ? (
      <RevisitSection
        candidates={resurfaceCandidates}
        onDismiss={handleDismiss}
        onEngage={handleEngage}
        onCluster={handleCluster}
      />
    ) : null
  }
  ListEmptyComponent={renderNotesEmpty}
  // ... existing props
/>
```

---

## Files to create or modify

### New files
- `packages/mobile/src/components/thought/RevisitSection.tsx` — Revisit horizontal card section
- `packages/mobile/src/components/thought/CollisionCard.tsx` — Inline collision result card for Capture screen

### Modified files
- `packages/server/src/routers/thought.ts` — Add `enqueueThoughtCollision` call in `create`, add `getResurfaceCandidates` and `recordSurfaceAction` procedures
- `packages/server/src/db/schema.ts` — Add `dismissStreak` and `resurfaceExcluded` fields to thoughts table
- `packages/mobile/src/app/(tabs)/capture.tsx` — Add post-save polling state and CollisionCard rendering
- `packages/mobile/src/app/(tabs)/thoughts/index.tsx` — Add RevisitSection as ListHeaderComponent, data fetching with hourly debounce

### Unchanged files (already built, no modifications needed)
- `packages/server/src/jobs/workers/thoughtCollisionWorker.ts`
- `packages/server/src/jobs/queues.ts`
- `packages/server/src/lib/embeddings.ts`
- `packages/server/src/lib/vector-search.ts`
- `packages/mobile/src/components/thought/ConnectionsSection.tsx`
- `packages/mobile/src/components/ClusterPicker.tsx`

---

## Acceptance Criteria

### Connection Discovery
- [ ] `enqueueThoughtCollision()` called after every `thought.create`
- [ ] Collision check completes within 30 seconds of thought save
- [ ] Inline CollisionCard appears on Capture screen when match > 0.7 found
- [ ] "View Together" navigates to thought detail where ConnectionsSection shows the match
- [ ] "Add to Cluster" opens ClusterPicker for the new thought
- [ ] If no collision within 30s, navigates to thought detail normally
- [ ] Maximum 1 collision shown per capture (highest similarity)
- [ ] Content < 10 chars skips collision silently

### Resurfacing Engine
- [ ] `getResurfaceCandidates` returns top 3 eligible thoughts scored by FRD formula
- [ ] Only thoughts 24h+ old, not archived, not promoted, not in backoff window are eligible
- [ ] Score uses all 4 factors: recency, connection density, type diversity, engagement
- [ ] `recordSurfaceAction` validates ownership and handles resurfaceExcluded as no-op
- [ ] `recordSurfaceAction` updates surfaceCount, dismissCount/engageCount, and timestamps
- [ ] Dismiss backoff: 3d -> 7d -> 14d -> permanent exclusion
- [ ] Positive engagement (engage/cluster) resets dismissStreak
- [ ] `reactCount` renamed to `engageCount` in schema and all references

### Revisit Section
- [ ] Appears at top of Stream view when candidates exist
- [ ] Does not render when no candidates
- [ ] Horizontal scroll of 1-3 cards with content preview, time, type, maturity
- [ ] Dismiss animates card out and follows backoff schedule
- [ ] Engage navigates to Capture with `linkedThoughtId` param, auto-links new thought
- [ ] Cluster opens ClusterPicker and assigns thought
- [ ] Fetching debounced to once per hour via AsyncStorage timestamp
- [ ] Cards removed optimistically on action (no re-fetch within the hour)
