# Thought Property Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the thought property system so the schema enforces the brand belief that "a thought is not an idea." Drop user-declared idea-ness from thoughts, finish the half-built `crystallizedIdeas` architecture by collapsing it into a renamed `ideas` table, automate cluster synthesis, and add a release valve for utility notes.

**Architecture:**
- Single feature branch `matt/thought-property-restructure`. Phases are sequential and each is independently shippable.
- Backend: Drizzle migrations, tRPC routers, vitest tests, BullMQ-style background workers (existing pattern: `thoughtCollisionWorker`).
- Mobile: React Native + Expo Router, tRPC client, Lucide icons, BottomSheet primitive.
- All Project → Idea renames are full code renames (table, router, types, UI, copy).

**Tech Stack:**
- Backend: TypeScript, Drizzle ORM, drizzle-kit migrations, vitest, Anthropic Claude (Haiku)
- Mobile: React Native (Expo), tRPC, Lucide icons
- Pattern references: `thoughtCollisionWorker` for new `clusterSynthesisWorker`, `cluster.promoteToIdea` for new `cluster.crystallize`

**Spec:** `docs/superpowers/specs/2026-05-01-thought-property-restructure-design.md`

---

## File Structure Map

### Backend files affected

```
packages/server/src/db/
  schema.ts                          MODIFY — drop columns, rename projects→ideas, merge crystallizedIdeas, add validationStatus
packages/server/drizzle/
  0025_thought_property_restructure.sql   CREATE — single migration covering all schema changes

packages/server/src/routers/
  thought.ts                         MODIFY — remove promote(), filter by kind, add convertKind procedure
  cluster.ts                         MODIFY — persist synthesis outputs, rename promoteToIdea→crystallize (keep alias 1 release), add resolveTension
  project.ts                         RENAME → idea.ts; rewrite all procedures
  index.ts                           MODIFY — register idea router, deprecate project alias
  note.ts                            MODIFY — alias updates only

packages/server/src/jobs/workers/
  clusterSynthesisWorker.ts          CREATE — auto-trigger synthesis on milestones
  thoughtClassifyWorker.ts           MODIFY — skip kind='note'
  thoughtCollisionWorker.ts          MODIFY — skip kind='note'
  index.ts                           MODIFY — export new worker

packages/server/src/services/
  sandbox-ai.ts                      MODIFY — extend synthesizeIdea to extract 5 fields, extend summarizeSandbox to tag dimensions
  cluster-readiness.ts               CREATE — readinessScore + clusterMaturity computation
  thought-ai.ts                      MODIFY — skip classification for kind='note'

packages/server/src/jobs/
  thought-classify.ts                MODIFY — skip kind='note'

packages/shared/src/validators/
  index.ts                           MODIFY — drop purpose, maturity validators; add kind, validationStatus

packages/server/src/db/__tests__/
  thought-kind.test.ts               CREATE — test kind defaults + filtering
  cluster-readiness.test.ts          CREATE — test scoring + maturity transitions
  cluster-synthesis-worker.test.ts   CREATE — test trigger thresholds
  crystallize.test.ts                CREATE — test cluster→idea creation with provenance
```

### Mobile files affected

```
packages/mobile/src/app/(tabs)/
  capture.tsx                        MODIFY — remove PurposePicker, add "File as note" affordance
  thoughts/index.tsx                 MODIFY — add Thoughts|Notes|All filter
  sandbox/[id]/index.tsx             MODIFY — surface synthesis/gaps/tensions inline, Crystallize CTA, AI menu reorganize
  vault/index.tsx                    MODIFY — render new Idea fields
  vault/[id]/                        MODIFY — Idea detail with 5 fields, source cluster link, back-to-cluster

packages/mobile/src/components/thought/
  PurposePicker.tsx                  DELETE
  MaturityPicker.tsx                 DELETE
  PropertyChipBar.tsx                MODIFY — drop Maturity chip, drop Purpose chip, hide chips for notes
  NoteFilingChip.tsx                 CREATE — "File as note" inline affordance for capture
  ConvertKindAction.tsx              CREATE — kebab action for thought↔note conversion

packages/mobile/src/components/cluster/
  ClusterMaturityDot.tsx             CREATE — visual dot for cluster card
  CrystallizeCTA.tsx                 CREATE — bottom-of-cluster primary CTA
  TensionList.tsx                    CREATE — tension display + tap-to-resolve
  SynthesisPanel.tsx                 CREATE — inline render of synthesis/gaps/brief

packages/mobile/src/components/idea/
  IdeaCard.tsx                       CREATE (or rename from project equivalent) — vault list cell
  IdeaDetailScreen.tsx               CREATE (or rename) — 5 fields + provenance
  ValidationStatusBadge.tsx          CREATE
```

---

## Phase 0: Branch + Pre-flight

### Task 0.1: Create feature branch

**Files:** none

- [ ] **Step 1: Create and checkout branch**

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel
git checkout -b matt/thought-property-restructure
git status
```

Expected: clean working tree on new branch.

- [ ] **Step 2: Commit the spec + plan docs already on disk**

```bash
git add docs/superpowers/specs/2026-05-01-thought-property-restructure-design.md \
        docs/superpowers/plans/2026-05-01-thought-property-restructure.md
git commit -m "docs: add thought property restructure spec and plan"
```

---

## Phase 1: Schema Migration

Single migration file covering all schema changes. Run `pnpm db:generate` to produce the SQL, hand-edit if drizzle-kit can't infer renames safely, then commit.

### Task 1.1: Update schema.ts — Thought table

**Files:**
- Modify: `packages/server/src/db/schema.ts` (thoughts table, lines ~300-340)

- [ ] **Step 1: Edit the thoughts table definition**

Replace the existing `purpose`, `maturityLevel`, `maturityNotes`, `maturityHistory`, `promotedProjectId` columns. Keep all other columns.

```typescript
export const thoughts = pgTable('Thought', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  title: text(),
  // REPLACED purpose with kind:
  kind: text('kind').default('thought').notNull(), // 'thought' | 'note'
  content: text().default('').notNull(),
  thoughtType: thoughtTypeEnum('thought_type'),
  typeSource: text('type_source').default('ai_auto').notNull(),
  tags: text().array().default([]),
  aiTags: text('ai_tags').array().default([]),
  // REMOVED: maturityLevel, maturityNotes, maturityHistory
  confidenceLevel: text('confidence_level'),
  // ... keep all resurfacing, refinement, connection columns unchanged ...
  // REMOVED: promotedProjectId
  userId: text().notNull(),
  // ... rest unchanged ...
});
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @forge/server type-check
```

Expected: type errors in any file referencing the dropped columns. List them — they will be fixed in Phase 2/3.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/db/schema.ts
git commit -m "schema: replace thought.purpose with kind, drop maturity columns"
```

### Task 1.2: Update schema.ts — rename projects → ideas, merge crystallizedIdeas

**Files:**
- Modify: `packages/server/src/db/schema.ts` (projects table ~200-227, crystallizedIdeas ~480-510)

- [ ] **Step 1: Rename `projects` constant and table to `ideas`**

```typescript
export const ideas = pgTable('Idea', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  title: text().notNull(),
  description: text().notNull(),
  notes: text(),
  status: projectStatusEnum().default('CAPTURED').notNull(),
  mode: projectModeEnum().default('LAUNCH').notNull(),
  businessContext: jsonb('business_context'),
  cardResult: jsonb('card_result'),

  // ADDED — merged from crystallizedIdeas:
  problemStatement: text('problem_statement'),
  targetAudience: text('target_audience'),
  proposedSolution: text('proposed_solution'),
  uniqueAngle: text('unique_angle'),
  pricingHypothesis: text('pricing_hypothesis'),
  sparkAnswers: jsonb('spark_answers'),
  sparkSessionId: text('spark_session_id'),
  sourceClusterId: text('source_cluster_id'),
  sourceThoughtIds: text('source_thought_ids').array().default([]),
  crystallizedAt: timestamp('crystallized_at', { precision: 3, mode: 'date' }),
  crystallizedBy: text('crystallized_by'),

  // ADDED — workflow status:
  validationStatus: text('validation_status').default('draft').notNull(),

  // REMOVED: promoted, promotedAt
  userId: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Idea_status_idx').using('btree', table.status.asc().nullsLast()),
  index('Idea_userId_idx').using('btree', table.userId.asc().nullsLast()),
  index('Idea_userId_status_idx').using('btree', table.userId.asc(), table.status.asc()),
  index('Idea_sourceClusterId_idx').using('btree', table.sourceClusterId.asc().nullsLast()),
  foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'Idea_userId_fkey' })
    .onUpdate('cascade').onDelete('cascade'),
  foreignKey({ columns: [table.sourceClusterId], foreignColumns: [thoughtClusters.id], name: 'Idea_sourceClusterId_fkey' })
    .onUpdate('cascade').onDelete('set null'),
]);

// Backwards-compat alias for one release:
export const projects = ideas;
```

- [ ] **Step 2: Delete the entire `crystallizedIdeas` table definition**

Remove the `export const crystallizedIdeas = pgTable(...)` block and its relations (lines ~480-510). Also remove from `relations.ts` imports if present.

- [ ] **Step 3: Update relations**

Rename `projectsRelations` → `ideasRelations`. Update `projectAttachments` (later renamed `ideaAttachments`) to point at `ideas`. Update `thoughtClustersRelations` if it references `projects`.

```typescript
export const ideasRelations = relations(ideas, ({ one, many }) => ({
  user: one(users, { fields: [ideas.userId], references: [users.id] }),
  attachments: many(projectAttachments),
  sparkCards: many(sparkCards),
  // ... existing relations ...
  sourceCluster: one(thoughtClusters, { fields: [ideas.sourceClusterId], references: [thoughtClusters.id] }),
}));

// Backwards-compat alias:
export const projectsRelations = ideasRelations;
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @forge/server type-check 2>&1 | head -30
```

Expected: many references to `projects.*` will need to be `ideas.*` (handled in Phase 2). List them.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/db/schema.ts packages/server/src/db/relations.ts
git commit -m "schema: rename Project to Idea, merge CrystallizedIdea fields, add validationStatus"
```

### Task 1.3: Update schema.ts — add cluster.brief column

**Files:**
- Modify: `packages/server/src/db/schema.ts` (thoughtClusters table ~268-295)

- [ ] **Step 1: Add brief column to thoughtClusters**

Add after the `synthesis` field:

```typescript
synthesis: text(),
brief: text('brief'),                          // ADDED for generateBrief persistence
clusterMaturity: text('cluster_maturity').default('exploring').notNull(),
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/db/schema.ts
git commit -m "schema: add ThoughtCluster.brief column"
```

### Task 1.4: Generate the migration SQL

**Files:**
- Create: `packages/server/drizzle/0025_thought_property_restructure.sql`

- [ ] **Step 1: Run drizzle-kit generate**

```bash
cd packages/server
DATABASE_URL=postgres://placeholder pnpm db:generate
```

Expected: a new SQL file. Drizzle may not detect renames cleanly — review the output.

- [ ] **Step 2: Hand-edit the migration SQL to ensure correct order**

Open the generated file and reorder/edit so it does this exact sequence (drizzle-kit may need help with the rename and the crystallizedIdeas → ideas backfill):

```sql
-- 0025_thought_property_restructure.sql

BEGIN;

-- 1. Add new Thought.kind column with backfill from purpose
ALTER TABLE "Thought" ADD COLUMN "kind" text DEFAULT 'thought' NOT NULL;
UPDATE "Thought" SET "kind" = 'note' WHERE "purpose" = 'note';

-- 2. Drop maturity + promoted columns from Thought
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "maturity_level";
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "maturity_notes";
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "maturity_history";
ALTER TABLE "Thought" DROP COLUMN IF EXISTS "promoted_project_id";

-- 3. Add brief column to ThoughtCluster
ALTER TABLE "ThoughtCluster" ADD COLUMN IF NOT EXISTS "brief" text;

-- 4. Add new columns to Project (pre-rename)
ALTER TABLE "Project" ADD COLUMN "problem_statement" text;
ALTER TABLE "Project" ADD COLUMN "target_audience" text;
ALTER TABLE "Project" ADD COLUMN "proposed_solution" text;
ALTER TABLE "Project" ADD COLUMN "unique_angle" text;
ALTER TABLE "Project" ADD COLUMN "pricing_hypothesis" text;
ALTER TABLE "Project" ADD COLUMN "spark_answers" jsonb;
ALTER TABLE "Project" ADD COLUMN "spark_session_id" text;
ALTER TABLE "Project" ADD COLUMN "source_cluster_id" text;
ALTER TABLE "Project" ADD COLUMN "source_thought_ids" text[] DEFAULT '{}';
ALTER TABLE "Project" ADD COLUMN "crystallized_at" timestamp(3);
ALTER TABLE "Project" ADD COLUMN "crystallized_by" text;
ALTER TABLE "Project" ADD COLUMN "validation_status" text DEFAULT 'draft' NOT NULL;

-- 5. Defensive backfill from CrystallizedIdea
UPDATE "Project" p
SET
  problem_statement   = ci.problem_statement,
  target_audience     = ci.target_audience,
  proposed_solution   = ci.proposed_solution,
  unique_angle        = ci.unique_angle,
  pricing_hypothesis  = ci.pricing_hypothesis,
  spark_answers       = ci.spark_answers,
  spark_session_id    = ci.spark_session_id,
  source_cluster_id   = ci.cluster_id,
  source_thought_ids  = ci.source_thought_ids,
  crystallized_at     = ci.crystallized_at,
  crystallized_by     = ci.crystallized_by
FROM "CrystallizedIdea" ci
WHERE ci.project_id = p.id;

-- 6. Drop CrystallizedIdea table
DROP TABLE IF EXISTS "CrystallizedIdea";

-- 7. Drop legacy promoted columns (now defunct)
ALTER TABLE "Project" DROP COLUMN IF EXISTS "promoted";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "promoted_at";

-- 8. Drop Thought.purpose (now safely migrated to kind)
ALTER TABLE "Thought" DROP COLUMN "purpose";

-- 9. Rename Project table → Idea (and indexes)
ALTER TABLE "Project" RENAME TO "Idea";
ALTER INDEX "Project_status_idx" RENAME TO "Idea_status_idx";
ALTER INDEX "Project_userId_idx" RENAME TO "Idea_userId_idx";
ALTER INDEX "Project_userId_status_idx" RENAME TO "Idea_userId_status_idx";

-- 10. Add the new index for source_cluster_id lookups
CREATE INDEX "Idea_sourceClusterId_idx" ON "Idea" ("source_cluster_id");

-- 11. FK to source cluster (with set null on delete)
ALTER TABLE "Idea"
  ADD CONSTRAINT "Idea_sourceClusterId_fkey"
  FOREIGN KEY ("source_cluster_id") REFERENCES "ThoughtCluster"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 12. Rename FK constraints on related tables (Project_xxx → Idea_xxx)
-- ProjectAttachment.project_id FK
ALTER TABLE "ProjectAttachment" RENAME CONSTRAINT "ProjectAttachment_projectId_fkey" TO "ProjectAttachment_ideaId_fkey";
-- (Repeat for SparkCard, CustomerInterview, etc — list them all from `\d+ Idea` after rename)

-- 13. Backfill ThoughtCluster.cluster_maturity (initial computation done by app on first cluster touch; default 'exploring' is correct for now)

COMMIT;
```

- [ ] **Step 3: Verify migration runs against a fresh DB**

```bash
# Spin up a local Postgres or use a scratch DB
DATABASE_URL=$DEV_DB_URL pnpm db:migrate
```

Expected: migration runs without error.

- [ ] **Step 4: Smoke-test schema integrity**

```bash
DATABASE_URL=$DEV_DB_URL pnpm db:studio
```

Inspect: `Idea` table has new columns, `Thought.kind` exists, `Thought.purpose` is gone, `CrystallizedIdea` is gone.

- [ ] **Step 5: Commit**

```bash
git add packages/server/drizzle/0025_thought_property_restructure.sql packages/server/drizzle/meta/
git commit -m "migration: thought property restructure (drop purpose/maturity, rename Project→Idea, merge CrystallizedIdea)"
```

---

## Phase 2: Backend Project → Idea Rename

All `project.*` tRPC calls become `idea.*`. The router file is renamed. A temporary alias is registered for one release so the mobile client doesn't break.

### Task 2.1: Rename router file and update internals

**Files:**
- Rename: `packages/server/src/routers/project.ts` → `packages/server/src/routers/idea.ts`
- Modify: `packages/server/src/routers/index.ts`

- [ ] **Step 1: Move the file**

```bash
git mv packages/server/src/routers/project.ts packages/server/src/routers/idea.ts
```

- [ ] **Step 2: Update internals of `idea.ts`**

Find all references to `projects` (the schema export) and rename to `ideas`. Find all `projectRouter` and rename to `ideaRouter`. Find all `projectId` parameters and decide per-call whether to rename to `ideaId` (do rename — full vocab consistency).

```bash
# In packages/server/src/routers/idea.ts:
sed -i '' 's/projectRouter/ideaRouter/g' packages/server/src/routers/idea.ts
sed -i '' 's/from .* projects /from \.\.\/db\/schema { ideas } /g' packages/server/src/routers/idea.ts
# Then hand-fix anything sed missed.
```

- [ ] **Step 3: Update `routers/index.ts`**

```typescript
import { ideaRouter } from './idea';
// Remove: import { projectRouter } from './project';

export const appRouter = router({
  idea: ideaRouter,
  project: ideaRouter,  // BACKWARDS COMPAT — remove in next mobile release
  // ... other routers
});
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @forge/server type-check
```

Fix all errors that mention `projects` or `projectRouter` — most should be unambiguous renames.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routers/
git commit -m "rename: projectRouter -> ideaRouter, register both as tRPC paths"
```

### Task 2.2: Update all server-side imports of `projects`

**Files:**
- Modify: every server file that imports `projects` from schema (run grep to find them)

- [ ] **Step 1: Find all import sites**

```bash
grep -rn "from.*schema.*projects\b\| projects[, }]" packages/server/src/ | grep -v "node_modules" | grep -v "drizzle"
```

- [ ] **Step 2: Replace `projects` with `ideas` in each file**

For each file in the grep output, change `import { ..., projects, ... }` to `import { ..., ideas, ... }` and replace usages.

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @forge/server type-check
```

Expected: zero errors related to the rename.

- [ ] **Step 4: Run server tests**

```bash
pnpm --filter @forge/server test:run
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/
git commit -m "rename: replace projects with ideas in all server imports"
```

---

## Phase 3: Backend Thought Cleanup + `kind` Handling

### Task 3.1: Update validators

**Files:**
- Modify: `packages/shared/src/validators/index.ts`

- [ ] **Step 1: Drop maturity and purpose validators, add kind**

In the createThoughtSchema and updateThoughtSchema:

```typescript
// REMOVE: purpose: z.enum(['idea', 'note']).optional()
// REMOVE: maturityLevel: z.enum([...]).optional()
// REMOVE: maturityNotes: z.string().max(500).optional()

// ADD:
kind: z.enum(['thought', 'note']).default('thought'),

// In updateProperties or new convertKind procedure input:
export const convertKindSchema = z.object({
  thoughtId: z.string(),
  kind: z.enum(['thought', 'note']),
});

// ADD validationStatus enum for ideas:
export const validationStatusSchema = z.enum(['draft', 'in_validation', 'validated', 'killed', 'returned']);
```

- [ ] **Step 2: Type-check + test**

```bash
pnpm --filter @forge/shared type-check
pnpm --filter @forge/shared test:run
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/
git commit -m "validators: drop purpose/maturity, add kind and validationStatus"
```

### Task 3.2: Test `kind` defaults + filtering

**Files:**
- Create: `packages/server/src/db/__tests__/thought-kind.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../client';
import { thoughts } from '../schema';
import { eq } from 'drizzle-orm';

describe('Thought.kind', () => {
  let testUserId: string;

  beforeEach(async () => {
    // setup test user via fixture
    testUserId = await createTestUser();
  });

  it('defaults to "thought" when not specified', async () => {
    const [row] = await db.insert(thoughts).values({
      userId: testUserId,
      content: 'a fragment',
    }).returning();
    expect(row.kind).toBe('thought');
  });

  it('accepts "note"', async () => {
    const [row] = await db.insert(thoughts).values({
      userId: testUserId,
      content: 'fix nav bug',
      kind: 'note',
    }).returning();
    expect(row.kind).toBe('note');
  });

  it('can be converted from thought to note', async () => {
    const [t] = await db.insert(thoughts).values({
      userId: testUserId,
      content: 'oh wait this is a bug',
    }).returning();
    await db.update(thoughts).set({ kind: 'note' }).where(eq(thoughts.id, t.id));
    const [updated] = await db.select().from(thoughts).where(eq(thoughts.id, t.id));
    expect(updated.kind).toBe('note');
  });
});
```

- [ ] **Step 2: Run tests, verify they pass against the new schema**

```bash
pnpm --filter @forge/server test:run thought-kind
```

Expected: PASS (the schema already supports this; tests prove the contract).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/db/__tests__/thought-kind.test.ts
git commit -m "test: thought kind defaults and conversion"
```

### Task 3.3: Update thought router — remove promote, filter resurfacing/collision by kind

**Files:**
- Modify: `packages/server/src/routers/thought.ts`

- [ ] **Step 1: Remove the `promote` procedure entirely**

Delete the `promote: protectedProcedure...` block (currently around line 436-500).

- [ ] **Step 2: Remove `updateProperties` handling for purpose, maturityLevel, maturityNotes**

In the `updateProperties` procedure, remove all branches that set `purpose`, `maturityLevel`, `maturityNotes`. Keep `thoughtType`, `confidenceLevel`.

- [ ] **Step 3: Add `convertKind` procedure**

```typescript
convertKind: protectedProcedure
  .input(convertKindSchema)
  .mutation(async ({ ctx, input }) => {
    const [updated] = await ctx.db
      .update(thoughts)
      .set({ kind: input.kind })
      .where(and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)))
      .returning();
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });

    if (input.kind === 'thought') {
      // Re-enqueue classification + collision detection
      await enqueueThoughtClassify({ thoughtId: updated.id });
      await enqueueThoughtCollision({ thoughtId: updated.id });
    }
    return updated;
  }),
```

- [ ] **Step 4: Update resurfacing query**

In `getResurfaceCandidates` (around line 1186-1220), replace the `eq(thoughts.purpose, 'idea')` filter with `eq(thoughts.kind, 'thought')`.

```typescript
// BEFORE:
// eq(thoughts.purpose, 'idea'),
// AFTER:
eq(thoughts.kind, 'thought'),
sql`length(${thoughts.content}) >= 20`,
```

- [ ] **Step 5: Update `create` to default `kind` from input**

```typescript
const [thought] = await ctx.db.insert(thoughts).values({
  userId: ctx.userId,
  content: input.content,
  kind: input.kind ?? 'thought',
  thoughtType: input.thoughtType,
  typeSource: input.thoughtType ? 'user' : 'ai_auto',
  // ... rest unchanged ...
}).returning();

// Only enqueue collision/classify if kind === 'thought'
if (thought.kind === 'thought' && thought.content.length >= 20) {
  await enqueueThoughtCollision({ thoughtId: thought.id });
  if (!input.thoughtType) {
    await enqueueThoughtClassify({ thoughtId: thought.id });
  }
}
```

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @forge/server type-check
```

- [ ] **Step 7: Run thought router tests**

```bash
pnpm --filter @forge/server test:run thought
```

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/routers/thought.ts
git commit -m "thought router: remove promote, filter by kind, add convertKind procedure"
```

### Task 3.4: Update workers — skip notes

**Files:**
- Modify: `packages/server/src/jobs/workers/thoughtCollisionWorker.ts`
- Modify: `packages/server/src/jobs/thought-classify.ts`

- [ ] **Step 1: Add early-return for notes in collision worker**

Inside the worker's `processor` function, before generating embeddings:

```typescript
const [thought] = await db.select().from(thoughts).where(eq(thoughts.id, thoughtId));
if (!thought) return;
if (thought.kind !== 'thought') {
  console.log('[thoughtCollisionWorker] skipping note', thoughtId);
  return;
}
if (thought.content.length < 20) {
  console.log('[thoughtCollisionWorker] skipping short content', thoughtId);
  return;
}
// ... rest unchanged ...
```

- [ ] **Step 2: Same early-return in classify worker**

Inside `thoughtClassifyWorker.processor`:

```typescript
const [thought] = await db.select().from(thoughts).where(eq(thoughts.id, thoughtId));
if (!thought || thought.kind !== 'thought') return;
if (thought.typeSource === 'user') return;  // existing check
// ... rest unchanged ...
```

- [ ] **Step 3: Run worker tests**

```bash
pnpm --filter @forge/server test:run thoughtCollisionWorker
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/jobs/
git commit -m "workers: skip kind='note' for classify and collision detection"
```

---

## Phase 4: Cluster Synthesis Persistence + Auto-Trigger

### Task 4.1: Persist synthesis outputs

**Files:**
- Modify: `packages/server/src/routers/cluster.ts`

- [ ] **Step 1: Update `summarize` to persist + return**

```typescript
summarize: protectedProcedure
  .input(clusterAiActionSchema)
  .mutation(async ({ ctx, input }) => {
    const contents = await getClusterThoughtsForAi(ctx.db, input.id, ctx.userId);
    try {
      const { summary, dimensionCoverage } = await summarizeSandbox(contents);
      // ADDED — persist to cluster row
      await ctx.db.update(thoughtClusters)
        .set({
          synthesis: summary,
          dimensionCoverage,
        })
        .where(eq(thoughtClusters.id, input.id));
      // Trigger readiness recompute
      await recomputeClusterReadiness(ctx.db, input.id);
      return { summary, dimensionCoverage };
    } catch (error) {
      console.error('[ClusterRouter] Summarize failed:', error);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'SUMMARIZE_FAILED' });
    }
  }),
```

- [ ] **Step 2: Same pattern for `identifyGaps`, `findContradictions`, `generateBrief`**

```typescript
identifyGaps: ...
  const gaps = await identifyGaps(contents);
  const gapsWithIds = gaps.map(g => ({ id: crypto.randomUUID(), text: g }));
  await ctx.db.update(thoughtClusters).set({ gaps: gapsWithIds }).where(eq(thoughtClusters.id, input.id));
  await recomputeClusterReadiness(ctx.db, input.id);
  return { gaps: gapsWithIds };

findContradictions: ...
  const tensions = await findContradictions(contents);
  const tensionsWithIds = tensions.map(t => ({
    id: crypto.randomUUID(),
    text: t,
    resolvedAt: null,
  }));
  await ctx.db.update(thoughtClusters).set({ tensions: tensionsWithIds }).where(eq(thoughtClusters.id, input.id));
  await recomputeClusterReadiness(ctx.db, input.id);
  return { tensions: tensionsWithIds };

generateBrief: ...
  const brief = await generateBrief(contents);
  await ctx.db.update(thoughtClusters).set({ brief }).where(eq(thoughtClusters.id, input.id));
  await recomputeClusterReadiness(ctx.db, input.id);
  return { brief };
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routers/cluster.ts
git commit -m "cluster: persist synthesis outputs, trigger readiness recompute"
```

### Task 4.2: Extend `summarizeSandbox` to also return dimensionCoverage

**Files:**
- Modify: `packages/server/src/services/sandbox-ai.ts`

- [ ] **Step 1: Update the AI prompt and return type**

```typescript
export async function summarizeSandbox(contents: string[]): Promise<{
  summary: string;
  dimensionCoverage: { problem: boolean; audience: boolean; solution: boolean; angle: boolean; pricing: boolean };
}> {
  const response = await callHaiku({
    system: `You are a thought synthesizer. Given a list of raw thoughts:
1. Produce a 2-3 paragraph summary capturing the core ideas, observations, and gaps.
2. For each thought, identify which idea dimensions it speaks to:
   - problem (problem statement)
   - audience (target users / customers)
   - solution (proposed approach)
   - angle (unique differentiator)
   - pricing (business model / monetization)
Return JSON: { summary: string, dimensions: { problem: bool, audience: bool, solution: bool, angle: bool, pricing: bool } }
Set each dimension flag to true if at least one thought speaks to it.`,
    messages: [{ role: 'user', content: contents.map((c, i) => `${i + 1}. ${c}`).join('\n') }],
    responseFormat: 'json',
  });
  const parsed = JSON.parse(response);
  return { summary: parsed.summary, dimensionCoverage: parsed.dimensions };
}
```

- [ ] **Step 2: Test the new contract**

```typescript
// packages/server/src/services/__tests__/sandbox-ai.test.ts
it('summarize returns dimensionCoverage', async () => {
  const result = await summarizeSandbox([
    'Coffee shops have terrible loyalty apps',
    'What if loyalty was the payment?',
  ]);
  expect(result.dimensionCoverage).toHaveProperty('problem');
  expect(result.dimensionCoverage).toHaveProperty('solution');
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/services/
git commit -m "sandbox-ai: extend summarize to return dimensionCoverage"
```

### Task 4.3: Build cluster-readiness service

**Files:**
- Create: `packages/server/src/services/cluster-readiness.ts`
- Create: `packages/server/src/services/__tests__/cluster-readiness.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { computeReadinessScore, computeClusterMaturity } from '../cluster-readiness';

describe('cluster-readiness', () => {
  it('returns 0 for empty cluster', () => {
    const score = computeReadinessScore({
      thoughts: [],
      dimensionCoverage: null,
      synthesisRunCount: 0,
      tensions: [],
      collisionCount: 0,
    });
    expect(score).toBe(0);
  });

  it('returns ~1 for fully synthesized, diverse cluster', () => {
    const score = computeReadinessScore({
      thoughts: Array(5).fill(null).map((_, i) => ({
        thoughtType: ['problem', 'solution', 'what_if', 'observation', 'question'][i] as any,
      })),
      dimensionCoverage: { problem: true, audience: true, solution: true, angle: true, pricing: true },
      synthesisRunCount: 4,
      tensions: [{ id: 'a', text: 't', resolvedAt: new Date() }],
      collisionCount: 5,
    });
    expect(score).toBeGreaterThan(0.9);
  });

  it('maturity transitions: exploring -> forming at 5 thoughts + synthesis run', () => {
    expect(computeClusterMaturity({ thoughtCount: 4, synthesisRunCount: 1, readinessScore: 0.3 })).toBe('exploring');
    expect(computeClusterMaturity({ thoughtCount: 5, synthesisRunCount: 0, readinessScore: 0.3 })).toBe('exploring');
    expect(computeClusterMaturity({ thoughtCount: 5, synthesisRunCount: 1, readinessScore: 0.3 })).toBe('forming');
    expect(computeClusterMaturity({ thoughtCount: 8, synthesisRunCount: 2, readinessScore: 0.71 })).toBe('ready');
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

```bash
pnpm --filter @forge/server test:run cluster-readiness
```

Expected: FAIL ("module not found").

- [ ] **Step 3: Implement the service**

```typescript
// packages/server/src/services/cluster-readiness.ts
import { db } from '../db/client';
import { thoughts, thoughtClusters, thoughtConnections } from '../db/schema';
import { eq, and, isNull, or, inArray } from 'drizzle-orm';

export type ReadinessInputs = {
  thoughts: { thoughtType: string | null }[];
  dimensionCoverage: { problem: boolean; audience: boolean; solution: boolean; angle: boolean; pricing: boolean } | null;
  synthesisRunCount: number;
  tensions: { id: string; text: string; resolvedAt: Date | null }[];
  collisionCount: number;
};

const TYPES = ['problem', 'solution', 'what_if', 'observation', 'question'];

export function computeReadinessScore(inputs: ReadinessInputs): number {
  if (inputs.thoughts.length === 0) return 0;

  const distinctTypes = new Set(inputs.thoughts.map(t => t.thoughtType).filter(Boolean));
  const thoughtDiversityScore = distinctTypes.size / TYPES.length;

  const dims = inputs.dimensionCoverage;
  const dimensionCoverageScore = dims
    ? Object.values(dims).filter(Boolean).length / 5
    : 0;

  const synthesisDepthScore = Math.min(inputs.synthesisRunCount / 4, 1);

  const totalTensions = inputs.tensions.length;
  const resolvedTensions = inputs.tensions.filter(t => t.resolvedAt !== null).length;
  const tensionResolutionScore = totalTensions === 0 ? 0 : resolvedTensions / totalTensions;

  const connectionDensityScore = Math.min(inputs.collisionCount / Math.max(inputs.thoughts.length, 1), 1);

  return (
    0.30 * thoughtDiversityScore +
    0.25 * dimensionCoverageScore +
    0.20 * synthesisDepthScore +
    0.15 * tensionResolutionScore +
    0.10 * connectionDensityScore
  );
}

export function computeClusterMaturity(inputs: { thoughtCount: number; synthesisRunCount: number; readinessScore: number }): 'exploring' | 'forming' | 'ready' {
  if (inputs.readinessScore > 0.7) return 'ready';
  if (inputs.thoughtCount >= 5 && inputs.synthesisRunCount >= 1) return 'forming';
  return 'exploring';
}

export async function recomputeClusterReadiness(database: typeof db, clusterId: string): Promise<void> {
  // Fetch cluster + thoughts + connections
  const [cluster] = await database.select().from(thoughtClusters).where(eq(thoughtClusters.id, clusterId));
  if (!cluster) return;

  const clusterThoughts = await database.select({ thoughtType: thoughts.thoughtType, id: thoughts.id })
    .from(thoughts)
    .where(and(eq(thoughts.clusterId, clusterId), eq(thoughts.kind, 'thought')));

  const thoughtIds = clusterThoughts.map(t => t.id);
  const collisions = thoughtIds.length === 0 ? [] : await database.select()
    .from(thoughtConnections)
    .where(or(
      inArray(thoughtConnections.thoughtAId, thoughtIds),
      inArray(thoughtConnections.thoughtBId, thoughtIds),
    ));

  const synthesisRunCount =
    (cluster.synthesis ? 1 : 0) +
    (cluster.gaps && (cluster.gaps as any[]).length > 0 ? 1 : 0) +
    (cluster.tensions && (cluster.tensions as any[]).length > 0 ? 1 : 0) +
    (cluster.brief ? 1 : 0);

  const score = computeReadinessScore({
    thoughts: clusterThoughts,
    dimensionCoverage: cluster.dimensionCoverage as any,
    synthesisRunCount,
    tensions: (cluster.tensions as any[]) ?? [],
    collisionCount: collisions.length,
  });

  const maturity = computeClusterMaturity({
    thoughtCount: clusterThoughts.length,
    synthesisRunCount,
    readinessScore: score,
  });

  await database.update(thoughtClusters)
    .set({ readinessScore: score, clusterMaturity: maturity })
    .where(eq(thoughtClusters.id, clusterId));
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm --filter @forge/server test:run cluster-readiness
```

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/cluster-readiness.ts packages/server/src/services/__tests__/
git commit -m "service: cluster readiness score + maturity computation"
```

### Task 4.4: Add resolveTension procedure

**Files:**
- Modify: `packages/server/src/routers/cluster.ts`

- [ ] **Step 1: Add procedure**

```typescript
resolveTension: protectedProcedure
  .input(z.object({ clusterId: z.string(), tensionId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const [cluster] = await ctx.db.select().from(thoughtClusters)
      .where(and(eq(thoughtClusters.id, input.clusterId), eq(thoughtClusters.userId, ctx.userId)));
    if (!cluster) throw new TRPCError({ code: 'NOT_FOUND' });

    const tensions = (cluster.tensions as { id: string; text: string; resolvedAt: Date | null }[]) ?? [];
    const updated = tensions.map(t =>
      t.id === input.tensionId ? { ...t, resolvedAt: new Date() } : t,
    );

    await ctx.db.update(thoughtClusters)
      .set({ tensions: updated })
      .where(eq(thoughtClusters.id, input.clusterId));
    await recomputeClusterReadiness(ctx.db, input.clusterId);

    return { success: true };
  }),
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routers/cluster.ts
git commit -m "cluster: add resolveTension procedure"
```

### Task 4.5: Build clusterSynthesisWorker

**Files:**
- Create: `packages/server/src/jobs/workers/clusterSynthesisWorker.ts`
- Create: `packages/server/src/jobs/cluster-synthesis.ts` (enqueue helper)
- Create: `packages/server/src/jobs/workers/__tests__/clusterSynthesisWorker.test.ts`
- Modify: `packages/server/src/jobs/workers/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runClusterSynthesisJob } from '../clusterSynthesisWorker';
import * as clusterRouter from '../../../routers/cluster';

vi.mock('../../../routers/cluster');

describe('clusterSynthesisWorker', () => {
  it('triggers summarize + identifyGaps when thoughtCount >= 5 and no synthesis exists', async () => {
    const mockSummarize = vi.spyOn(clusterRouter, '_internalSummarize').mockResolvedValue();
    const mockGaps = vi.spyOn(clusterRouter, '_internalIdentifyGaps').mockResolvedValue();
    await runClusterSynthesisJob({ clusterId: 'c1', userId: 'u1', trigger: 'milestone:5_thoughts' });
    expect(mockSummarize).toHaveBeenCalledWith('c1', 'u1');
    expect(mockGaps).toHaveBeenCalledWith('c1', 'u1');
  });
  // ... cases for milestone:8 (findContradictions), milestone:12 (re-summarize), readiness:0.5 (brief), readiness:0.7 (all four)
});
```

- [ ] **Step 2: Implement the worker**

```typescript
// packages/server/src/jobs/workers/clusterSynthesisWorker.ts
import { Worker, Queue } from 'bullmq';
import { redis } from '../../lib/redis';
import { db } from '../../db/client';
import { thoughtClusters, thoughts } from '../../db/schema';
import { eq, and, count } from 'drizzle-orm';
import { runSummarize, runIdentifyGaps, runFindContradictions, runGenerateBrief } from '../../services/cluster-actions';
import { recomputeClusterReadiness } from '../../services/cluster-readiness';

export type ClusterSynthesisTrigger =
  | 'milestone:5_thoughts'
  | 'milestone:8_thoughts'
  | 'milestone:12_thoughts'
  | 'readiness:0.5'
  | 'readiness:0.7';

const QUEUE_NAME = 'cluster-synthesis';

export const clusterSynthesisQueue = new Queue<{ clusterId: string; userId: string; trigger: ClusterSynthesisTrigger }>(
  QUEUE_NAME,
  { connection: redis },
);

export async function enqueueClusterSynthesis(payload: { clusterId: string; userId: string; trigger: ClusterSynthesisTrigger }) {
  // Debounce: dedupe by clusterId+trigger within 5 minutes
  const jobId = `${payload.clusterId}:${payload.trigger}`;
  await clusterSynthesisQueue.add(jobId, payload, {
    jobId,
    delay: 5 * 60 * 1000, // 5 min debounce
    removeOnComplete: true,
  });
}

export function createClusterSynthesisWorker() {
  return new Worker(
    QUEUE_NAME,
    async (job) => runClusterSynthesisJob(job.data),
    { connection: redis, concurrency: 2 },
  );
}

export async function runClusterSynthesisJob(payload: { clusterId: string; userId: string; trigger: ClusterSynthesisTrigger }) {
  const { clusterId, userId, trigger } = payload;

  switch (trigger) {
    case 'milestone:5_thoughts':
      await runSummarize(clusterId, userId);
      await runIdentifyGaps(clusterId, userId);
      break;
    case 'milestone:8_thoughts':
      await runFindContradictions(clusterId, userId);
      break;
    case 'milestone:12_thoughts':
      await runSummarize(clusterId, userId); // refresh
      break;
    case 'readiness:0.5':
      await runGenerateBrief(clusterId, userId);
      break;
    case 'readiness:0.7':
      await runSummarize(clusterId, userId);
      await runIdentifyGaps(clusterId, userId);
      await runFindContradictions(clusterId, userId);
      await runGenerateBrief(clusterId, userId);
      break;
  }

  await recomputeClusterReadiness(db, clusterId);
}
```

- [ ] **Step 3: Extract `runSummarize` etc. into `services/cluster-actions.ts`**

These call the same logic as the tRPC procedures but without the protectedProcedure wrapper, so the worker can call them directly. Move the body of each cluster.ts AI mutation into a `services/cluster-actions.ts` function and have the procedures delegate to those.

- [ ] **Step 4: Add trigger calls in cluster mutations**

In `cluster.ts`, after every thought is added/removed, dispatch the appropriate enqueue. In `thought.ts`'s cluster-add procedure (or wherever clusterId gets set), check the new count and enqueue the right milestone.

```typescript
// In thought router, after cluster assignment:
const [{ thoughtCount }] = await ctx.db.select({ thoughtCount: count() }).from(thoughts)
  .where(and(eq(thoughts.clusterId, clusterId), eq(thoughts.kind, 'thought')));

if (thoughtCount === 5) {
  await enqueueClusterSynthesis({ clusterId, userId: ctx.userId, trigger: 'milestone:5_thoughts' });
} else if (thoughtCount === 8) {
  await enqueueClusterSynthesis({ clusterId, userId: ctx.userId, trigger: 'milestone:8_thoughts' });
} else if (thoughtCount % 5 === 2 && thoughtCount > 12) {
  await enqueueClusterSynthesis({ clusterId, userId: ctx.userId, trigger: 'milestone:12_thoughts' });
}
```

In `recomputeClusterReadiness`, after computing the new score, compare to the previous score and enqueue if a threshold was crossed:

```typescript
// At the end of recomputeClusterReadiness, after update:
if (cluster.readinessScore < 0.5 && score >= 0.5) {
  await enqueueClusterSynthesis({ clusterId, userId: cluster.userId, trigger: 'readiness:0.5' });
}
if (cluster.readinessScore < 0.7 && score >= 0.7) {
  await enqueueClusterSynthesis({ clusterId, userId: cluster.userId, trigger: 'readiness:0.7' });
}
```

- [ ] **Step 5: Register worker in index.ts**

```typescript
// packages/server/src/jobs/workers/index.ts
export { createClusterSynthesisWorker } from './clusterSynthesisWorker';
```

And in the worker bootstrap (wherever workers are started):

```typescript
import { createThoughtCollisionWorker, createClusterSynthesisWorker } from './workers';
// ...
const workers = [
  createThoughtCollisionWorker(),
  createClusterSynthesisWorker(),
];
```

- [ ] **Step 6: Run all tests**

```bash
pnpm --filter @forge/server test:run
```

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/jobs/ packages/server/src/services/cluster-actions.ts
git commit -m "worker: cluster synthesis auto-trigger on milestones and readiness thresholds"
```

---

## Phase 5: Crystallize Procedure

### Task 5.1: Extend `synthesizeIdea` to extract 5 fields

**Files:**
- Modify: `packages/server/src/services/sandbox-ai.ts`

- [ ] **Step 1: Update return type and prompt**

```typescript
export type CrystallizedFields = {
  title: string;
  problemStatement: string;
  targetAudience: string;
  proposedSolution: string;
  uniqueAngle: string;
  pricingHypothesis: string;
};

export async function synthesizeIdea(contents: string[]): Promise<CrystallizedFields> {
  const response = await callHaiku({
    system: `You are a startup strategist. Given raw thought fragments, extract a structured idea.
Return JSON with exactly these fields:
- title: short name for this idea (3-7 words)
- problemStatement: the core problem being solved (1-2 sentences)
- targetAudience: who specifically experiences this problem (1 sentence)
- proposedSolution: how the idea solves it (1-2 sentences)
- uniqueAngle: what makes this different from existing solutions (1 sentence). If unclear, write "Not yet differentiated."
- pricingHypothesis: business model hypothesis (1 sentence). If unclear, write "Not yet defined."
Output strictly the JSON.`,
    messages: [{ role: 'user', content: contents.map((c, i) => `${i + 1}. ${c}`).join('\n') }],
    responseFormat: 'json',
  });
  return JSON.parse(response);
}
```

- [ ] **Step 2: Test with snapshot**

```typescript
it('synthesizeIdea returns 5 fields + title', async () => {
  const result = await synthesizeIdea([
    'Coffee shops have terrible loyalty apps',
    'What if loyalty was the payment method',
    'Small cafes are my target',
  ]);
  expect(result).toMatchObject({
    title: expect.any(String),
    problemStatement: expect.any(String),
    targetAudience: expect.any(String),
    proposedSolution: expect.any(String),
    uniqueAngle: expect.any(String),
    pricingHypothesis: expect.any(String),
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/services/
git commit -m "synthesize: extract 5 crystallized idea fields"
```

### Task 5.2: Replace `cluster.promoteToIdea` with `cluster.crystallize`

**Files:**
- Modify: `packages/server/src/routers/cluster.ts`

- [ ] **Step 1: Add new procedure, keep old as alias**

```typescript
crystallize: protectedProcedure
  .input(clusterAiActionSchema)
  .mutation(async ({ ctx, input }) => {
    const [cluster] = await ctx.db.select().from(thoughtClusters)
      .where(and(eq(thoughtClusters.id, input.id), eq(thoughtClusters.userId, ctx.userId)));
    if (!cluster) throw new TRPCError({ code: 'NOT_FOUND' });

    const clusterThoughts = await ctx.db.select({
      id: thoughts.id,
      content: thoughts.content,
    }).from(thoughts).where(and(
      eq(thoughts.clusterId, input.id),
      eq(thoughts.kind, 'thought'),
      isNull(thoughts.isArchived ? thoughts.isArchived : null),
    ));

    if (clusterThoughts.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'CLUSTER_EMPTY' });
    }

    const fields = await synthesizeIdea(clusterThoughts.map(t => t.content));

    const [idea] = await ctx.db.insert(ideas).values({
      title: fields.title,
      description: fields.problemStatement, // legacy short description
      problemStatement: fields.problemStatement,
      targetAudience: fields.targetAudience,
      proposedSolution: fields.proposedSolution,
      uniqueAngle: fields.uniqueAngle,
      pricingHypothesis: fields.pricingHypothesis,
      sourceClusterId: input.id,
      sourceThoughtIds: clusterThoughts.map(t => t.id),
      crystallizedAt: new Date(),
      crystallizedBy: ctx.userId,
      validationStatus: 'draft',
      userId: ctx.userId,
    }).returning({ id: ideas.id });

    return { ideaId: idea.id };
  }),

// DEPRECATED — alias for one mobile release
promoteToIdea: protectedProcedure
  .input(clusterAiActionSchema)
  .mutation(async ({ ctx, input }) => {
    // forward to crystallize
    return await ctx.someInternalCallTo Crystallize(input);
    // (Implementation: extract crystallize body into a helper and call here too)
  }),
```

- [ ] **Step 2: Test crystallize end-to-end**

```typescript
// packages/server/src/routers/__tests__/crystallize.test.ts
it('crystallize creates an idea with provenance', async () => {
  const userId = await createTestUser();
  const clusterId = await createTestClusterWith5Thoughts(userId);

  const result = await callerForUser(userId).cluster.crystallize({ id: clusterId });
  expect(result.ideaId).toBeDefined();

  const [idea] = await db.select().from(ideas).where(eq(ideas.id, result.ideaId));
  expect(idea.sourceClusterId).toBe(clusterId);
  expect(idea.sourceThoughtIds).toHaveLength(5);
  expect(idea.problemStatement).toBeTruthy();
  expect(idea.validationStatus).toBe('draft');

  // Source thoughts and cluster MUST still exist
  const [stillThereCluster] = await db.select().from(thoughtClusters).where(eq(thoughtClusters.id, clusterId));
  expect(stillThereCluster).toBeDefined();
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @forge/server test:run crystallize
git add packages/server/src/
git commit -m "cluster: add crystallize procedure (replaces promoteToIdea)"
```

---

## Phase 6: Mobile — Capture Flow

### Task 6.1: Remove PurposePicker from capture

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx`
- Delete: `packages/mobile/src/components/thought/PurposePicker.tsx`

- [ ] **Step 1: Remove PurposePicker import + invocation in capture.tsx**

Find any reference to `PurposePicker` or `purpose` state and remove. Capture is now: text input + voice button + save.

- [ ] **Step 2: Add NoteFilingChip below input**

Create `packages/mobile/src/components/thought/NoteFilingChip.tsx`:

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

export function NoteFilingChip({
  isNote,
  onToggle,
}: {
  isNote: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.chip, isNote && styles.chipActive]}
      activeOpacity={0.7}
    >
      <FileText size={14} color={isNote ? colors.brand : colors.muted} />
      <Text style={[styles.text, isNote && styles.textActive]}>
        {isNote ? 'Filing as note' : 'File as note'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandMuted,
  },
  text: { ...fonts.outfit.medium, fontSize: 12, color: colors.muted },
  textActive: { color: colors.brand },
});
```

- [ ] **Step 3: Use it in capture.tsx**

```typescript
const [isNote, setIsNote] = useState(false);
const createMutation = trpc.thought.create.useMutation();

const handleSave = async () => {
  await createMutation.mutateAsync({
    content,
    kind: isNote ? 'note' : 'thought',
  });
  router.back();
};

// In JSX, below the input:
<NoteFilingChip isNote={isNote} onToggle={() => setIsNote(prev => !prev)} />
```

- [ ] **Step 4: Delete PurposePicker.tsx**

```bash
git rm packages/mobile/src/components/thought/PurposePicker.tsx
```

- [ ] **Step 5: Type-check + commit**

```bash
pnpm --filter @forge/mobile type-check
git add packages/mobile/
git commit -m "mobile capture: remove purpose picker, add file-as-note affordance"
```

---

## Phase 7: Mobile — Thought Detail

### Task 7.1: Remove MaturityPicker, hide chips for notes

**Files:**
- Delete: `packages/mobile/src/components/thought/MaturityPicker.tsx`
- Modify: `packages/mobile/src/components/thought/PropertyChipBar.tsx`
- Modify: `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx` (thought detail)

- [ ] **Step 1: Delete MaturityPicker**

```bash
git rm packages/mobile/src/components/thought/MaturityPicker.tsx
```

- [ ] **Step 2: Strip Maturity + Purpose from PropertyChipBar**

Remove all imports + render of `MaturityPicker` and the `MaturityDot`. Remove the Purpose chip. Add a `kind` prop and render no chips when `kind === 'note'` except Labels.

```typescript
// PropertyChipBar.tsx
export function PropertyChipBar({ thought, onUpdate }: { thought: Thought; onUpdate: (patch) => void }) {
  if (thought.kind === 'note') {
    return (
      <View style={styles.chipRow}>
        <LabelChip thought={thought} onUpdate={onUpdate} />
      </View>
    );
  }

  return (
    <View style={styles.chipRow}>
      <TypeChip thought={thought} onUpdate={onUpdate} />
      <ConfidenceChip thought={thought} onUpdate={onUpdate} />
      <ClusterChip thought={thought} onUpdate={onUpdate} />
      <LabelChip thought={thought} onUpdate={onUpdate} />
    </View>
  );
}
```

- [ ] **Step 3: Add Convert action in detail kebab menu**

```typescript
// In notes/[id]/index.tsx kebab menu items:
const convertKindMutation = trpc.thought.convertKind.useMutation({
  onSuccess: () => utils.thought.get.invalidate({ id: thought.id }),
});
{
  label: thought.kind === 'thought' ? 'Convert to note' : 'Convert to thought',
  icon: thought.kind === 'thought' ? FileText : Lightbulb,
  onPress: () => convertKindMutation.mutate({
    thoughtId: thought.id,
    kind: thought.kind === 'thought' ? 'note' : 'thought',
  }),
}
```

- [ ] **Step 4: Type-check + commit**

```bash
pnpm --filter @forge/mobile type-check
git add packages/mobile/
git commit -m "mobile thought detail: drop maturity + purpose chips, add kind conversion"
```

---

## Phase 8: Mobile — Thoughts Tab Filter

### Task 8.1: Add Thoughts | Notes | All filter

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/thoughts/index.tsx`

- [ ] **Step 1: Add filter state + persist via AsyncStorage**

```typescript
type KindFilter = 'thought' | 'note' | 'all';

const [kindFilter, setKindFilter] = useState<KindFilter>('thought');

useEffect(() => {
  AsyncStorage.getItem('thoughtsTabKindFilter').then((v) => {
    if (v === 'thought' || v === 'note' || v === 'all') setKindFilter(v);
  });
}, []);

const updateFilter = (next: KindFilter) => {
  setKindFilter(next);
  AsyncStorage.setItem('thoughtsTabKindFilter', next);
};
```

- [ ] **Step 2: Pass filter to tRPC query**

```typescript
const { data, isLoading, refetch } = trpc.thought.list.useQuery({
  kind: kindFilter === 'all' ? undefined : kindFilter,
});
```

Update `thought.list` server-side to accept and apply this filter.

- [ ] **Step 3: Add segmented control above the list**

```typescript
<View style={styles.filterRow}>
  {(['thought', 'note', 'all'] as KindFilter[]).map((k) => (
    <TouchableOpacity
      key={k}
      onPress={() => updateFilter(k)}
      style={[styles.segment, kindFilter === k && styles.segmentActive]}
    >
      <Text style={[styles.segmentText, kindFilter === k && styles.segmentTextActive]}>
        {k === 'thought' ? 'Thoughts' : k === 'note' ? 'Notes' : 'All'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/
git commit -m "mobile thoughts tab: add kind filter (Thoughts | Notes | All)"
```

---

## Phase 9: Mobile — Cluster Detail (Synthesis Inline + Crystallize CTA)

### Task 9.1: Add ClusterMaturityDot component

**Files:**
- Create: `packages/mobile/src/components/cluster/ClusterMaturityDot.tsx`

- [ ] **Step 1: Implement**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';

export function ClusterMaturityDot({ status, size = 12 }: { status: 'exploring' | 'forming' | 'ready'; size?: number }) {
  const style = (() => {
    switch (status) {
      case 'exploring':
        return { borderColor: colors.muted, backgroundColor: 'transparent' };
      case 'forming':
        return { borderColor: colors.warning, backgroundColor: 'rgba(245,158,11,0.3)' };
      case 'ready':
        return { borderColor: colors.success, backgroundColor: colors.success };
    }
  })();
  return <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, borderWidth: 2 }, style]} />;
}

const styles = StyleSheet.create({ dot: {} });
```

- [ ] **Step 2: Use in cluster card list (thoughts/index.tsx clusters section)**

Render the dot next to each cluster name.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/components/cluster/
git commit -m "mobile: ClusterMaturityDot indicator on cluster cards"
```

### Task 9.2: Reorganize cluster detail AI menu + add Crystallize CTA

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/sandbox/[id]/index.tsx`
- Create: `packages/mobile/src/components/cluster/CrystallizeCTA.tsx`

- [ ] **Step 1: Build CrystallizeCTA**

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

type Status = 'exploring' | 'forming' | 'ready';

export function CrystallizeCTA({ status, onPress }: { status: Status; onPress: () => void }) {
  if (status === 'exploring') return null;

  const variant = status === 'ready' ? 'primary' : 'secondary';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.button, variant === 'primary' ? styles.primary : styles.secondary]}
    >
      <Sparkles size={18} color={variant === 'primary' ? '#FFF' : colors.brand} />
      <Text style={[styles.label, variant === 'primary' ? styles.labelPrimary : styles.labelSecondary]}>
        {variant === 'primary' ? 'Crystallize' : 'Keep growing'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginHorizontal: 16, marginBottom: 16 },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.brand },
  label: { ...fonts.outfit.bold, fontSize: 15 },
  labelPrimary: { color: '#FFF' },
  labelSecondary: { color: colors.brand },
});
```

- [ ] **Step 2: In sandbox/[id]/index.tsx, render the CTA at bottom and remove "Promote to Idea" from AI menu**

```typescript
// Remove the "Promote to Idea" entry from the AI menu items array.
// Keep: Summarize, Find Tensions (renamed from Contradictions), Find Gaps, Generate Brief, Extract Todos.
const aiMenuItems = [
  { label: 'Summarize', icon: FileText, onPress: () => summarizeMutation.mutate({ id }) },
  { label: 'Find Tensions', icon: AlertTriangle, onPress: () => findContradictionsMutation.mutate({ id }) },
  { label: 'Find Gaps', icon: Search, onPress: () => identifyGapsMutation.mutate({ id }) },
  { label: 'Generate Brief', icon: FileText, onPress: () => generateBriefMutation.mutate({ id }) },
  { label: 'Extract Todos', icon: ListChecks, onPress: () => extractTodosMutation.mutate({ id }) },
];

// Add Crystallize CTA at bottom of screen:
<CrystallizeCTA
  status={cluster.clusterMaturity}
  onPress={() => router.push(`/sandbox/${id}/crystallize`)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/
git commit -m "mobile cluster detail: Crystallize CTA + AI menu reorganize (rename Contradictions → Find Tensions)"
```

### Task 9.3: Build SynthesisPanel + TensionList

**Files:**
- Create: `packages/mobile/src/components/cluster/SynthesisPanel.tsx`
- Create: `packages/mobile/src/components/cluster/TensionList.tsx`

- [ ] **Step 1: SynthesisPanel renders persisted synthesis/gaps/brief**

```typescript
export function SynthesisPanel({ cluster }: { cluster: Cluster }) {
  return (
    <View style={styles.container}>
      {cluster.synthesis && (
        <Section title="Summary">
          <Text style={styles.body}>{cluster.synthesis}</Text>
        </Section>
      )}
      {cluster.gaps && cluster.gaps.length > 0 && (
        <Section title="Gaps">
          {cluster.gaps.map((g) => <Text key={g.id} style={styles.body}>• {g.text}</Text>)}
        </Section>
      )}
      {cluster.brief && (
        <Section title="Brief">
          <Text style={styles.body}>{cluster.brief}</Text>
        </Section>
      )}
    </View>
  );
}
```

- [ ] **Step 2: TensionList with tap-to-resolve**

```typescript
export function TensionList({ clusterId, tensions }: { clusterId: string; tensions: Tension[] }) {
  const utils = trpc.useUtils();
  const resolveMutation = trpc.cluster.resolveTension.useMutation({
    onSuccess: () => utils.cluster.get.invalidate({ id: clusterId }),
  });
  const open = tensions.filter(t => !t.resolvedAt);
  const resolved = tensions.filter(t => !!t.resolvedAt);

  return (
    <View>
      {open.length > 0 && <Section title="Tensions">
        {open.map(t => (
          <TouchableOpacity key={t.id} onPress={() => resolveMutation.mutate({ clusterId, tensionId: t.id })}>
            <Text style={styles.tension}>⚠ {t.text}</Text>
            <Text style={styles.hint}>Tap when resolved</Text>
          </TouchableOpacity>
        ))}
      </Section>}
      {resolved.length > 0 && <Section title="Resolved">
        {resolved.map(t => <Text key={t.id} style={styles.resolvedTension}>✓ {t.text}</Text>)}
      </Section>}
    </View>
  );
}
```

- [ ] **Step 3: Wire into sandbox/[id]/index.tsx**

Render below the thoughts list:

```tsx
<SynthesisPanel cluster={cluster} />
<TensionList clusterId={id} tensions={cluster.tensions ?? []} />
```

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/
git commit -m "mobile cluster: SynthesisPanel + TensionList with tap-to-resolve"
```

### Task 9.4: Build Crystallize preview screen

**Files:**
- Create: `packages/mobile/src/app/(tabs)/sandbox/[id]/crystallize.tsx`

- [ ] **Step 1: Implement**

```typescript
export default function CrystallizeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const crystallizeMutation = trpc.cluster.crystallize.useMutation({
    onSuccess: ({ ideaId }) => {
      utils.idea.list.invalidate();
      router.replace(`/vault/${ideaId}`);
    },
  });

  // Step 1: Run crystallize, show loading
  const [extracted, setExtracted] = useState<CrystallizedFields | null>(null);
  const [editing, setEditing] = useState<CrystallizedFields | null>(null);

  useEffect(() => {
    // Call a "preview" version that returns fields without inserting (or inspect after insert)
    crystallizeMutation.mutate({ id });
  }, [id]);

  // Renders the 5 fields editable, with a Confirm button that triggers the actual insert
}
```

Note: the `cluster.crystallize` procedure currently inserts immediately. For a preview-then-confirm UX, split it into:
- `cluster.previewCrystallize` (returns fields, no insert)
- `cluster.confirmCrystallize` (input: fields + cluster id, inserts)

Update `cluster.ts` accordingly.

- [ ] **Step 2: Add `previewCrystallize` + `confirmCrystallize` server procedures**

```typescript
previewCrystallize: protectedProcedure
  .input(clusterAiActionSchema)
  .mutation(async ({ ctx, input }) => {
    // verify ownership, fetch thoughts, call synthesizeIdea, return fields without insert
    const fields = await synthesizeIdea(/* ... */);
    return fields;
  }),

confirmCrystallize: protectedProcedure
  .input(z.object({
    clusterId: z.string(),
    title: z.string(),
    problemStatement: z.string(),
    targetAudience: z.string(),
    proposedSolution: z.string(),
    uniqueAngle: z.string(),
    pricingHypothesis: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // ... insert into ideas table ...
    return { ideaId };
  }),
```

- [ ] **Step 3: Update mobile screen to use preview → confirm flow**

```typescript
const previewMutation = trpc.cluster.previewCrystallize.useMutation();
const confirmMutation = trpc.cluster.confirmCrystallize.useMutation({
  onSuccess: ({ ideaId }) => router.replace(`/vault/${ideaId}`),
});

useEffect(() => {
  previewMutation.mutate({ id }, { onSuccess: setEditing });
}, [id]);

// On confirm:
const onConfirm = () => {
  if (!editing) return;
  confirmMutation.mutate({ clusterId: id, ...editing });
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/ packages/server/
git commit -m "crystallize: preview-then-confirm flow with editable 5 fields"
```

---

## Phase 10: Mobile — Vault (Idea Cards + Detail)

### Task 10.1: Update Vault list to render new Idea fields

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/vault/index.tsx`

- [ ] **Step 1: Switch tRPC query from `project.list` to `idea.list`**

```typescript
const { data, isLoading, refetch } = trpc.idea.list.useQuery({});
```

- [ ] **Step 2: Update IdeaCard meta extraction**

Show: title, first line of `problemStatement` (fallback to `description`), validation status badge, cardResult verdict badge, source thought count + time span.

```typescript
function getIdeaSummary(item: Idea) {
  const firstLine = item.problemStatement?.split('\n')[0] ?? item.description ?? '';
  return {
    title: item.title,
    summary: firstLine.slice(0, 120),
    validationStatus: item.validationStatus,
    verdict: item.cardResult?.verdict,
    sourceThoughtCount: item.sourceThoughtIds?.length ?? 0,
    timeSpan: computeTimeSpan(item.crystallizedAt, item.updatedAt),
  };
}
```

- [ ] **Step 3: Add ValidationStatusBadge component**

```typescript
// packages/mobile/src/components/idea/ValidationStatusBadge.tsx
const STATUS_META = {
  draft: { label: 'Draft', color: colors.muted },
  in_validation: { label: 'In Validation', color: colors.warning },
  validated: { label: 'Validated', color: colors.success },
  killed: { label: 'Killed', color: colors.danger },
  returned: { label: 'Returned', color: colors.brand },
};
```

- [ ] **Step 4: Update empty state copy**

```typescript
<Text style={styles.emptyTitle}>Your crystallized ideas live here.</Text>
<Text style={styles.emptyBody}>Start by growing thoughts in the Thoughts tab.</Text>
```

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/
git commit -m "mobile vault: list ideas with new fields, validation status badge"
```

### Task 10.2: Idea detail with 5 fields + provenance

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/vault/[id]/index.tsx`

- [ ] **Step 1: Render all 5 fields editably**

Each field gets a section: Problem, Audience, Solution, Angle, Pricing. Tap to edit. Save via `idea.update`.

- [ ] **Step 2: Add "View source cluster" link**

```tsx
{idea.sourceClusterId && (
  <TouchableOpacity onPress={() => router.push(`/sandbox/${idea.sourceClusterId}`)}>
    <Text style={styles.sourceLink}>View source cluster →</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 3: Add "Back to cluster" action**

This action sets `validationStatus = 'returned'` and navigates to the cluster.

```typescript
const returnToClusterMutation = trpc.idea.update.useMutation({
  onSuccess: () => {
    router.replace(`/sandbox/${idea.sourceClusterId}`);
  },
});
const onReturn = () => returnToClusterMutation.mutate({
  id: idea.id,
  validationStatus: 'returned',
});
```

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/
git commit -m "mobile vault: idea detail with 5 fields, provenance, return-to-cluster"
```

---

## Phase 11: Kill `thought.promote()` + Final Cleanup

### Task 11.1: Remove single-thought promote everywhere

**Files:**
- Modify: `packages/server/src/routers/thought.ts` (remove `promote` procedure if not already done in Task 3.3)
- Modify: any mobile screen that calls `trpc.thought.promote`

- [ ] **Step 1: Grep for callers**

```bash
grep -rn "thought\.promote\|promoteMutation" packages/mobile/src
```

- [ ] **Step 2: Remove all UI references**

Any "Promote to Idea" button on a single-thought view: delete it. Crystallization is cluster-only now.

- [ ] **Step 3: Type-check + commit**

```bash
pnpm --filter @forge/server type-check
pnpm --filter @forge/mobile type-check
git add .
git commit -m "remove: single-thought promote flow (crystallization is cluster-only)"
```

### Task 11.2: Drop deprecated tRPC alias

**Files:**
- Modify: `packages/server/src/routers/index.ts`

- [ ] **Step 1: Confirm mobile no longer uses `trpc.project.*` or `cluster.promoteToIdea`**

```bash
grep -rn "trpc\.project\.\|cluster\.promoteToIdea" packages/mobile/src
```

Expected: no results. If any results, fix them first.

- [ ] **Step 2: Remove the aliases**

```typescript
// Remove:
// project: ideaRouter,
// In cluster.ts: remove the promoteToIdea procedure.
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/
git commit -m "remove: deprecated project/promoteToIdea aliases"
```

---

## Phase 12: Migration Safety + Final QA

### Task 12.1: Backfill embeddings for kind='thought' (lazy)

**Files:**
- Create: `packages/server/src/scripts/backfill-thought-embeddings.ts`

- [ ] **Step 1: Implement script**

```typescript
import { db } from '../db/client';
import { thoughts, embeddings } from '../db/schema';
import { eq, and, sql, notInArray } from 'drizzle-orm';
import { enqueueThoughtCollision } from '../jobs/cluster-synthesis';

async function main() {
  const needsEmbedding = await db.select({ id: thoughts.id }).from(thoughts)
    .where(and(
      eq(thoughts.kind, 'thought'),
      sql`length(${thoughts.content}) >= 20`,
      sql`NOT EXISTS (SELECT 1 FROM "Embedding" e WHERE e.thought_id = "Thought".id)`,
    ));

  console.log(`[backfill] ${needsEmbedding.length} thoughts need embeddings`);
  for (const { id } of needsEmbedding) {
    await enqueueThoughtCollision({ thoughtId: id });
  }
  console.log('[backfill] enqueued');
}
main().catch(console.error);
```

- [ ] **Step 2: Run against staging, then prod**

```bash
DATABASE_URL=$STAGING_DB pnpm tsx packages/server/src/scripts/backfill-thought-embeddings.ts
# After verifying:
DATABASE_URL=$PROD_DB pnpm tsx packages/server/src/scripts/backfill-thought-embeddings.ts
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/scripts/
git commit -m "scripts: backfill embeddings for existing kind='thought' rows"
```

### Task 12.2: Backfill cluster readiness + maturity

**Files:**
- Create: `packages/server/src/scripts/backfill-cluster-readiness.ts`

- [ ] **Step 1: Implement**

```typescript
import { db } from '../db/client';
import { thoughtClusters } from '../db/schema';
import { recomputeClusterReadiness } from '../services/cluster-readiness';

async function main() {
  const clusters = await db.select({ id: thoughtClusters.id }).from(thoughtClusters);
  for (const { id } of clusters) {
    await recomputeClusterReadiness(db, id);
  }
  console.log(`[backfill] recomputed ${clusters.length} clusters`);
}
main().catch(console.error);
```

- [ ] **Step 2: Run + commit**

```bash
DATABASE_URL=$STAGING_DB pnpm tsx packages/server/src/scripts/backfill-cluster-readiness.ts
git add packages/server/src/scripts/
git commit -m "scripts: backfill cluster readiness + maturity"
```

### Task 12.3: Manual QA checklist

**Files:** none (manual)

- [ ] Capture a thought, no purpose picker shown, lands in Thoughts tab within 200ms.
- [ ] AI type fills in within 5s.
- [ ] No Maturity chip on thought detail view.
- [ ] Tap "File as note" before save: thought saves with `kind='note'`, hidden by default in Thoughts tab.
- [ ] Switch filter to Notes: previously-filed notes appear.
- [ ] Convert a note to thought from kebab menu: it disappears from Notes view, appears in Thoughts view.
- [ ] Add 5 thoughts to a cluster: within 5 minutes, summary + gaps appear automatically.
- [ ] Add 8 thoughts: tensions appear automatically.
- [ ] Cluster card shows orange dot when forming, green when ready.
- [ ] Tap a tension to resolve: it moves to Resolved subgroup.
- [ ] Cluster reaches "ready": Crystallize CTA shows as primary red button.
- [ ] Tap Crystallize: 5 editable fields appear pre-filled.
- [ ] Confirm: idea appears in Vault.
- [ ] Vault Idea detail shows all 5 fields, source cluster link, validation status.
- [ ] Source cluster and thoughts still exist after crystallization.
- [ ] "Back to cluster" sets validationStatus='returned' and navigates to cluster.
- [ ] Old thoughts captured before this restructure: still visible, no errors, no missing fields.
- [ ] Kill thought.promote() flow: no single-thought "Promote" button anywhere.

- [ ] **Step 1: Mark each line complete after verification.**

- [ ] **Step 2: If all pass, open PR**

```bash
gh pr create --title "Thought property restructure: brand-aligned schema + crystallization automation" \
  --body "$(cat <<'EOF'
## Summary
- Replaces `Thought.purpose` with `kind` (default `thought`), reframed as filing not idea-evaluation
- Drops `maturityLevel`/`maturityNotes`/`maturityHistory` from thoughts; maturity moves to clusters as auto-computed
- Renames `Project` → `Idea`, collapses dormant `crystallizedIdeas` table into it
- Auto-triggers cluster synthesis on milestones; Crystallize is now a primary CTA
- Kills single-thought `promote()` path; crystallization is cluster-only
- Adds Notes filter to Thoughts tab; notes skip the embedding pipeline (cost saving)

## Test plan
- [ ] Capture flow: no purpose picker, frictionless save
- [ ] Cluster auto-synthesis fires at 5 / 8 / 12 thoughts
- [ ] Crystallize end-to-end produces an Idea with provenance
- [ ] Vault renders new fields
- [ ] Existing data migrates cleanly (purpose → kind, projects → ideas)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

(I ran this against the spec.)

**1. Spec coverage:**
- ✅ Section 2 decisions 1-9 all have tasks
- ✅ Section 3 schema changes covered in Phase 1
- ✅ Section 4.1 capture flow → Phase 6
- ✅ Section 4.2 thought detail + filter → Phase 7-8
- ✅ Section 4.3 cluster maturity computation → Phase 4
- ✅ Section 4.4 crystallization flow → Phase 5 + 9.4
- ✅ Section 4.5 Vault → Phase 10
- ✅ Section 4.6 removed actions → Phase 6/7/11
- ✅ Section 4.7 renamed procedures → Phase 2 + 5
- ✅ Section 4.8 cluster AI actions auto-trigger → Phase 4
- ✅ Section 5 migration → Phase 1
- ✅ Section 6 cost implications → covered by kind filter in Phase 3/12

**2. Placeholder scan:**
- One known unfilled detail: Task 5.2 Step 1 has `ctx.someInternalCallTo Crystallize(input)` — the deprecated `promoteToIdea` should call the same `crystallize` body. The cleanest fix: extract crystallize body into a helper function `_crystallizeCluster(db, userId, clusterId)` that both procedures call.
- Task 12.1 references `enqueueThoughtCollision` from a module path that may differ from where it actually lives. Worker should look up the correct path: `from ../jobs/thought-collision` or similar.

**3. Type consistency:**
- `cluster.previewCrystallize` returns `CrystallizedFields` from `synthesizeIdea`. `confirmCrystallize` takes the same shape. ✅
- `Tension` shape is `{ id, text, resolvedAt }` consistently. ✅
- `ClusterMaturity` is `'exploring' | 'forming' | 'ready'` consistently. ✅
- `Kind` is `'thought' | 'note'` consistently. ✅
