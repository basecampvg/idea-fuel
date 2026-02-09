---
status: done
priority: p3
issue_id: "014"
tags: [code-review, cleanup, dead-code]
dependencies: []
---

# Dead Code Cleanup (Seed File, Unused Import, BullMQ Stubs)

## Problem Statement

Several pieces of dead code remain from the migration that should be cleaned up.

## Findings

### Agent: code-simplicity-reviewer + data-integrity-guardian + pattern-recognition-specialist

1. **Dead seed file**: `prisma/seed-test-ideas.js` calls `prisma.idea.create` and uses `ideaId`. Will crash on execution. (~210 lines)
2. **Unused import**: `paginationSchema` imported but never used in `project.ts`
3. **BullMQ worker stubs**: `researchPipelineWorker.ts` has 5 TODOs with `simulatePhase()`. `reportGenerationWorker.ts` has 1 TODO. Both are complete stubs.
4. **Dead `list-ideas.ts` script**: References deleted Idea model (already deleted in diff but verify)

## Proposed Solutions

### Option A: Delete dead files, remove unused imports
- Delete `seed-test-ideas.js` or rewrite for Project model
- Remove unused `paginationSchema` import
- Either implement BullMQ workers or remove the stub files
- **Effort**: Small (30 min)
- **Risk**: Low

## Acceptance Criteria

- [ ] Seed file updated or deleted
- [ ] No unused imports in project router
- [ ] BullMQ stubs documented or removed

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by code-simplicity + data-integrity + pattern-recognition |
