# Phase 1 Handoff: Shared Types + DB Schema

**Feature:** Notes (Brain Dump + AI Refinement)
**Phase:** 1 of 3
**Status:** COMPLETE
**Built by:** Phase Builder
**Date:** 2026-03-27

## What Was Built

### 1. NoteRefinement Interface (`packages/shared/src/types/index.ts`)
- Added `NoteRefinement` interface with `title: string`, `description: string`, `tags: string[]`
- Inserted at line ~1208 before the TemplateDefinition section

### 2. Zod Schemas (`packages/shared/src/validators/index.ts`)
Added 6 schemas + constants:
- `createNoteSchema` — empty object (no input needed; userId comes from context)
- `updateNoteSchema` — `{ id, content }` with 50k char max
- `refineNoteSchema` — `{ id }`
- `promoteNoteSchema` — `{ id }`
- `deleteNoteSchema` — `{ id }`
- `noteRefinementSchema` — `{ title, description, tags }` for AI response validation
- Constants: `NOTE_CONTENT_MAX`, `NOTE_TITLE_MAX`, `NOTE_DESC_MAX`, `NOTE_TAG_MAX`, `NOTE_TAGS_MAX`, `NOTE_REFINE_MIN_CHARS`
- All inferred types exported: `CreateNoteInput`, `UpdateNoteInput`, `RefineNoteInput`, `PromoteNoteInput`, `DeleteNoteInput`, `NoteRefinementInput`

### 3. Notes pgTable (`packages/server/src/db/schema.ts`)
Table name: `Note`
Columns:
| Column | SQL Name | Type | Default | Nullable |
|--------|----------|------|---------|----------|
| id | id | text PK | crypto.randomUUID() | NOT NULL |
| content | content | text | '' | NOT NULL |
| refinedTitle | refined_title | text | — | nullable |
| refinedDescription | refined_description | text | — | nullable |
| refinedTags | refined_tags | jsonb (string[]) | — | nullable |
| lastRefinedAt | last_refined_at | timestamp(3) | — | nullable |
| promotedProjectId | promoted_project_id | text | — | nullable |
| userId | userId | text | — | NOT NULL |
| createdAt | createdAt | timestamp(3) | CURRENT_TIMESTAMP | NOT NULL |
| updatedAt | updatedAt | timestamp(3) | — | NOT NULL ($onUpdate) |

Foreign keys:
- `Note_userId_fkey` → `User.id` (ON DELETE CASCADE)
- `Note_promotedProjectId_fkey` → `Project.id` (ON DELETE SET NULL)

Indexes:
- `Note_userId_idx` — for filtering by user
- `Note_userId_updatedAt_idx` — for listing user's notes sorted by updatedAt DESC

### 4. Relations
- `notesRelations`: `user` (one → users), `promotedProject` (one → projects)
- `usersRelations`: added `notes: many(notes)`
- `projectsRelations`: added `promotedNotes: many(notes)`

### 5. Migration
- File: `packages/server/drizzle/0011_lively_sentinels.sql`
- Creates `Note` table, 2 foreign keys, 2 indexes

## Verification Results
- `@forge/shared` tsc --noEmit: PASS (zero errors)
- `@forge/server` tsc --noEmit: PASS (zero errors)
- Migration SQL reviewed: correct column types, FK constraints, indexes

## Deviations from Plan
None.

## Decisions Made
- `promotedProjectId` FK uses `ON DELETE SET NULL` — if a project is deleted, the note keeps its content but loses the promotion link. This prevents cascade-deleting user notes when a project is removed.
- `projectsRelations` uses `promotedNotes` as the relation name (not `notes`) to avoid confusion with the existing `notes` text field on the projects table.
- `createNoteSchema` is an empty `z.object({})` since note creation requires no input (userId from context, content starts empty per the plan).
- `NOTE_REFINE_MIN_CHARS = 50` exported as a constant for the router to use in Phase 2 (not enforced in the Zod schema since the check happens server-side after reading the note content).

## What Phase 2 Needs
Phase 2 (Server Backend) should:
1. Import `notes` table from `schema.ts` for all CRUD operations
2. Import `noteRefinementSchema` to validate Haiku AI responses
3. Import `updateNoteSchema`, `refineNoteSchema`, `promoteNoteSchema`, `deleteNoteSchema` for tRPC input validation
4. Import `NOTE_REFINE_MIN_CHARS` for the 50-char minimum check in the refine procedure
5. Import `NoteRefinement` type from `@forge/shared/types` for the AI service return type
6. The `notes` table is ready — no enum dependencies, all columns nullable where needed for progressive refinement
