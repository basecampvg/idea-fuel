---
title: Unified Project Lifecycle - Draft Idea to Project Promotion
type: refactor
date: 2026-02-08
brainstorm: docs/brainstorms/2026-02-08-unified-project-lifecycle-brainstorm.md
supersedes: docs/plans/2026-02-06-feat-project-canvas-architecture-plan.md
---

# Unified Project Lifecycle: Draft Idea → Project Promotion

## Overview

Merge the separate `Project` and `Idea` database models into a single unified `Project` model with a status-based lifecycle. Replace the block-based canvas editor with a simple notes field. When a user captures an idea, it starts as a Draft (status=CAPTURED). When they trigger any research mode (Spark, Light, or Forge), the item automatically promotes to a Project and moves from the sidebar's Drafts section to the Vault section.

**This supersedes the Project+Canvas architecture plan from 2026-02-06**, which was implemented 2 days ago. The canvas system is being simplified before it solidifies.

## Problem Statement

The current architecture requires users to manually create a "Project" container before capturing and validating an idea. This is backwards:

1. **Extra friction** — Users must create an empty Project, then build canvas blocks, then create an Idea inside it
2. **Wrong mental model** — A "project" implies commitment, but users haven't validated anything yet
3. **Over-engineered canvas** — Block-based editor (sections, notes, sub-ideas, links, drag-to-reorder) adds complexity without clear value at the capture stage
4. **Redundant data model** — Two tables (Project + Idea) with a forced 1:1 relationship that could be a single table

## Proposed Solution

**One entity, one table, status-driven lifecycle:**

```
CAPTURED (Draft)  →  INTERVIEWING  →  RESEARCHING  →  COMPLETE
   "Idea"              "Project"       "Project"      "Project"
  [Drafts]              [Vault]         [Vault]        [Vault]
```

- **Status = CAPTURED**: UI calls it an "Idea", shown in sidebar Drafts section
- **Status = INTERVIEWING/RESEARCHING/COMPLETE**: UI calls it a "Project", shown in sidebar Vault section
- Promotion happens automatically when user triggers research (Spark, Light, or Forge)
- Canvas JSON field replaced by a simple `notes` text field
- `CanvasSnapshot` model removed; notes text stored directly on Research record if needed

## Technical Approach

### Architecture

#### New Unified Project Model (Prisma)

```prisma
model Project {
  id          String        @id @default(cuid())
  title       String
  description String        @db.Text
  notes       String?       @db.Text        // Replaces canvas blocks
  status      ProjectStatus @default(CAPTURED)
  userId      String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  interviews Interview[]
  reports    Report[]
  research   Research?

  @@index([userId])
  @@index([status])
}

enum ProjectStatus {
  CAPTURED      // Draft idea - not yet researched
  INTERVIEWING  // Light/Forge interview in progress
  RESEARCHING   // Research pipeline running
  COMPLETE      // Research finished
}
```

**Changes from current schema:**
- Absorbs Idea's `title`, `description`, `status` fields
- Replaces `canvas Json` with `notes String? @db.Text`
- Adds direct relations to `Interview[]`, `Report[]`, `Research?`
- Removes `ideas Idea[]` and `snapshots CanvasSnapshot[]` relations
- Renames `IdeaStatus` enum to `ProjectStatus` (same values)
- `description` becomes required `@db.Text` (was optional on Project, required on Idea)

**Models removed:**
- `Idea` — absorbed into Project
- `CanvasSnapshot` — no longer needed (notes snapshot stored as string on Research)

**Models updated:**
- `Interview` — `ideaId` → `projectId`
- `Report` — `ideaId` → `projectId`
- `Research` — `ideaId` → `projectId`, `canvasSnapshotId` → `notesSnapshot String? @db.Text`
- `User` — remove `ideas Idea[]` relation

#### ERD (Post-Migration)

```mermaid
erDiagram
    User ||--o{ Project : owns
    User ||--o{ Interview : owns
    User ||--o{ Report : owns
    Project ||--o{ Interview : has
    Project ||--o{ Report : has
    Project ||--o| Research : has

    User {
        string id PK
        string email UK
        string name
        enum subscription
        enum role
    }

    Project {
        string id PK
        string title
        text description
        text notes
        enum status
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    Interview {
        string id PK
        enum mode
        enum status
        int currentTurn
        json messages
        string projectId FK
        string userId FK
    }

    Research {
        string id PK
        enum status
        enum currentPhase
        int progress
        text notesSnapshot
        string projectId FK UK
    }

    Report {
        string id PK
        enum type
        enum tier
        text content
        string projectId FK
        string userId FK
    }
```

### Implementation Phases

#### Phase 1: Database Schema Migration

**Goal:** Merge Idea into Project at the database level. This is the foundation everything else builds on.

**Tasks:**

- [x] Add new fields to Project model:
  - `description String @db.Text` (make required, copy from first Idea)
  - `notes String? @db.Text` (new field, replaces canvas)
  - `status ProjectStatus @default(CAPTURED)` (copy from Idea)
  - Direct relations: `interviews Interview[]`, `reports Report[]`, `research Research?`
- [x] Create `ProjectStatus` enum (identical values to `IdeaStatus`: CAPTURED, INTERVIEWING, RESEARCHING, COMPLETE)
- [x] Update `Interview` model: `ideaId String` → `projectId String`
- [x] Update `Report` model: `ideaId String` → `projectId String`
- [x] Update `Research` model:
  - `ideaId String` → `projectId String` (keep `@unique`)
  - Remove `canvasSnapshotId String?`
  - Add `notesSnapshot String? @db.Text`
- [x] Remove `CanvasSnapshot` model
- [x] Remove `Idea` model
- [x] Remove `IdeaStatus` enum
- [x] Update `User` model: remove `ideas Idea[]` relation
- [x] Write migration script (`scripts/migrate-idea-to-project.ts`):
  1. For each Idea with a projectId: copy `title`, `description`, `status` to its Project
  2. For each Idea without a projectId: create a new Project from Idea data
  3. Update Interview, Report, Research foreign keys from `ideaId` → `projectId`
  4. Convert existing `canvas` JSON to notes text (concatenate block contents)
  5. Copy existing CanvasSnapshot content to Research `notesSnapshot` field
  6. Drop Idea table, CanvasSnapshot table, IdeaStatus enum
- [x] Run `pnpm db:generate` to regenerate Prisma client

**Files modified:**
- `BETA/packages/server/prisma/schema.prisma`
- `BETA/packages/server/src/scripts/migrate-idea-to-project.ts` (update existing)

**Success criteria:**
- [x] Prisma generates without errors
- [x] Migration script handles all existing data
- [x] All foreign key references updated
- [x] No orphaned records

---

#### Phase 2: Backend Router Consolidation

**Goal:** Merge idea router endpoints into project router. Update all routers that reference `ideaId`.

**Tasks:**

##### 2a. Merge `idea.ts` into `project.ts`

- [x] Add to project router (absorb from idea router):
  - `startInterview` — Creates interview, triggers Spark or starts Light/Forge chat. Updates `project.status` from CAPTURED → INTERVIEWING (Light/Forge) or CAPTURED → RESEARCHING (Spark)
  - `startResearch` — Creates Research record, snapshots notes text, enqueues pipeline
- [x] Update existing project router endpoints:
  - `list` — Remove idea includes, add status filter param. Support `phase` filter: `'draft'` (CAPTURED), `'active'` (INTERVIEWING + RESEARCHING), `'complete'` (COMPLETE)
  - `get` — Include interviews, reports, research directly (no nested idea)
  - `create` — Accept `title` + `description` (both required). Status defaults to CAPTURED
  - `update` — Accept `title`, `description`, `notes` (all optional)
  - `delete` — Cascade to interviews, reports, research
- [x] Remove `updateCanvas` endpoint (replaced by `update` with `notes` field)
- [x] Delete `idea.ts` router file
- [x] Update `routers/index.ts` to remove idea router export

**Files modified:**
- `BETA/packages/server/src/routers/project.ts` (major rewrite)
- `BETA/packages/server/src/routers/idea.ts` (delete)
- `BETA/packages/server/src/routers/index.ts`

##### 2b. Update `research.ts` router

- [x] Replace all `ideaId` references with `projectId`
- [x] Replace `idea.userId` ownership checks with `project.userId`
- [x] Replace `include: { idea: { include: { project: ... } } }` with direct `project` include
- [x] Replace canvas serialization (`serializeCanvasForAI()`) with direct notes pass-through
- [x] Update `start` endpoint: snapshot `project.notes` to `research.notesSnapshot` instead of creating CanvasSnapshot
- [x] Update `startSpark` endpoint: same notes snapshot logic
- [x] Update background job payloads: `ideaId` → `projectId`

**Files modified:**
- `BETA/packages/server/src/routers/research.ts`

##### 2c. Update `interview.ts` router

- [x] Replace all `ideaId` references with `projectId`
- [x] Replace `idea` relation includes with `project` includes
- [x] Update `complete` endpoint: use `projectId` when creating Research record
- [x] Update `abandon` endpoint: revert `project.status` to CAPTURED

**Files modified:**
- `BETA/packages/server/src/routers/interview.ts`

##### 2d. Update `report.ts` router

- [x] Replace all `ideaId` references with `projectId`
- [x] Replace `idea` relation includes with `project` includes
- [x] Update PDF generation to use `project.title`, `project.description`

**Files modified:**
- `BETA/packages/server/src/routers/report.ts`

**Success criteria:**
- [x] All tRPC endpoints compile without errors
- [x] No references to `ideaId` remain in routers
- [x] No references to `idea` model remain in routers
- [x] `pnpm type-check` passes for server package

---

#### Phase 3: Services & Background Jobs

**Goal:** Update AI services and background job workers that reference ideas or canvas.

**Tasks:**

- [x] Update `services/research-ai.ts`:
  - `ResearchInput` interface: `ideaId` → `projectId`, `ideaTitle` → `title`, `ideaDescription` → `description`
  - Canvas context: replace `canvasContext` with `notesContext` (plain text, no serialization)
  - All prompt templates: replace "idea" terminology with appropriate labels
- [x] Update `services/interview-ai.ts`:
  - Function signatures: `ideaId` → `projectId`, `ideaTitle` → `title`
  - System prompts: use `project.notes` as additional context if present
- [x] Update `services/spark-ai.ts`:
  - Function signatures: `ideaId` → `projectId`
  - Notes context injection (replaces canvas context)
- [x] Update `services/spark-demand.ts`, `spark-tam.ts`, `spark-competitors.ts`:
  - Verify no direct idea/canvas references (should be minimal)
- [x] Update `jobs/queues.ts`:
  - `ResearchPipelinePayload`: `ideaId` → `projectId`
  - `ReportGenerationPayload`: `ideaId` → `projectId`
  - `enqueueResearchPipeline()`: update param names
  - `enqueueReportGeneration()`: update param names
- [x] Update `jobs/workers/researchPipelineWorker.ts`:
  - All `ideaId` references → `projectId`
- [x] Update `jobs/workers/reportGenerationWorker.ts`:
  - All `ideaId` references → `projectId`
- [x] Update `lib/token-tracker.ts`:
  - `ideaId` → `projectId` in usage tracking
- [x] Update `lib/pdf/generator.tsx`:
  - References to `idea.title`, `idea.description` → `project.title`, `project.description`
- [x] Update `lib/audit.ts`:
  - Rename audit actions: `IDEA_CREATE` → `PROJECT_CREATE`, etc.
  - Remove `CANVAS_UPDATE`, `CANVAS_SNAPSHOT` actions
  - Add `NOTES_UPDATE` action if needed
- [x] Delete `lib/canvas-snapshot.ts` (no longer needed)

**Files modified:**
- `BETA/packages/server/src/services/research-ai.ts`
- `BETA/packages/server/src/services/interview-ai.ts`
- `BETA/packages/server/src/services/spark-ai.ts`
- `BETA/packages/server/src/jobs/queues.ts`
- `BETA/packages/server/src/jobs/workers/researchPipelineWorker.ts`
- `BETA/packages/server/src/jobs/workers/reportGenerationWorker.ts`
- `BETA/packages/server/src/lib/token-tracker.ts`
- `BETA/packages/server/src/lib/pdf/generator.tsx`
- `BETA/packages/server/src/lib/audit.ts`
- `BETA/packages/server/src/lib/canvas-snapshot.ts` (delete)

**Success criteria:**
- [x] No references to `ideaId`, `Idea`, `canvas`, or `CanvasSnapshot` in server package
- [x] `pnpm type-check` passes for server package
- [x] AI prompt templates use notes context correctly

---

#### Phase 4: Shared Package Updates

**Goal:** Update shared types, validators, and utilities.

**Tasks:**

- [x] Update `types/index.ts`:
  - Remove `Idea` interface
  - Remove canvas types: `CanvasBlock`, `CanvasBlockType`, `CanvasBlockBase`, `CanvasSectionBlock`, `CanvasNoteBlock`, `CanvasSubIdeaBlock`, `CanvasLinkBlock`, `PredefinedSectionType`, `CanvasSnapshot`
  - Rename `IdeaStatus` → `ProjectStatus` (keep same values)
  - Update `Project` interface: remove `canvas`, add `notes`, `status`, `description` (required)
  - Update `Interview` interface: `ideaId` → `projectId`
  - Update `Research` interface: `ideaId` → `projectId`, add `notesSnapshot`
  - Update `Report` interface: `ideaId` → `projectId`
  - Keep `ProjectStatus` type: `'DRAFT' | 'ACTIVE' | 'COMPLETE'` as derived type for sidebar (computed from status enum)
- [x] Update `validators/index.ts`:
  - Remove canvas validators: `canvasBlockSchema`, `updateCanvasSchema`
  - Remove idea validators: `createIdeaSchema`, `updateIdeaSchema`, `startInterviewSchema` (move to project validators)
  - Update `createProjectSchema`: require `title` + `description`
  - Update `updateProjectSchema`: optional `title`, `description`, `notes`
  - Add `startInterviewSchema` to project validators: `projectId` + optional `mode`
- [x] Update `constants/index.ts`:
  - Remove `PREDEFINED_SECTIONS` array
  - Remove `PROJECT_STATUS_LABELS` if based on canvas states
  - Update/keep status labels for new lifecycle
- [x] Delete `utils/canvas-serializer.ts`

**Files modified:**
- `BETA/packages/shared/src/types/index.ts`
- `BETA/packages/shared/src/validators/index.ts`
- `BETA/packages/shared/src/constants/index.ts`
- `BETA/packages/shared/src/utils/canvas-serializer.ts` (delete)

**Success criteria:**
- [x] No canvas-related types or validators remain
- [x] No `Idea` type exports remain
- [x] `pnpm type-check` passes for shared package

---

#### Phase 5: Frontend Web — Sidebar & Navigation

**Goal:** Two stacked sections in sidebar: Drafts + Vault. Update navigation.

**Tasks:**

- [x] Update `components/layout/sidebar.tsx`:
  - Add "Drafts" section above Vault
  - Drafts query: `trpc.project.list.useQuery({ phase: 'draft', limit: 5 })`
  - Vault query: `trpc.project.list.useQuery({ phase: 'active', limit: 5 })` (includes INTERVIEWING + RESEARCHING + COMPLETE)
  - Drafts section: collapsed by default, shows count badge, expands to show draft cards
  - Vault section: existing project cards, status badges (Active/Complete)
  - "New" button → captures draft directly or navigates to capture form
- [x] Update `components/layout/project-mini-card.tsx`:
  - Remove derived status logic (status now on Project directly)
  - Show appropriate badge: Draft (gray), Active (primary), Complete (green)
- [x] Delete `components/layout/idea-mini-card.tsx` (if exists)
- [x] Update `components/layout/top-nav-bar.tsx`:
  - Project selector shows all projects (non-drafts)
- [x] Update `middleware.ts`:
  - Redirect `/ideas/*` → `/projects/*` (keep existing redirect)
- [x] Update `lib/project-status.ts`:
  - Simplify: status is now directly on Project, no derivation from nested idea needed
  - Derived display status for sidebar: `CAPTURED → 'Draft'`, `INTERVIEWING/RESEARCHING → 'Active'`, `COMPLETE → 'Complete'`

**Files modified:**
- `BETA/packages/web/src/components/layout/sidebar.tsx`
- `BETA/packages/web/src/components/layout/project-mini-card.tsx`
- `BETA/packages/web/src/components/layout/idea-mini-card.tsx` (delete if exists)
- `BETA/packages/web/src/components/layout/top-nav-bar.tsx`
- `BETA/packages/web/src/middleware.ts`
- `BETA/packages/web/src/lib/project-status.ts`

**Success criteria:**
- [x] Sidebar shows Drafts and Vault sections
- [x] Items move from Drafts to Vault when research starts
- [x] Status badges display correctly

---

#### Phase 6: Frontend Web — Pages & Components

**Goal:** Consolidate idea pages into project pages. Remove canvas editor. Add title to capture card.

**Tasks:**

##### 6a. Capture Card (Dashboard)

- [x] Update dashboard capture card:
  - Add title input above description input
  - On submit: call `trpc.project.create({ title, description })`
  - Navigate to `/projects/[id]` on success

##### 6b. Project List Page

- [x] Update `projects/page.tsx`:
  - Add tab/filter toggle: "All" | "Active" | "Complete"
  - Remove derived status logic (use `project.status` directly)
  - Remove idea count display

##### 6c. Project Detail Page (Unified)

- [x] Rewrite `projects/[id]/page.tsx` to use the current idea detail layout:
  - Query: `trpc.project.get.useQuery({ id })`
  - Status-specific content based on `project.status`:
    - **CAPTURED**: Show notes field + research mode selection (Spark/Light/Forge buttons)
    - **INTERVIEWING**: Show "Resume Interview" card + research mode info
    - **RESEARCHING**: Show SparkProgress or ResearchProgress component
    - **COMPLETE**: Show results (SparkResults, score cards, user story, reports, etc.)
  - Notes field visible on all statuses (editable textarea below main content)
- [x] Move idea components to project directory:
  - `ideas/[id]/components/status-captured.tsx` → `projects/[id]/components/status-captured.tsx`
  - `ideas/[id]/components/status-researching.tsx` → `projects/[id]/components/status-researching.tsx`
  - `ideas/[id]/components/spark-progress.tsx` → `projects/[id]/components/spark-progress.tsx`
  - `ideas/[id]/components/spark-results.tsx` → `projects/[id]/components/spark-results.tsx`
  - `ideas/[id]/components/next-step-promotion.tsx` → `projects/[id]/components/next-step-promotion.tsx`
  - `ideas/[id]/components/report-grid.tsx` → `projects/[id]/components/report-grid.tsx`
  - `ideas/[id]/components/score-cards.tsx` → `projects/[id]/components/score-cards.tsx`
  - `ideas/[id]/components/user-story.tsx` → `projects/[id]/components/user-story.tsx`
  - `ideas/[id]/components/value-ladder.tsx` → `projects/[id]/components/value-ladder.tsx`
  - `ideas/[id]/components/download-card.tsx` → `projects/[id]/components/download-card.tsx`
- [x] Update all moved components: replace `trpc.idea.*` → `trpc.project.*`, `ideaId` → `projectId`
- [x] Update secondary nav: replace idea-secondary-nav with project-secondary-nav (already exists)
- [x] Move interview page: `ideas/[id]/interview/page.tsx` → `projects/[id]/interview/page.tsx`
- [x] Move interview summary: `ideas/[id]/interview-summary/page.tsx` → `projects/[id]/interview-summary/page.tsx`

##### 6d. Remove Canvas Editor

- [x] Delete `projects/[id]/components/canvas-editor.tsx`
- [x] Delete or simplify `projects/[id]/components/project-layout-client.tsx` (remove canvas-specific logic)

##### 6e. Delete Old Idea Pages

- [x] Delete entire `ideas/` directory under `(dashboard)/`

**Files modified/created/deleted:**
- `BETA/packages/web/src/app/(dashboard)/dashboard/page.tsx` (capture card update)
- `BETA/packages/web/src/app/(dashboard)/projects/page.tsx` (list update)
- `BETA/packages/web/src/app/(dashboard)/projects/[id]/page.tsx` (major rewrite)
- `BETA/packages/web/src/app/(dashboard)/projects/[id]/interview/page.tsx` (moved from ideas)
- `BETA/packages/web/src/app/(dashboard)/projects/[id]/components/*.tsx` (moved from ideas)
- `BETA/packages/web/src/app/(dashboard)/ideas/` (delete entire directory)
- `BETA/packages/web/src/app/(dashboard)/projects/[id]/components/canvas-editor.tsx` (delete)

**Success criteria:**
- [x] Dashboard capture card has title + description fields
- [x] `/projects/[id]` shows correct status-specific content
- [x] No `/ideas/` routes remain
- [x] No canvas editor components remain
- [x] All `trpc.idea.*` calls replaced with `trpc.project.*`

---

#### Phase 7: Frontend Mobile

**Goal:** Update mobile screens to match new unified model.

**Tasks:**

- [x] Update `(tabs)/ideas/index.tsx` (Vault screen):
  - Rename to projects list or update to show Drafts + Projects sections
  - Query: `trpc.project.list.useQuery({})`
  - Add section headers or tabs for Drafts vs Active/Complete
- [x] Update `(tabs)/ideas/new.tsx` (New idea screen):
  - Add title field above description
  - Call `trpc.project.create({ title, description })`
- [x] Update `(tabs)/ideas/[id]/index.tsx` (Detail screen):
  - Replace all `trpc.idea.*` calls with `trpc.project.*`
  - Update `ideaId` references to `projectId`
  - Status-specific rendering stays the same (already based on status)
- [x] Update `(tabs)/ideas/[id]/interview.tsx`:
  - Replace `ideaId` → `projectId`
- [x] Update `(tabs)/dashboard.tsx`:
  - Update any idea-related queries to project queries
- [x] Update `(tabs)/reports.tsx`:
  - Update any ideaId references to projectId
- [x] Update `components/analysis/NextStepPromotion.tsx`:
  - `ideaId` → `projectId`

**Files modified:**
- `BETA/packages/mobile/src/app/(tabs)/ideas/index.tsx`
- `BETA/packages/mobile/src/app/(tabs)/ideas/new.tsx`
- `BETA/packages/mobile/src/app/(tabs)/ideas/[id]/index.tsx`
- `BETA/packages/mobile/src/app/(tabs)/ideas/[id]/interview.tsx`
- `BETA/packages/mobile/src/app/(tabs)/dashboard.tsx`
- `BETA/packages/mobile/src/app/(tabs)/reports.tsx`
- `BETA/packages/mobile/src/components/analysis/NextStepPromotion.tsx`

**Success criteria:**
- [x] Mobile app displays drafts and projects correctly
- [x] New idea capture includes title field
- [x] All idea references replaced with project
- [x] `pnpm type-check` passes for mobile package

---

#### Phase 8: Cleanup & Documentation

**Goal:** Remove all legacy code, update docs.

**Tasks:**

- [x] Search entire codebase for remaining references to:
  - `ideaId`, `idea_id`, `IdeaStatus`, `Idea ` (as type)
  - `canvas`, `CanvasBlock`, `CanvasSnapshot`, `canvasSnapshot`
  - `updateCanvas`, `canvas-serializer`, `canvas-snapshot`
- [x] Remove `canvas` column from Project model (was Json, no longer used)
- [x] Update `CLAUDE.md`:
  - Remove Idea model from Backend API Structure table
  - Update Project model description
  - Remove canvas references
  - Update router endpoints
  - Add change log entry
- [x] Update `BETA/.env.example` if any canvas-related env vars exist
- [x] Run full type check: `pnpm type-check` from BETA root
- [ ] Test key flows manually:
  - Create draft → edit notes → trigger Spark → view results
  - Create draft → start Light interview → complete → view results
  - Delete draft, delete project
  - Sidebar shows correct sections

**Files modified:**
- Various cleanup across codebase
- `CLAUDE.md`

---

## Alternative Approaches Considered

### 1. Keep Both Models, Auto-Link (Rejected)
When research triggers, auto-create a Project and link the Idea. Least disruptive but keeps the dual-model complexity forever. The 1:1 relationship is an inherent code smell — if two tables always have exactly one record each, they should be one table.

### 2. Rename Idea to Project (Rejected)
Simply rename the Idea model to Project and add canvas → notes. Simpler migration but loses the existing Project model's structure (userId index, timestamps). Since the Project model already exists with data, merging is cleaner than renaming.

### 3. Keep Canvas, Simplify UI (Rejected)
Keep the block-based canvas system but simplify the editor. Rejected because the block system adds schema complexity (CanvasSnapshot, JSON validation, serializer) without clear user value at this stage.

## Acceptance Criteria

### Functional Requirements

- [x] User can capture a draft idea with title + description from dashboard
- [x] Draft ideas appear in sidebar "Drafts" section
- [x] Triggering Spark/Light/Forge on a draft moves it to sidebar "Vault" section
- [x] Research pipeline works identically (Spark 6-step, Light/Forge 5-phase)
- [x] Research upgrade path works (Spark → Light/Forge)
- [x] Notes field is editable at all statuses
- [x] Notes feed into AI research prompts as context
- [x] Project detail page shows correct status-specific content
- [x] Reports generate and display correctly
- [x] Delete works for both drafts and projects (with cascade)
- [x] Mobile app reflects all changes

### Non-Functional Requirements

- [x] No data loss during migration (all existing ideas/projects preserved)
- [x] `pnpm type-check` passes across all packages
- [x] No references to `Idea` model, `ideaId`, or canvas blocks remain in codebase
- [x] Existing `/ideas/[id]` URLs redirect to `/projects/[id]`

### Quality Gates

- [x] Database migration script tested on development database
- [x] All tRPC endpoints accessible from frontend
- [x] Sidebar updates reactively when status changes
- [ ] Full end-to-end flow tested (capture → research → results)

## Success Metrics

- Capture-to-research time decreases (fewer steps)
- Codebase complexity reduced (~15 files deleted, ~40 files simplified)
- Single source of truth for project data (one table, not two)

## Dependencies & Prerequisites

- **Database backup** before running migration
- Current `feat/project-canvas` branch as base (contains the Project+Canvas code to modify)
- No concurrent work on idea/project routers

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data loss during migration | Medium | Critical | Backup database first. Migration script is idempotent. Test on staging first. |
| Breaking existing research pipelines | Low | High | Research logic stays the same — only foreign key names change |
| Mobile app breaks | Medium | Medium | Mobile uses same tRPC client — update types and it follows |
| Orphaned records (interviews/reports without project) | Low | Medium | Migration script validates all foreign key references |
| AI context quality degrades (notes vs canvas) | Low | Low | Notes text is more direct than serialized canvas blocks — quality may improve |

## Phase Transition Rules (Key Design Decisions)

### Status Lifecycle

| Trigger | From | To | Sidebar |
|---------|------|----|---------|
| User creates draft | — | CAPTURED | Drafts |
| User starts Light/Forge interview | CAPTURED | INTERVIEWING | Vault |
| User triggers Spark | CAPTURED | RESEARCHING | Vault |
| Interview completes → research starts | INTERVIEWING | RESEARCHING | Vault |
| Research completes | RESEARCHING | COMPLETE | Vault |
| Research fails | RESEARCHING | RESEARCHING (Research.status=FAILED) | Vault (error state) |
| Interview abandoned | INTERVIEWING | CAPTURED | Drafts |
| Interview expired | INTERVIEWING | CAPTURED | Drafts |

### Notes Field Rules

- **Format:** Plain text (no markdown rendering, no rich text editor)
- **Max length:** Soft limit 10,000 chars in UI, `@db.Text` (unlimited) in database
- **AI truncation:** First 4,000 chars passed to AI prompts (matching current canvas limit)
- **Editable:** At all statuses, including during research
- **Snapshot:** Notes text stored as `Research.notesSnapshot` when research starts

### Title/Description Edit Rules

- **Editable:** At all statuses
- **Effect:** Edits do NOT trigger re-research or invalidate existing results
- **Upgrade behavior:** When upgrading research mode, latest title/description/notes are used

## Future Considerations

- **Multi-project support**: The unified model makes it trivial to later add sub-projects or idea grouping
- **Rich notes editor**: Could upgrade from plain textarea to basic markdown editor in a future iteration
- **Project templates**: Could add template support (pre-filled notes for common idea types)
- **Draft auto-cleanup**: Could add TTL for abandoned drafts after N days

## References & Research

### Internal References

- Brainstorm: [2026-02-08-unified-project-lifecycle-brainstorm.md](../brainstorms/2026-02-08-unified-project-lifecycle-brainstorm.md)
- Superseded plan: [2026-02-06-feat-project-canvas-architecture-plan.md](2026-02-06-feat-project-canvas-architecture-plan.md)
- Prisma schema: `BETA/packages/server/prisma/schema.prisma`
- Project router: `BETA/packages/server/src/routers/project.ts`
- Idea router: `BETA/packages/server/src/routers/idea.ts`
- Research router: `BETA/packages/server/src/routers/research.ts`
- Interview router: `BETA/packages/server/src/routers/interview.ts`
- Sidebar: `BETA/packages/web/src/components/layout/sidebar.tsx`
- Shared types: `BETA/packages/shared/src/types/index.ts`

### File Impact Summary

| Category | Files Modified | Files Deleted | Files Created |
|----------|---------------|---------------|---------------|
| Database | 2 | 0 | 0 |
| Backend routers | 5 | 1 (idea.ts) | 0 |
| Backend services | 8 | 2 (canvas-snapshot, canvas-serializer) | 0 |
| Shared package | 4 | 1 (canvas-serializer) | 0 |
| Web frontend | ~20 | ~15 (idea pages + canvas) | ~12 (moved components) |
| Mobile frontend | 7 | 0 | 0 |
| Documentation | 1 | 0 | 0 |
| **Total** | **~47** | **~19** | **~12** |
