# Thought Schema Migration + Capture Redesign — Design Spec

**Created:** 2026-04-15
**Status:** Draft
**Branch:** matt/thought-capture
**Parent FRD:** ThoughtCapture_IdeationFlow_FRD_v2.md (Sections 3, 4.1)
**Supplemental Spec:** ThoughtDetailView_PropertySystem_Spec.md (Sections 3, 7, 8, 9, 11, 12)
**Phase:** 2 of Thought Capture buildout (Phase 1 = Thoughts tab merge, completed)

---

## Problem Statement

The current data model uses a `Note` entity with a `QUICK | AI` type enum that forces users to choose between raw capture and AI-assisted capture at creation time. This premature convergence kills divergent thinking (Guilford). The schema also lacks fields for thought classification, maturity tracking, incubation, and the property system defined in the supplemental spec. The Capture UI has 3 options (Quick Note, AI Note, Idea) when it should have 2 (Thought, Idea).

## Scope

### In scope (this phase)
- Full schema migration: Note → Thought, Sandbox → Cluster
- All new columns from FRD §3.1 + Property System spec §12
- New tables: ThoughtConnection, ThoughtEvent, ThoughtComment, CrystallizedIdea
- tRPC router renames: note.* → thought.*, sandbox.* → cluster.*
- New server procedures: thought.updateProperties, thought.addReaction, thought.removeReaction, thought.addComment, thought.deleteComment, thought.listEvents
- New background job: thought.autoClassify (async type detection via Claude Haiku)
- Capture UI: eliminate Quick/AI split, add thought type chips
- Remove auto-refine behavior from thought detail editor
- Update all mobile tRPC calls to new router names
- Stream card redesign: type colored dots replace Quick/Refined/Pinned badges
- Delete NoteTypePopover, rename SandboxPicker → ClusterPicker
- Shared validator updates for all new enums and schemas

### Out of scope (later phases)
- Full Thought Detail View redesign (Property chip bar, Activity log, Connections panel, Comments UI, Reactions UI) — that's the Property System spec phase
- Resurfacing Engine / Revisit section
- Cluster AI action renames (Extract Themes, Find Tensions, etc.)
- Dimension coverage bar and readiness scoring
- Crystallization flow
- Bridge to Spark
- Maturity auto-suggestion logic
- Semantic collision detection
- Push notifications

### MVP vs stretch
- **MVP:** Schema migration, router renames, capture simplification, type chips, auto-classify job, card dot indicators
- **Stretch:** Confidence level in capture UI (currently Phase 2 per Property spec)

---

## 1. Schema Migration

### 1.1 Thought Table (renamed from Note)

One Drizzle migration that renames the table and adds all columns. Existing data gets safe defaults.

**New columns added to existing table:**

| Column | Type | Default | Nullable | Source |
|--------|------|---------|----------|--------|
| `thoughtType` | enum: problem, solution, what_if, observation, question | 'observation' | no | FRD §3.1 |
| `typeSource` | text | 'ai_auto' | no | FRD §3.1 |
| `maturityLevel` | text | 'spark' | no | FRD §3.1 |
| `maturityNotes` | text | — | yes | FRD §3.1 |
| `maturityHistory` | jsonb | '[]' | no | FRD §3.1 |
| `confidenceLevel` | text | 'untested' | no | Property §3.2.3 |
| `thoughtNumber` | integer | — | no | Property §11 |
| `reactions` | jsonb | '[]' | no | Property §7 |
| `captureMethod` | text | 'quick_text' | no | FRD §3.1 |
| `voiceMemoUrl` | text | — | yes | FRD §3.1 |
| `transcription` | text | — | yes | FRD §3.1 |
| `aiRefinement` | text | — | yes | FRD §3.1 |
| `tags` | text[] | '{}' | no | FRD §3.1 |
| `aiTags` | text[] | '{}' | no | FRD §3.1 |
| `lastSurfacedAt` | timestamp | — | yes | FRD §3.1 |
| `surfaceCount` | integer | 0 | no | FRD §3.1 |
| `dismissCount` | integer | 0 | no | FRD §3.1 |
| `reactCount` | integer | 0 | no | FRD §3.1 |
| `collisionIds` | text[] | '{}' | no | FRD §3.1 |
| `incubationScore` | real | 0 | no | FRD §3.1 |
| `clusterPosition` | integer | — | yes | FRD §3.1 |
| `captureSource` | text | — | yes | FRD §3.1 |
| `isArchived` | boolean | false | no | FRD §3.1 |

**Columns renamed:**
- `sandboxId` → `clusterId`

**Column removed:**
- `type` (QUICK/AI enum) — no longer needed

**Columns kept as-is:**
- `id`, `content`, `userId`, `createdAt`, `updatedAt`
- `sourceNoteId` (rename to `sourceThoughtId` for consistency)
- `refinedTitle`, `refinedDescription`, `refinedTags`, `lastRefinedAt`
- `promotedProjectId`

**Existing data migration defaults:**
- All notes: `thoughtType: 'observation'`, `typeSource: 'ai_auto'`, `captureMethod: 'quick_text'`, `confidenceLevel: 'untested'`
- Notes with `type = 'AI'` and `refinedTitle IS NOT NULL`: `maturityLevel: 'developing'`
- All other notes: `maturityLevel: 'spark'`
- `thoughtNumber`: assigned sequentially per user ordered by `createdAt` (SQL window function)

### 1.2 Cluster Table (renamed from Sandbox)

**Existing columns kept:** id, name, color, userId, createdAt, updatedAt

**New columns:**

| Column | Type | Default | Source |
|--------|------|---------|--------|
| `description` | text | — | FRD §3.2 |
| `themes` | jsonb | '[]' | FRD §3.2 |
| `tensions` | jsonb | '[]' | FRD §3.2 |
| `gaps` | jsonb | '[]' | FRD §3.2 |
| `synthesis` | text | — | FRD §3.2 |
| `clusterMaturity` | text | 'exploring' | FRD §3.2 |
| `readinessScore` | real | — | FRD §3.2 |
| `dimensionCoverage` | jsonb | — | FRD §3.2 |
| `projectId` | text | — | FRD §3.2 |

### 1.3 New Tables

**ThoughtConnection** (FRD §3.3):
```
id              text PK
thoughtAId      text FK → Thought
thoughtBId      text FK → Thought
connectionType  text (semantic | user_linked | collision | contradiction)
strength        real (0–1.0)
createdBy       text (ai | user)
surfacedAt      timestamp nullable
userAction      text nullable (acknowledged | dismissed | merged)
createdAt       timestamp
```

**ThoughtEvent** (Property spec §8.4):
```
id              text PK
thoughtId       text FK → Thought
eventType       text (created | ai_tagged | type_changed | refined | resurfaced |
                      resurface_action | clustered | unclustered | maturity_changed |
                      confidence_changed | connection_found | connection_added |
                      reaction_added | commented | crystallized)
metadata        jsonb
createdAt       timestamp
```

**ThoughtComment** (Property spec §9.3):
```
id              text PK
thoughtId       text FK → Thought
userId          text FK → User
content         text
createdAt       timestamp
updatedAt       timestamp
```

**CrystallizedIdea** (FRD §3.4):
```
id                text PK
userId            text FK → User
clusterId         text FK → Cluster nullable
projectId         text FK → Project
problemStatement  text nullable
targetAudience    text nullable
proposedSolution  text nullable
uniqueAngle       text nullable
pricingHypothesis text nullable
sparkAnswers      jsonb nullable
sparkSessionId    text nullable
sourceThoughtIds  text[]
crystallizedAt    timestamp
crystallizedBy    text (user_manual | user_prompted)
```

### 1.4 Enum Changes

**Remove:** `NoteType` enum ('QUICK', 'AI')

**Add:** `ThoughtType` enum ('problem', 'solution', 'what_if', 'observation', 'question')

Note: maturityLevel, confidenceLevel, captureMethod are stored as text with application-level validation (not Postgres enums) to avoid migration friction when adding new values.

---

## 2. Server Changes

### 2.1 Router Renames

All `note.*` procedures become `thought.*`. All `sandbox.*` procedures become `cluster.*`.

The old router names are kept as thin aliases that delegate to the new implementations. This supports the bridge files from Phase 1 and any cached mobile clients.

### 2.2 thought.create Changes

**Old input:** `{ type?: 'QUICK' | 'AI', content?: string, sandboxId?: string }`

**New input:** `{ content?: string, thoughtType?: ThoughtType, captureMethod?: CaptureMethod, clusterId?: string }`

- `type` param removed entirely
- If `thoughtType` provided: save it, set `typeSource: 'user'`
- If `thoughtType` omitted: set `typeSource: 'ai_auto'`, enqueue `thought.autoClassify` background job
- `captureMethod` defaults to `'quick_text'`
- Always creates a `ThoughtEvent` with `eventType: 'created'`
- Assigns next `thoughtNumber` for the user (SELECT MAX + 1, or 1 if first)

### 2.3 thought.refine Changes

- Remove the `type === 'QUICK'` guard — any thought can be refined
- Remove the auto-refine timer reference (server-side was already on-demand, the timer was client-side)
- Creates a ThoughtEvent with `eventType: 'refined'`

### 2.4 thought.extractIdeas Changes

- Remove the QUICK-only restriction — works on any thought with ≥50 chars
- Extracted ideas become new thoughts (not notes) with appropriate defaults

### 2.5 New Procedures

**thought.updateProperties**
- Input: `{ id, maturityLevel?, thoughtType?, confidenceLevel? }`
- Updates specified fields. Logs a ThoughtEvent for each changed property.
- If maturityLevel changes, appends to `maturityHistory` array.
- If thoughtType changes and was previously ai_auto, sets `typeSource: 'user'`.

**thought.addReaction**
- Input: `{ thoughtId, emoji }` where emoji is one of: 🔥, ⭐, 🤔, 🚫, 💡
- Increments count in reactions JSON array. Creates ThoughtEvent.

**thought.removeReaction**
- Input: `{ thoughtId, emoji }`
- Removes all of that emoji type from reactions array.

**thought.addComment**
- Input: `{ thoughtId, content }`
- Creates ThoughtComment row. Creates ThoughtEvent with `eventType: 'commented'`.

**thought.deleteComment**
- Input: `{ commentId }`
- Deletes own comment only (checks userId). No ThoughtEvent for deletes.

**thought.listEvents**
- Input: `{ thoughtId, limit?, cursor? }`
- Returns paginated ThoughtEvents, newest first.

### 2.6 Background Job: thought.autoClassify

New BullMQ job registered in the worker:

1. Accepts `{ thoughtId }` payload
2. Fetches thought content
3. Calls Claude Haiku with a classification prompt:
   - System: "Classify the following thought into exactly one category: problem, solution, what_if, observation, question"
   - Returns structured output via Zod schema
4. Updates `thoughtType` and `typeSource: 'ai_auto'`
5. Creates ThoughtEvent: `{ eventType: 'ai_tagged', metadata: { type: 'observation' } }`
6. Target completion: <10 seconds from capture

### 2.7 Shared Validators

Update `packages/shared/src/validators/index.ts`:

**New enums:**
- `thoughtTypeSchema`: z.enum(['problem', 'solution', 'what_if', 'observation', 'question'])
- `maturityLevelSchema`: z.enum(['spark', 'developing', 'hypothesis', 'conviction'])
- `confidenceLevelSchema`: z.enum(['untested', 'researched', 'validated'])
- `captureMethodSchema`: z.enum(['quick_text', 'voice', 'photo', 'share_extension'])
- `reactionEmojiSchema`: z.enum(['🔥', '⭐', '🤔', '🚫', '💡'])

**New schemas:**
- `createThoughtSchema` (replaces createNoteSchema)
- `updateThoughtPropertiesSchema`
- `addReactionSchema`
- `addCommentSchema`
- `thoughtEventTypeSchema`

**Deprecated:** `createNoteSchema`, `noteTypeSchema` (kept for backwards compat but marked deprecated)

---

## 3. Mobile Capture Changes

### 3.1 CaptureActionMenu Simplification

Goes from 3 options to 2:

| Option | Icon | Subtitle | Action |
|--------|------|----------|--------|
| **Thought** | NotebookPen | "Capture a raw thought" | `thought.create({ content, thoughtType?, captureMethod })` → navigate to `/(tabs)/thoughts/[id]` |
| **Idea** | Lightbulb | "Send to vault for validation" | `project.create(...)` → navigate to vault (unchanged) |

### 3.2 ThoughtTypeChips Component

New component: `packages/mobile/src/components/ThoughtTypeChips.tsx`

- Horizontal row of 5 tappable chips below the text input on the Capture screen
- Each chip: colored dot + label (Problem, Solution, What If, Observation, Question)
- Single-select, optional (tapping selected chip deselects it)
- Returns `thoughtType: ThoughtType | null` to parent
- Chip colors match the Property spec §3.2.2 type colors

### 3.3 Capture Tab Updates

- Import ThoughtTypeChips, render below text input
- `handleNoteCapture` renamed to `handleThoughtCapture`
- Passes `thoughtType` from chips (or null for auto-detect)
- Passes `captureMethod: 'quick_text'` or `'voice'` based on whether dictation was used
- CaptureActionMenu receives `onThought` instead of `onQuickNote`/`onAINote`

### 3.4 NoteTypePopover Deletion

File deleted: `packages/mobile/src/components/NoteTypePopover.tsx`

The Thoughts Stream FAB now calls `thought.create()` directly (no type selection modal). Creates a thought with default type and navigates to the detail editor.

### 3.5 Thought Detail Editor Changes

In `notes/[id]/index.tsx` (and its bridge at `thoughts/[id]/index.tsx`):

- Remove auto-refine timer (the 3-second idle trigger and `scheduleAutoRefine` function)
- Remove all `note.type === 'QUICK'` checks
- Placeholder text: "Dump your thoughts here..." (universal, no AI-specific hint)
- IdeaCard display stays (shows refinement when triggered on-demand)
- Refine button available in overflow menu or as inline CTA when no refinement exists
- All `trpc.note.*` calls become `trpc.thought.*`
- All `trpc.sandbox.*` calls become `trpc.cluster.*`

### 3.6 Stream Card Updates

In `thoughts/index.tsx`, the `getNoteMeta` function is replaced with `getThoughtMeta`:

- Instead of Quick/Refined/Promoted badges → show a small colored dot for the thought type
- Dot colors match Property spec §3.2.2:
  - Problem: `#EF4444` (red)
  - Solution: `#10B981` (green)
  - What If: `#8B5CF6` (purple)
  - Observation: `#3B82F6` (blue)
  - Question: `#F59E0B` (amber)
- The "Pinned" badge is removed (cluster membership visible in detail view)
- "Promoted" badge stays (important signal in the stream)
- Card icon changes from Sparkles/NotebookPen to a simple filled circle with the type color

### 3.7 ClusterPicker Rename

`SandboxPicker.tsx` → `ClusterPicker.tsx`. UI copy changes "Sandbox" → "Cluster" throughout. Uses `trpc.cluster.*` calls.

---

## 4. Data Migration Strategy

The migration is a single Drizzle migration file that:

1. Adds the `ThoughtType` enum to Postgres
2. Renames `Note` table → `Thought`
3. Renames `Sandbox` table → `Cluster`
4. Adds all new columns with defaults
5. Renames `sandboxId` → `clusterId`, `sourceNoteId` → `sourceThoughtId`
6. Runs data backfill:
   - Set `thoughtType = 'observation'` for all rows
   - Set `maturityLevel = 'developing'` where old `type = 'AI'` AND `refinedTitle IS NOT NULL`
   - Set `maturityLevel = 'spark'` for all others
   - Assign `thoughtNumber` per user via ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", id)
7. Drops the old `NoteType` enum and `type` column
8. Creates ThoughtConnection, ThoughtEvent, ThoughtComment, CrystallizedIdea tables
9. Renames `NoteAttachment` table → `ThoughtAttachment`, updates FK from `note_id` → `thought_id` pointing at renamed Thought table

**Rollback:** Standard Drizzle down migration reverses all changes. The old `type` column data can be inferred from `maturityLevel` for rollback purposes.

---

## 5. Files Affected Summary

### Server (packages/server/)
- `src/db/schema.ts` — Full schema rewrite
- `src/routers/note.ts` → `src/routers/thought.ts` (new file, old kept as alias)
- `src/routers/sandbox.ts` → `src/routers/cluster.ts` (new file, old kept as alias)
- `src/routers/index.ts` — Register new routers
- `src/services/note-ai.ts` → `src/services/thought-ai.ts` — Add autoClassify function
- `src/worker.ts` — Register autoClassify job
- `drizzle/NNNN_migration.sql` — Generated migration

### Shared (packages/shared/)
- `src/validators/index.ts` — New enums, schemas, deprecate old ones

### Mobile (packages/mobile/)
- `src/app/(tabs)/capture.tsx` — Simplified action menu, add type chips
- `src/app/(tabs)/thoughts/index.tsx` — Update tRPC calls, new card meta
- `src/app/(tabs)/thoughts/[id]/index.tsx` — Replace bridge with actual editor
- `src/app/(tabs)/thoughts/cluster/[id]/index.tsx` — Replace bridge with actual cluster detail
- `src/app/(tabs)/notes/[id]/index.tsx` — Remove auto-refine, update tRPC calls
- `src/app/(tabs)/sandbox/[id]/index.tsx` — Update tRPC calls
- `src/components/CaptureActionMenu.tsx` — 3 options → 2
- `src/components/ThoughtTypeChips.tsx` — New component
- `src/components/ClusterPicker.tsx` — Renamed from SandboxPicker
- `src/components/NoteTypePopover.tsx` — Deleted
- `src/lib/trpc.ts` — Update type imports if needed

---

## Constraints

- Migration must be non-destructive: all existing data preserved with safe defaults
- Old `note.*` and `sandbox.*` tRPC routes must continue working as aliases during transition
- Auto-classify background job must complete within 10 seconds
- Claude Haiku used for classification (cost-effective, fast)
- No UI changes to the Thought Detail View layout beyond removing auto-refine — the full Property System UI is a separate phase
