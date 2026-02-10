---
status: done
priority: p3
issue_id: "013"
tags: [code-review, naming, cleanup]
dependencies: []
---

# Stale "idea"/"canvas" Naming Across Codebase (50+ Locations)

## Problem Statement

Despite the Idea → Project rename, dozens of references to "idea" and "canvas" remain throughout the codebase. This creates confusion for developers and inconsistent user-facing copy.

## Findings

### Agent: pattern-recognition-specialist + code-simplicity-reviewer + architecture-strategist

**Server - High Impact:**
- `research-ai.ts`: `ResearchInput.ideaTitle`, `ideaDescription`, `canvasContext` (9 occurrences), `FOUNDER'S CANVAS` prompt header
- `audit.ts`: 6 dead action types (`IDEA_CREATE/UPDATE/DELETE/VIEW`, `CANVAS_UPDATE/SNAPSHOT`), `formatResource('idea')`
- `config.ts`: 15+ config descriptions reference "idea dashboard"
- Subscription constants: `maxIdeas`, `canCreateIdea()`, `getIdeasRemaining()` (20+ locations)
- PDF templates: `ideaTitle`, `ideaDescription` in positioning/competitive-analysis/business-plan templates

**Frontend - Lower Impact:**
- Dashboard: `ideaTitle`, `ideaDescription` variables
- Component props: `ideaTitle` in action-prompts, spark-results, offer-section
- Mobile stylesheets: `ideaRow`, `ideaSubtitle`, `ideaStatusDot`, `ideaInput` style keys
- Delete modal: "canvas, idea" in confirmation text

**Schema comments:**
- `schema.prisma` line 433: example `"IDEA_CREATE"`, line 434: example `"idea:abc123"`

## Proposed Solutions

### Option A: Batch rename in cleanup pass (Recommended)
Use find-and-replace across the codebase. Group by layer (server, shared, web, mobile).
- **Effort**: Medium (2-3 hours)
- **Risk**: Low (mostly renaming)

## Acceptance Criteria

- [ ] No remaining "idea" or "canvas" references in active code (excluding git history)
- [ ] `canvasContext` → `notesContext` in research-ai.ts
- [ ] `ideaTitle/ideaDescription` → `projectTitle/projectDescription` in AI services
- [ ] Subscription helpers renamed to project-based naming
- [ ] Stale audit actions removed

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by pattern-recognition + code-simplicity + architecture |
