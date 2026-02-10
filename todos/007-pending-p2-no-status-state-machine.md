---
status: done
priority: p2
issue_id: "007"
tags: [code-review, architecture, state-machine]
dependencies: []
---

# No State Machine for Project Status Transitions

## Problem Statement

Project status is mutated via raw `prisma.project.update({ data: { status: '...' } })` in 11 separate locations across 4 routers. No centralized function validates that transitions follow the intended lifecycle. Invalid transitions are possible (e.g., COMPLETE → CAPTURED via interview.abandon).

## Findings

### Agent: pattern-recognition-specialist + security-sentinel + architecture-strategist

11 mutation points found:

| Transition | Router | Location |
|-----------|--------|----------|
| * → INTERVIEWING | project | project.ts:322 |
| * → RESEARCHING | project | project.ts:273, 392 |
| * → RESEARCHING | research | research.ts:226, 807 |
| * → RESEARCHING | interview | interview.ts:464 |
| * → COMPLETE | interview/research | interview.ts:553, research.ts:436, 632, 863 |
| * → CAPTURED | interview | interview.ts:604 |

Invalid transitions possible:
- COMPLETE → RESEARCHING (via research.start with no guard)
- COMPLETE → CAPTURED (via interview.abandon)
- Multiple concurrent transitions to RESEARCHING

## Proposed Solutions

### Option A: Centralized transitionProjectStatus function (Recommended)
Create a function that validates `(currentStatus, targetStatus)` pairs against an allowed transitions map.
- **Effort**: Medium (1-2 hours)
- **Risk**: Low

## Technical Details

**Affected files:**
- `packages/server/src/routers/project.ts`
- `packages/server/src/routers/research.ts`
- `packages/server/src/routers/interview.ts`

## Acceptance Criteria

- [ ] Centralized transition function with allowed transitions map
- [ ] All 11 mutation points use the centralized function
- [ ] Invalid transitions throw descriptive errors
- [ ] Pipeline error resets project status appropriately (not stuck in RESEARCHING)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by pattern-recognition + security-sentinel + architecture-strategist |
