# Design: Purpose Chip, Labels, and Deselectable Properties

**Created:** 2026-04-15
**Status:** Approved

## Problem Statement

The current thought property system assumes every capture is an idea heading toward validation. In practice, users dump all kinds of things into the app — bug reports, feature requests, tasks, references — that clutter the ideation pipeline. There's no way to tag thoughts for organization, and once a property is selected it can't be cleared.

## Scope

### In scope

- Purpose chip (`idea` / `note`) on Capture screen and PropertyChipBar
- Notes excluded from resurfacing, collision detection, and cluster readiness scoring
- Label system with predefined + custom labels, stored in `tags` field
- `userLabels` table for persisting custom labels per user
- LabelPicker modal in PropertyChipBar
- Deselectable maturity, type, and confidence (nullable with ghost chip state)
- AI refinement context includes purpose and labels
- Cluster AI actions include purpose and labels per thought in context

### Out of scope

- Search/filter by labels (future feature)
- AI auto-labeling
- Label management screen (edit/delete custom labels)
- Labels on Capture screen (detail view only)

---

## Feature 1: Purpose Chip (Idea / Note)

### Schema

Add `purpose` field to the `thoughts` table:

```typescript
purpose: text('purpose').default('idea').notNull(),
```

Values: `idea` | `note`. Defaults to `idea`.

### Validator

Add to `packages/shared/src/validators/index.ts`:

```typescript
export const purposeSchema = z.enum(['idea', 'note']);
export type Purpose = z.infer<typeof purposeSchema>;
```

Add `purpose` to `createThoughtSchema` and `updateThoughtPropertiesSchema` as optional fields.

### Capture screen

Add a two-chip toggle row above the existing `ThoughtTypeChips` in `capture.tsx`. Same pill chip styling. `Idea` is selected by default. Tapping `Note` switches the selection. Tapping the active chip does nothing (one must always be selected).

State: `const [purpose, setPurpose] = useState<'idea' | 'note'>('idea');`

Pass `purpose` to the `createThought.mutate()` call.

### PropertyChipBar

Add Purpose as the **first chip** (before maturity). Shows the current value with an icon — Lightbulb for Idea, FileText for Note. Tapping opens a simple two-option picker modal (same pattern as MaturityPicker). No ghost/null state — always one or the other.

### Pipeline exclusions for Notes

Notes (`purpose === 'note'`) are excluded from:

1. **Resurfacing** — Add `eq(thoughts.purpose, 'idea')` to the eligibility filter in `getResurfaceCandidates`
2. **Collision detection** — In `thought.create`, only call `enqueueThoughtCollision()` when `purpose === 'idea'`
3. **Cluster readiness scoring** — When calculating dimension coverage and readiness score, exclude thoughts where `purpose === 'note'`

Notes remain:
- Visible in Stream
- Manually addable to clusters
- Searchable
- Eligible for AI refinement (with purpose as context)

---

## Feature 2: Labels (Predefined + Custom)

### Schema

**Reuse existing `tags` field** on the thoughts table (`tags: text().array().default([])`). Currently populated by AI refinement but never user-editable. This becomes the user-facing labels field.

**Important: AI refinement writes to `aiTags`, not `tags`.** The `tags` field is for user-controlled labels only. The AI refinement service (`note-ai.ts`) already writes its generated tags to the separate `aiTags` field, so there's no conflict. Verify this during implementation — if refinement writes to `tags`, change it to write to `aiTags` instead.

**New `userLabels` table** for persisting custom labels per user:

```typescript
export const userLabels = pgTable('UserLabel', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text().notNull(),
  color: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('UserLabel_userId_idx').using('btree', table.userId.asc()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'UserLabel_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);
```

### Predefined labels

Stored as a shared constant (not in the DB):

```typescript
export const PREDEFINED_LABELS = [
  { name: 'bug', color: '#EF4444' },
  { name: 'feature', color: '#10B981' },
  { name: 'task', color: '#F59E0B' },
  { name: 'reference', color: '#3B82F6' },
  { name: 'research', color: '#8B5CF6' },
] as const;
```

### Server endpoints

Add to the thought router:

- **`thought.updateLabels`** — `{ thoughtId, labels: string[] }`. Updates the `tags` array on the thought. Creates a `ThoughtEvent` with eventType `labels_changed`.
- **`thought.listUserLabels`** — Returns the user's custom labels from `userLabels` table, merged with predefined labels.
- **`thought.createUserLabel`** — `{ name, color? }`. Creates a custom label. Color auto-assigned from palette if not provided.

### LabelPicker component

New `LabelPicker` modal component, following the same pattern as `MaturityPicker`/`TypePicker`/`ConfidencePicker`.

Shows:
- Section header: "Labels"
- Predefined labels as tappable chips (multi-select, highlighted when active)
- Custom labels section below (if any exist)
- "Add label" text input at the bottom with a color dot and create button
- Active labels have a filled background, inactive have border-only

### PropertyChipBar integration

Add a Labels chip after the Cluster chip. Behavior:

- **No labels:** Ghost chip (dashed border, "Labels" placeholder with Plus icon) — tapping opens LabelPicker
- **Has labels:** Shows first label name + count badge if multiple (e.g., `bug +2`). Chip background tinted with the first label's color. Tapping opens LabelPicker. Long-press clears all labels.

### Capture screen

Labels are NOT available on the Capture screen. They're added only from the thought detail view's PropertyChipBar. This keeps capture fast.

### AI wiring

**Refinement prompt** (`packages/server/src/services/note-ai.ts`): When refining a thought, include purpose and labels in the system prompt:

```
Purpose: note
Labels: bug, feature
Refine this thought accordingly — it's a bug report, not a business idea.
```

The existing prompt already says "preserve intent" — this makes intent explicit.

**Cluster AI actions** (`packages/server/src/services/sandbox-ai.ts`): When gathering thought contents for cluster synthesis, include each thought's labels and purpose:

```
[Thought 1 | Purpose: idea | Labels: feature, research]
Content here...

[Thought 2 | Purpose: note | Labels: bug]
Content here...
```

This lets the AI distinguish utility notes from idea-oriented thoughts during synthesis.

---

## Feature 3: Deselectable Properties

### Schema changes

Make `maturityLevel`, `thoughtType`, and `confidenceLevel` nullable:

```typescript
maturityLevel: text('maturity_level').default(null),  // was default('spark').notNull()
thoughtType: thoughtTypeEnum('thought_type').default(null),  // was default('observation').notNull()
confidenceLevel: text('confidence_level').default(null),  // was default('untested').notNull()
```

**Migration:** Existing thoughts keep their current values. Only new thoughts start with null if the user doesn't select anything at capture.

### Validator changes

Update shared validators to accept null:

```typescript
export const thoughtTypeSchema = z.enum(['problem', 'solution', 'what_if', 'observation', 'question']).nullable();
export const maturityLevelSchema = z.enum(['spark', 'developing', 'hypothesis', 'conviction']).nullable();
export const thoughtConfidenceLevelSchema = z.enum(['untested', 'researched', 'validated']).nullable();
```

### Picker changes

**MaturityPicker, TypePicker, ConfidencePicker:** Add a "None" option at the top of each picker's option list. Selecting it passes `null` to the `onSelect` callback.

### PropertyChipBar changes

When a property is null, show the ghost chip pattern (already used for Cluster):
- Dashed border, muted text
- Plus icon + property name as placeholder (e.g., "+ Maturity", "+ Type", "+ Confidence")
- Tapping opens the picker

### AI impact

When properties are null, the AI refinement prompt omits them from context rather than passing "unknown" or "null". The auto-classify job still runs for `thoughtType === null` (same behavior as today with `typeSource: 'ai_auto'`).

### Resurfacing impact

The incubation score formula's `type_diversity_bonus` treats null-type thoughts as their own category — a null-type thought connected to a "problem" thought counts as type-diverse (bonus = 1.0).

---

## Files to create or modify

### New files
- `packages/mobile/src/components/thought/LabelPicker.tsx` — Label selection modal
- `packages/mobile/src/components/thought/PurposePicker.tsx` — Idea/Note picker modal
- `packages/mobile/src/components/PurposeChips.tsx` — Two-chip toggle for Capture screen

### Modified files
- `packages/server/src/db/schema.ts` — Add `purpose` field, `userLabels` table, make maturity/type/confidence nullable
- `packages/shared/src/validators/index.ts` — Add `purposeSchema`, `labelSchemas`, make type/maturity/confidence nullable
- `packages/server/src/routers/thought.ts` — Add `updateLabels`, `listUserLabels`, `createUserLabel` endpoints; add purpose to `create`; add purpose filter to `getResurfaceCandidates` and collision trigger
- `packages/server/src/services/note-ai.ts` — Include purpose and labels in refinement prompt
- `packages/server/src/services/sandbox-ai.ts` — Include purpose and labels per thought in cluster AI context
- `packages/mobile/src/components/thought/PropertyChipBar.tsx` — Add Purpose chip, Labels chip, ghost states for nullable properties
- `packages/mobile/src/components/thought/MaturityPicker.tsx` — Add "None" option
- `packages/mobile/src/components/thought/TypePicker.tsx` — Add "None" option
- `packages/mobile/src/components/thought/ConfidencePicker.tsx` — Add "None" option
- `packages/mobile/src/app/(tabs)/capture.tsx` — Add PurposeChips, pass purpose to create mutation
- `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx` — Pass labels and purpose data to PropertyChipBar

---

## Acceptance Criteria

### Purpose Chip
- [ ] `purpose` field exists on thoughts table, defaults to `idea`
- [ ] Capture screen shows Idea/Note toggle, defaults to Idea
- [ ] PropertyChipBar shows Purpose as first chip with icon
- [ ] Notes excluded from `getResurfaceCandidates`
- [ ] Notes excluded from collision detection (no `enqueueThoughtCollision`)
- [ ] Notes excluded from cluster readiness scoring
- [ ] Notes still visible in Stream, addable to clusters, refineable

### Labels
- [ ] `tags` field used for user-facing labels
- [ ] `userLabels` table created for custom label persistence
- [ ] 5 predefined labels available: bug, feature, task, reference, research
- [ ] LabelPicker supports multi-select with predefined + custom labels
- [ ] Custom labels created via text input in LabelPicker
- [ ] PropertyChipBar shows Labels chip with first label + count
- [ ] Labels NOT on Capture screen (detail view only)
- [ ] `updateLabels`, `listUserLabels`, `createUserLabel` endpoints work
- [ ] AI refinement prompt includes purpose and labels as context
- [ ] Cluster AI actions include purpose and labels per thought

### Deselectable Properties
- [ ] maturityLevel, thoughtType, confidenceLevel nullable in schema
- [ ] All three pickers have "None" option
- [ ] PropertyChipBar shows ghost chip (dashed border + placeholder) when null
- [ ] Existing thoughts retain their current values after migration
- [ ] AI refinement omits null properties from context
- [ ] Null thoughtType triggers auto-classify job (existing behavior preserved)
- [ ] Incubation score treats null type as its own category for diversity
