# Feature Spec: Notes (Brain Dump + AI Refinement)
**Created:** 2026-03-27
**Status:** Draft
**Project type:** Existing codebase

## Problem Statement
Users often have raw, unstructured thoughts about potential business ideas but no place to capture them before they're ready for validation. The current flow (Capture → Vault → Validate) assumes the user already has a formed idea with a title and description. Notes fills the gap before that — a brain dump area where messy thoughts get refined into a structured idea by AI.

## Users and Roles
- **All mobile users** (free and paid) can create and use notes. No tier gating on notes — this is top-of-funnel.
- Notes are user-scoped. Each user sees only their own notes.

## Scope

### In scope (this build)
- New "Notes" tab (4th tab) in the mobile app with a Notebook (pen) icon from lucide
- Notes list screen showing all notes sorted by `updatedAt` descending (most recently edited first)
- Note editor screen with free-form text area (brain dump)
- AI refinement: reads user's notes and generates a structured idea card (title + description + tags) displayed above the notes
- First AI refinement triggers automatically when note content reaches 50 characters
- Subsequent refinements triggered by manual "Refine" button tap
- "Promote to Idea" button that creates a new CAPTURED project from the AI-refined title + description + tags
- Note persists after promotion, badge shows "Promoted". Only the most recent promotion is tracked (promotedProjectId overwritten on re-promote).
- Delete note with confirmation dialog
- New `Note` DB table with content, AI refinement result, promotion tracking
- New `note` tRPC router with CRUD + refine + promote endpoints
- Auto-save note content (debounced, same pattern as vault detail)

### Out of scope (future / not planned)
- Web app notes (mobile-only for now)
- Voice-to-note (use Capture for voice, Notes for text)
- Note sharing or collaboration
- Note folders/categories/organization
- Offline note creation (requires network for AI refinement)
- Search within notes
- Rich text / markdown formatting in notes (plain text only for v1)

### MVP vs stretch
- **MVP**: Notes list + editor + AI refinement card + promote to idea + delete
- **Stretch**: Note tags/categories, search, note-to-note linking

## Functional Requirements

### Happy Path
1. User taps "Notes" tab → sees list of all notes sorted by `updatedAt` descending
2. User taps "+" FAB or "New Note" button → system immediately creates a Note DB row (no debounce on creation) → navigates to editor
3. Editor opens with empty content. Save status shows "Saved".
4. User types raw thoughts into the free-form text area (brain dump)
5. Content auto-saves on 1.5-second debounce (same pattern as vault detail)
6. When content reaches 50 characters, AI refinement triggers automatically for the first time
7. AI (Claude Haiku) reads the full note content and generates: a business idea title, a 2-3 sentence description, and 2-4 category tags
8. The AI-generated idea card appears at the top of the note with `FadeIn.duration(300)`, showing: title, description, tag chips, "Refine" button, and "Promote to Idea" button
9. User continues writing. The idea card stays static until user taps "Refine" button
10. User taps "Refine" → Refine button shows spinner, old card content remains visible → AI re-processes the updated note content → card updates with new title/description/tags on success
11. When satisfied, user taps "Promote to Idea" on the card
12. System creates a new project: `title` = AI refined title, `description` = AI refined description, `status` = CAPTURED. Tags are NOT stored on the project (no tags field exists on Project table).
13. Note's `promotedProjectId` is set to the new project ID. "Promoted" badge appears on the note.
14. User sees success toast: "Idea created — find it in your Vault"
15. Project appears in the Vault list as a draft, ready for Quick Validate

### Edge Cases and Error Handling
- **AI refinement fails** (Haiku API error/timeout): Show error message in the card area: "Couldn't refine — tap to retry" with a retry button. Note content is unaffected. No card displayed until successful refinement.
- **AI refinement timeout**: Client-side timeout of 10 seconds. If exceeded, treat as refinement failure (same handling as API error).
- **Refine tapped while refinement in progress**: Button shows spinner and is disabled. Old card content remains visible. New result replaces old card on success.
- **Promotion fails** (network/server error): Show error toast "Couldn't create idea — try again". Note is NOT marked as promoted. `promotedProjectId` remains unchanged.
- **User deletes note that was promoted**: The promoted project in the Vault is NOT affected. The project is independent once created.
- **User promotes note, then edits and re-promotes**: Creates a second, separate project with the new AI refinement. `promotedProjectId` is overwritten to the latest project ID. Both projects exist independently in the Vault.
- **Note content drops below 50 chars** (user deletes text): AI card remains if it was already generated. Show "Based on earlier content" in muted text (12px, `colors.mutedDim`) below the card title. Refine button still works if user taps it.
- **User navigates away mid-edit**: Auto-save fires on navigation (flush on `beforeRemove`, same as vault detail).
- **Empty notes list**: Show empty state using the Notes tab icon (`NotebookPen`) at 48x48, message "Start brain dumping — your raw thoughts become refined ideas", and "New Note" CTA button.
- **Network error on save**: Show save status indicator (Saving.../Saved/Failed — same component as vault detail).

### Data Validation Rules
- Note content: no minimum to save (can be empty), no maximum (unlimited brain dump)
- AI refinement: requires minimum 50 characters of content to trigger
- Refine button: disabled while a refinement is in progress (shows spinner)
- Promote button: disabled if no AI refinement exists yet (card must be visible with refinedTitle set)
- Delete: requires confirmation dialog ("Delete this note? This can't be undone.")

## Data Model (high level)

### New: Note table
```
Note {
  id: text (UUID, primary key)
  content: text (the raw brain dump, default '')
  refinedTitle: text (nullable — AI-generated title)
  refinedDescription: text (nullable — AI-generated description)
  refinedTags: jsonb (nullable — AI-generated tags array, e.g. ["SaaS", "B2B"])
  lastRefinedAt: timestamp (nullable — when the last refinement completed)
  promotedProjectId: text (nullable — FK to Project, set on promote, overwritten on re-promote)
  userId: text (FK to User, NOT NULL)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Note list display title derivation:** `refinedTitle ?? first 50 chars of content ?? 'Untitled Note'`

### Relationships
- Note belongs to User (userId FK)
- Note optionally links to Project (promotedProjectId FK) — tracks most recent promotion only
- Project is independent of Note after creation (no back-reference needed)

### Modified: None
No changes to existing tables. Projects are created through the existing `project.create` pattern.

## tRPC Endpoint Signatures

### note.list
```typescript
input: none (uses ctx.userId)
output: Note[] // sorted by updatedAt desc
```

### note.get
```typescript
input: { id: string }
output: Note
```

### note.create
```typescript
input: none (creates empty note for ctx.userId)
output: Note // with id, empty content, null refinement fields
```

### note.update
```typescript
input: { id: string, content: string }
output: { success: true }
// Called by auto-save debounce. Verifies ownership via ctx.userId.
```

### note.delete
```typescript
input: { id: string }
output: { success: true }
// Verifies ownership. Does NOT cascade to promoted project.
```

### note.refine
```typescript
input: { id: string }
output: { refinedTitle: string, refinedDescription: string, refinedTags: string[] }
// Reads note content, calls Haiku, saves result to note, returns refinement.
// Throws if content < 50 chars.
```

### note.promote
```typescript
input: { id: string }
output: { projectId: string }
// Creates project from refinedTitle + refinedDescription. Sets promotedProjectId on note.
// Throws if refinedTitle is null (no refinement yet).
```

## Prompt Template

### AI Refinement System Prompt
```
You are a business idea refinement assistant. You read a user's raw, unstructured notes and extract a clear business idea from them.

Return valid JSON matching this exact schema:
{
  "title": "A concise business idea title (5-10 words)",
  "description": "A clear 2-3 sentence description of the business idea, including what it does, who it's for, and why it matters",
  "tags": ["Tag1", "Tag2", "Tag3"]
}

Rules:
- title: concise, compelling, 5-10 words. Think product name or elevator pitch headline.
- description: 2-3 sentences. Cover: what the product/service does, who the target customer is, and the core value proposition.
- tags: 2-4 category tags from this list: SaaS, Marketplace, E-commerce, Service, Agency, Mobile App, Hardware, Fintech, HealthTech, EdTech, AI/ML, B2B, B2C, Creator Economy, Community, Subscription, One-time Purchase
- If the notes are too vague to form a coherent idea, do your best with what's there. Never refuse — always return the JSON.
- Return ONLY the JSON object, no markdown wrapping.
```

## Note List Item Anatomy
Each note in the list shows:
- **Display title** (16px, `fonts.outfit.semiBold`): `refinedTitle ?? first 50 chars of content ?? 'Untitled Note'`
- **Content preview** (13px, `colors.muted`, 2 lines max): first 2 lines of raw content
- **Footer row**: relative timestamp ("2m ago") on the left, badge on the right
  - Badge: "Promoted" (green, `colors.success` tint) if `promotedProjectId` is set, otherwise no badge
  - If `refinedTitle` exists but not promoted: show "Refined" badge (brand tint)
- **Left icon**: `NotebookPen` (lucide) in 42x42 rounded box, brand-muted background. If promoted: green-tinted background with `CheckCircle` icon.

## Non-Functional Requirements
- **AI latency**: Haiku refinement should complete in <5 seconds. Client-side timeout of 10 seconds.
- **Cost**: ~$0.005 per refinement (Haiku). No cost concern.
- **Auto-save latency**: 1.5-second debounce, same as vault detail
- **No queuing**: Refinement is synchronous request-response
- **Animations**: FadeIn.duration(300) for idea card appearance, FadeInUp.delay(index * 80).springify() for note list stagger (matches vault list pattern)

## Constraints
- **No web app changes**
- **Branch**: `matt/mobile-quick-validation` (continue on same branch)
- **AI model**: Claude Haiku (`claude-haiku-4-5-20251001`) — same client as card extraction in `card-ai.ts`
- **Fonts**: Use Outfit font family (already loaded)
