# Brainstorm: Notes (Brain Dump + AI Refinement)
**Created:** 2026-03-27
**Spec:** plan-build/specs/notes-braindump-spec-2026-03-27.md
**Status:** Draft
**Project type:** Existing codebase

## Vision
A brain dump feature that sits upstream of idea validation. Users capture raw, unstructured thoughts in Notes. AI reads the notes and surfaces a refined business idea (title + description + tags) as a card at the top. When the idea is ready, the user promotes it to the Vault as a draft for Quick Validation. This creates a seamless funnel: Notes → Refined Idea → Draft → Validate → Full Research.

## Existing Context

### Project Structure
- **Monorepo**: `packages/server`, `packages/web`, `packages/mobile`, `packages/shared`
- **Server**: tRPC routers in `routers/`, services in `services/`, Drizzle ORM + PostgreSQL, Anthropic SDK already initialized in `card-ai.ts`
- **Mobile**: Expo Router file-based routing, 3 tabs (capture, vault, settings), custom tab bar, NativeWind, Reanimated 4
- **Shared**: Types in `types/index.ts`, validators in `validators/index.ts`, constants in `constants/`

### Key Patterns to Follow
- **Router registration**: Import → add to `appRouter` in `routers/index.ts`
- **DB schema**: Drizzle `pgTable()` with `text()` IDs, `timestamp()`, `foreignKey()` in `db/schema.ts`
- **tRPC procedures**: `protectedProcedure.input(zodSchema).mutation/query()` pattern
- **Mobile tabs**: `<Tabs.Screen>` in `(tabs)/_layout.tsx`, icon logic in `CustomTabBar`
- **Mobile list**: `FlatList` + `RefreshControl` + `trpc.X.list.useQuery()` (see vault/index.tsx)
- **Mobile detail**: `useLocalSearchParams` + `trpc.X.get.useQuery()` + auto-save hooks (see vault/[id]/index.tsx)
- **Auto-save**: `useAutoSave` hook with 1.5s debounce, flush on navigation
- **Anthropic client**: Lazy singleton in `card-ai.ts`, `claude-haiku-4-5-20251001` model
- **Animations**: Reanimated `FadeInUp.delay(index * 80).springify()` for lists, `FadeIn.duration(300)` for content

### Files That Will Be Modified
| File | Change |
|------|--------|
| `packages/server/src/db/schema.ts` | Add Note table + relations |
| `packages/server/src/routers/index.ts` | Register note router |
| `packages/shared/src/types/index.ts` | Add NoteRefinement type |
| `packages/shared/src/validators/index.ts` | Add note Zod schemas |
| `packages/mobile/src/app/(tabs)/_layout.tsx` | Add Notes tab |

### Files That Will Be Created
| File | Purpose |
|------|---------|
| `packages/server/src/routers/note.ts` | tRPC router: list, get, create, update, delete, refine, promote |
| `packages/server/src/services/note-ai.ts` | AI refinement service (Haiku call + JSON extraction) |
| `packages/mobile/src/app/(tabs)/notes/index.tsx` | Notes list screen |
| `packages/mobile/src/app/(tabs)/notes/_layout.tsx` | Notes stack layout |
| `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx` | Note editor + AI card |
| `packages/mobile/src/components/ui/IdeaCard.tsx` | The AI-refined idea card component |
| `drizzle/XXXX_migration.sql` | DB migration for Note table |

## Components Identified

### C1: Note DB Table + Migration
- **Responsibility**: Store notes with content, AI refinement results, and promotion tracking
- **Upstream (receives from)**: note tRPC router writes/reads
- **Downstream (sends to)**: All note queries + the promote flow (creates a Project)
- **External dependencies**: Drizzle Kit for migration generation
- **Hands test**: PASS — Drizzle is configured, migration pattern exists from quick-validation build

### C2: Shared Types + Validators
- **Responsibility**: NoteRefinement type, Zod schemas for all 7 note endpoints
- **Upstream (receives from)**: N/A (type definitions)
- **Downstream (sends to)**: Server (note router), Mobile (tRPC type inference)
- **External dependencies**: None
- **Hands test**: PASS — types propagate via tRPC inference

### C3: Note AI Service
- **Responsibility**: Call Claude Haiku with note content, extract structured refinement (title + description + tags)
- **Upstream (receives from)**: note.refine procedure passes note content
- **Downstream (sends to)**: Returns NoteRefinement to router, saved to Note record
- **External dependencies**: Anthropic API (`claude-haiku-4-5-20251001`), `ANTHROPIC_API_KEY`
- **Hands test**: PASS — Anthropic client already exists in `card-ai.ts` as lazy singleton. Can reuse `getAnthropicClient()` or create a separate one in `note-ai.ts`.

### C4: Note tRPC Router
- **Responsibility**: 7 endpoints — list, get, create, update, delete, refine, promote
- **Upstream (receives from)**: Mobile tRPC client
- **Downstream (sends to)**: DB (notes table, projects table), AI service (C3)
- **External dependencies**: DB (ctx.db), Auth (ctx.userId), project.create pattern for promote
- **Hands test**: PASS — all dependencies available via tRPC context

### C5: Notes Tab Registration
- **Responsibility**: Add 4th tab to mobile navigation
- **Upstream (receives from)**: Expo Router tab configuration
- **Downstream (sends to)**: Routes to notes list screen
- **External dependencies**: None
- **Hands test**: PASS — just adding a `<Tabs.Screen>` and icon condition

### C6: Notes List Screen
- **Responsibility**: Display all notes with display title, preview, badges, timestamps. Staggered animation. New note button.
- **Upstream (receives from)**: note.list tRPC query
- **Downstream (sends to)**: Navigation to note editor, note.create mutation, note.delete mutation
- **External dependencies**: None beyond tRPC client
- **Hands test**: PASS — mirrors vault list pattern exactly

### C7: Note Editor Screen
- **Responsibility**: Free-form text editor with auto-save. AI idea card at top. Refine + Promote buttons.
- **Upstream (receives from)**: note.get query (loads note), note.refine mutation (AI card), note.promote mutation
- **Downstream (sends to)**: note.update mutation (auto-save), note.refine (trigger AI), note.promote (create project), navigation back to list
- **External dependencies**: None beyond tRPC client
- **Hands test**: PASS — auto-save pattern exists in vault detail

### C8: IdeaCard Component
- **Responsibility**: Render the AI-refined idea as a visual card with title, description, tag chips, Refine button, Promote button
- **Upstream (receives from)**: Note editor passes refinement data + callbacks
- **Downstream (sends to)**: Triggers refine/promote callbacks in parent
- **External dependencies**: None
- **Hands test**: PASS — pure presentational component

## Rough Dependency Map

```
Shared Types + Validators (C2)
    ↓
Note DB Table + Migration (C1)
    ↓
Note AI Service (C3) ←─────────────┐
    ↓                               │
Note tRPC Router (C4) ─────────────→┘
    ↑
    │ (tRPC client calls)
    │
Notes Tab (C5) → Notes List (C6) → Note Editor (C7) → IdeaCard (C8)
                                          ↓
                                    project.create (existing)
```

**Build order (dependency-first):**
1. C2: Shared types + validators
2. C1: DB schema + migration
3. C3: Note AI service
4. C4: Note tRPC router (depends on C1, C2, C3)
5. C5-C8: Mobile UI (depends on C4 for API contract)

## Risk Assessment

### Complexity Hotspots
- **Note editor auto-save + AI trigger interaction**: The auto-save debounce and the first-time 50-char AI trigger need to be coordinated. The auto-save should fire independently of the AI call. The AI call should check content length AFTER the save, not trigger a save itself. Risk: medium — requires careful sequencing in the editor component.
- **Tab bar icon expansion**: Adding a 4th tab compresses the spacing. Currently 3 tabs with `flex: 1` each. 4 tabs will be tighter but should still work at 375px width. Risk: low.

### Integration Risks
- **Anthropic client sharing**: `card-ai.ts` has a lazy singleton `getAnthropicClient()`. The note AI service can import and reuse it, or create its own. Reusing is cleaner but couples the two services. Creating a separate client is trivial (3 lines). Risk: low — either approach works.
- **Promote creates project via direct DB insert**: The promote endpoint should mirror the `project.create` pattern (insert + audit log), NOT call the project router's create procedure directly. This avoids circular dependencies. Risk: low if the pattern is followed.

### Existing Quality
- No existing Note infrastructure — this is greenfield within the existing codebase
- `useAutoSave` hook is already battle-tested in vault detail — reuse directly
- The vault list pattern is well-established — mirror it for notes list

## Open Questions
None — all resolved in the spec.

## Risks and Concerns
- **4-tab layout**: May need to adjust tab bar padding/icon sizes slightly if it feels cramped on smaller phones. Can be tuned after initial build.
- **AI refinement quality with minimal content**: At exactly 50 characters, the refinement will be rough. That's expected — the spec says "do your best with what's there." The Refine button lets the user improve it after adding more content.
