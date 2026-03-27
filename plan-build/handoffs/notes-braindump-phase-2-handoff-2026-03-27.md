# Phase 2 Handoff: Server Backend (API)

**Feature:** Notes (Brain Dump + AI Refinement)
**Phase:** 2 of 3
**Status:** COMPLETE
**Built by:** Phase Builder
**Date:** 2026-03-27

## What Was Built

### 1. Shared Anthropic Client (`packages/server/src/lib/anthropic.ts`)
- Extracted the lazy singleton pattern from `card-ai.ts` into a shared utility
- Exports `getAnthropicClient()` — returns a cached `Anthropic` SDK instance
- Configuration: 30s timeout, 1 max retry (matches prior behavior)

### 2. Updated `packages/server/src/services/card-ai.ts`
- Removed local `_anthropicClient` variable and `getAnthropicClient()` function
- Added `import { getAnthropicClient } from '../lib/anthropic'`
- No behavioral change — same singleton, just sourced from shared lib

### 3. Note AI Service (`packages/server/src/services/note-ai.ts`)
- `refineNote(content: string): Promise<NoteRefinement>` — calls Haiku (`claude-haiku-4-5-20251001`)
- System prompt instructs Haiku to extract title, description, and tags from raw notes
- JSON parsing with fallbacks: raw JSON → code-fenced JSON → embedded JSON object
- Validates response with `noteRefinementSchema` from `@forge/shared`
- Throws on validation failure (no fallback card — unlike card-ai.ts, refinement is not a paid operation so a clean error is better)

### 4. Note Router (`packages/server/src/routers/note.ts`)
All 7 procedures implemented with `protectedProcedure`:

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `list` | query | none | Returns user's notes sorted by `updatedAt` desc |
| `get` | query | `{ id }` | Returns single note (ownership check) |
| `create` | mutation | `{}` | Inserts empty note for user, returns it |
| `update` | mutation | `{ id, content }` | Updates content (ownership check), returns `{ success: true }` |
| `delete` | mutation | `{ id }` | Deletes note (ownership check), returns `{ success: true }` |
| `refine` | mutation | `{ id }` | Validates >= 50 chars, calls Haiku, saves refinement fields, returns `{ refinedTitle, refinedDescription, refinedTags }` |
| `promote` | mutation | `{ id }` | Creates project from refinement (transaction), updates `promotedProjectId`, returns `{ projectId }` |

Error messages:
- `NOTE_NOT_FOUND` — for all ownership/existence failures
- `REFINEMENT_FAILED` — when Haiku API call or response parsing fails
- `NO_REFINEMENT` — when promoting a note that has no refined title/description
- Already-promoted check: rejects with `"Note has already been promoted"`

### 5. Router Registration (`packages/server/src/routers/index.ts`)
- Added `import { noteRouter } from './note'`
- Registered as `note: noteRouter` in the `appRouter`

## Verification Results
- `@forge/server` tsc --noEmit: PASS (zero errors)
- No TODO/FIXME markers in any new files
- Router registered and exported in index.ts
- card-ai.ts refactored — uses shared Anthropic client, no broken imports

## Deviations from Plan
None.

## Decisions Made
1. **`get` procedure reuses `refineNoteSchema`** (`{ id: string }`) for input since the shape is identical. Avoids a separate schema for a simple ID lookup.
2. **Promote guards against double-promotion** — if `note.promotedProjectId` is already set, throws `BAD_REQUEST`. The plan didn't explicitly state this, but it prevents duplicate projects from repeated promote taps.
3. **`refineNote` throws on validation failure** rather than returning a fallback (unlike `extractCardResult` in card-ai.ts). Refinement is a free, retryable operation so a clean error is preferable to a degraded response.
4. **Project created with status `CAPTURED`** (the default on the projects table) — matches the plan's IC7 spec.

## What Phase 3 Needs
Phase 3 (Mobile UI) should:
1. Import tRPC hooks via the app router type — `note.list`, `note.get`, `note.create`, `note.update`, `note.delete`, `note.refine`, `note.promote` are all available
2. `note.list` returns full note objects sorted by `updatedAt` desc — no pagination (list is per-user, expected to be small)
3. `note.create` returns the full note object (including `id`) — navigate to editor with it
4. `note.update` returns `{ success: true }` — use for save status indicator
5. `note.refine` returns `{ refinedTitle, refinedDescription, refinedTags }` — use to populate IdeaCard
6. `note.promote` returns `{ projectId }` — use for success toast
7. Note object shape from `list`/`get`:
   ```
   { id, content, refinedTitle, refinedDescription, refinedTags, lastRefinedAt, promotedProjectId, userId, createdAt, updatedAt }
   ```
8. Error messages to check: `NOTE_NOT_FOUND`, `REFINEMENT_FAILED`, `NO_REFINEMENT`
9. The 50-char minimum check is server-side — mobile should also check locally to avoid unnecessary round trips
