---
status: done
priority: p1
issue_id: "005"
tags: [code-review, data-integrity, performance, prisma]
dependencies: []
---

# Missing $transaction on Multi-Table Status Updates

## Problem Statement

Multiple code paths perform 2-3 sequential database writes that must be atomic but are NOT wrapped in `prisma.$transaction()`. If a connection drops between calls, the system reaches an inconsistent state (e.g., interview marked COMPLETE but project stuck in INTERVIEWING).

## Findings

### Agent: performance-oracle + data-integrity-guardian

Affected operations:
- `project.startInterview`: Creates interview + updates project status (2 writes)
- `project.startResearch`: Creates research + updates project status (2 writes)
- `research.start`: Creates research + updates project + runs pipeline (3 writes)
- `interview.complete`: Updates interview + updates project + creates research (3 writes)

Additionally, `project.startResearch` catches queue errors silently, leaving the research record in `PENDING` with no job processing it — the user sees "Researching" indefinitely.

## Proposed Solutions

### Option A: Wrap in prisma.$transaction (Recommended)
Use `prisma.$transaction([...])` for all multi-table writes.
- **Pros**: Atomic operations, consistent state guaranteed
- **Cons**: Slightly more complex code
- **Effort**: Small (1 hour)
- **Risk**: Low

## Technical Details

**Affected files:**
- `packages/server/src/routers/project.ts` (startInterview ~line 270, startResearch ~line 380)
- `packages/server/src/routers/research.ts` (start ~line 210)
- `packages/server/src/routers/interview.ts` (complete ~line 460)

## Acceptance Criteria

- [ ] All multi-table writes wrapped in `$transaction`
- [ ] Queue enqueue failure either rolls back or surfaces error to user
- [ ] No orphaned records possible on partial failure

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by performance-oracle + data-integrity-guardian |
