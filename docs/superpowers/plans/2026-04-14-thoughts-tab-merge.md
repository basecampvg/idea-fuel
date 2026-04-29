# Thoughts Tab Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the separate Notes and Sandbox tabs into a unified "Thoughts" tab with Stream/Clusters toggle, preserving all existing functionality.

**Architecture:** Create a new `thoughts/` route group under `(tabs)/` that combines the Notes list (Stream view) and Sandbox list (Clusters view) via a segmented control. Note detail and cluster detail screens live under the thoughts stack. Old notes/sandbox tabs are hidden but their route files remain temporarily for backwards compatibility until all references are migrated.

**Tech Stack:** Expo Router, React Native, NativeWind, Reanimated, Gesture Handler, tRPC, lucide-react-native

**FRD Reference:** `/Users/mattjones/Documents/IdeaFuel/ThoughtCapture_IdeationFlow_FRD_v2.md` Section 2 (Structural Changes)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/(tabs)/thoughts/_layout.tsx` | Stack navigator for thoughts tab (index, [id], cluster/[id]) |
| Create | `src/app/(tabs)/thoughts/index.tsx` | Merged screen: Stream view (notes list) + Clusters view (sandbox list) with segmented toggle |
| Create | `src/app/(tabs)/thoughts/[id]/index.tsx` | Thought detail - re-exports note editor from old path (temporary bridge) |
| Create | `src/app/(tabs)/thoughts/cluster/[id]/index.tsx` | Cluster detail - re-exports sandbox detail from old path (temporary bridge) |
| Modify | `src/app/(tabs)/_layout.tsx` | Add thoughts tab, hide notes/sandbox tabs, update icon mapping |
| Modify | `src/app/(tabs)/capture.tsx:329` | Change note creation navigation from `/(tabs)/notes/` to `/(tabs)/thoughts/` |
| Modify | `src/app/(tabs)/sandbox/[id]/index.tsx:109,178` | Change navigation from `/(tabs)/notes/` to `/(tabs)/thoughts/` |
| Modify | `src/app/(tabs)/notes/[id]/index.tsx:106,492` | Change sandbox back-navigation from `/(tabs)/sandbox/` to `/(tabs)/thoughts/cluster/` |

All paths relative to `packages/mobile/`.

---

### Task 1: Create thoughts stack layout

**Files:**
- Create: `src/app/(tabs)/thoughts/_layout.tsx`

- [ ] **Step 1: Create the Stack layout**

```tsx
import React from 'react';
import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../lib/theme';

export default function ThoughtsStackLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: colors.foreground },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
          ) : null,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="cluster/[id]/index" options={{ headerShown: false }} />
    </Stack>
  );
}
```

---

### Task 2: Create thought detail bridge

**Files:**
- Create: `src/app/(tabs)/thoughts/[id]/index.tsx`

This is a temporary bridge file that re-exports the existing note editor. The note editor uses `useLocalSearchParams` which reads `id` from the route, which works identically under `thoughts/[id]` as it does under `notes/[id]`.

- [ ] **Step 1: Create the bridge file**

```tsx
export { default } from '../../notes/[id]/index';
```

---

### Task 3: Create cluster detail bridge

**Files:**
- Create: `src/app/(tabs)/thoughts/cluster/[id]/index.tsx`

Same pattern - re-exports the existing sandbox detail screen.

- [ ] **Step 1: Create the bridge file**

```tsx
export { default } from '../../../sandbox/[id]/index';
```

---

### Task 4: Build the merged Thoughts screen

**Files:**
- Create: `src/app/(tabs)/thoughts/index.tsx`

This is the main UI work. Combines the notes list (Stream) and sandbox list (Clusters) into one screen with a segmented control toggle. Reuses the same card components, swipe gestures, animations, and data fetching patterns from the original screens.

Key design decisions:
- Stream/Clusters segmented control replaces the old All/Unpinned/Pinned filter
- Stream view renders SwipeableNoteCard (same as notes/index.tsx)
- Clusters view renders SwipeableClusterCard (renamed from SwipeableSandboxCard)
- FAB changes per view: new note (Stream) vs new cluster (Clusters)
- NoteTypePopover kept for now (Quick/AI split removed in a later task)
- CreateClusterModal (renamed from CreateSandboxModal) for Clusters view
- Navigation: note cards go to `/(tabs)/thoughts/[id]`, cluster cards go to `/(tabs)/thoughts/cluster/[id]`
- Uses new font tokens (`fonts.display.*`, `fonts.text.*`) since this is new code
- Header title: "Thoughts"

- [ ] **Step 1: Create the file with imports and utilities**

Write the full file at `src/app/(tabs)/thoughts/index.tsx`. The file combines:
- `formatRelativeTime` utility (shared by both views)
- `deriveTitle` and `getNoteMeta` (from notes/index.tsx)
- `SwipeableNoteCard` component (from notes/index.tsx, navigation updated to `/(tabs)/thoughts/[id]`)
- `SwipeableClusterCard` component (from sandbox/index.tsx, navigation updated to `/(tabs)/thoughts/cluster/[id]`)
- `CreateClusterModal` component (from sandbox/index.tsx, UI copy renamed from "Sandbox" to "Cluster")
- `ThoughtsScreen` main component with Stream/Clusters toggle
- Combined styles

The complete code is ~700 lines. Key structural notes:

**Segmented control** replaces the old filter:
```tsx
type ThoughtsView = 'stream' | 'clusters';
// ...
<View style={styles.segmentedControl}>
  {(['stream', 'clusters'] as ThoughtsView[]).map((v) => (
    <TouchableOpacity
      key={v}
      style={[styles.segment, view === v && styles.segmentActive]}
      onPress={() => setView(v)}
    >
      <Text style={[styles.segmentText, view === v && styles.segmentTextActive]}>
        {v === 'stream' ? 'Stream' : 'Clusters'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

**Conditional rendering** based on active view:
```tsx
{view === 'stream' ? (
  <FlatList data={notes} renderItem={renderNoteItem} ... />
) : (
  <FlatList data={sandboxes} renderItem={renderClusterItem} ... />
)}
```

**FAB changes per view:**
- Stream: Plus button opens NoteTypePopover
- Clusters: Plus button opens CreateClusterModal

**Navigation paths:**
- Note card press: `router.push('/(tabs)/thoughts/${item.id}')`
- Cluster card press: `router.push('/(tabs)/thoughts/cluster/${item.id}')`
- Note creation success: `router.push('/(tabs)/thoughts/${newNote.id}')`
- Cluster creation success: `router.push('/(tabs)/thoughts/cluster/${newSandbox.id}')`

- [ ] **Step 2: Verify the file compiles**

Run: `cd packages/mobile && npx tsc --noEmit 2>&1 | grep thoughts`
Expected: No errors from the thoughts directory

---

### Task 5: Update tab layout (5 tabs to 4 tabs)

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add Lightbulb import and update icon mapping**

Add `Lightbulb` to the lucide imports. Update the icon conditional in `CustomTabBar` to handle `thoughts` instead of `notes`:

```tsx
// Old:
import { Mic, Vault, NotebookPen, ArrowUpRight, X, FlaskConical, Pencil } from 'lucide-react-native';
// New:
import { Mic, Vault, Lightbulb, ArrowUpRight, X, Pencil } from 'lucide-react-native';
```

Update icon mapping in CustomTabBar:
```tsx
const icon = route.name === 'capture'
  ? <Mic size={22} color={color} />
  : route.name === 'vault'
  ? <Vault size={22} color={color} />
  : route.name === 'thoughts'
  ? <Lightbulb size={22} color={color} />
  : route.name === 'sketch'
  ? <Pencil size={22} color={color} />
  : null;
```

- [ ] **Step 2: Update Tabs.Screen entries**

Replace the notes and sandbox screens with the thoughts screen. Hide notes and sandbox with `href: null` so their routes remain navigable (needed for bridge files importing from them):

```tsx
<Tabs.Screen
  name="thoughts"
  options={{ title: 'Thoughts' }}
/>
<Tabs.Screen
  name="notes"
  options={{ title: 'Notes', href: null }}
/>
<Tabs.Screen
  name="sandbox"
  options={{ title: 'Sandbox', href: null }}
/>
<Tabs.Screen
  name="capture"
  options={{ ... }}
/>
<Tabs.Screen
  name="sketch"
  options={{ title: 'Sketch' }}
/>
<Tabs.Screen
  name="vault"
  options={{ title: 'Vault' }}
/>
```

Note: Tab order in the JSX determines display order. `thoughts` should be first (leftmost).

---

### Task 6: Update navigation references

**Files:**
- Modify: `src/app/(tabs)/capture.tsx:329`
- Modify: `src/app/(tabs)/sandbox/[id]/index.tsx:109,178`
- Modify: `src/app/(tabs)/notes/[id]/index.tsx:106,492`

- [ ] **Step 1: Update capture.tsx**

Change the note creation success navigation:
```tsx
// Old (line 329):
router.push(`/(tabs)/notes/${newNote.id}` as any);
// New:
router.push(`/(tabs)/thoughts/${newNote.id}` as any);
```

- [ ] **Step 2: Update sandbox detail navigation**

In `sandbox/[id]/index.tsx`, update note navigation to go through thoughts tab:
```tsx
// Old (line 109):
router.push(`/(tabs)/notes/${newNote.id}?fromSandbox=${id}` as any);
// New:
router.push(`/(tabs)/thoughts/${newNote.id}?fromCluster=${id}` as any);

// Old (line 178):
router.push(`/(tabs)/notes/${item.id}?fromSandbox=${id}` as any);
// New:
router.push(`/(tabs)/thoughts/${item.id}?fromCluster=${id}` as any);
```

- [ ] **Step 3: Update note detail back-navigation**

In `notes/[id]/index.tsx`, update the sandbox back-navigation to use the thoughts tab:
```tsx
// Old (line 68):
const { id, fromSandbox } = useLocalSearchParams<{ id: string; fromSandbox?: string }>();
// New:
const { id, fromSandbox, fromCluster } = useLocalSearchParams<{ id: string; fromSandbox?: string; fromCluster?: string }>();

// Old (line 104-106):
if (fromSandbox) {
  utils.sandbox.get.invalidate({ id: fromSandbox });
  router.navigate(`/(tabs)/sandbox/${fromSandbox}` as any);
}
// New:
const clusterId = fromCluster || fromSandbox;
if (clusterId) {
  utils.sandbox.get.invalidate({ id: clusterId });
  router.navigate(`/(tabs)/thoughts/cluster/${clusterId}` as any);
}

// Old (line 490-492) - same pattern in the header back button:
if (fromSandbox) {
  router.navigate(`/(tabs)/sandbox/${fromSandbox}` as any);
}
// New:
const backClusterId = fromCluster || fromSandbox;
if (backClusterId) {
  router.navigate(`/(tabs)/thoughts/cluster/${backClusterId}` as any);
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: merge Notes + Sandbox into unified Thoughts tab with Stream/Clusters toggle"
```

---

### Task 7: Type-check and verify

- [ ] **Step 1: Run type-check**

Run: `cd packages/mobile && npx tsc --noEmit 2>&1 | head -40`
Expected: No new errors related to thoughts/navigation changes

- [ ] **Step 2: Verify Expo Router picks up the new routes**

Run: `cd packages/mobile && npx expo start --clear` (briefly, to check for route errors)
Expected: No "unmatched route" errors

- [ ] **Step 3: Visual verification**

Open the app in simulator. Verify:
- 4 tabs visible: Thoughts, Capture, Sketch, Vault
- Thoughts tab shows Stream/Clusters toggle
- Stream view shows all notes as swipeable cards
- Clusters view shows all clusters with color dots
- Tapping a note card navigates to the note editor
- Tapping a cluster card navigates to the cluster detail with AI actions
- Creating a note from Capture navigates to the thoughts tab
- Back navigation from note detail and cluster detail works correctly

---

## Navigation Reference Summary

After this plan is complete, all navigation paths will be:

| From | To | Path |
|------|----|------|
| Thoughts Stream | Note detail | `/(tabs)/thoughts/[id]` |
| Thoughts Clusters | Cluster detail | `/(tabs)/thoughts/cluster/[id]` |
| Cluster detail | Note detail | `/(tabs)/thoughts/[id]?fromCluster=[clusterId]` |
| Note detail back | Cluster detail | `/(tabs)/thoughts/cluster/[clusterId]` |
| Capture | Note detail | `/(tabs)/thoughts/[id]` |
| Note promote | Vault | `/(tabs)/vault` |
