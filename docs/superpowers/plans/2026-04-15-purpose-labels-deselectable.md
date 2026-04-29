# Purpose Chip, Labels & Deselectable Properties Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Idea/Note purpose toggle, a predefined+custom label system, and make maturity/type/confidence nullable with deselect support.

**Architecture:** Schema changes (purpose field, userLabels table, nullable properties) → shared validators → server endpoints (updateLabels, listUserLabels, createUserLabel) → mobile pickers and PropertyChipBar updates → AI prompt wiring. Each feature builds on the schema layer independently.

**Tech Stack:** Drizzle ORM (schema), Zod (validators), tRPC (endpoints), React Native (pickers/chips), BottomSheet (modals)

**Spec:** `docs/superpowers/specs/2026-04-15-purpose-labels-deselectable-design.md`

---

## Task 1: Schema changes — purpose field, userLabels table, nullable properties

**Files:**
- Modify: `packages/server/src/db/schema.ts`
- Modify: `packages/shared/src/validators/index.ts`

- [ ] **Step 1: Add purpose field to thoughts table**

In `packages/server/src/db/schema.ts`, in the thoughts table definition, add after the `title` field (around line 295):

```typescript
  purpose: text('purpose').default('idea').notNull(),
```

- [ ] **Step 2: Make maturityLevel, thoughtType, confidenceLevel nullable**

In the same file, change these three lines:

Replace:
```typescript
  maturityLevel: text('maturity_level').default('spark').notNull(),
```
With:
```typescript
  maturityLevel: text('maturity_level'),
```

Replace:
```typescript
  thoughtType: thoughtTypeEnum('thought_type').default('observation').notNull(),
```
With:
```typescript
  thoughtType: thoughtTypeEnum('thought_type'),
```

Replace:
```typescript
  confidenceLevel: text('confidence_level').default('untested').notNull(),
```
With:
```typescript
  confidenceLevel: text('confidence_level'),
```

- [ ] **Step 3: Add userLabels table**

In `packages/server/src/db/schema.ts`, after the `thoughtConnections` table definition, add:

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

export const userLabelsRelations = relations(userLabels, ({ one }) => ({
  user: one(users, { fields: [userLabels.userId], references: [users.id] }),
}));
```

Import `relations` if not already imported (it is).

- [ ] **Step 4: Update shared validators**

In `packages/shared/src/validators/index.ts`:

Add the purpose schema after the existing thought validators (around line 512):

```typescript
export const purposeSchema = z.enum(['idea', 'note']);
export type Purpose = z.infer<typeof purposeSchema>;
```

Make the three property schemas nullable:

Replace:
```typescript
export const thoughtTypeSchema = z.enum(['problem', 'solution', 'what_if', 'observation', 'question']);
```
With:
```typescript
export const thoughtTypeSchema = z.enum(['problem', 'solution', 'what_if', 'observation', 'question']).nullable();
```

Replace:
```typescript
export const maturityLevelSchema = z.enum(['spark', 'developing', 'hypothesis', 'conviction']);
```
With:
```typescript
export const maturityLevelSchema = z.enum(['spark', 'developing', 'hypothesis', 'conviction']).nullable();
```

Replace:
```typescript
export const thoughtConfidenceLevelSchema = z.enum(['untested', 'researched', 'validated']);
```
With:
```typescript
export const thoughtConfidenceLevelSchema = z.enum(['untested', 'researched', 'validated']).nullable();
```

Add `purpose` to `createThoughtSchema`:

```typescript
export const createThoughtSchema = z.object({
  content: z.string().max(NOTE_CONTENT_MAX).optional(),
  thoughtType: thoughtTypeSchema.optional(),
  captureMethod: captureMethodSchema.optional().default('quick_text'),
  clusterId: z.string().optional(),
  purpose: purposeSchema.optional().default('idea'),
});
```

Add `purpose` and `labels` to `updateThoughtPropertiesSchema`:

```typescript
export const updateThoughtPropertiesSchema = z.object({
  id: entityId,
  maturityLevel: maturityLevelSchema.optional(),
  thoughtType: thoughtTypeSchema.optional(),
  confidenceLevel: thoughtConfidenceLevelSchema.optional(),
  maturityNotes: z.string().max(500).optional(),
  purpose: purposeSchema.optional(),
});
```

Add label-related schemas:

```typescript
export const updateLabelsSchema = z.object({
  thoughtId: entityId,
  labels: z.array(z.string().max(50)).max(20),
});
export type UpdateLabelsInput = z.infer<typeof updateLabelsSchema>;

export const createUserLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(10).optional(),
});
export type CreateUserLabelInput = z.infer<typeof createUserLabelSchema>;
```

Add the predefined labels constant:

```typescript
export const PREDEFINED_LABELS = [
  { name: 'bug', color: '#EF4444' },
  { name: 'feature', color: '#10B981' },
  { name: 'task', color: '#F59E0B' },
  { name: 'reference', color: '#3B82F6' },
  { name: 'research', color: '#8B5CF6' },
] as const;

export const LABEL_PALETTE = [
  '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
] as const;
```

- [ ] **Step 5: Generate and push migration**

```bash
cd packages/server && pnpm db:generate
```

Then push to dev DB (using the same pattern that worked before):

```bash
cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && export $(grep -v '^#' .env | xargs) && CLEAN_URL=$(echo "$DATABASE_URL" | sed 's/\?.*//') && psql "$CLEAN_URL" -c 'ALTER TABLE "Thought" ADD COLUMN IF NOT EXISTS "purpose" text DEFAULT '"'"'idea'"'"' NOT NULL;' -c 'ALTER TABLE "Thought" ALTER COLUMN "maturity_level" DROP NOT NULL;' -c 'ALTER TABLE "Thought" ALTER COLUMN "maturity_level" DROP DEFAULT;' -c 'ALTER TABLE "Thought" ALTER COLUMN "thought_type" DROP NOT NULL;' -c 'ALTER TABLE "Thought" ALTER COLUMN "thought_type" DROP DEFAULT;' -c 'ALTER TABLE "Thought" ALTER COLUMN "confidence_level" DROP NOT NULL;' -c 'ALTER TABLE "Thought" ALTER COLUMN "confidence_level" DROP DEFAULT;' -c 'CREATE TABLE IF NOT EXISTS "UserLabel" ("id" text PRIMARY KEY NOT NULL, "user_id" text NOT NULL, "name" text NOT NULL, "color" text NOT NULL, "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL);' -c 'CREATE INDEX IF NOT EXISTS "UserLabel_userId_idx" ON "UserLabel" USING btree ("user_id");'
```

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/db/schema.ts packages/shared/src/validators/index.ts packages/server/drizzle/
git commit -m "feat: add purpose field, userLabels table, make properties nullable"
```

---

## Task 2: Server endpoints — updateLabels, listUserLabels, createUserLabel, purpose in create

**Files:**
- Modify: `packages/server/src/routers/thought.ts`

- [ ] **Step 1: Add purpose to create mutation**

In `packages/server/src/routers/thought.ts`, in the `create` mutation's `.values()` call (around line 153), add:

```typescript
          purpose: input.purpose ?? 'idea',
```

- [ ] **Step 2: Conditionally skip collision detection for notes**

In the same `create` mutation, wrap the `enqueueThoughtCollision` call (around line 190) with a purpose check:

```typescript
      // Enqueue collision detection (fire-and-forget) — ideas only
      if ((input.purpose ?? 'idea') === 'idea') {
        try {
          await enqueueThoughtCollision({ thoughtId: thought.id });
        } catch {
          // Non-critical — don't fail thought creation if queue is down
        }
      }
```

- [ ] **Step 3: Add purpose filter to getResurfaceCandidates**

In the `getResurfaceCandidates` query's `where` clause, add:

```typescript
            eq(thoughts.purpose, 'idea'),
```

- [ ] **Step 4: Add purpose to updateProperties**

In the `updateProperties` mutation (around line 735), add purpose handling after the existing confidence block:

```typescript
      if (input.purpose !== undefined && input.purpose !== thought.purpose) {
        updates.purpose = input.purpose;
        events.push({
          eventType: 'type_changed',
          metadata: { field: 'purpose', from: thought.purpose, to: input.purpose },
        });
      }
```

Also add `purpose: true` to the `columns` selection in the ownership check query.

- [ ] **Step 5: Fix updateProperties to handle null values**

The existing code uses `if (input.maturityLevel && ...)` which treats `null` as falsy and won't clear the value. Change the three property checks from:

```typescript
      if (input.maturityLevel && input.maturityLevel !== thought.maturityLevel) {
```

To:

```typescript
      if (input.maturityLevel !== undefined && input.maturityLevel !== thought.maturityLevel) {
```

Do the same for `thoughtType` and `confidenceLevel`. This allows passing `null` to clear the value.

- [ ] **Step 6: Add updateLabels endpoint**

Add before the closing `});` of the router:

```typescript
  /**
   * Update labels (tags) on a thought.
   */
  updateLabels: protectedProcedure
    .input(updateLabelsSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: { id: true, tags: true },
      });

      if (!thought) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'THOUGHT_NOT_FOUND' });
      }

      await ctx.db
        .update(thoughts)
        .set({ tags: input.labels })
        .where(eq(thoughts.id, input.thoughtId));

      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.thoughtId,
        eventType: 'type_changed',
        metadata: { field: 'labels', from: thought.tags, to: input.labels },
      });

      return { success: true, labels: input.labels };
    }),
```

- [ ] **Step 7: Add listUserLabels endpoint**

```typescript
  /**
   * List user's custom labels merged with predefined labels.
   */
  listUserLabels: protectedProcedure
    .query(async ({ ctx }) => {
      const custom = await ctx.db
        .select()
        .from(userLabels)
        .where(eq(userLabels.userId, ctx.userId))
        .orderBy(desc(userLabels.createdAt));

      return { predefined: PREDEFINED_LABELS, custom };
    }),
```

Import `PREDEFINED_LABELS` from `@forge/shared` and `userLabels` from the schema.

- [ ] **Step 8: Add createUserLabel endpoint**

```typescript
  /**
   * Create a custom label for the user.
   */
  createUserLabel: protectedProcedure
    .input(createUserLabelSchema)
    .mutation(async ({ ctx, input }) => {
      // Auto-assign color from palette if not provided
      const existingCount = await ctx.db
        .select({ cnt: count() })
        .from(userLabels)
        .where(eq(userLabels.userId, ctx.userId));

      const colorIndex = Number(existingCount[0]?.cnt ?? 0) % LABEL_PALETTE.length;
      const color = input.color ?? LABEL_PALETTE[colorIndex];

      const [label] = await ctx.db
        .insert(userLabels)
        .values({
          userId: ctx.userId,
          name: input.name.toLowerCase().trim(),
          color,
        })
        .returning();

      return label;
    }),
```

Import `LABEL_PALETTE`, `updateLabelsSchema`, `createUserLabelSchema` from `@forge/shared`.

- [ ] **Step 9: Add necessary imports**

At the top of `thought.ts`, add to the `@forge/shared` import:

```typescript
  updateLabelsSchema,
  createUserLabelSchema,
  PREDEFINED_LABELS,
  LABEL_PALETTE,
```

Add to the schema import:

```typescript
  userLabels,
```

- [ ] **Step 10: Type-check**

Run: `pnpm type-check`

Fix any TypeScript errors related to the nullable types. The mobile code may have errors since it still expects non-null — those will be fixed in later tasks.

- [ ] **Step 11: Commit**

```bash
git add packages/server/src/routers/thought.ts
git commit -m "feat: add label endpoints, purpose in create, nullable property handling"
```

---

## Task 3: Add "None" option to MaturityPicker, TypePicker, ConfidencePicker

**Files:**
- Modify: `packages/mobile/src/components/thought/MaturityPicker.tsx`
- Modify: `packages/mobile/src/components/thought/TypePicker.tsx`
- Modify: `packages/mobile/src/components/thought/ConfidencePicker.tsx`

- [ ] **Step 1: Update MaturityPicker**

Change the interface to accept nullable values:

```typescript
interface MaturityPickerProps {
  visible: boolean;
  onClose: () => void;
  current: MaturityLevel | null;
  onSelect: (level: MaturityLevel | null) => void;
}
```

Add a "None" option at the top of the options list inside the render:

```tsx
<TouchableOpacity
  style={[styles.option, current === null && { backgroundColor: `${colors.mutedDim}15` }]}
  onPress={() => {
    onSelect(null);
    onClose();
  }}
  activeOpacity={0.7}
>
  <View style={styles.iconContainer}>
    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.mutedDim, borderStyle: 'dashed' }} />
  </View>
  <View style={styles.optionText}>
    <Text style={[styles.label, { color: colors.mutedDim }]}>None</Text>
    <Text style={styles.description}>No maturity level assigned.</Text>
  </View>
  {current === null && <Check size={18} color={colors.mutedDim} />}
</TouchableOpacity>
```

Place this before the `.map()` of MATURITY_OPTIONS.

- [ ] **Step 2: Update TypePicker**

Same pattern. Change interface:

```typescript
interface TypePickerProps {
  visible: boolean;
  onClose: () => void;
  current: ThoughtType | null;
  onSelect: (type: ThoughtType | null) => void;
}
```

Add "None" option at the top:

```tsx
<TouchableOpacity
  style={[styles.option, current === null && { backgroundColor: `${colors.mutedDim}15` }]}
  onPress={() => {
    onSelect(null);
    onClose();
  }}
  activeOpacity={0.7}
>
  <View style={styles.iconContainer}>
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.mutedDim, borderStyle: 'dashed' }} />
  </View>
  <View style={styles.optionText}>
    <Text style={[styles.label, { color: colors.mutedDim }]}>None</Text>
    <Text style={styles.description}>No type assigned.</Text>
  </View>
  {current === null && <Check size={18} color={colors.mutedDim} />}
</TouchableOpacity>
```

- [ ] **Step 3: Update ConfidencePicker**

Same pattern. Change interface:

```typescript
interface ConfidencePickerProps {
  visible: boolean;
  onClose: () => void;
  current: ConfidenceLevel | null;
  onSelect: (level: ConfidenceLevel | null) => void;
}
```

Add "None" option at the top with the same dashed circle icon pattern.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/src/components/thought/MaturityPicker.tsx packages/mobile/src/components/thought/TypePicker.tsx packages/mobile/src/components/thought/ConfidencePicker.tsx
git commit -m "feat: add None option to all three property pickers"
```

---

## Task 4: Create PurposeChips for Capture screen

**Files:**
- Create: `packages/mobile/src/components/PurposeChips.tsx`
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx`

- [ ] **Step 1: Create PurposeChips component**

Create `packages/mobile/src/components/PurposeChips.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lightbulb, FileText } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';

export type Purpose = 'idea' | 'note';

const PURPOSE_OPTIONS: { value: Purpose; label: string; color: string; Icon: typeof Lightbulb }[] = [
  { value: 'idea', label: 'Idea', color: '#F59E0B', Icon: Lightbulb },
  { value: 'note', label: 'Note', color: '#6B7280', Icon: FileText },
];

export function PurposeChips({
  selected,
  onSelect,
}: {
  selected: Purpose;
  onSelect: (purpose: Purpose) => void;
}) {
  return (
    <View style={styles.container}>
      {PURPOSE_OPTIONS.map(({ value, label, color, Icon }) => {
        const isActive = selected === value;
        return (
          <TouchableOpacity
            key={value}
            style={[
              styles.chip,
              isActive && { backgroundColor: `${color}20`, borderColor: color },
            ]}
            onPress={() => onSelect(value)}
            activeOpacity={0.7}
          >
            <Icon size={14} color={isActive ? color : colors.mutedDim} />
            <Text style={[styles.label, isActive && { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
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
  label: {
    fontSize: 13,
    ...fonts.text.regular,
    color: colors.muted,
  },
});
```

- [ ] **Step 2: Integrate into Capture screen**

In `packages/mobile/src/app/(tabs)/capture.tsx`:

Add import:
```typescript
import { PurposeChips, type Purpose } from '../../components/PurposeChips';
```

Add state (near other state declarations):
```typescript
const [purpose, setPurpose] = useState<Purpose>('idea');
```

Add the PurposeChips above the ThoughtTypeChips in the JSX. Find where `<ThoughtTypeChips` is rendered and add above it:
```tsx
<PurposeChips selected={purpose} onSelect={setPurpose} />
```

Pass purpose to the `createThought.mutate()` call. Find `handleThoughtCapture` where `createThought.mutate({...})` is called and add `purpose`:
```typescript
createThought.mutate({
  content: trimmed,
  thoughtType: selectedType ?? undefined,
  captureMethod: isListening ? 'voice' : 'quick_text',
  purpose,
});
```

Reset purpose in the `onSuccess` callback:
```typescript
setPurpose('idea');
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/components/PurposeChips.tsx packages/mobile/src/app/\(tabs\)/capture.tsx
git commit -m "feat: add Purpose chips (Idea/Note) to Capture screen"
```

---

## Task 5: Create LabelPicker component

**Files:**
- Create: `packages/mobile/src/components/thought/LabelPicker.tsx`

- [ ] **Step 1: Create LabelPicker**

Create `packages/mobile/src/components/thought/LabelPicker.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Plus, Tag } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';
import { trpc } from '../../lib/trpc';
import { PREDEFINED_LABELS } from '@forge/shared';

interface LabelPickerProps {
  visible: boolean;
  onClose: () => void;
  currentLabels: string[];
  onUpdateLabels: (labels: string[]) => void;
}

export function LabelPicker({ visible, onClose, currentLabels, onUpdateLabels }: LabelPickerProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const { data: userLabelsData } = trpc.thought.listUserLabels.useQuery(undefined, { enabled: visible });
  const createLabelMutation = trpc.thought.createUserLabel.useMutation({
    onSuccess: (label) => {
      // Auto-select the newly created label
      if (!currentLabels.includes(label.name)) {
        onUpdateLabels([...currentLabels, label.name]);
      }
      setNewLabelName('');
    },
  });

  const toggleLabel = (name: string) => {
    if (currentLabels.includes(name)) {
      onUpdateLabels(currentLabels.filter((l) => l !== name));
    } else {
      onUpdateLabels([...currentLabels, name]);
    }
  };

  const handleCreateLabel = () => {
    const trimmed = newLabelName.toLowerCase().trim();
    if (!trimmed) return;
    createLabelMutation.mutate({ name: trimmed });
  };

  const allLabels = [
    ...PREDEFINED_LABELS.map((l) => ({ name: l.name, color: l.color, custom: false })),
    ...(userLabelsData?.custom ?? []).map((l) => ({ name: l.name, color: l.color, custom: true })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Labels">
      <View style={styles.options}>
        {allLabels.map(({ name, color }) => {
          const isSelected = currentLabels.includes(name);
          return (
            <TouchableOpacity
              key={name}
              style={[styles.option, isSelected && { backgroundColor: `${color}15` }]}
              onPress={() => toggleLabel(name)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={[styles.label, isSelected && { color }]}>{name}</Text>
              {isSelected && <Check size={16} color={color} />}
            </TouchableOpacity>
          );
        })}

        {/* Create new label */}
        <View style={styles.createRow}>
          <Tag size={14} color={colors.mutedDim} />
          <TextInput
            style={styles.input}
            value={newLabelName}
            onChangeText={setNewLabelName}
            placeholder="New label..."
            placeholderTextColor={colors.mutedDim}
            maxLength={50}
            autoCapitalize="none"
            onSubmitEditing={handleCreateLabel}
            returnKeyType="done"
          />
          {newLabelName.trim() && (
            <TouchableOpacity onPress={handleCreateLabel} activeOpacity={0.7}>
              {createLabelMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Plus size={18} color={colors.brand} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 15,
    ...fonts.text.medium,
    color: colors.foreground,
    flex: 1,
    textTransform: 'capitalize',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    ...fonts.text.regular,
    color: colors.foreground,
    paddingVertical: 0,
  },
});
```

- [ ] **Step 2: Export from index**

In `packages/mobile/src/components/thought/index.ts`, add:

```typescript
export { LabelPicker } from './LabelPicker';
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/components/thought/LabelPicker.tsx packages/mobile/src/components/thought/index.ts
git commit -m "feat: create LabelPicker component with predefined + custom labels"
```

---

## Task 6: Update PropertyChipBar — purpose chip, labels chip, ghost states

**Files:**
- Modify: `packages/mobile/src/components/thought/PropertyChipBar.tsx`
- Create: `packages/mobile/src/components/thought/PurposePicker.tsx`

- [ ] **Step 1: Create PurposePicker**

Create `packages/mobile/src/components/thought/PurposePicker.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Lightbulb, FileText } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { BottomSheet } from '../ui/BottomSheet';

export type Purpose = 'idea' | 'note';

const PURPOSE_OPTIONS: { value: Purpose; label: string; color: string; Icon: typeof Lightbulb; description: string }[] = [
  { value: 'idea', label: 'Idea', color: '#F59E0B', Icon: Lightbulb, description: 'Part of the ideation pipeline. Gets resurfaced and scored.' },
  { value: 'note', label: 'Note', color: '#6B7280', Icon: FileText, description: 'General capture. Skips resurfacing and scoring.' },
];

interface PurposePickerProps {
  visible: boolean;
  onClose: () => void;
  current: Purpose;
  onSelect: (purpose: Purpose) => void;
}

export function PurposePicker({ visible, onClose, current, onSelect }: PurposePickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Purpose">
      <View style={styles.options}>
        {PURPOSE_OPTIONS.map(({ value, label, color, Icon, description }) => {
          const isSelected = current === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.option, isSelected && { backgroundColor: `${color}15` }]}
              onPress={() => {
                onSelect(value);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon size={20} color={color} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.label, { color }]}>{label}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              {isSelected && <Check size={18} color={color} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  iconContainer: { width: 28, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  label: { fontSize: 15, ...fonts.text.semiBold },
  description: { fontSize: 13, ...fonts.text.regular, color: colors.muted },
});
```

- [ ] **Step 2: Update PropertyChipBar props and imports**

In `packages/mobile/src/components/thought/PropertyChipBar.tsx`:

Add imports:
```typescript
import { Lightbulb, FileText, Tag } from 'lucide-react-native';
import { PurposePicker, type Purpose } from './PurposePicker';
import { LabelPicker } from './LabelPicker';
```

Update the interface to accept nullable properties, plus purpose and labels:

```typescript
interface PropertyChipBarProps {
  maturityLevel: MaturityLevel | null;
  thoughtType: ThoughtType | null;
  confidenceLevel: ConfidenceLevel | null;
  purpose: string;
  labels: string[];
  clusterId: string | null;
  clusterName?: string | null;
  clusterColor?: string | null;
  typeSource: string;
  onUpdateMaturity: (level: MaturityLevel | null) => void;
  onUpdateType: (type: ThoughtType | null) => void;
  onUpdateConfidence: (level: ConfidenceLevel | null) => void;
  onUpdatePurpose: (purpose: Purpose) => void;
  onUpdateLabels: (labels: string[]) => void;
  onAddToCluster: (clusterId: string) => void;
  onRemoveFromCluster: () => void;
}
```

- [ ] **Step 3: Add purpose and label state, update destructuring**

Add to the destructuring:
```typescript
  purpose,
  labels,
  onUpdatePurpose,
  onUpdateLabels,
```

Add state:
```typescript
  const [showPurpose, setShowPurpose] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
```

- [ ] **Step 4: Add Purpose chip as first chip**

In the ScrollView, add before the Maturity chip:

```tsx
        {/* Purpose chip */}
        <TouchableOpacity
          style={[styles.chip, { borderColor: purpose === 'idea' ? '#F59E0B40' : `${colors.mutedDim}40` }]}
          onPress={() => setShowPurpose(true)}
          activeOpacity={0.7}
        >
          {purpose === 'idea' ? (
            <Lightbulb size={14} color="#F59E0B" />
          ) : (
            <FileText size={14} color={colors.mutedDim} />
          )}
          <Text style={[styles.chipLabel, { color: purpose === 'idea' ? '#F59E0B' : colors.mutedDim }]}>
            {purpose === 'idea' ? 'Idea' : 'Note'}
          </Text>
        </TouchableOpacity>
```

- [ ] **Step 5: Update maturity, type, confidence chips for nullable**

Replace the maturity chip block with ghost-chip support:

```tsx
        {/* Maturity chip */}
        {maturityLevel && maturity ? (
          <TouchableOpacity
            style={[styles.chip, { borderColor: `${maturity.color}40` }]}
            onPress={() => setShowMaturity(true)}
            activeOpacity={0.7}
          >
            <MaturityDot color={maturity.color} style={maturity.style} />
            <Text style={[styles.chipLabel, { color: maturity.color }]}>{maturity.label}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.chip, styles.ghostChip]}
            onPress={() => setShowMaturity(true)}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.mutedDim} />
            <Text style={[styles.chipLabel, styles.ghostLabel]}>Maturity</Text>
          </TouchableOpacity>
        )}
```

Do the same for the type chip:

```tsx
        {/* Type chip */}
        {thoughtType && type ? (
          <TouchableOpacity
            style={[styles.chip, { borderColor: `${type.color}40` }]}
            onPress={() => setShowType(true)}
            activeOpacity={0.7}
          >
            <type.Icon size={14} color={type.color} />
            <Text style={[styles.chipLabel, { color: type.color }]}>{type.label}</Text>
            {typeSource === 'ai_auto' && (
              <View style={styles.aiLabel}>
                <Text style={styles.aiLabelText}>AI</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.chip, styles.ghostChip]}
            onPress={() => setShowType(true)}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.mutedDim} />
            <Text style={[styles.chipLabel, styles.ghostLabel]}>Type</Text>
          </TouchableOpacity>
        )}
```

And confidence:

```tsx
        {/* Confidence chip */}
        {confidenceLevel && confidence ? (
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setShowConfidence(true)}
            activeOpacity={0.7}
          >
            <confidence.Icon size={14} color={confidence.color} />
            <Text style={[styles.chipLabel, { color: confidence.color }]}>{confidence.label}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.chip, styles.ghostChip]}
            onPress={() => setShowConfidence(true)}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.mutedDim} />
            <Text style={[styles.chipLabel, styles.ghostLabel]}>Confidence</Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 6: Add Labels chip after Cluster chip**

After the Cluster chip block, add:

```tsx
        {/* Labels chip */}
        {labels.length > 0 ? (
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setShowLabels(true)}
            onLongPress={() => onUpdateLabels([])}
            activeOpacity={0.7}
          >
            <Tag size={14} color={colors.muted} />
            <Text style={styles.chipLabel} numberOfLines={1}>
              {labels[0]}{labels.length > 1 ? ` +${labels.length - 1}` : ''}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.chip, styles.ghostChip]}
            onPress={() => setShowLabels(true)}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.mutedDim} />
            <Text style={[styles.chipLabel, styles.ghostLabel]}>Labels</Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 7: Add Purpose and Label pickers to the bottom of the component**

After the existing ClusterPicker, add:

```tsx
      <PurposePicker
        visible={showPurpose}
        onClose={() => setShowPurpose(false)}
        current={purpose as Purpose}
        onSelect={onUpdatePurpose}
      />

      <LabelPicker
        visible={showLabels}
        onClose={() => setShowLabels(false)}
        currentLabels={labels}
        onUpdateLabels={onUpdateLabels}
      />
```

- [ ] **Step 8: Handle nullable config lookups safely**

Update the config lookups at the top of the component to handle null:

```typescript
  const maturity = maturityLevel ? MATURITY_CONFIG[maturityLevel] : null;
  const type = thoughtType ? TYPE_CONFIG[thoughtType] : null;
  const confidence = confidenceLevel ? CONFIDENCE_CONFIG[confidenceLevel] : null;
```

- [ ] **Step 9: Commit**

```bash
git add packages/mobile/src/components/thought/PurposePicker.tsx packages/mobile/src/components/thought/PropertyChipBar.tsx
git commit -m "feat: add Purpose and Labels chips to PropertyChipBar, ghost states for nullable"
```

---

## Task 7: Wire PropertyChipBar changes in thought detail view

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`

- [ ] **Step 1: Add purpose and label handlers**

In the thought detail view, add handlers for the new props:

```typescript
  const handleUpdatePurpose = useCallback((purpose: string) => {
    updatePropertiesMutation.mutate({ id: id!, purpose: purpose as any });
  }, [id, updatePropertiesMutation]);

  const handleUpdateLabels = useCallback((labels: string[]) => {
    updateLabelsMutation.mutate({ thoughtId: id!, labels });
  }, [id]);
```

Add the updateLabels mutation:

```typescript
  const updateLabelsMutation = trpc.thought.updateLabels.useMutation({
    onSuccess: () => {
      utils.thought.get.invalidate({ id: id! });
      utils.thought.list.invalidate();
    },
  });
```

- [ ] **Step 2: Pass new props to PropertyChipBar**

Update the PropertyChipBar usage to pass purpose, labels, and the new handlers:

```tsx
<PropertyChipBar
  maturityLevel={note.maturityLevel as any}
  thoughtType={note.thoughtType as any}
  confidenceLevel={note.confidenceLevel as any}
  purpose={note.purpose ?? 'idea'}
  labels={note.tags ?? []}
  clusterId={note.clusterId ?? null}
  clusterName={note.cluster?.name ?? null}
  clusterColor={note.cluster?.color ?? null}
  typeSource={note.typeSource}
  onUpdateMaturity={handleUpdateMaturity}
  onUpdateType={handleUpdateType}
  onUpdateConfidence={handleUpdateConfidence}
  onUpdatePurpose={handleUpdatePurpose}
  onUpdateLabels={handleUpdateLabels}
  onAddToCluster={(clusterId) => pinMutation.mutate({ thoughtId: id!, clusterId })}
  onRemoveFromCluster={() => unpinMutation.mutate({ thoughtId: id! })}
/>
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/notes/[id]/index.tsx
git commit -m "feat: wire purpose and labels to PropertyChipBar in thought detail"
```

---

## Task 8: AI prompt wiring — include purpose and labels in refinement and cluster context

**Files:**
- Modify: `packages/server/src/services/note-ai.ts`
- Modify: `packages/server/src/services/sandbox-ai.ts`

- [ ] **Step 1: Update refinement prompt in note-ai.ts**

In `packages/server/src/services/note-ai.ts`, find the `refineNote` function. Update the system prompt to include purpose and labels context. The function currently takes `content: string` — change the signature to accept optional metadata:

```typescript
export async function refineNote(
  content: string,
  metadata?: { purpose?: string; labels?: string[] },
)
```

Add to the system prompt (before the existing prompt text):

```typescript
const contextLine = metadata
  ? `\nContext: Purpose=${metadata.purpose || 'idea'}${metadata.labels?.length ? `, Labels=[${metadata.labels.join(', ')}]` : ''}\n`
  : '';
```

Prepend `contextLine` to the user message when calling the AI.

- [ ] **Step 2: Update the refine mutation in thought.ts to pass metadata**

In `packages/server/src/routers/thought.ts`, find the `refine` mutation. Update the `refineNote` call to pass purpose and labels:

```typescript
const refinement = await refineNote(thought.content, {
  purpose: thought.purpose,
  labels: thought.tags ?? [],
});
```

This requires fetching `purpose` and `tags` in the thought query — add them to the `columns` selection.

- [ ] **Step 3: Update cluster AI context in sandbox-ai.ts**

In `packages/server/src/services/sandbox-ai.ts`, find the `formatNotesForAi` function (or equivalent). Update it to include metadata per thought. The function currently takes `noteContents: string[]` — if the cluster AI actions pass raw content strings, update the callers to pass structured objects instead:

In `packages/server/src/routers/cluster.ts`, the `getClusterThoughtsForAi` helper fetches thoughts and extracts just the `content` field. Update it to also return `purpose` and `tags`:

```typescript
const clusterThoughts = await db
  .select({ content: thoughts.content, purpose: thoughts.purpose, tags: thoughts.tags })
  .from(thoughts)
  .where(and(eq(thoughts.clusterId, clusterId), isNull(thoughts.promotedProjectId)));

const formattedContents = clusterThoughts
  .filter((n) => n.content.length > 0)
  .map((n) => {
    const meta = [];
    if (n.purpose) meta.push(`Purpose: ${n.purpose}`);
    if (n.tags?.length) meta.push(`Labels: ${n.tags.join(', ')}`);
    const prefix = meta.length > 0 ? `[${meta.join(' | ')}]\n` : '';
    return `${prefix}${n.content}`;
  });
```

Return `formattedContents` instead of the plain content array.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/services/note-ai.ts packages/server/src/services/sandbox-ai.ts packages/server/src/routers/thought.ts packages/server/src/routers/cluster.ts
git commit -m "feat: include purpose and labels in AI refinement and cluster synthesis context"
```
