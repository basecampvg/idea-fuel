# Brainstorm: Project + Canvas Architecture

**Date:** 2026-02-06
**Status:** Ready for planning

---

## What We're Building

Introduce a **Project** as the top-level container in the app, replacing the current flat "Idea" model. Each Project has:

1. **A canvas** — a rich workspace with structured sections, free-form notes, sub-ideas, and attachable links/files/images
2. **One Idea** (initially) that flows through the existing pipeline: Interview → Research → Report
3. **Schema readiness** for multiple Ideas per Project in the future

### User-Facing Language
| Term | Meaning |
|------|---------|
| **Project** | The container. Has a title, canvas, and owns one or more ideas. |
| **Idea** | The thing that gets researched. Flows through interview → research → report. |
| **Canvas** | The workspace on a Project where users gather context before (and during) research. |

---

## Why This Approach

**Approach chosen:** New Project layer above existing Idea (Approach A)

**Over alternatives:**
- **Enriching Idea in-place** would be simpler short-term but blocks the multi-idea future without another refactor
- **Phased rename-then-canvas** adds two migration cycles and delivers a rename with no user value in Phase 1

**Rationale:** A proper `Project → Idea` hierarchy sets up multi-idea support from day one. The canvas is naturally a Project-level feature. The existing pipeline stays attached to Idea with minimal changes.

---

## Key Decisions

### 1. Hierarchy: Project → Idea (one-to-many, starting with one)
- A Project contains one Idea at launch
- Schema uses a standard `projectId` FK on Idea, not `@unique` — ready for multiple ideas later
- UI enforces "one idea per project" for now via application logic, not schema constraints

### 2. Canvas: Rich, structured, always-editable with snapshots
- **Structured sections** as backbone (e.g., Target Audience, Competitors, Inspiration, Open Questions)
- **Free-form notes** and **sub-ideas** as canvas elements
- **Rich attachments**: URL bookmarks, uploaded files/images
- Canvas is **always editable**, but a **snapshot is taken** when research starts
- Reports reference the snapshot, not the live canvas

### 3. AI Integration: Canvas feeds into the pipeline
- All canvas content is included as context for AI interviews and research
- More context from the canvas → better, more targeted reports
- The snapshot (not live canvas) is what the AI uses during research

### 4. URL Structure: `/projects/[id]` replaces `/ideas/[id]`
- Web routes move from `/ideas/` to `/projects/`
- Mobile routes move from `/(tabs)/ideas/` to `/(tabs)/projects/`
- The canvas is the default view when opening a project

### 5. Data Model (Conceptual)

```
User
  └── Project (new model)
        ├── title, description, createdAt, updatedAt
        ├── Canvas
        │     ├── CanvasSection (structured: "Competitors", "Target Audience", etc.)
        │     ├── CanvasNote (free-form text)
        │     ├── CanvasSubIdea (lightweight idea sketch)
        │     └── CanvasAttachment (links, files, images)
        ├── CanvasSnapshot (frozen copy taken at research start)
        └── Idea (existing model, gains projectId)
              ├── Interview
              ├── Research
              └── Report
```

### 6. Status Flow Update
Current: `CAPTURED → INTERVIEWING → RESEARCHING → COMPLETE` (on Idea)

New: Project gets its own lightweight status derived from its child Idea(s):
- **DRAFT** — Project created, canvas being built, no idea submitted yet
- **ACTIVE** — Idea is in pipeline (interviewing/researching)
- **COMPLETE** — Idea pipeline finished, reports available

Idea keeps its existing `IdeaStatus` enum internally.

---

## Open Questions

1. **Canvas element positioning** — Should canvas elements have x/y coordinates (spatial canvas like Miro) or be a vertical list/grid? Spatial is more flexible but harder to build.

2. **Predefined sections** — What are the default structured sections? Candidates:
   - Target Audience
   - Problem Statement
   - Competitors / Alternatives
   - Inspiration / References
   - Open Questions
   - Revenue Model

3. **Migration strategy** — For existing users, each current Idea becomes a Project with one Idea child. Need to decide if this is a zero-downtime migration or a maintenance window.

4. **Canvas on mobile** — How does the canvas translate to the mobile app? Simplified list view? Or skip canvas on mobile initially?

5. **File storage** — Where do uploaded images/files go? Supabase Storage? S3? This is new infrastructure.

---

## Scope Impact

### What Changes
- New `Project` model in Prisma schema
- New canvas-related models (`CanvasSection`, `CanvasNote`, `CanvasSubIdea`, `CanvasAttachment`, `CanvasSnapshot`)
- New `project` tRPC router
- All frontend routes renamed from `/ideas/` → `/projects/`
- `Idea` model gains `projectId` FK
- AI pipeline updated to accept canvas context
- Sidebar, navigation, and UI components updated

### What Stays the Same
- `Idea` model and its pipeline (interview → research → report) — core logic unchanged
- `IdeaStatus` enum and state machine
- Report generation, PDF output
- Authentication, user management
- Mobile app structure (adapted, not rewritten)

---

## Codebase Impact (from repo scan)

| Layer | Estimated Touch Points |
|-------|----------------------|
| Prisma schema | 1 new model, 5 new canvas models, 1 FK addition |
| Server routers | New `project` router + updates to 5 existing routers |
| Shared types | ~6 files (types, validators, constants) |
| Web frontend | ~50 route files (rename) + new canvas components |
| Mobile frontend | ~5 route files (rename) + simplified canvas view |
| Total `ideaId` references | 162+ across 34 files (most stay, some gain `projectId` sibling) |

---

## Next Steps

Run `/workflows:plan` to create a detailed implementation plan covering:
1. Database schema design (Prisma models)
2. Migration strategy for existing data
3. Server-side changes (routers, services)
4. Frontend route restructuring
5. Canvas UI components
6. AI pipeline context injection
7. Mobile app adaptation
