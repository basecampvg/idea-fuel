---
status: done
priority: p2
issue_id: "008"
tags: [code-review, security, validation]
dependencies: ["001"]
---

# Arbitrary JSON Injection via z.record(z.any()) in research.updatePhase

## Problem Statement

The `data` parameter in `research.updatePhase` uses `z.record(z.any())`, accepting any JSON without schema validation. Combined with the IDOR (issue 001), this allows injecting arbitrary data into research fields. Even after fixing the IDOR, the lack of schema validation is a defense-in-depth gap.

## Findings

### Agent: security-sentinel

- `research.ts` line 559: `data: z.record(z.any())`
- Same pattern at `interview.addAssistantMessage` line 229: `collectedData: z.record(z.any()).optional()`
- Injected data renders in frontend components without additional validation

## Proposed Solutions

### Option A: Replace with typed Zod schemas (Recommended)
Define specific schemas for each updatable research field.
- **Effort**: Medium (1-2 hours)
- **Risk**: Low

## Acceptance Criteria

- [ ] `updatePhase` data parameter uses typed schemas per field
- [ ] `collectedData` on interview uses a defined schema
- [ ] All validated at API boundary

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by security-sentinel |
