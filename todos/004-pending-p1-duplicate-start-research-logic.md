---
status: done
priority: p1
issue_id: "004"
tags: [code-review, architecture, duplication]
dependencies: []
---

# Duplicate and Divergent startResearch Logic Across Routers

## Problem Statement

Three separate code paths create a Research record and trigger a pipeline, each with different initial state and execution strategy. This produces inconsistent Research records and makes the system hard to reason about.

## Findings

### Agent: architecture-strategist + pattern-recognition-specialist

| Path | File | Initial Phase | Initial Status | Execution |
|------|------|--------------|----------------|-----------|
| `project.startResearch` | `project.ts:342-417` | `QUEUED` | `PENDING` | BullMQ queue (stub) |
| `research.start` | `research.ts:149-469` | `DEEP_RESEARCH` | `IN_PROGRESS` | In-process IIFE |
| `interview.complete` | `interview.ts:418-567` | `QUERY_GENERATION` | `IN_PROGRESS` | In-process IIFE |

The `interview.complete` path also has a hardcoded `errorPhase: 'SYNTHESIS'` at line 561.

## Proposed Solutions

### Option A: Consolidate to single startResearch function (Recommended)
Create a shared `triggerResearch()` function that all three paths call, with consistent initial state and execution.
- **Pros**: Single source of truth, consistent behavior
- **Cons**: Requires touching 3 files
- **Effort**: Medium (1-2 hours)
- **Risk**: Medium (must verify all callers work correctly)

### Option B: Remove project.startResearch (stub path)
Since the BullMQ worker is a stub, remove the project.startResearch endpoint and always use research.start.
- **Pros**: Eliminates dead code path
- **Cons**: Loses the queued approach for when BullMQ is ready
- **Effort**: Small (30 min)
- **Risk**: Low

## Technical Details

**Affected files:**
- `BETA/packages/server/src/routers/project.ts` (lines 342-417)
- `BETA/packages/server/src/routers/research.ts` (lines 149-469)
- `BETA/packages/server/src/routers/interview.ts` (lines 418-567)

## Acceptance Criteria

- [ ] Single code path for research creation with consistent initial state
- [ ] All callers produce identical Research records
- [ ] Error phase tracking is dynamic, not hardcoded

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by architecture-strategist + pattern-recognition-specialist |
