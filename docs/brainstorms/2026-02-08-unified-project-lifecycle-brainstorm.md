# Brainstorm: Unified Project Lifecycle (Draft Idea → Project Promotion)

**Date:** 2026-02-08
**Status:** Ready for Planning
**Participants:** Matt, Claude

---

## What We're Building

A simplified lifecycle where **Ideas and Projects are the same entity**. A user captures a business idea (Draft), and when they trigger any research mode (Spark, Light, or Forge), that draft automatically becomes a Project and appears in the Vault.

### Current Flow (Being Replaced)
```
User creates Project (manual) → Builds canvas → Creates Idea inside Project → Triggers research
```

### New Flow
```
User captures Idea (draft) → Triggers Spark/Light/Forge → Draft becomes a Project → Appears in Vault
```

---

## Why This Approach

The current architecture asks users to set up a "Project" container before they've validated anything. This is backwards — a project should be the *result* of committing to research, not a prerequisite. By unifying the data model and making promotion automatic, we:

1. **Reduce friction** — One fewer manual step before research begins
2. **Match mental model** — "Idea" = thinking about it, "Project" = actively working on it
3. **Simplify the data model** — One table instead of two linked tables with a forced 1:1 relationship
4. **Remove canvas complexity** — The block-based canvas editor is replaced by a simple notes field

---

## Key Decisions

### 1. Entry Point: Existing Capture Card + Title Field
- Keep the current idea capture card on the dashboard
- **Add a title input** above the description field so the project has a proper title when promoted
- Idea saves immediately as a Draft

### 2. Data Model: Single Unified "Project" Table
- Merge the current `Idea` and `Project` models into one `Project` model
- Add a `phase` field: `DRAFT` | `RESEARCHING` | `COMPLETE`
- When `phase === DRAFT`, the UI labels it an "Idea"
- When research starts, `phase` flips to `RESEARCHING` and it becomes a "Project"
- Absorb relevant fields from both models: `title`, `description`, `notes` (replaces canvas), `status` (research sub-status), plus all existing Idea relations (interviews, reports, research)
- Requires a **database migration** to merge data

### 3. Canvas → Notes Field
- Replace the block-based canvas editor (sections, notes, sub-ideas, links, drag-to-reorder) with a **simple rich-text notes field**
- The notes field still feeds into AI research prompts via a simplified serialization (just pass the text, no block parsing needed)
- Remove the `CanvasSnapshot` model — snapshot the notes string directly on the Research record if needed
- Eliminates: canvas block types, canvas serializer, canvas editor component, canvas update router

### 4. Sidebar Navigation: Two Stacked Sections
- **Drafts section** (top): Shows unresearched ideas (`phase === DRAFT`)
- **Vault section** (below): Shows active and complete projects (`phase === RESEARCHING | COMPLETE`)
- Both sections show recent items (5 each) with "See all" links

### 5. Project Detail View: Keep Current Layout
- The project detail page uses the existing idea detail layout
- Status-specific components remain: `StatusCaptured` (pick research mode), `StatusResearching` (progress), results display
- Research upgrade path preserved (Spark result → upgrade to Light/Forge)
- URL structure shifts from `/ideas/[id]` to `/projects/[id]`

### 6. Research Trigger = Promotion Moment
- When user selects Spark, Light, or Forge on a Draft idea:
  1. `phase` updates from `DRAFT` to `RESEARCHING`
  2. Notes field content is snapshot (if applicable)
  3. Research pipeline kicks off (unchanged logic)
  4. Item moves from Drafts section to Vault in the sidebar
- The research pipelines themselves (Spark, Light/Forge) remain unchanged

---

## Scope of Changes

### Database
- New migration: Merge `Idea` + `Project` → unified `Project` table
- Migrate existing data (copy Idea fields into Project, link relations)
- Remove `CanvasSnapshot` model (or simplify to store notes string)
- Remove old `Idea` model after migration

### Backend (tRPC Routers)
- Merge `idea` and `project` routers into unified `project` router
- Update `research.start` to flip `phase` from DRAFT → RESEARCHING
- Update `interview` router references from `ideaId` to `projectId`
- Simplify canvas-related endpoints to a single `updateNotes` mutation

### Frontend (Web)
- Sidebar: Two sections (Drafts + Vault) replacing single Projects list
- Capture card: Add title input
- Remove canvas editor components and page
- Update all `/ideas/[id]` routes to `/projects/[id]`
- Update all `trpc.idea.*` calls to `trpc.project.*`

### Frontend (Mobile)
- Update Vault screen to separate Drafts from Projects
- Update idea-related screens to use project router
- Remove any canvas references

### Shared Package
- Remove canvas block types and serializer
- Update validators (remove canvas schemas, add notes field)
- Update shared types

---

## Open Questions

1. **Migration strategy** — Do we do a big-bang migration or support both models temporarily with a feature flag?
2. **URL redirects** — Should old `/ideas/[id]` URLs redirect to `/projects/[id]`?
3. **Notes field format** — Plain text or basic markdown? Rich text editor or simple textarea?
4. **Mobile capture flow** — Does the mobile app need the same title field addition?

---

## Out of Scope

- Changing the research pipelines themselves (Spark, Light, Forge logic stays the same)
- Multi-idea projects (staying with 1:1 for now)
- New research modes or report types
- Dashboard redesign beyond the capture card title addition
