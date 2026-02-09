---
status: done
priority: p2
issue_id: "011"
tags: [code-review, performance, frontend]
dependencies: []
---

# Double Polling During Research Progress

## Problem Statement

During research, two separate mechanisms poll `project.get` simultaneously, effectively doubling the request rate to ~1 request per 1.5 seconds instead of every 3 seconds.

## Findings

### Agent: performance-oracle

- `project-layout-client.tsx`: Sets `refetchInterval: 3000` on the query
- `status-researching.tsx`: Runs a separate `setInterval` calling `utils.project.get.invalidate` every 3000ms
- These are unsynchronized, causing double the traffic

## Proposed Solutions

### Option A: Remove StatusResearching polling (Recommended)
The layout already handles polling. Remove the duplicate `setInterval` from `status-researching.tsx`.
- **Effort**: Small (15 min)
- **Risk**: Low

## Acceptance Criteria

- [ ] Only one polling mechanism active during research
- [ ] Research progress still updates every 3 seconds

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by performance-oracle |
