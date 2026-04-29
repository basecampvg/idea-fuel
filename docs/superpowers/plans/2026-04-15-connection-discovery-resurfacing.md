# Connection Discovery & Resurfacing Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up semantic collision detection on thought creation and build a resurfacing engine that surfaces dormant thoughts in a "Revisit" section at the top of the Stream view.

**Architecture:** The collision worker and embedding pipeline already exist — Task 1 just connects the trigger. Tasks 2-3 add schema fields and server endpoints for the incubation score and surface actions. Tasks 4-6 build the mobile UI: collision inline card on Capture, Revisit section on Stream, and the Engage->Capture wiring.

**Tech Stack:** tRPC + Drizzle ORM (server), React Native + Expo (mobile), BullMQ (queue), pgvector + OpenAI embeddings (collision), AsyncStorage (client-side caching)

**Spec:** `docs/superpowers/specs/2026-04-15-connection-discovery-resurfacing-design.md`

---

## Task 1: Wire collision worker trigger in thought.create

**Files:**
- Modify: `packages/server/src/routers/thought.ts:179-189`

This is the critical one-line fix. The `enqueueThoughtCollision` function and `thoughtCollisionWorker` are fully built — they just never get called.

- [ ] **Step 1: Add the enqueue call after thought creation**

In `packages/server/src/routers/thought.ts`, add the collision enqueue after the auto-classify block (after line 187). Add the import at the top of the file.

Add this import near the top of the file (after the existing imports around line 29):

```typescript
import { enqueueThoughtCollision } from '../jobs/queues';
```

Then after the auto-classify block (after line 187, before `return thought;`), add:

```typescript
      // Enqueue collision detection (fire-and-forget)
      try {
        await enqueueThoughtCollision({ thoughtId: thought.id });
      } catch {
        // Non-critical — don't fail thought creation if queue is down
      }
```

- [ ] **Step 2: Verify the worker is registered**

Check that `createThoughtCollisionWorker()` is called in the worker entry point:

Run: `grep -n "createThoughtCollisionWorker" packages/server/src/worker.ts`

Expected: A line like `createThoughtCollisionWorker();` confirming the worker is instantiated.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routers/thought.ts
git commit -m "feat: wire collision detection trigger on thought creation"
```

---

## Task 2: Add schema fields for resurfacing

**Files:**
- Modify: `packages/server/src/db/schema.ts:319-334`
- Modify: `packages/shared/src/validators/index.ts`

Add `dismissStreak`, `resurfaceExcluded` fields and a composite index for efficient resurfacing queries. Also rename `reactCount` to `engageCount`.

- [ ] **Step 1: Add fields and rename in schema.ts**

In `packages/server/src/db/schema.ts`, find the thoughts table definition. After `reactCount` (line 319) and before `collisionIds` (line 320), add the new fields. Also rename `reactCount` to `engageCount`.

Replace line 319:
```typescript
  reactCount: integer('react_count').default(0).notNull(),
```
with:
```typescript
  engageCount: integer('engage_count').default(0).notNull(),
  dismissStreak: integer('dismiss_streak').default(0).notNull(),
  resurfaceExcluded: boolean('resurface_excluded').default(false).notNull(),
```

- [ ] **Step 2: Add composite index for resurfacing queries**

In the same table's index array (after line 334), add:

```typescript
  index('Thought_resurface_idx').using('btree', table.userId.asc(), table.resurfaceExcluded.asc(), table.nextSurfaceAt.asc().nullsLast()),
```

- [ ] **Step 3: Update any references to reactCount in the codebase**

Run: `grep -rn "reactCount\|react_count" packages/server/src/ packages/shared/src/`

For each reference found, rename `reactCount` to `engageCount`. The FRD incubation score formula uses `engageCount` to avoid confusion with the `reactions` jsonb field.

- [ ] **Step 4: Add validator for surface action**

In `packages/shared/src/validators/index.ts`, after the `createThoughtSchema` block (around line 537), add:

```typescript
export const surfaceActionSchema = z.enum(['dismiss', 'engage', 'cluster']);
export type SurfaceAction = z.infer<typeof surfaceActionSchema>;

export const recordSurfaceActionSchema = z.object({
  thoughtId: entityId,
  action: surfaceActionSchema,
});
export type RecordSurfaceActionInput = z.infer<typeof recordSurfaceActionSchema>;
```

- [ ] **Step 5: Generate migration**

Run: `cd packages/server && pnpm db:generate`

This generates a Drizzle migration for the new columns, rename, and index.

- [ ] **Step 6: Push schema to dev DB**

Run: `cd packages/server && pnpm db:push`

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/db/schema.ts packages/shared/src/validators/index.ts
git add packages/server/drizzle/
git commit -m "feat: add dismissStreak, resurfaceExcluded fields and resurface index"
```

---

## Task 3: Add server endpoints — getResurfaceCandidates and recordSurfaceAction

**Files:**
- Modify: `packages/server/src/routers/thought.ts`
- Modify: `packages/shared/src/validators/index.ts` (already done in Task 2)

- [ ] **Step 1: Add the getResurfaceCandidates endpoint**

In `packages/server/src/routers/thought.ts`, before the closing `});` of the router (line 1107), add the new procedure. Add these imports at the top if not already present:

```typescript
import { sql, and, eq, isNull, or, lt, gt, desc, count } from 'drizzle-orm';
```

Add the procedure:

```typescript
  /**
   * Get top 3 thoughts eligible for resurfacing, scored by incubation formula.
   */
  getResurfaceCandidates: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 1. Fetch eligible thoughts (max 100)
      const eligible = await ctx.db
        .select()
        .from(thoughts)
        .where(
          and(
            eq(thoughts.userId, ctx.userId),
            eq(thoughts.isArchived, false),
            eq(thoughts.resurfaceExcluded, false),
            isNull(thoughts.promotedProjectId),
            lt(thoughts.createdAt, oneDayAgo),
            or(
              isNull(thoughts.nextSurfaceAt),
              lt(thoughts.nextSurfaceAt, now),
            ),
            or(
              isNull(thoughts.lastSurfacedAt),
              lt(thoughts.lastSurfacedAt, oneHourAgo),
            ),
          ),
        )
        .orderBy(desc(thoughts.updatedAt))
        .limit(100);

      if (eligible.length === 0) {
        return { candidates: [] };
      }

      const eligibleIds = eligible.map((t) => t.id);

      // 2. Fetch connection counts per thought
      const connectionCounts = await ctx.db
        .select({
          thoughtId: thoughtConnections.thoughtAId,
          count: count(),
        })
        .from(thoughtConnections)
        .where(
          or(
            sql`${thoughtConnections.thoughtAId} = ANY(${eligibleIds})`,
            sql`${thoughtConnections.thoughtBId} = ANY(${eligibleIds})`,
          ),
        )
        .groupBy(thoughtConnections.thoughtAId);

      // Also count as thoughtB
      const connectionCountsB = await ctx.db
        .select({
          thoughtId: thoughtConnections.thoughtBId,
          count: count(),
        })
        .from(thoughtConnections)
        .where(
          sql`${thoughtConnections.thoughtBId} = ANY(${eligibleIds})`,
        )
        .groupBy(thoughtConnections.thoughtBId);

      // Merge counts
      const countMap = new Map<string, number>();
      for (const c of connectionCounts) {
        if (eligibleIds.includes(c.thoughtId)) {
          countMap.set(c.thoughtId, (countMap.get(c.thoughtId) ?? 0) + Number(c.count));
        }
      }
      for (const c of connectionCountsB) {
        countMap.set(c.thoughtId, (countMap.get(c.thoughtId) ?? 0) + Number(c.count));
      }

      const maxConnections = Math.max(...Array.from(countMap.values()), 1);

      // 3. Check type diversity — find thoughts connected to different types
      const diverseThoughtIds = new Set<string>();
      if (eligibleIds.length > 0) {
        const connections = await ctx.db
          .select({
            aId: thoughtConnections.thoughtAId,
            bId: thoughtConnections.thoughtBId,
          })
          .from(thoughtConnections)
          .where(
            or(
              sql`${thoughtConnections.thoughtAId} = ANY(${eligibleIds})`,
              sql`${thoughtConnections.thoughtBId} = ANY(${eligibleIds})`,
            ),
          );

        // Build a map of thoughtId -> connected thoughtIds
        const connectedMap = new Map<string, Set<string>>();
        for (const c of connections) {
          if (eligibleIds.includes(c.aId)) {
            if (!connectedMap.has(c.aId)) connectedMap.set(c.aId, new Set());
            connectedMap.get(c.aId)!.add(c.bId);
          }
          if (eligibleIds.includes(c.bId)) {
            if (!connectedMap.has(c.bId)) connectedMap.set(c.bId, new Set());
            connectedMap.get(c.bId)!.add(c.aId);
          }
        }

        // Build type lookup from eligible + connected thoughts
        const allConnectedIds = new Set<string>();
        for (const ids of connectedMap.values()) {
          for (const id of ids) allConnectedIds.add(id);
        }
        const externalIds = Array.from(allConnectedIds).filter((id) => !eligibleIds.includes(id));

        const typeMap = new Map<string, string>();
        for (const t of eligible) typeMap.set(t.id, t.thoughtType);

        if (externalIds.length > 0) {
          const externals = await ctx.db
            .select({ id: thoughts.id, thoughtType: thoughts.thoughtType })
            .from(thoughts)
            .where(sql`${thoughts.id} = ANY(${externalIds})`);
          for (const e of externals) typeMap.set(e.id, e.thoughtType);
        }

        // Check diversity
        for (const [thoughtId, connIds] of connectedMap) {
          const myType = typeMap.get(thoughtId);
          for (const connId of connIds) {
            if (typeMap.get(connId) !== myType) {
              diverseThoughtIds.add(thoughtId);
              break;
            }
          }
        }
      }

      // 4. Score each thought
      const scored = eligible.map((t) => {
        const hoursSinceView = t.lastSurfacedAt
          ? (now.getTime() - t.lastSurfacedAt.getTime()) / 3600000
          : (now.getTime() - t.createdAt.getTime()) / 3600000;

        const recencyFactor = Math.exp(-0.5 * Math.pow((hoursSinceView - 48) / 24, 2));

        const connCount = countMap.get(t.id) ?? 0;
        const connectionDensity = connCount / maxConnections;

        let typeDiversityBonus = 0;
        if (connCount > 0) {
          typeDiversityBonus = diverseThoughtIds.has(t.id) ? 1.0 : 0.5;
        }

        const engagementSignal = (t.engageCount - t.dismissCount) / Math.max(t.surfaceCount, 1);

        const score =
          0.4 * recencyFactor +
          0.3 * connectionDensity +
          0.15 * typeDiversityBonus +
          0.15 * engagementSignal;

        return {
          id: t.id,
          content: t.content,
          thoughtType: t.thoughtType,
          maturityLevel: t.maturityLevel,
          thoughtNumber: t.thoughtNumber,
          createdAt: t.createdAt,
          score,
          daysSinceCapture: Math.floor((now.getTime() - t.createdAt.getTime()) / 86400000),
          connectionCount: connCount,
        };
      });

      // 5. Return top 3
      scored.sort((a, b) => b.score - a.score);
      return { candidates: scored.slice(0, 3) };
    }),
```

- [ ] **Step 2: Add the recordSurfaceAction endpoint**

Below the `getResurfaceCandidates` procedure, add:

```typescript
  /**
   * Record user action on a resurfaced thought (dismiss, engage, cluster).
   */
  recordSurfaceAction: protectedProcedure
    .input(recordSurfaceActionSchema)
    .mutation(async ({ ctx, input }) => {
      const thought = await ctx.db.query.thoughts.findFirst({
        where: and(eq(thoughts.id, input.thoughtId), eq(thoughts.userId, ctx.userId)),
        columns: {
          id: true,
          dismissStreak: true,
          resurfaceExcluded: true,
          surfaceCount: true,
          dismissCount: true,
          engageCount: true,
        },
      });

      if (!thought) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'THOUGHT_NOT_FOUND' });
      }

      // No-op if already excluded
      if (thought.resurfaceExcluded) {
        return { success: true, alreadyExcluded: true };
      }

      const now = new Date();
      const updates: Record<string, any> = {
        lastSurfacedAt: now,
        surfaceCount: thought.surfaceCount + 1,
      };

      if (input.action === 'dismiss') {
        const newStreak = thought.dismissStreak + 1;
        updates.dismissCount = thought.dismissCount + 1;
        updates.dismissStreak = newStreak;

        if (newStreak >= 4) {
          updates.resurfaceExcluded = true;
          updates.nextSurfaceAt = null;
        } else {
          const backoffDays = newStreak === 1 ? 3 : newStreak === 2 ? 7 : 14;
          updates.nextSurfaceAt = new Date(now.getTime() + backoffDays * 24 * 60 * 60 * 1000);
        }
      } else {
        // engage or cluster — positive engagement resets dismiss streak
        updates.engageCount = thought.engageCount + 1;
        updates.dismissStreak = 0;
      }

      await ctx.db
        .update(thoughts)
        .set(updates)
        .where(eq(thoughts.id, input.thoughtId));

      // Log event
      await ctx.db.insert(thoughtEvents).values({
        thoughtId: input.thoughtId,
        eventType: 'resurface_action',
        metadata: { action: input.action },
      });

      return {
        success: true,
        surfaceCount: updates.surfaceCount,
        dismissStreak: updates.dismissStreak ?? thought.dismissStreak,
        lastSurfacedAt: now,
      };
    }),
```

- [ ] **Step 3: Add the import for recordSurfaceActionSchema**

At the top of `thought.ts`, in the import from `@forge/shared`, add `recordSurfaceActionSchema`:

Find the import line that includes `createThoughtSchema` and add `recordSurfaceActionSchema` to it.

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`

Expected: No new errors in thought.ts or validators.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routers/thought.ts packages/shared/src/validators/index.ts
git commit -m "feat: add getResurfaceCandidates and recordSurfaceAction endpoints"
```

---

## Task 4: Build CollisionCard component and capture screen integration

**Files:**
- Create: `packages/mobile/src/components/thought/CollisionCard.tsx`
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx:327-342`

- [ ] **Step 1: Create CollisionCard component**

Create `packages/mobile/src/components/thought/CollisionCard.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

interface CollisionMatch {
  id: string;
  connectionType: string;
  strength: number;
  linkedThought: {
    id: string;
    content: string;
    thoughtType: string;
    createdAt: string;
  };
}

interface CollisionCardProps {
  connection: CollisionMatch;
  onViewTogether: () => void;
  onAddToCluster: () => void;
  onDismiss: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CollisionCard({ connection, onViewTogether, onAddToCluster, onDismiss }: CollisionCardProps) {
  const thought = connection.linkedThought;
  const preview = thought.content.length > 100
    ? thought.content.slice(0, 100) + '...'
    : thought.content;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} exiting={FadeOut.duration(200)}>
      <TouchableOpacity style={styles.card} onPress={onDismiss} activeOpacity={1}>
        <View style={styles.header}>
          <Zap size={14} color="#F59E0B" />
          <Text style={styles.headerText}>
            This connects to something from {formatRelativeDate(thought.createdAt)}
          </Text>
        </View>
        <Text style={styles.preview} numberOfLines={3}>
          {preview}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onViewTogether} activeOpacity={0.7}>
            <Text style={styles.actionText}>View Together</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onAddToCluster} activeOpacity={0.7}>
            <Text style={styles.actionText}>Add to Cluster</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1500',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F59E0B33',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  headerText: {
    color: '#F59E0B',
    fontSize: 13,
    ...fonts.text.medium,
    flex: 1,
  },
  preview: {
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    ...fonts.text.regular,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.foreground,
    fontSize: 13,
    ...fonts.text.medium,
  },
});
```

- [ ] **Step 2: Add the export to the thought components index**

In `packages/mobile/src/components/thought/index.ts`, add:

```typescript
export { CollisionCard } from './CollisionCard';
```

- [ ] **Step 3: Modify Capture screen — add polling state**

In `packages/mobile/src/app/(tabs)/capture.tsx`, add state variables near the other state declarations (around line 80):

```typescript
const [savedThoughtId, setSavedThoughtId] = useState<string | null>(null);
const [collisionMatch, setCollisionMatch] = useState<any | null>(null);
const [isPollingCollisions, setIsPollingCollisions] = useState(false);
const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
const pollCountRef = useRef(0);
```

Add the import for `CollisionCard` and `ClusterPicker` at the top:

```typescript
import { CollisionCard } from '../../components/thought/CollisionCard';
import { ClusterPicker } from '../../components/ClusterPicker';
```

- [ ] **Step 4: Modify Capture screen — replace immediate navigation with polling**

Replace the `createThought` mutation's `onSuccess` callback (lines 327-337):

```typescript
  const createThought = trpc.thought.create.useMutation({
    onSuccess: (newThought) => {
      triggerHaptic('success');
      utils.thought.list.invalidate();
      setIdeaText('');
      finalizedText.current = '';
      setAttachments([]);
      setAiConsent(false);
      setSelectedType(null);

      // Start collision polling instead of immediate navigation
      setSavedThoughtId(newThought.id);
      setIsPollingCollisions(true);
      pollCountRef.current = 0;
    },
    onError: () => {
      triggerHaptic('error');
      showToast({ message: 'Failed to create thought', type: 'error' });
    },
  });
```

- [ ] **Step 5: Add polling effect and navigation helpers**

Add this effect and helper functions after the mutation declarations:

```typescript
  const navigateToThought = useCallback((thoughtId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPollingCollisions(false);
    setSavedThoughtId(null);
    setCollisionMatch(null);
    router.push(`/(tabs)/thoughts/${thoughtId}` as any);
  }, [router]);

  const [showCollisionClusterPicker, setShowCollisionClusterPicker] = useState(false);

  // Poll for collision connections after thought creation
  useEffect(() => {
    if (!isPollingCollisions || !savedThoughtId) return;

    const poll = async () => {
      pollCountRef.current += 1;
      try {
        const connections = await utils.thought.listConnections.fetch({ id: savedThoughtId });
        if (connections && connections.length > 0) {
          // Found a collision — show the highest-strength match
          const best = connections.reduce((a, b) => (a.strength > b.strength ? a : b));
          setCollisionMatch(best);
          setIsPollingCollisions(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
          return;
        }
      } catch {
        // Ignore fetch errors during polling
      }

      // Stop after 6 attempts (30s)
      if (pollCountRef.current >= 6) {
        setIsPollingCollisions(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
        navigateToThought(savedThoughtId);
      }
    };

    pollingRef.current = setInterval(poll, 5000);
    // Run first poll immediately
    poll();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isPollingCollisions, savedThoughtId, utils, navigateToThought]);

  // Clean up polling on unmount or background
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);
```

- [ ] **Step 6: Add CollisionCard UI to the render**

In the Capture screen's return JSX, add the collision card and cluster picker. Find an appropriate place after the "Thought saved" state — render the CollisionCard when `savedThoughtId` is set and `collisionMatch` is found. Add this conditionally rendered block (the exact insertion point depends on the current render structure — place it after the main capture input area):

```tsx
{/* Post-save collision detection */}
{savedThoughtId && !collisionMatch && isPollingCollisions && (
  <Animated.View entering={FadeIn} style={{ alignItems: 'center', paddingTop: 20 }}>
    <Text style={{ color: colors.muted, fontSize: 14, ...fonts.text.regular }}>
      Thought saved. Checking for connections...
    </Text>
  </Animated.View>
)}

{savedThoughtId && collisionMatch && (
  <CollisionCard
    connection={collisionMatch}
    onViewTogether={() => navigateToThought(savedThoughtId)}
    onAddToCluster={() => setShowCollisionClusterPicker(true)}
    onDismiss={() => navigateToThought(savedThoughtId)}
  />
)}

{savedThoughtId && (
  <ClusterPicker
    visible={showCollisionClusterPicker}
    onClose={() => setShowCollisionClusterPicker(false)}
    onSelect={(clusterId) => {
      setShowCollisionClusterPicker(false);
      // Add to cluster then navigate
      utils.client.thought.addToCluster.mutate({ thoughtId: savedThoughtId, clusterId })
        .then(() => navigateToThought(savedThoughtId))
        .catch(() => navigateToThought(savedThoughtId));
    }}
  />
)}
```

- [ ] **Step 7: Test manually**

1. Start the dev server: `pnpm dev`
2. Start the worker: `pnpm --filter @forge/server worker`
3. In the mobile app, capture a new thought with content similar to an existing thought
4. Verify: "Checking for connections..." appears briefly, then either a CollisionCard shows (if match found) or navigates to thought detail (if no match after 30s)

- [ ] **Step 8: Commit**

```bash
git add packages/mobile/src/components/thought/CollisionCard.tsx
git add packages/mobile/src/components/thought/index.ts
git add packages/mobile/src/app/\(tabs\)/capture.tsx
git commit -m "feat: add collision inline card on capture screen with polling"
```

---

## Task 5: Build RevisitSection component and integrate into Stream

**Files:**
- Create: `packages/mobile/src/components/thought/RevisitSection.tsx`
- Modify: `packages/mobile/src/app/(tabs)/thoughts/index.tsx:456-777`
- Modify: `packages/mobile/src/components/thought/index.ts`

- [ ] **Step 1: Create RevisitSection component**

Create `packages/mobile/src/components/thought/RevisitSection.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { RotateCcw, MessageSquarePlus, FolderPlus, X } from 'lucide-react-native';
import { triggerHaptic } from '../ui/Button';
import { colors, fonts } from '../../lib/theme';

interface ResurfaceCandidate {
  id: string;
  content: string;
  thoughtType: string;
  maturityLevel: string;
  thoughtNumber: number;
  createdAt: Date | string;
  score: number;
  daysSinceCapture: number;
  connectionCount: number;
}

interface RevisitSectionProps {
  candidates: ResurfaceCandidate[];
  onDismiss: (thoughtId: string) => void;
  onEngage: (thoughtId: string) => void;
  onCluster: (thoughtId: string) => void;
}

const THOUGHT_TYPE_LABELS: Record<string, string> = {
  problem: 'Problem',
  solution: 'Solution',
  what_if: 'What If',
  observation: 'Observation',
  question: 'Question',
};

const MATURITY_CONFIG: Record<string, { color: string; style: 'hollow' | 'half' | 'filled' | 'ring' }> = {
  spark: { color: '#6B7280', style: 'hollow' },
  developing: { color: '#3B82F6', style: 'half' },
  hypothesis: { color: '#F59E0B', style: 'filled' },
  conviction: { color: '#10B981', style: 'ring' },
};

function MaturityDot({ level }: { level: string }) {
  const c = MATURITY_CONFIG[level] || MATURITY_CONFIG.spark;
  if (c.style === 'hollow') {
    return <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: c.color }} />;
  }
  if (c.style === 'half') {
    return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color, opacity: 0.5 }} />;
  }
  if (c.style === 'ring') {
    return (
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
      </View>
    );
  }
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />;
}

function RevisitCard({
  candidate,
  onDismiss,
  onEngage,
  onCluster,
}: {
  candidate: ResurfaceCandidate;
  onDismiss: () => void;
  onEngage: () => void;
  onCluster: () => void;
}) {
  const preview = candidate.content.length > 80
    ? candidate.content.slice(0, 80) + '...'
    : candidate.content;

  return (
    <Animated.View exiting={FadeOut.duration(200)} style={styles.card}>
      <View style={styles.cardMeta}>
        <MaturityDot level={candidate.maturityLevel} />
        <Text style={styles.typeChip}>
          {THOUGHT_TYPE_LABELS[candidate.thoughtType] || candidate.thoughtType}
        </Text>
      </View>

      <Text style={styles.cardContent} numberOfLines={2}>
        {preview}
      </Text>

      <Text style={styles.cardTime}>
        {candidate.daysSinceCapture === 1 ? '1 day ago' : `${candidate.daysSinceCapture} days ago`}
      </Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { triggerHaptic('light'); onDismiss(); }}
          activeOpacity={0.7}
        >
          <X size={14} color={colors.muted} />
          <Text style={styles.actionLabel}>Dismiss</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { triggerHaptic('light'); onEngage(); }}
          activeOpacity={0.7}
        >
          <MessageSquarePlus size={14} color={colors.brand} />
          <Text style={[styles.actionLabel, { color: colors.brand }]}>Engage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { triggerHaptic('light'); onCluster(); }}
          activeOpacity={0.7}
        >
          <FolderPlus size={14} color="#14B8A6" />
          <Text style={[styles.actionLabel, { color: '#14B8A6' }]}>Cluster</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function RevisitSection({ candidates, onDismiss, onEngage, onCluster }: RevisitSectionProps) {
  if (candidates.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <RotateCcw size={14} color={colors.muted} />
        <Text style={styles.sectionTitle}>Revisit</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {candidates.map((candidate) => (
          <RevisitCard
            key={candidate.id}
            candidate={candidate}
            onDismiss={() => onDismiss(candidate.id)}
            onEngage={() => onEngage(candidate.id)}
            onCluster={() => onCluster(candidate.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    ...fonts.display.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 16,
  },
  card: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  typeChip: {
    color: colors.muted,
    fontSize: 11,
    ...fonts.text.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardContent: {
    color: colors.foreground,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
    ...fonts.text.regular,
  },
  cardTime: {
    color: colors.mutedDim,
    fontSize: 11,
    marginBottom: 10,
    ...fonts.text.regular,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionLabel: {
    color: colors.muted,
    fontSize: 11,
    ...fonts.text.medium,
  },
});
```

- [ ] **Step 2: Export RevisitSection from index**

In `packages/mobile/src/components/thought/index.ts`, add:

```typescript
export { RevisitSection } from './RevisitSection';
```

- [ ] **Step 3: Integrate RevisitSection into Stream view**

In `packages/mobile/src/app/(tabs)/thoughts/index.tsx`, add imports at the top:

```typescript
import { RevisitSection } from '../../../components/thought/RevisitSection';
import { ClusterPicker } from '../../../components/ClusterPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

- [ ] **Step 4: Add resurfacing state and data fetching**

Inside `ThoughtsScreen` function (after the existing state declarations around line 470), add:

```typescript
  // ── Resurfacing state ──
  const [resurfaceCandidates, setResurfaceCandidates] = useState<any[]>([]);
  const [revisitClusterTarget, setRevisitClusterTarget] = useState<string | null>(null);

  const recordSurfaceAction = trpc.thought.recordSurfaceAction.useMutation();

  // Fetch resurface candidates (debounced to 1hr via AsyncStorage)
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const lastFetch = await AsyncStorage.getItem('lastResurfaceFetch');
        const now = Date.now();
        if (lastFetch && now - parseInt(lastFetch, 10) < 3600000) {
          // Within 1hr debounce — use cached data if available
          const cached = await AsyncStorage.getItem('resurfaceCandidates');
          if (cached) {
            setResurfaceCandidates(JSON.parse(cached));
            return;
          }
        }

        const result = await utils.thought.getResurfaceCandidates.fetch();
        setResurfaceCandidates(result.candidates);
        await AsyncStorage.setItem('lastResurfaceFetch', now.toString());
        await AsyncStorage.setItem('resurfaceCandidates', JSON.stringify(result.candidates));
      } catch {
        // Silently fail — Revisit section just won't show
      }
    };

    fetchCandidates();
  }, [utils]);
```

- [ ] **Step 5: Add Revisit action handlers**

Below the resurfacing state, add:

```typescript
  const handleRevisitDismiss = useCallback((thoughtId: string) => {
    // Optimistic removal
    setResurfaceCandidates((prev) => prev.filter((c) => c.id !== thoughtId));
    recordSurfaceAction.mutate({ thoughtId, action: 'dismiss' });
  }, [recordSurfaceAction]);

  const handleRevisitEngage = useCallback((thoughtId: string) => {
    setResurfaceCandidates((prev) => prev.filter((c) => c.id !== thoughtId));
    recordSurfaceAction.mutate({ thoughtId, action: 'engage' });
    router.push({ pathname: '/(tabs)/capture', params: { linkedThoughtId: thoughtId } } as any);
  }, [recordSurfaceAction, router]);

  const handleRevisitCluster = useCallback((thoughtId: string) => {
    setRevisitClusterTarget(thoughtId);
  }, []);

  const handleRevisitClusterSelect = useCallback((clusterId: string) => {
    if (!revisitClusterTarget) return;
    setResurfaceCandidates((prev) => prev.filter((c) => c.id !== revisitClusterTarget));
    // Add to cluster
    trpc.useUtils().client.thought.addToCluster.mutate({
      thoughtId: revisitClusterTarget,
      clusterId,
    }).catch(() => {});
    recordSurfaceAction.mutate({ thoughtId: revisitClusterTarget, action: 'cluster' });
    setRevisitClusterTarget(null);
  }, [revisitClusterTarget, recordSurfaceAction]);
```

- [ ] **Step 6: Add RevisitSection as ListHeaderComponent**

In the Stream FlatList (around line 760-776), add `ListHeaderComponent`:

Replace:
```tsx
        <FlatList
          data={notes ?? []}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderStreamEmpty}
```

With:
```tsx
        <FlatList
          data={notes ?? []}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            activeView === 'stream' && resurfaceCandidates.length > 0 ? (
              <RevisitSection
                candidates={resurfaceCandidates}
                onDismiss={handleRevisitDismiss}
                onEngage={handleRevisitEngage}
                onCluster={handleRevisitCluster}
              />
            ) : null
          }
          ListEmptyComponent={renderStreamEmpty}
```

- [ ] **Step 7: Add ClusterPicker for Revisit**

At the bottom of the component's JSX (before the final closing `</View>`), add:

```tsx
      {/* Cluster picker for Revisit section */}
      <ClusterPicker
        visible={!!revisitClusterTarget}
        onClose={() => setRevisitClusterTarget(null)}
        onSelect={handleRevisitClusterSelect}
      />
```

- [ ] **Step 8: Test manually**

1. Ensure you have thoughts older than 24 hours in the database
2. Open the app, go to Thoughts tab (Stream view)
3. Verify: Revisit section appears at top with 1-3 cards
4. Test Dismiss: card animates out
5. Test Cluster: ClusterPicker opens, card removed after selection
6. Test Engage: navigates to Capture screen

- [ ] **Step 9: Commit**

```bash
git add packages/mobile/src/components/thought/RevisitSection.tsx
git add packages/mobile/src/components/thought/index.ts
git add packages/mobile/src/app/\(tabs\)/thoughts/index.tsx
git commit -m "feat: add Revisit section to Stream view with resurface candidates"
```

---

## Task 6: Wire Engage -> Capture with linkedThoughtId

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx`

- [ ] **Step 1: Read linkedThoughtId from route params**

In the CaptureScreen component, add the route param reading. Near the top of the component (after `const router = useRouter();`), add:

```typescript
import { useLocalSearchParams } from 'expo-router';
```

(If already imported, just ensure `useLocalSearchParams` is included.)

Inside the component:

```typescript
  const { linkedThoughtId } = useLocalSearchParams<{ linkedThoughtId?: string }>();
```

- [ ] **Step 2: Fetch the linked thought for display**

Add a query to show the linked thought reference:

```typescript
  const { data: linkedThought } = trpc.thought.get.useQuery(
    { id: linkedThoughtId! },
    { enabled: !!linkedThoughtId },
  );
```

- [ ] **Step 3: Auto-link after thought creation**

In the `createThought` mutation's `onSuccess` callback, after the existing logic and before starting collision polling, add the auto-link call:

```typescript
      // Auto-link if this was triggered from Revisit "Engage"
      if (linkedThoughtId) {
        try {
          await utils.client.thought.linkThought.mutate({
            thoughtId: newThought.id,
            targetThoughtId: linkedThoughtId,
          });
        } catch {
          // Non-critical — thought was still created
        }
      }
```

Note: Change the `onSuccess` to be `async` to support the await.

- [ ] **Step 4: Show linked thought reference card above input**

In the Capture screen JSX, above the text input area, add a reference card when `linkedThought` is available:

```tsx
{linkedThought && (
  <View style={{
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  }}>
    <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4, ...fonts.text.medium }}>
      Responding to:
    </Text>
    <Text style={{ color: colors.foreground, fontSize: 13, ...fonts.text.regular }} numberOfLines={2}>
      {linkedThought.content?.slice(0, 100)}
    </Text>
  </View>
)}
```

- [ ] **Step 5: Test the full Engage flow**

1. Open app, go to Stream view
2. Tap "Engage" on a Revisit card
3. Verify: Capture screen opens with the linked thought's content shown as a reference
4. Type a new thought and save
5. Verify: The new thought is linked to the original via a `user_linked` connection
6. Verify: The connection appears in both thoughts' ConnectionsSections

- [ ] **Step 6: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/capture.tsx
git commit -m "feat: wire Engage action from Revisit to Capture with auto-linking"
```

---

## Task 7: Update AsyncStorage cache on Revisit actions

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/thoughts/index.tsx`

When candidates are dismissed/engaged/clustered, the cached candidates in AsyncStorage should be updated so navigating away and back doesn't re-show removed cards.

- [ ] **Step 1: Update cache after candidate removal**

Modify the `handleRevisitDismiss`, `handleRevisitEngage`, and `handleRevisitCluster` callbacks to also update the AsyncStorage cache. Add a shared helper:

```typescript
  const removeCandidateFromCache = useCallback(async (thoughtId: string) => {
    try {
      const cached = await AsyncStorage.getItem('resurfaceCandidates');
      if (cached) {
        const updated = JSON.parse(cached).filter((c: any) => c.id !== thoughtId);
        await AsyncStorage.setItem('resurfaceCandidates', JSON.stringify(updated));
      }
    } catch {
      // Non-critical
    }
  }, []);
```

Then call `removeCandidateFromCache(thoughtId)` inside each handler alongside the optimistic state removal.

- [ ] **Step 2: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/thoughts/index.tsx
git commit -m "fix: sync AsyncStorage cache when Revisit candidates are actioned"
```
