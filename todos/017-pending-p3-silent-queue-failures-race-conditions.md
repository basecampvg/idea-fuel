---
status: done
priority: p3
issue_id: "017"
tags: [code-review, reliability, error-handling]
dependencies: ["005"]
---

# Silent Queue Enqueue Failures + Concurrent startResearch Race Condition

## Problem Statement

Two related reliability issues:

1. **Silent queue failures**: Queue enqueue errors are caught and logged but leave entities stranded in processing states forever (Research in `PENDING`, Report in `GENERATING`).

2. **Race condition**: Concurrent `startResearch` calls can pass the `if (project.research)` check simultaneously, hitting the `@unique` constraint on `projectId` with an unhandled Prisma error instead of a clean user message.

## Findings

### Agent: pattern-recognition-specialist + performance-oracle

**Silent failures:**
- `project.ts` lines 412-414: `enqueueResearchPipeline` error caught silently
- `report.ts` lines 192-194, 243-245: `enqueueReportGeneration` error caught silently
- `research.ts` lines 511-516: `enqueueResearchCancel` error caught silently

**Race condition:**
- `project.ts` line 364: Check `if (project.research)` and line 379 `research.create` are not atomic
- Second concurrent request hits unique constraint, surfaces as unhandled Prisma error

## Proposed Solutions

### Option A: Surface queue errors + catch unique constraint
- Queue failure: Roll back entity state or surface error to user
- Race condition: Catch `P2002` unique constraint error and return friendly message
- **Effort**: Small (1 hour)
- **Risk**: Low

## Acceptance Criteria

- [ ] Queue failures either roll back or notify user
- [ ] Concurrent startResearch returns clean error message
- [ ] No entities stranded in processing states

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by pattern-recognition + performance-oracle |
