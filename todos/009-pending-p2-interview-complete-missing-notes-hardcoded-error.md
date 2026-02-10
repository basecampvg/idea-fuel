---
status: done
priority: p2
issue_id: "009"
tags: [code-review, data-integrity, bug]
dependencies: []
---

# interview.complete: Missing notesSnapshot + Hardcoded errorPhase

## Problem Statement

Two bugs in the `interview.complete` handler's background research pipeline:

1. **Missing notesSnapshot**: Research created via `interview.complete` does NOT snapshot `project.notes`, unlike all three other creation paths (`project.startResearch`, `research.start`, `research.startSpark`). This means AI pipelines triggered via interview completion receive different (missing) context.

2. **Hardcoded errorPhase**: Error handler always sets `errorPhase: 'SYNTHESIS'` regardless of actual failure phase (line 561).

## Findings

### Agent: data-integrity-guardian + security-sentinel + pattern-recognition-specialist

- `interview.ts` lines 468-476: `notesSnapshot` not included in Research creation
- `interview.ts` line 561: `errorPhase: 'SYNTHESIS'` hardcoded
- This was noted as fixed in 2026-01-20 changelog for `research.ts`, but the same bug persists in `interview.ts`

## Proposed Solutions

### Option A: Fix both issues directly (Recommended)
Add `notesSnapshot: project.notes` to research creation. Track `currentPhase` variable for error handler.
- **Effort**: Small (30 min)
- **Risk**: Low

## Acceptance Criteria

- [ ] `notesSnapshot: project.notes` added to Research creation in interview.complete
- [ ] `errorPhase` tracks actual phase dynamically
- [ ] All research creation paths produce consistent records

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by data-integrity-guardian + pattern-recognition-specialist |
