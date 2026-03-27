# Build Plan: Notes (Brain Dump + AI Refinement)
**Created:** 2026-03-27
**Spec:** plan-build/specs/notes-braindump-spec-2026-03-27.md
**Brainstorm:** plan-build/brainstorm/notes-braindump-brainstorm-2026-03-27.md
**Status:** Draft
**Project type:** Existing codebase
**Branch:** matt/mobile-quick-validation

## Overview
Build a "Notes" brain dump feature for the IdeaFuel mobile app. Users capture raw thoughts in a free-form editor. AI (Claude Haiku) continuously refines those thoughts into a structured business idea (title + description + tags) shown as a card above the notes. When ready, the user promotes the refined idea to the Vault as a draft for Quick Validation. No web app changes.

## Component Inventory

| ID | Component | Package | Inputs | Outputs | External Deps |
|----|-----------|---------|--------|---------|---------------|
| C1 | Note DB Table | server | N/A | Schema + migration | Drizzle Kit |
| C2 | Shared Types + Validators | shared | N/A | Types, Zod schemas | None |
| C3 | Note AI Service | server | note content string | NoteRefinement JSON | Anthropic API (Haiku) |
| C4 | Note tRPC Router | server | tRPC requests | tRPC responses | DB, Auth, C3 |
| C5 | Notes Tab | mobile | tab config | route to notes list | None |
| C6 | Notes List Screen | mobile | note.list query | navigation to editor | tRPC client |
| C7 | Note Editor Screen | mobile | note.get query | auto-save, refine, promote | tRPC client |
| C8 | IdeaCard Component | mobile | refinement data + callbacks | UI rendering | None |

## Flow 0: Signup → First Use

N/A for this feature — uses existing auth. Notes tab appears for all authenticated users. First action: tap Notes tab → empty state → tap "New Note" → type → AI card appears at 50 chars.

## Integration Contracts

### IC1: Mobile → note.list
```
Source: Notes list screen (C6)
Target: note tRPC router (C4)
What flows: no input (userId from context)
How: tRPC query via httpBatchLink
Auth: Bearer token → ctx.userId via protectedProcedure
Response: Note[] sorted by updatedAt desc
Error path: TRPCError → show error state on list
```

### IC2: Mobile → note.create
```
Source: Notes list screen (C6) "New Note" button
Target: note tRPC router (C4)
What flows: no input
How: tRPC mutation
Auth: Bearer token → ctx.userId
Response: Note (with id, empty content)
Error path: TRPCError → show error toast
Post-success: navigate to editor with new note ID, invalidate note.list
```

### IC3: Mobile → note.update
```
Source: Note editor auto-save (C7)
Target: note tRPC router (C4)
What flows: { id: string, content: string }
How: tRPC mutation, debounced at 1.5s
Auth: Bearer token → ctx.userId
Response: { success: true }
Error path: Save status indicator shows "Failed"
```

### IC4: Mobile → note.refine
```
Source: Note editor (C7) — auto on 50 chars first time, manual "Refine" button after
Target: note tRPC router (C4) → Note AI Service (C3) → Anthropic Haiku
What flows: { id: string }
How: tRPC mutation
Auth: Bearer token → ctx.userId
Response: { refinedTitle: string, refinedDescription: string, refinedTags: string[] }
Error path: Show "Couldn't refine — tap to retry" in card area. 10-second client timeout.
```

### IC5: Mobile → note.promote
```
Source: IdeaCard (C8) "Promote to Idea" button
Target: note tRPC router (C4)
What flows: { id: string }
How: tRPC mutation
Auth: Bearer token → ctx.userId
Response: { projectId: string }
Error path: Show error toast "Couldn't create idea — try again"
Post-success: toast "Idea created — find it in your Vault", invalidate note.get + note.list
```

### IC6: note.refine → Anthropic Haiku
```
Source: note.refine procedure (C4)
Target: Note AI Service refineNote() (C3) → Anthropic SDK
What flows: note content string
How: Direct function call
Auth: ANTHROPIC_API_KEY (already exists in env)
Response: NoteRefinement { title, description, tags }
Error path: Throw → router catches → returns error to client
```

### IC7: note.promote → DB (Project creation)
```
Source: note.promote procedure (C4)
Target: projects table via Drizzle ORM
What flows: INSERT into projects (title, description, userId, status='CAPTURED')
How: ctx.db.insert(projects).values({...})
Auth: ctx.userId from tRPC context
Error path: DB error → throw TRPCError → client shows error toast
Note: Uses direct DB insert (same pattern as project.create), NOT calling the project router
```

## End-to-End Flows

### Flow 1: Create Note → Write → AI Refines → Promote
```
1. [Mobile] User taps Notes tab → notes list screen
2. [Mobile] User taps "New Note"
3. [Mobile] Calls note.create mutation
4. [Server] INSERT into notes (userId, content='') → return Note
5. [Mobile] Navigate to editor with note ID
6. [Mobile] User types content
7. [Mobile] Auto-save debounce (1.5s) → calls note.update({ id, content })
8. [Server] UPDATE notes SET content = X WHERE id = Y AND userId = Z
9. [Mobile] Content reaches 50 chars → auto-trigger note.refine({ id })
10. [Server] Read note content → call refineNote(content) → Haiku API → parse JSON
11. [Server] UPDATE notes SET refinedTitle, refinedDescription, refinedTags, lastRefinedAt
12. [Server] Return { refinedTitle, refinedDescription, refinedTags }
13. [Mobile] IdeaCard fades in with FadeIn.duration(300)
14. [Mobile] User continues writing, saves content
15. [Mobile] User taps "Refine" on card
16. [Mobile] Calls note.refine({ id }) again
17. [Server] Same as steps 10-12 with updated content
18. [Mobile] Card updates with new refinement
19. [Mobile] User taps "Promote to Idea"
20. [Mobile] Calls note.promote({ id })
21. [Server] Read note.refinedTitle + refinedDescription
22. [Server] INSERT into projects (title, description, userId, status='CAPTURED')
23. [Server] UPDATE notes SET promotedProjectId = newProject.id
24. [Server] Return { projectId }
25. [Mobile] Toast: "Idea created — find it in your Vault"
26. [Mobile] Invalidate note.get + note.list queries
27. [Mobile] Badge updates to "Promoted"
```

### Flow 2: Empty State → First Note
```
1. [Mobile] User taps Notes tab → empty list
2. [Mobile] Empty state: NotebookPen icon + message + "New Note" button
3. [Mobile] User taps "New Note" → same as Flow 1 step 3+
```

### Flow 3: Refinement Failure
```
1. [Mobile] Content reaches 50 chars → note.refine called
2. [Server] Haiku API timeout or error
3. [Server] Throw TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'REFINEMENT_FAILED' })
4. [Mobile] Card area shows: "Couldn't refine — tap to retry" with retry button
5. [Mobile] User taps retry → calls note.refine again
```

### Flow 4: Delete Note
```
1. [Mobile] User long-presses note in list (or taps delete in editor)
2. [Mobile] Confirmation dialog: "Delete this note? This can't be undone."
3. [Mobile] Calls note.delete({ id })
4. [Server] DELETE from notes WHERE id = X AND userId = Y
5. [Server] Return { success: true }
6. [Mobile] Invalidate note.list, navigate back if in editor
```

## Convention Guide

### File Naming
- Server routers: `camelCase.ts` → `note.ts`
- Server services: `kebab-case.ts` → `note-ai.ts`
- Mobile screens: Expo Router file-based → `notes/index.tsx`, `notes/[id]/index.tsx`
- Mobile components: `PascalCase.tsx` → `IdeaCard.tsx`

### Function Naming
- Server: `camelCase` → `refineNote`, `promoteNote`
- Mobile: `camelCase` for functions, `PascalCase` for components

### Fonts
- Title text: `fontFamily: fonts.outfit.semiBold` or `fonts.outfit.bold`
- Body text: `fontFamily: fonts.outfit.regular`
- Labels: `fontFamily: fonts.outfit.medium`
- Stat values: `fontFamily: fonts.outfit.bold`

### Error Handling
- Server: `TRPCError` with typed messages: `REFINEMENT_FAILED`, `NOTE_NOT_FOUND`, `NO_REFINEMENT`
- Mobile: Check `mutation.error.message` for typed errors

### Database Patterns
- `ctx.db.transaction()` for promote (create project + update note atomically)
- Ownership check: every query/mutation filters by `userId = ctx.userId`

## Issues Found

### Issue 1: Anthropic Client Sharing
The existing `getAnthropicClient()` in `card-ai.ts` is a private lazy singleton. The note AI service needs Anthropic too. Two options: (a) export the getter from `card-ai.ts`, or (b) create a shared `getAnthropicClient()` utility. Option (b) is cleaner — extract to `packages/server/src/lib/anthropic.ts`.
**Resolution:** Phase 2 — create shared Anthropic client utility, update `card-ai.ts` to import from it.

### Issue 2: Auto-save Hook Reuse
The `useAutoSave` hook in mobile is currently used for vault detail notes. It saves to `project.update` with a `notes` field. For the Note editor, we need it to save to `note.update` with a `content` field. The hook takes `projectId` and `field` params — it needs to be generalized or a separate instance created.
**Resolution:** Phase 3 — check if the hook is generic enough. If not, create a `useNoteAutoSave` variant or parameterize the existing hook.

## Wiring Checklist

### Phase 1: Shared Types + DB Schema
- [ ] Add `NoteRefinement` interface to `packages/shared/src/types/index.ts` (title, description, tags)
- [ ] Add Zod schemas to `packages/shared/src/validators/index.ts`: `createNoteSchema`, `updateNoteSchema`, `refineNoteSchema`, `promoteNoteSchema`, `deleteNoteSchema`, `noteRefinementSchema`
- [ ] Add `notes` pgTable to `packages/server/src/db/schema.ts`: id, content, refinedTitle, refinedDescription, refinedTags, lastRefinedAt, promotedProjectId (FK), userId (FK), createdAt, updatedAt
- [ ] Add relations for notes table (user, promotedProject)
- [ ] Generate Drizzle migration: `npx drizzle-kit generate`
- [ ] Verify migration SQL

### Phase 2: Server Backend
- [ ] Create `packages/server/src/lib/anthropic.ts` — shared Anthropic client getter (extracted from card-ai.ts pattern)
- [ ] Update `packages/server/src/services/card-ai.ts` to import `getAnthropicClient` from the shared lib
- [ ] Create `packages/server/src/services/note-ai.ts`:
  - [ ] `refineNote(content: string): Promise<NoteRefinement>` — calls Haiku with refinement prompt, parses JSON, validates against schema
- [ ] Create `packages/server/src/routers/note.ts`:
  - [ ] `list` query: return user's notes sorted by updatedAt desc
  - [ ] `get` query: return single note by id (ownership check)
  - [ ] `create` mutation: insert empty note for user, return it
  - [ ] `update` mutation: update content by id (ownership check)
  - [ ] `delete` mutation: delete by id (ownership check), return success
  - [ ] `refine` mutation: read note content, validate >= 50 chars, call refineNote(), save results to note, return refinement
  - [ ] `promote` mutation: read note refinement, create project (transaction: insert project + update note.promotedProjectId), return projectId
- [ ] Register `noteRouter` in `packages/server/src/routers/index.ts`

### Phase 3: Mobile UI
- [ ] Add Notes tab to `packages/mobile/src/app/(tabs)/_layout.tsx`: new `<Tabs.Screen name="notes">`, add `NotebookPen` icon to CustomTabBar
- [ ] Create `packages/mobile/src/app/(tabs)/notes/_layout.tsx` — Stack layout for notes list + detail
- [ ] Create `packages/mobile/src/app/(tabs)/notes/index.tsx` — Notes list:
  - [ ] FlatList with note.list query
  - [ ] Staggered FadeInUp animation per item
  - [ ] Display title derivation: refinedTitle ?? first 50 chars ?? 'Untitled Note'
  - [ ] Content preview (2 lines)
  - [ ] Badges: "Promoted" (green), "Refined" (brand), none for raw
  - [ ] Left icon: NotebookPen (draft), CheckCircle (promoted)
  - [ ] "New Note" button / FAB
  - [ ] Long-press to delete with confirmation
  - [ ] Empty state with NotebookPen icon + message + CTA
  - [ ] Pull-to-refresh
- [ ] Create `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx` — Note editor:
  - [ ] Load note via note.get query
  - [ ] Auto-save content with debounce (reuse or adapt useAutoSave hook)
  - [ ] Track content length → auto-trigger note.refine at 50 chars (first time only)
  - [ ] IdeaCard at top when refinement exists
  - [ ] "Based on earlier content" indicator when lastRefinedAt < updatedAt
  - [ ] Flush save on navigation away
  - [ ] Save status indicator
  - [ ] Delete button in header
  - [ ] KeyboardAvoidingView with offset 100
- [ ] Create `packages/mobile/src/components/ui/IdeaCard.tsx`:
  - [ ] Title (fonts.outfit.bold)
  - [ ] Description (fonts.outfit.regular)
  - [ ] Tag chips row
  - [ ] "Refine" button (outline variant, shows spinner during loading)
  - [ ] "Promote to Idea" button (primary variant, disabled if no refinement)
  - [ ] Stale indicator text
  - [ ] FadeIn.duration(300) entering animation
  - [ ] "Promoted" state: show promoted badge, promote button changes to "Promoted ✓" (disabled)

## Build Order

### Phase 1: Shared Types + DB Schema (Foundation)
**Scope:** C1, C2
**Files:** shared/types, shared/validators, server/db/schema, drizzle migration
**Why first:** Everything depends on types and DB columns.
**Deliverables:** NoteRefinement type, Zod schemas, Note table, migration.

### Phase 2: Server Backend (API)
**Scope:** C3, C4 + shared Anthropic client extraction
**Files:** server/lib/anthropic.ts, server/services/note-ai.ts, server/routers/note.ts, server/routers/index.ts, server/services/card-ai.ts (update import)
**Why second:** Mobile needs the API to exist for type inference.
**Deliverables:** Working note.list/get/create/update/delete/refine/promote endpoints.

### Phase 3: Mobile UI (Screens)
**Scope:** C5, C6, C7, C8
**Files:** mobile tabs layout, notes list, notes editor, IdeaCard component
**Why third:** Depends on Phase 1 (types) and Phase 2 (API).
**Deliverables:** Complete Notes tab → list → editor → AI card → promote flow.
