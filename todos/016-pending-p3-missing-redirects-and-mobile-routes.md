---
status: done
priority: p3
issue_id: "016"
tags: [code-review, ux, routes]
dependencies: []
---

# Missing /ideas/ to /projects/ URL Redirect + Mobile Route Naming

## Problem Statement

All web routes migrated from `/ideas/` to `/projects/`, but no redirects exist for bookmarked URLs. Mobile app route files still use `ideas/` naming while tRPC calls correctly use `project.*`.

## Findings

### Agent: architecture-strategist + pattern-recognition-specialist

- No `redirects()` in `next.config.ts` for `/ideas/:path*` → `/projects/:path*`
- Mobile routes: `(tabs)/ideas/[id]/index.tsx`, `(tabs)/ideas/new.tsx` etc. still named with "ideas"
- tRPC calls in mobile correctly use `trpc.project.*`

## Proposed Solutions

### Option A: Add Next.js redirects + rename mobile routes
- Add redirects in `next.config.ts`
- Rename mobile route files from `ideas/` to `projects/`
- **Effort**: Small (30 min)
- **Risk**: Low

## Acceptance Criteria

- [ ] `/ideas/*` URLs redirect to `/projects/*` in web app
- [ ] Mobile route files renamed to `projects/`

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by architecture-strategist + pattern-recognition-specialist |
