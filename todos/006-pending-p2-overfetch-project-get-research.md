---
status: done
priority: p2
issue_id: "006"
tags: [code-review, performance, overfetch]
dependencies: []
---

# Over-fetch: project.get Includes Full Research Model (50-200KB)

## Problem Statement

The `project.get` endpoint uses `research: true` which includes the entire Research model with 30+ JSON columns (`rawData`, `rawDeepResearch`, `researchChunks`, `synthesizedInsights`, `marketAnalysis`, `competitors`, etc.). This transfers 50-200KB per request. Combined with 3-second polling during research, one user generates ~40 full-payload requests per minute.

## Findings

### Agent: performance-oracle

- `project.ts` line 115: `research: true` — no `select` filter
- Layout client polls every 3s during RESEARCHING status
- Each sub-page also triggers `project.get` (React Query deduplication helps but stale cache re-fetches full payload)
- Audit log fires on every `project.get` call (~28K rows/user/day during research)

## Proposed Solutions

### Option A: Use select on research include (Recommended)
Replace `research: true` with `research: { select: { status, currentPhase, progress, scores... } }` for the main query. Create a separate `research.getFull` endpoint for sub-pages that need the complete data.
- **Effort**: Medium (1-2 hours)
- **Risk**: Low

### Option B: Remove audit log from project.get
At minimum, stop writing audit rows on every read.
- **Effort**: Small (5 min)
- **Risk**: Low

## Technical Details

**Affected files:**
- `BETA/packages/server/src/routers/project.ts` (line 115)
- `BETA/packages/server/src/lib/audit.ts` (logAuditAsync call in get endpoint)

## Acceptance Criteria

- [ ] `project.get` returns only status/progress fields from Research by default
- [ ] Sub-pages that need full research data use a dedicated endpoint
- [ ] Audit log removed from `project.get` or debounced

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by performance-oracle |
