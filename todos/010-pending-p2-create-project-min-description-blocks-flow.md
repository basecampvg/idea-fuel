---
status: done
priority: p2
issue_id: "010"
tags: [code-review, bug, ux]
dependencies: []
---

# createProjectSchema Minimum Description Length Blocks "New Project" Flow

## Problem Statement

The `createProjectSchema` validator requires `description` to be at least 10 characters, but the "New Project" button creates a project with `description: ''`. This fails Zod validation at runtime.

## Findings

### Agent: architecture-strategist

- `validators/index.ts` line 9: `description: z.string().min(10, ...)`
- `projects/page.tsx` lines 112-113: Creates project with empty description
- Users cannot create a draft project without writing 10+ characters of description first

## Proposed Solutions

### Option A: Relax min for draft creation (Recommended)
Allow empty description on creation (drafts), enforce minimum only when starting interview/research.
- **Effort**: Small (15 min)
- **Risk**: Low

## Acceptance Criteria

- [ ] "New Project" button works without requiring description
- [ ] Description validation enforced before starting interview/research

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by architecture-strategist |
