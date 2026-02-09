---
status: done
priority: p1
issue_id: "003"
tags: [code-review, architecture, types, runtime-error]
dependencies: []
---

# ResearchPhase Enum Desync Across Three Definitions

## Problem Statement

The `ResearchPhase` type is defined in three places with **different values**, causing runtime validation failures when the pipeline produces states that the shared validators reject.

## Findings

### Agent: architecture-strategist + pattern-recognition-specialist

| Source | File | Values |
|--------|------|--------|
| Prisma schema | `schema.prisma:265-277` | QUEUED, DEEP_RESEARCH, SYNTHESIS, SOCIAL_RESEARCH, REPORT_GENERATION, **BUSINESS_PLAN_GENERATION**, COMPLETE, QUERY_GENERATION, DATA_COLLECTION |
| Shared types | `types/index.ts:200-209` | QUEUED, DEEP_RESEARCH, SOCIAL_RESEARCH, SYNTHESIS, REPORT_GENERATION, COMPLETE, QUERY_GENERATION, DATA_COLLECTION |
| Shared validators | `validators/index.ts:115-122` | QUEUED, QUERY_GENERATION, DATA_COLLECTION, SYNTHESIS, REPORT_GENERATION, COMPLETE |

**Missing from shared types:** `BUSINESS_PLAN_GENERATION`
**Missing from validators:** `DEEP_RESEARCH`, `SOCIAL_RESEARCH`, `BUSINESS_PLAN_GENERATION`

Any API endpoint using `researchPhaseSchema` for input validation will reject valid phase values the pipeline actually produces.

## Proposed Solutions

### Option A: Sync all three definitions (Recommended)
Add all missing phases to shared types and validators to match the Prisma schema.
- **Pros**: Complete fix, prevents runtime errors
- **Cons**: None
- **Effort**: Small (30 min)
- **Risk**: Low

## Technical Details

**Affected files:**
- `BETA/packages/shared/src/types/index.ts` (lines 200-209)
- `BETA/packages/shared/src/validators/index.ts` (lines 115-122)
- `BETA/packages/server/prisma/schema.prisma` (lines 265-277) — source of truth

Also update shared constants:
- `BETA/packages/shared/src/constants/index.ts` — add `BUSINESS_PLAN_GENERATION` to `RESEARCH_PHASE_LABELS`, `RESEARCH_PHASE_DESCRIPTIONS`, `RESEARCH_PHASE_DURATION_MINUTES`, `RESEARCH_PHASE_PROGRESS`

## Acceptance Criteria

- [ ] `ResearchPhase` type in shared types matches Prisma enum exactly
- [ ] `researchPhaseSchema` in validators matches Prisma enum exactly
- [ ] Constants include entries for all phases
- [ ] `pnpm type-check` passes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by architecture-strategist + pattern-recognition-specialist |
