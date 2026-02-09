---
status: deferred
priority: p1
issue_id: "002"
tags: [code-review, data-integrity, prisma, migration]
dependencies: []
---

# No Migration SQL - db:push Will Destroy Existing Data

## Problem Statement

The `prisma/migrations/` directory contains zero files. The only mechanism to sync the schema is `prisma db push`. When Prisma encounters a model rename (`Idea` → `Project`) and column renames (`ideaId` → `projectId`) via `db:push`, it performs **DROP TABLE + CREATE TABLE**, not `ALTER TABLE RENAME`. All existing records are permanently destroyed.

## Findings

### Agent: data-integrity-guardian

- No migration files exist anywhere in the project
- The schema change renames: model `Idea` → `Project`, FK `ideaId` → `projectId` on Interview/Report/Research/TokenUsage, enum `IdeaStatus` → `ProjectStatus`
- `db:push` cannot infer renames — it treats them as drop+create
- No rollback strategy exists
- No database backup script exists

## Proposed Solutions

### Option A: Write proper ALTER TABLE migration SQL (Recommended if data exists)
Create a SQL migration that renames tables, columns, and enums in-place.
- **Pros**: Preserves all existing data
- **Cons**: Manual SQL required, must be tested against a copy of production
- **Effort**: Medium (1-2 hours)
- **Risk**: Medium (must validate FK constraints)

### Option B: Document that db:push is intentional (if pre-production)
If the Supabase database contains no valuable data, document this explicitly.
- **Pros**: No migration work needed
- **Cons**: Risky if assumption is wrong
- **Effort**: Small (15 min)
- **Risk**: High if assumption is wrong

### Option C: Take Supabase snapshot before push
At minimum, create a database snapshot before applying schema changes.
- **Pros**: Provides rollback capability
- **Cons**: Doesn't prevent data loss, just enables recovery
- **Effort**: Small (15 min)
- **Risk**: Low

## Technical Details

**Affected files:**
- `BETA/packages/server/prisma/schema.prisma`
- `BETA/packages/server/prisma/migrations/` (empty)

## Acceptance Criteria

- [ ] Either: proper migration SQL written and tested, OR database confirmed expendable and documented
- [ ] Supabase snapshot taken before any schema push
- [ ] Schema successfully applied without data loss

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-08 | Created | Found by data-integrity-guardian agent |

## Resources

- Supabase project: `wvacfynzguprqlzyukzx` (us-west-2)
