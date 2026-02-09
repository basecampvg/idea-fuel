---
status: done
priority: p1
issue_id: "001"
tags: [code-review, security, idor]
dependencies: []
---

# IDOR in research.updatePhase and research.markFailed

## Problem Statement

Two research router endpoints (`updatePhase` and `markFailed`) are `protectedProcedure` but perform **no userId ownership check**. Any authenticated user who knows or guesses a valid research CUID can modify or sabotage another user's research data.

This is a **merge-blocking security vulnerability**.

## Findings

### Agent: security-sentinel

- `research.ts` lines 542-637 (`updatePhase`): Fetches `project.userId` but never compares it to `ctx.userId`
- `research.ts` lines 693-736 (`markFailed`): Does not even fetch the project relationship
- **Contrast**: All other endpoints in the same file (`get`, `getProgress`, `cancel`, `backfill`, `getSparkStatus`, `pollSpark`) properly verify ownership and throw `FORBIDDEN`

### Proof of Concept

```typescript
// Any authenticated user can sabotage another user's research:
trpc.research.markFailed.mutate({
  id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', // victim's research ID
  errorMessage: 'Sabotaged',
  errorPhase: 'DEEP_RESEARCH',
});
```

## Proposed Solutions

### Option A: Add ownership check (Recommended)
Add `research.project.userId !== ctx.userId` check to both endpoints, matching existing pattern.
- **Pros**: Simple, consistent with existing code
- **Cons**: None
- **Effort**: Small (15 min)
- **Risk**: Low

## Technical Details

**Affected files:**
- `packages/server/src/routers/research.ts` (lines 542-637, 693-736)

## Acceptance Criteria

- [ ] `updatePhase` checks `research.project.userId === ctx.userId` before proceeding
- [ ] `markFailed` checks `research.project.userId === ctx.userId` before proceeding
- [ ] Both throw `TRPCError({ code: 'FORBIDDEN' })` on mismatch
- [ ] Verified manually or via test

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by security-sentinel agent |

## Resources

- Branch: `feat/unified-project-lifecycle`
- Correct pattern example: `research.ts` line 103 (`get` endpoint)
