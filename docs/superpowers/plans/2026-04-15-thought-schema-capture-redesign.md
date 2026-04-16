# Thought Schema Migration + Capture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the data model from Note/Sandbox to Thought/Cluster, eliminate the Quick/AI Note split, add thought type tagging with async AI classification, and update all server + mobile code to use the new schema.

**Architecture:** Schema-first approach. Drizzle schema rewrite + SQL migration first, then server routers (thought.ts, cluster.ts replacing note.ts, sandbox.ts), then mobile UI updates. Old routers kept as thin aliases for backwards compatibility. New BullMQ background job for async thought type classification.

**Tech Stack:** Drizzle ORM, PostgreSQL, tRPC, BullMQ, Claude Haiku (classification), React Native/Expo Router, NativeWind

**Spec:** `docs/superpowers/specs/2026-04-15-thought-schema-capture-redesign.md`

---

## File Map

| Action | Path (relative to repo root) | Responsibility |
|--------|------------------------------|----------------|
| Modify | `packages/shared/src/validators/index.ts` | Add thought/cluster enums and schemas |
| Modify | `packages/server/src/db/schema.ts` | Rename tables, add columns, new tables |
| Create | `packages/server/src/routers/thought.ts` | All thought CRUD + properties + reactions + comments |
| Create | `packages/server/src/routers/cluster.ts` | All cluster CRUD + AI actions |
| Modify | `packages/server/src/routers/index.ts` | Register new routers, alias old names |
| Modify | `packages/server/src/routers/note.ts` | Thin alias delegating to thought router |
| Modify | `packages/server/src/routers/sandbox.ts` | Thin alias delegating to cluster router |
| Create | `packages/server/src/services/thought-ai.ts` | autoClassify function |
| Modify | `packages/server/src/services/note-ai.ts` | Re-export from thought-ai for compat |
| Create | `packages/server/src/jobs/thought-classify.ts` | BullMQ worker for auto-classify |
| Modify | `packages/server/src/worker.ts` | Register classify worker |
| Generate | `packages/server/drizzle/NNNN_*.sql` | Migration SQL (via `pnpm db:generate`) |
| Create | `packages/mobile/src/components/ThoughtTypeChips.tsx` | Type chip selector component |
| Modify | `packages/mobile/src/components/CaptureActionMenu.tsx` | 3 options → 2 |
| Rename | `packages/mobile/src/components/SandboxPicker.tsx` → `ClusterPicker.tsx` | Rename + update copy |
| Delete | `packages/mobile/src/components/NoteTypePopover.tsx` | No longer needed |
| Modify | `packages/mobile/src/app/(tabs)/capture.tsx` | Add type chips, use thought.create |
| Modify | `packages/mobile/src/app/(tabs)/thoughts/index.tsx` | Update tRPC calls, new card meta |
| Modify | `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx` | Remove auto-refine, update tRPC |
| Modify | `packages/mobile/src/app/(tabs)/sandbox/[id]/index.tsx` | Update tRPC calls |

---

### Task 1: Shared Validators — New Enums and Schemas

**Files:**
- Modify: `packages/shared/src/validators/index.ts`

This task adds all new Zod schemas and enums needed by the server and mobile. Must be done first since both packages import from `@forge/shared`.

- [ ] **Step 1: Add thought-related enums and constants**

Add after the existing note validators section (around line 491):

```typescript
// ============================================
// Thought validators (replaces Note validators)
// ============================================
export const thoughtTypeSchema = z.enum(['problem', 'solution', 'what_if', 'observation', 'question']);
export type ThoughtType = z.infer<typeof thoughtTypeSchema>;

export const maturityLevelSchema = z.enum(['spark', 'developing', 'hypothesis', 'conviction']);
export type MaturityLevel = z.infer<typeof maturityLevelSchema>;

export const confidenceLevelSchema = z.enum(['untested', 'researched', 'validated']);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

export const captureMethodSchema = z.enum(['quick_text', 'voice', 'photo', 'share_extension']);
export type CaptureMethod = z.infer<typeof captureMethodSchema>;

export const reactionEmojiSchema = z.enum(['🔥', '⭐', '🤔', '🚫', '💡']);
export type ReactionEmoji = z.infer<typeof reactionEmojiSchema>;

export const thoughtEventTypeSchema = z.enum([
  'created', 'ai_tagged', 'type_changed', 'refined', 'resurfaced',
  'resurface_action', 'clustered', 'unclustered', 'maturity_changed',
  'confidence_changed', 'connection_found', 'connection_added',
  'reaction_added', 'commented', 'crystallized',
]);
export type ThoughtEventType = z.infer<typeof thoughtEventTypeSchema>;

export const createThoughtSchema = z.object({
  content: z.string().max(NOTE_CONTENT_MAX).optional(),
  thoughtType: thoughtTypeSchema.optional(),
  captureMethod: captureMethodSchema.optional().default('quick_text'),
  clusterId: z.string().optional(),
});
export type CreateThoughtInput = z.infer<typeof createThoughtSchema>;

export const updateThoughtPropertiesSchema = z.object({
  id: entityId,
  maturityLevel: maturityLevelSchema.optional(),
  thoughtType: thoughtTypeSchema.optional(),
  confidenceLevel: confidenceLevelSchema.optional(),
  maturityNotes: z.string().max(500).optional(),
});
export type UpdateThoughtPropertiesInput = z.infer<typeof updateThoughtPropertiesSchema>;

export const addReactionSchema = z.object({
  thoughtId: entityId,
  emoji: reactionEmojiSchema,
});
export type AddReactionInput = z.infer<typeof addReactionSchema>;

export const removeReactionSchema = z.object({
  thoughtId: entityId,
  emoji: reactionEmojiSchema,
});
export type RemoveReactionInput = z.infer<typeof removeReactionSchema>;

export const addThoughtCommentSchema = z.object({
  thoughtId: entityId,
  content: z.string().min(1).max(5000),
});
export type AddThoughtCommentInput = z.infer<typeof addThoughtCommentSchema>;

export const deleteThoughtCommentSchema = z.object({
  commentId: entityId,
});
export type DeleteThoughtCommentInput = z.infer<typeof deleteThoughtCommentSchema>;

export const listThoughtEventsSchema = z.object({
  thoughtId: entityId,
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});
export type ListThoughtEventsInput = z.infer<typeof listThoughtEventsSchema>;

// Thought type classification result (used by auto-classify job)
export const thoughtClassificationSchema = z.object({
  thoughtType: thoughtTypeSchema,
});
export type ThoughtClassification = z.infer<typeof thoughtClassificationSchema>;

// ============================================
// Cluster validators (replaces Sandbox validators)
// ============================================
export const CLUSTER_NAME_MAX = 100;
export const CLUSTER_MIN_THOUGHTS_FOR_AI = 2;
export const CLUSTER_MIN_CHARS_FOR_AI = 100;

export const clusterColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #FF0000').optional();

export const createClusterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(CLUSTER_NAME_MAX),
  color: clusterColorSchema,
});
export type CreateClusterInput = z.infer<typeof createClusterSchema>;

export const updateClusterSchema = z.object({
  id: entityId,
  name: z.string().min(1).max(CLUSTER_NAME_MAX).optional(),
  color: clusterColorSchema,
});
export type UpdateClusterInput = z.infer<typeof updateClusterSchema>;

export const deleteClusterSchema = z.object({ id: entityId });
export type DeleteClusterInput = z.infer<typeof deleteClusterSchema>;

export const getClusterSchema = z.object({ id: entityId });
export type GetClusterInput = z.infer<typeof getClusterSchema>;

export const clusterAiActionSchema = z.object({ id: entityId });
export type ClusterAiActionInput = z.infer<typeof clusterAiActionSchema>;

export const addToClusterSchema = z.object({
  thoughtId: entityId,
  clusterId: entityId,
});
export type AddToClusterInput = z.infer<typeof addToClusterSchema>;

export const removeFromClusterSchema = z.object({
  thoughtId: entityId,
});
export type RemoveFromClusterInput = z.infer<typeof removeFromClusterSchema>;
```

- [ ] **Step 2: Mark old validators as deprecated**

Add `@deprecated` JSDoc comments above the existing `noteTypeSchema`, `createNoteSchema`, `pinToSandboxSchema`, `unpinFromSandboxSchema`, `createSandboxSchema`, etc. Do NOT delete them — they're still used by the alias routers.

- [ ] **Step 3: Verify shared package builds**

Run: `cd packages/shared && pnpm build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: add thought/cluster validators and enums to shared package"
```

---

### Task 2: Drizzle Schema Rewrite + Migration

**Files:**
- Modify: `packages/server/src/db/schema.ts`
- Generate: `packages/server/drizzle/NNNN_*.sql`

This task rewrites the Drizzle schema to rename Note→Thought, Sandbox→Cluster, add all new columns, and create new tables. Then generates the migration SQL.

- [ ] **Step 1: Add ThoughtType enum to schema.ts**

Replace the `noteTypeEnum` line (line 84):
```typescript
// Old:
export const noteTypeEnum = pgEnum('NoteType', ['QUICK', 'AI']);
// New:
export const noteTypeEnum = pgEnum('NoteType', ['QUICK', 'AI']); // Keep for migration compat
export const thoughtTypeEnum = pgEnum('ThoughtType', ['problem', 'solution', 'what_if', 'observation', 'question']);
```

Add derived type:
```typescript
export type ThoughtType = (typeof thoughtTypeEnum.enumValues)[number];
```

- [ ] **Step 2: Rewrite the Sandbox table as Cluster**

Replace the `sandboxes` table definition (lines 259-273) with `clusters`:

```typescript
export const clusters = pgTable('Cluster', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  color: text(),
  description: text(),
  themes: jsonb().$type<any[]>().default([]),
  tensions: jsonb().$type<any[]>().default([]),
  gaps: jsonb().$type<any[]>().default([]),
  synthesis: text(),
  clusterMaturity: text('cluster_maturity').default('exploring').notNull(),
  readinessScore: doublePrecision('readiness_score'),
  dimensionCoverage: jsonb('dimension_coverage'),
  projectId: text('project_id'),
  userId: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Cluster_userId_updatedAt_idx').using('btree', table.userId.asc(), table.updatedAt.desc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Cluster_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);
```

Keep `sandboxes` as an alias: `export const sandboxes = clusters;`

- [ ] **Step 3: Rewrite the Note table as Thought**

Replace the `notes` table definition (lines 279-317) with `thoughts`:

```typescript
export const thoughts = pgTable('Thought', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  content: text().default('').notNull(),

  // Classification
  thoughtType: thoughtTypeEnum('thought_type').default('observation').notNull(),
  typeSource: text('type_source').default('ai_auto').notNull(),
  tags: text().array().default([]),
  aiTags: text('ai_tags').array().default([]),

  // Maturity
  maturityLevel: text('maturity_level').default('spark').notNull(),
  maturityNotes: text('maturity_notes'),
  maturityHistory: jsonb('maturity_history').$type<any[]>().default([]),

  // Confidence
  confidenceLevel: text('confidence_level').default('untested').notNull(),

  // Identity
  thoughtNumber: integer('thought_number').notNull(),

  // Reactions
  reactions: jsonb().$type<any[]>().default([]),

  // Capture context
  captureMethod: text('capture_method').default('quick_text').notNull(),
  voiceMemoUrl: text('voice_memo_url'),
  transcription: text(),
  captureSource: text('capture_source'),

  // AI refinement (non-destructive layer)
  aiRefinement: text('ai_refinement'),
  refinedTitle: text('refined_title'),
  refinedDescription: text('refined_description'),
  refinedTags: jsonb('refined_tags').$type<string[]>(),
  lastRefinedAt: timestamp('last_refined_at', { precision: 3, mode: 'date' }),

  // Incubation
  lastSurfacedAt: timestamp('last_surfaced_at', { precision: 3, mode: 'date' }),
  surfaceCount: integer('surface_count').default(0).notNull(),
  dismissCount: integer('dismiss_count').default(0).notNull(),
  reactCount: integer('react_count').default(0).notNull(),
  collisionIds: text('collision_ids').array().default([]),
  incubationScore: doublePrecision('incubation_score').default(0).notNull(),

  // Cluster membership
  clusterId: text('cluster_id'),
  clusterPosition: integer('cluster_position'),

  // Provenance
  sourceThoughtId: text('source_thought_id'),
  promotedProjectId: text('promoted_project_id'),

  // Status
  isArchived: boolean('is_archived').default(false).notNull(),

  // Audit
  userId: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Thought_userId_idx').using('btree', table.userId.asc().nullsLast()),
  index('Thought_userId_updatedAt_idx').using('btree', table.userId.asc(), table.updatedAt.desc().nullsLast()),
  index('Thought_clusterId_idx').using('btree', table.clusterId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Thought_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.promotedProjectId],
    foreignColumns: [projects.id],
    name: 'Thought_promotedProjectId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
  foreignKey({
    columns: [table.sourceThoughtId],
    foreignColumns: [table.id],
    name: 'Thought_sourceThoughtId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
  foreignKey({
    columns: [table.clusterId],
    foreignColumns: [clusters.id],
    name: 'Thought_clusterId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
]);

// Backwards compat alias
export const notes = thoughts;
```

- [ ] **Step 4: Rename NoteAttachment table to ThoughtAttachment**

Replace the `noteAttachments` definition (lines 323-346):

```typescript
export const thoughtAttachments = pgTable('ThoughtAttachment', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  storagePath: text('storage_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  order: integer().default(0).notNull(),
  thoughtId: text('thought_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ThoughtAttachment_thoughtId_idx').using('btree', table.thoughtId.asc().nullsLast()),
  index('ThoughtAttachment_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.thoughtId],
    foreignColumns: [thoughts.id],
    name: 'ThoughtAttachment_thoughtId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ThoughtAttachment_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// Backwards compat alias
export const noteAttachments = thoughtAttachments;
```

- [ ] **Step 5: Add new tables (ThoughtConnection, ThoughtEvent, ThoughtComment, CrystallizedIdea)**

Add after the ThoughtAttachment table:

```typescript
// =============================================================================
// THOUGHT CONNECTIONS
// =============================================================================

export const thoughtConnections = pgTable('ThoughtConnection', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  thoughtAId: text('thought_a_id').notNull(),
  thoughtBId: text('thought_b_id').notNull(),
  connectionType: text('connection_type').notNull(), // semantic | user_linked | collision | contradiction
  strength: doublePrecision().default(0).notNull(),
  createdBy: text('created_by').notNull(), // ai | user
  surfacedAt: timestamp('surfaced_at', { precision: 3, mode: 'date' }),
  userAction: text('user_action'), // acknowledged | dismissed | merged
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ThoughtConnection_thoughtAId_idx').using('btree', table.thoughtAId.asc()),
  index('ThoughtConnection_thoughtBId_idx').using('btree', table.thoughtBId.asc()),
  foreignKey({
    columns: [table.thoughtAId],
    foreignColumns: [thoughts.id],
    name: 'ThoughtConnection_thoughtAId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.thoughtBId],
    foreignColumns: [thoughts.id],
    name: 'ThoughtConnection_thoughtBId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// THOUGHT EVENTS (Activity Log)
// =============================================================================

export const thoughtEvents = pgTable('ThoughtEvent', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  thoughtId: text('thought_id').notNull(),
  eventType: text('event_type').notNull(),
  metadata: jsonb().default({}),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ThoughtEvent_thoughtId_idx').using('btree', table.thoughtId.asc(), table.createdAt.desc()),
  foreignKey({
    columns: [table.thoughtId],
    foreignColumns: [thoughts.id],
    name: 'ThoughtEvent_thoughtId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// THOUGHT COMMENTS
// =============================================================================

export const thoughtComments = pgTable('ThoughtComment', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  thoughtId: text('thought_id').notNull(),
  userId: text('user_id').notNull(),
  content: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('ThoughtComment_thoughtId_idx').using('btree', table.thoughtId.asc(), table.createdAt.asc()),
  foreignKey({
    columns: [table.thoughtId],
    foreignColumns: [thoughts.id],
    name: 'ThoughtComment_thoughtId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ThoughtComment_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// CRYSTALLIZED IDEAS
// =============================================================================

export const crystallizedIdeas = pgTable('CrystallizedIdea', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  clusterId: text('cluster_id'),
  projectId: text('project_id').notNull(),
  problemStatement: text('problem_statement'),
  targetAudience: text('target_audience'),
  proposedSolution: text('proposed_solution'),
  uniqueAngle: text('unique_angle'),
  pricingHypothesis: text('pricing_hypothesis'),
  sparkAnswers: jsonb('spark_answers'),
  sparkSessionId: text('spark_session_id'),
  sourceThoughtIds: text('source_thought_ids').array().default([]),
  crystallizedAt: timestamp('crystallized_at', { precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  crystallizedBy: text('crystallized_by').notNull(), // user_manual | user_prompted
}, (table) => [
  index('CrystallizedIdea_userId_idx').using('btree', table.userId.asc()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'CrystallizedIdea_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.clusterId],
    foreignColumns: [clusters.id],
    name: 'CrystallizedIdea_clusterId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'CrystallizedIdea_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);
```

- [ ] **Step 6: Update all Drizzle relations**

Update the existing `notesRelations` and `noteAttachmentsRelations` to reference the new table names and include new relations (events, comments, connections). Add relations for all new tables.

- [ ] **Step 7: Generate migration**

Run: `cd packages/server && pnpm db:generate`

This will generate a migration SQL file. The generated migration will need manual editing to:
1. Add data backfill for existing rows (set thoughtType, maturityLevel, thoughtNumber, etc.)
2. Properly handle the table renames vs. create-new-drop-old

- [ ] **Step 8: Edit migration SQL for data backfill**

After the column additions, add:

```sql
-- Backfill existing data
UPDATE "Thought" SET "thought_type" = 'observation', "type_source" = 'ai_auto', "capture_method" = 'quick_text', "confidence_level" = 'untested';
UPDATE "Thought" SET "maturity_level" = 'developing' WHERE "type" = 'AI' AND "refined_title" IS NOT NULL;
UPDATE "Thought" SET "maturity_level" = 'spark' WHERE "maturity_level" IS NULL OR "maturity_level" = '';

-- Assign thought numbers per user
UPDATE "Thought" SET "thought_number" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", id) as rn
  FROM "Thought"
) sub
WHERE "Thought".id = sub.id;
```

- [ ] **Step 9: Run migration against dev database**

Run: `cd packages/server && pnpm db:migrate`
Expected: Migration succeeds with no errors

- [ ] **Step 10: Verify with Drizzle Studio**

Run: `cd packages/server && pnpm db:studio`
Check: Thought table has all new columns, Cluster table exists, new tables created

- [ ] **Step 11: Commit**

```bash
git add packages/server/src/db/ packages/server/drizzle/
git commit -m "feat: schema migration — Note→Thought, Sandbox→Cluster, new tables"
```

---

### Task 3: Thought Router

**Files:**
- Create: `packages/server/src/routers/thought.ts`

Create the new thought router that replaces note.ts. This contains all existing note procedures (renamed) plus new procedures for properties, reactions, comments, and events. Read the existing `packages/server/src/routers/note.ts` for the full implementation of each procedure, then adapt.

- [ ] **Step 1: Create thought.ts with all procedures**

The router should contain these procedures, adapted from note.ts:

1. **list** — Same as note.list but queries `thoughts` table, filters `isArchived: false`
2. **get** — Same as note.get but queries `thoughts` table with attachments
3. **create** — New: accepts `{ content?, thoughtType?, captureMethod?, clusterId? }`. Assigns `thoughtNumber` (MAX+1 for user). If `thoughtType` provided, sets `typeSource: 'user'`. If omitted, sets `typeSource: 'ai_auto'` and enqueues auto-classify job. Creates a ThoughtEvent with `eventType: 'created'`.
4. **update** — Same as note.update
5. **delete** — Same as note.delete
6. **refine** — Same as note.refine but removes the `type === 'QUICK'` guard. Creates ThoughtEvent `'refined'`.
7. **promote** — Same as note.promote
8. **extractIdeas** — Same but removes QUICK-only restriction
9. **addToCluster** — Renamed from pinToSandbox, uses `clusterId`
10. **removeFromCluster** — Renamed from unpinFromSandbox
11. **addAttachments** — Same as note.addAttachments
12. **removeAttachment** — Same as note.removeAttachment
13. **updateProperties** — NEW: Updates maturityLevel, thoughtType, confidenceLevel. Logs ThoughtEvents.
14. **addReaction** — NEW: Increments emoji in reactions JSON array.
15. **removeReaction** — NEW: Removes emoji from reactions array.
16. **addComment** — NEW: Creates ThoughtComment + ThoughtEvent.
17. **deleteComment** — NEW: Deletes own comment.
18. **listEvents** — NEW: Paginated ThoughtEvents query.

Key changes from note.ts:
- All references to `notes` table → `thoughts`
- All references to `noteAttachments` → `thoughtAttachments`
- All references to `sandboxes` → `clusters`
- Import from `@forge/shared` uses new schemas: `createThoughtSchema`, `updateThoughtPropertiesSchema`, etc.
- `create` assigns `thoughtNumber` and creates ThoughtEvent
- `refine` removes type guard and creates ThoughtEvent
- New procedures use new schema imports

- [ ] **Step 2: Verify thought router compiles**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | grep thought`
Expected: No errors from thought.ts

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routers/thought.ts
git commit -m "feat: add thought router with all CRUD + property + reaction + comment procedures"
```

---

### Task 4: Cluster Router

**Files:**
- Create: `packages/server/src/routers/cluster.ts`

Copy `packages/server/src/routers/sandbox.ts` and adapt:
- Rename all `sandbox`/`sandboxes` references to `cluster`/`clusters`
- Rename all `notes` references to `thoughts`
- Update imports to use new schemas from `@forge/shared`
- The AI actions (summarize, extractTodos, promoteToIdea, identifyGaps, generateBrief, findContradictions) stay the same internally — they just reference the `thoughts` table instead of `notes`
- Import `clusters` and `thoughts` from schema instead of `sandboxes` and `notes`

- [ ] **Step 1: Create cluster.ts**

Read `packages/server/src/routers/sandbox.ts` and `packages/server/src/services/sandbox-ai.ts` for the full implementations. Create `cluster.ts` with all procedures renamed.

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routers/cluster.ts
git commit -m "feat: add cluster router (renamed from sandbox)"
```

---

### Task 5: Router Index + Aliases

**Files:**
- Modify: `packages/server/src/routers/index.ts`
- Modify: `packages/server/src/routers/note.ts`
- Modify: `packages/server/src/routers/sandbox.ts`

- [ ] **Step 1: Update router index to register new routers**

```typescript
import { thoughtRouter } from './thought';
import { clusterRouter } from './cluster';

export const appRouter = router({
  // ... existing routers ...
  thought: thoughtRouter,
  cluster: clusterRouter,
  // Keep old names as aliases for backwards compat
  note: noteRouter,      // delegates to thought router internally
  sandbox: sandboxRouter, // delegates to cluster router internally
  // ... rest ...
});
```

- [ ] **Step 2: Convert note.ts to thin alias**

Replace the entire note.ts body with:
```typescript
import { thoughtRouter } from './thought';
// Backwards compatibility: note.* routes delegate to thought.*
export const noteRouter = thoughtRouter;
```

- [ ] **Step 3: Convert sandbox.ts to thin alias**

Replace the entire sandbox.ts body with:
```typescript
import { clusterRouter } from './cluster';
// Backwards compatibility: sandbox.* routes delegate to cluster.*
export const sandboxRouter = clusterRouter;
```

- [ ] **Step 4: Type-check server**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routers/
git commit -m "feat: register thought/cluster routers, alias note/sandbox for compat"
```

---

### Task 6: Auto-Classify AI Service + Worker

**Files:**
- Create: `packages/server/src/services/thought-ai.ts`
- Create: `packages/server/src/jobs/thought-classify.ts`
- Modify: `packages/server/src/worker.ts`
- Modify: `packages/server/src/services/note-ai.ts`

- [ ] **Step 1: Create thought-ai.ts**

```typescript
import { thoughtClassificationSchema } from '@forge/shared';
import type { ThoughtClassification } from '@forge/shared';
import { getAnthropicClient } from '../lib/anthropic';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const CLASSIFY_SYSTEM_PROMPT = `You are a thought classifier for an ideation app. Classify the user's thought into exactly one category:

- problem: A pain point, frustration, or inefficiency observed or experienced.
- solution: A proposed approach, feature, or mechanism to address a problem.
- what_if: Speculative or hypothetical. Exploratory. "What if we..." thinking.
- observation: Something noticed — a trend, behavior, market signal, data point.
- question: An open question to research or think about further.

Return ONLY valid JSON: {"thoughtType": "category"}`;

export async function classifyThought(content: string): Promise<ThoughtClassification> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 50,
    temperature: 0,
    system: CLASSIFY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text);
  return thoughtClassificationSchema.parse(parsed);
}

// Re-export existing functions from note-ai for backwards compat
export { refineNote, extractIdeasFromNote } from './note-ai';
```

- [ ] **Step 2: Create thought-classify.ts worker**

```typescript
import { Worker, Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { db } from '../db/drizzle';
import { thoughts, thoughtEvents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { classifyThought } from '../services/thought-ai';

export const THOUGHT_CLASSIFY_QUEUE = 'thought-classify';

export function getThoughtClassifyQueue() {
  return new Queue(THOUGHT_CLASSIFY_QUEUE, { connection: getRedisConnection() });
}

export function createThoughtClassifyWorker() {
  return new Worker(
    THOUGHT_CLASSIFY_QUEUE,
    async (job) => {
      const { thoughtId } = job.data as { thoughtId: string };

      const [thought] = await db
        .select({ id: thoughts.id, content: thoughts.content, typeSource: thoughts.typeSource })
        .from(thoughts)
        .where(eq(thoughts.id, thoughtId))
        .limit(1);

      if (!thought || thought.typeSource === 'user') return;
      if (!thought.content || thought.content.length < 10) return;

      const result = await classifyThought(thought.content);

      await db.update(thoughts)
        .set({ thoughtType: result.thoughtType, typeSource: 'ai_auto' })
        .where(eq(thoughts.id, thoughtId));

      await db.insert(thoughtEvents).values({
        thoughtId,
        eventType: 'ai_tagged',
        metadata: { type: result.thoughtType },
      });
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    },
  );
}
```

- [ ] **Step 3: Register worker in worker.ts**

Add import and worker creation in `packages/server/src/worker.ts`:

```typescript
import { createThoughtClassifyWorker } from './jobs/thought-classify';

// In main():
const classifyWorker = createThoughtClassifyWorker();
const allWorkers = [researchWorker, sparkWorker, cancelWorker, reportWorker, businessPlanWorker, classifyWorker];
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/services/thought-ai.ts packages/server/src/jobs/thought-classify.ts packages/server/src/worker.ts
git commit -m "feat: add thought auto-classify service and BullMQ worker"
```

---

### Task 7: Mobile — ThoughtTypeChips + CaptureActionMenu + ClusterPicker

**Files:**
- Create: `packages/mobile/src/components/ThoughtTypeChips.tsx`
- Modify: `packages/mobile/src/components/CaptureActionMenu.tsx`
- Rename: `packages/mobile/src/components/SandboxPicker.tsx` → `ClusterPicker.tsx`
- Delete: `packages/mobile/src/components/NoteTypePopover.tsx`

- [ ] **Step 1: Create ThoughtTypeChips component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/theme';

export type ThoughtType = 'problem' | 'solution' | 'what_if' | 'observation' | 'question';

const THOUGHT_TYPES: { type: ThoughtType; label: string; color: string }[] = [
  { type: 'problem', label: 'Problem', color: '#EF4444' },
  { type: 'solution', label: 'Solution', color: '#10B981' },
  { type: 'what_if', label: 'What If', color: '#8B5CF6' },
  { type: 'observation', label: 'Observation', color: '#3B82F6' },
  { type: 'question', label: 'Question', color: '#F59E0B' },
];

export function ThoughtTypeChips({
  selected,
  onSelect,
}: {
  selected: ThoughtType | null;
  onSelect: (type: ThoughtType | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {THOUGHT_TYPES.map(({ type, label, color }) => {
        const isActive = selected === type;
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.chip,
              isActive && { backgroundColor: `${color}20`, borderColor: color },
            ]}
            onPress={() => onSelect(isActive ? null : type)}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.label, isActive && { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    ...fonts.text.medium,
    color: colors.muted,
  },
});
```

- [ ] **Step 2: Update CaptureActionMenu to 2 options**

Read `packages/mobile/src/components/CaptureActionMenu.tsx`. Replace the 3 options with 2:
- Replace `onQuickNote` and `onAINote` props with single `onThought` prop
- Remove Quick Note and AI Note rows
- Add "Thought" row: NotebookPen icon, accent color, subtitle "Capture a raw thought"
- Keep "Idea" row unchanged

- [ ] **Step 3: Rename SandboxPicker to ClusterPicker**

Copy `packages/mobile/src/components/SandboxPicker.tsx` to `ClusterPicker.tsx`. Replace all "Sandbox"/"sandbox" with "Cluster"/"cluster" in component name, UI copy, and tRPC calls. Update tRPC calls from `trpc.sandbox.*` to `trpc.cluster.*`.

Then update `SandboxPicker.tsx` to re-export from ClusterPicker for compat:
```typescript
export { ClusterPicker as SandboxPicker } from './ClusterPicker';
```

- [ ] **Step 4: Delete NoteTypePopover**

Delete `packages/mobile/src/components/NoteTypePopover.tsx`.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/src/components/
git commit -m "feat: add ThoughtTypeChips, simplify CaptureActionMenu, rename SandboxPicker→ClusterPicker"
```

---

### Task 8: Mobile — Capture Tab Update

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx`

- [ ] **Step 1: Integrate ThoughtTypeChips and update capture flow**

Read `packages/mobile/src/app/(tabs)/capture.tsx`. Make these changes:

1. Import `ThoughtTypeChips` and `ThoughtType` from `../../../components/ThoughtTypeChips`
2. Add state: `const [selectedType, setSelectedType] = useState<ThoughtType | null>(null)`
3. Render `<ThoughtTypeChips selected={selectedType} onSelect={setSelectedType} />` between the text input and the action buttons area
4. Rename `handleNoteCapture` to `handleThoughtCapture`. Remove the `type` parameter. Change the tRPC call from `note.create` to `thought.create`:
   ```typescript
   const handleThoughtCapture = () => {
     const trimmed = ideaText.trim();
     if (!trimmed) return;
     if (isListening) SpeechModule?.stop();
     Keyboard.dismiss();
     setShowActionMenu(false);
     createThought.mutate({
       content: trimmed,
       thoughtType: selectedType ?? undefined,
       captureMethod: isListening ? 'voice' : 'quick_text',
     });
   };
   ```
5. Update the `createNote` mutation to `createThought`:
   ```typescript
   const createThought = trpc.thought.create.useMutation({
     onSuccess: (newThought) => {
       triggerHaptic('success');
       utils.thought.list.invalidate();
       setIdeaText('');
       setSelectedType(null);
       router.push(`/(tabs)/thoughts/${newThought.id}` as any);
     },
     onError: () => { ... },
   });
   ```
6. Update `CaptureActionMenu` props: replace `onQuickNote`/`onAINote` with `onThought={handleThoughtCapture}`
7. Clear `selectedType` when the capture form is submitted or dismissed

- [ ] **Step 2: Commit**

```bash
git add packages/mobile/src/app/(tabs)/capture.tsx
git commit -m "feat: update capture tab with thought type chips and simplified flow"
```

---

### Task 9: Mobile — Thoughts Stream + Detail Editor Updates

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/thoughts/index.tsx`
- Modify: `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`

- [ ] **Step 1: Update Stream card meta**

In `thoughts/index.tsx`, replace the `getNoteMeta` function with `getThoughtMeta` that uses thought type for the colored dot:

```typescript
const THOUGHT_TYPE_COLORS: Record<string, string> = {
  problem: '#EF4444',
  solution: '#10B981',
  what_if: '#8B5CF6',
  observation: '#3B82F6',
  question: '#F59E0B',
};

function getThoughtMeta(thought: any) {
  if (thought.promotedProjectId) {
    return {
      dotColor: colors.success,
      badgeVariant: 'success' as const,
      badgeLabel: 'Promoted',
    };
  }
  return {
    dotColor: THOUGHT_TYPE_COLORS[thought.thoughtType] ?? colors.mutedDim,
    badgeVariant: null,
    badgeLabel: null,
  };
}
```

Update `SwipeableNoteCard` to render a colored dot instead of the icon box:
- Replace the 42x42 icon box with a 10x10 colored dot (matching the cluster card dot pattern)
- Remove Badge rendering for "Quick"/"Refined"/"Pinned"
- Keep "Promoted" badge

- [ ] **Step 2: Update Stream tRPC calls**

In `thoughts/index.tsx`:
- Change `trpc.note.list` → `trpc.thought.list`
- Change `trpc.note.create` → `trpc.thought.create`
- Change `trpc.note.delete` → `trpc.thought.delete`
- Change `trpc.sandbox.list` → `trpc.cluster.list`
- Change `trpc.sandbox.create` → `trpc.cluster.create`
- Change `trpc.sandbox.delete` → `trpc.cluster.delete`
- Update `utils.note.list.invalidate()` → `utils.thought.list.invalidate()`
- Update `utils.sandbox.list.invalidate()` → `utils.cluster.list.invalidate()`

- [ ] **Step 3: Update Stream FAB (remove NoteTypePopover)**

In `thoughts/index.tsx`:
- Remove `NoteTypePopover` import and rendering
- Remove `showTypePopover` state
- Stream FAB now directly creates a thought: `thoughtCreateMutation.mutate({})` — no popover, no type selection
- Remove `handleCreateQuickNote` and `handleCreateAINote` functions
- Keep single `handleNewThought` that calls `thoughtCreateMutation.mutate({})`

- [ ] **Step 4: Update thought detail editor — remove auto-refine**

In `notes/[id]/index.tsx`:
- Remove `scheduleAutoRefine` function entirely
- Remove the `autoRefineTimer` ref
- Remove the cleanup useEffect for `autoRefineTimer`
- In `handleEditorChange`, remove the `scheduleAutoRefine()` call — just call `markDirty()`
- Remove all `note.type === 'QUICK'` checks (lines that conditionally hide IdeaCard for QUICK notes)
- Change placeholder text to: `"Dump your thoughts here..."`
- Update tRPC calls: `trpc.note.*` → `trpc.thought.*`, `trpc.sandbox.*` → `trpc.cluster.*`

- [ ] **Step 5: Update sandbox detail tRPC calls**

In `sandbox/[id]/index.tsx`:
- Update `trpc.sandbox.*` → `trpc.cluster.*`
- Update `trpc.note.*` → `trpc.thought.*`
- Update `utils.sandbox.*` → `utils.cluster.*`
- Update `utils.note.*` → `utils.thought.*`

- [ ] **Step 6: Commit**

```bash
git add packages/mobile/src/app/
git commit -m "feat: update stream cards with type dots, remove auto-refine, update all tRPC calls"
```

---

### Task 10: Type-Check + Verify

- [ ] **Step 1: Type-check server**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from thought/cluster changes

- [ ] **Step 2: Type-check mobile**

Run: `cd packages/mobile && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from thought/cluster changes (pre-existing errors OK)

- [ ] **Step 3: Run server tests**

Run: `cd packages/server && pnpm test:run 2>&1 | tail -20`
Expected: Existing tests pass (may need updates if they reference note.create directly)

- [ ] **Step 4: Verify Expo Router routes**

Run: `cd packages/mobile && npx expo start --clear` (briefly check for route errors)
Expected: No unmatched route errors, 4 tabs visible

- [ ] **Step 5: Visual verification**

Open app in simulator:
- Capture tab: 2 options (Thought + Idea), type chips visible below input
- Thoughts Stream: cards show colored dots instead of Quick/Refined badges
- Thought detail: no auto-refine timer, single placeholder text
- Thoughts Clusters: cluster creation and navigation still works
- Cluster detail: AI actions still functional

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: fix any remaining type errors and verify build"
```
