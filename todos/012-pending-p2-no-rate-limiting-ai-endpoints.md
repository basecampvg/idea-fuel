---
status: deferred
priority: p2
issue_id: "012"
tags: [code-review, security, rate-limiting]
dependencies: []
---

# No Rate Limiting on AI Pipeline Endpoints

## Problem Statement

No rate limiting exists on any tRPC endpoint. The most expensive targets (`startInterview`, `research.start`, `research.startSpark`) trigger OpenAI API calls costing $15+ per run. An attacker with a single authenticated account could trigger hundreds of concurrent research pipelines, creating unbounded financial exposure.

## Findings

### Agent: security-sentinel

- No rate limiting middleware found in any router
- No per-user concurrency limits
- Combined with lack of project count limits, cost exposure is unbounded

## Proposed Solutions

### Option A: Per-user rate limiting on expensive endpoints (Recommended)
Add rate limiting middleware (e.g., sliding window) to AI pipeline endpoints.
- **Effort**: Medium (2-4 hours)
- **Risk**: Low

## Acceptance Criteria

- [ ] AI pipeline endpoints rate-limited per user
- [ ] Clear error message when rate limit exceeded
- [ ] Rate limits aligned with subscription tiers

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by security-sentinel |
