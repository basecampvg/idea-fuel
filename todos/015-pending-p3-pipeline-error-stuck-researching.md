---
status: done
priority: p3
issue_id: "015"
tags: [code-review, bug, data-integrity]
dependencies: ["007"]
---

# Pipeline Error Does Not Reset Project Status (Stuck in RESEARCHING)

## Problem Statement

When the research pipeline fails, the error handler sets `research.status` to `FAILED` but does NOT reset `project.status` from `RESEARCHING`. The project becomes permanently stuck in `RESEARCHING` with no user recovery path. Same pattern affects Spark pipeline and `research.cancel`.

## Findings

### Agent: data-integrity-guardian

- `research.ts` lines 438-465: Error handler updates research but not project
- `research.ts` lines 865-877: Same for Spark pipeline
- `research.cancel`: Does not reset project status either
- Users have no way to recover short of starting new research (which fails because one already exists)

## Proposed Solutions

### Option A: Reset project status on pipeline failure (Recommended)
In error/cancel handlers, reset `project.status` to its previous valid state (e.g., CAPTURED or INTERVIEWING).
- **Effort**: Small (30 min)
- **Risk**: Low (best combined with state machine from issue 007)

## Acceptance Criteria

- [ ] Pipeline failure resets project to a recoverable status
- [ ] Pipeline cancellation resets project status
- [ ] User can retry after failure

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by data-integrity-guardian |
