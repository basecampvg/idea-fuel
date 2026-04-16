# Build Plan: Thought Detail View Redesign
**Created:** 2026-04-15
**Spec:** ThoughtDetailView_PropertySystem_Spec.md (in conversation context)
**Status:** Draft
**Project type:** Existing codebase

## Overview

Replace the current note editor view (`packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`) with a Linear-inspired thought detail view. The current view is a markdown editor with an IdeaCard overlay and pin/delete header. The new view is a scrollable detail page with: thought ID, raw content (editable), property chip bar, source label, collapsible AI refinement, connections panel, activity log, and comment thread.

All server procedures already exist in `packages/server/src/routers/thought.ts`: `updateProperties`, `addReaction`, `removeReaction`, `addComment`, `deleteComment`, `listEvents`, `refine`, `addToCluster`, `removeFromCluster`.

## Component Inventory

### Existing (reuse)
| Component | Path | Usage |
|-----------|------|-------|
| BottomSheet | `components/ui/BottomSheet.tsx` | Property pickers |
| Badge | `components/ui/Badge.tsx` | Connection type badges |
| ClusterPicker | `components/ClusterPicker.tsx` | Cluster property chip |
| MarkdownEditor | `components/editor/MarkdownEditor.tsx` | Content editing (keep) |
| ThumbnailStrip | `components/ThumbnailStrip.tsx` | Attachments (keep) |
| ThoughtTypeChips | `components/ThoughtTypeChips.tsx` | Type colors reference |
| CollapsibleSection | `components/ui/CollapsibleSection.tsx` | Collapsible sections |

### New Components to Create
| Component | Path | Responsibility |
|-----------|------|----------------|
| PropertyChipBar | `components/thought/PropertyChipBar.tsx` | Horizontal chip row: Maturity, Type, Confidence, Cluster, + button |
| MaturityPicker | `components/thought/MaturityPicker.tsx` | Bottom sheet: 4 maturity levels with icons/colors |
| TypePicker | `components/thought/TypePicker.tsx` | Bottom sheet: 5 thought types with icons/colors |
| ConfidencePicker | `components/thought/ConfidencePicker.tsx` | Bottom sheet: 3 confidence levels |
| SourceLabel | `components/thought/SourceLabel.tsx` | Single-line capture method + date |
| AIRefinementSection | `components/thought/AIRefinementSection.tsx` | Collapsible refinement display + trigger CTA |
| ConnectionsSection | `components/thought/ConnectionsSection.tsx` | List of ThoughtConnections with type badges |
| ReactionsRow | `components/thought/ReactionsRow.tsx` | Emoji reactions with counts + add button |
| ActivityLog | `components/thought/ActivityLog.tsx` | Chronological ThoughtEvent timeline |
| CommentThread | `components/thought/CommentThread.tsx` | Comment list + fixed input at bottom |
| OverflowMenu | `components/thought/OverflowMenu.tsx` | ... menu with 7 actions |

### Modified Files
| File | Changes |
|------|---------|
| `app/(tabs)/notes/[id]/index.tsx` | Complete rewrite — new layout with all sections |

## Integration Contracts

### PropertyChipBar → Server
```
PropertyChipBar → thought.updateProperties
  What flows:     { id, maturityLevel?, thoughtType?, confidenceLevel?, maturityNotes? }
  How:            tRPC mutation, immediate save on selection
  Error:          Toast "Failed to update", revert chip state
```

### ReactionsRow → Server
```
ReactionsRow → thought.addReaction / thought.removeReaction
  What flows:     { thoughtId, emoji }
  How:            tRPC mutation on tap (add) / long-press (remove)
  Error:          Toast, revert count
```

### CommentThread → Server
```
CommentThread → thought.addComment / thought.deleteComment
  What flows:     { thoughtId, content } / { commentId }
  How:            tRPC mutation
  Error:          Toast
```

### ActivityLog → Server
```
ActivityLog → thought.listEvents
  What flows:     { thoughtId, limit, cursor? }
  How:            tRPC query with cursor pagination
```

### AIRefinementSection → Server
```
AIRefinementSection → thought.refine
  What flows:     { id }
  How:            tRPC mutation (existing)
  Loading:        Shimmer/skeleton state
```

### ConnectionsSection → Server
```
NOTE: No `thought.listConnections` procedure exists yet.
For MVP: derive connections from the `thoughtConnections` table.
Need to add a `thought.listConnections` query to the thought router.
```

## Issues Found

1. **Missing server procedure: `thought.listConnections`** — The thought router has no procedure to fetch connections for a thought. Need to add one that queries `thoughtConnections` where `thoughtAId = id OR thoughtBId = id`.

2. **Missing server procedure: `thought.duplicate`** — The overflow menu needs a Duplicate action. Need to add a `thought.duplicate` procedure that copies a thought with Spark maturity.

3. **`thought.get` needs to return more data** — Currently returns thought + attachments. Needs to also return: comments (via relation), event count, connection count. Or we fetch those separately.

4. **`note.sandboxId` reference in current detail view (line 465)** — The current code checks `note?.sandboxId` but the new schema uses `clusterId`. Already handled by alias but should use `clusterId` explicitly.

## Approach: Separate queries vs. eager loading

For MVP, use separate tRPC queries for each section rather than loading everything in `thought.get`. This keeps each section independently cacheable and avoids a massive initial payload:
- `thought.get` — thought + attachments (existing)
- `thought.listEvents` — activity log (existing)
- `thought.listConnections` — connections (NEW, needs server procedure)
- Comments: add to `thought.get` via Drizzle `with: { comments: true }` (simple)

## Build Order

### Phase 1: Server additions + foundation components
**Files:** Server router additions, new component stubs
1. Add `thought.listConnections` procedure to thought router
2. Add `thought.duplicate` procedure to thought router
3. Update `thought.get` to include comments via relation
4. Create `components/thought/` directory with all component files
5. Create PropertyChipBar, MaturityPicker, TypePicker, ConfidencePicker
6. Create SourceLabel
7. Verify: type-check server

### Phase 2: Detail view sections
**Files:** AIRefinementSection, ConnectionsSection, ReactionsRow, ActivityLog
1. Create AIRefinementSection (collapsible, refine CTA, display refined content)
2. Create ConnectionsSection (list connections, type badges, + Add)
3. Create ReactionsRow (5 emojis, tap to add, long-press to remove)
4. Create ActivityLog (paginated events, collapsed by default, show last 2)

### Phase 3: Comment thread + overflow menu
**Files:** CommentThread, OverflowMenu
1. Create CommentThread (fixed input at bottom, chronological list, swipe-to-delete)
2. Create OverflowMenu (7 actions: Refine, Add to Cluster, Duplicate, Archive, Copy, Share, Delete)

### Phase 4: Detail view rewrite
**Files:** `app/(tabs)/notes/[id]/index.tsx`
1. Rewrite the detail view to compose all sections in the spec's layout order:
   - Header (back, save indicator, overflow menu)
   - Thought ID (`T-{thoughtNumber}`)
   - Raw content (MarkdownEditor, kept)
   - PropertyChipBar
   - SourceLabel
   - AIRefinementSection
   - Attachments (ThumbnailStrip, kept)
   - ConnectionsSection
   - ReactionsRow
   - ActivityLog
   - CommentThread (fixed at bottom)
2. Remove old IdeaCard overlay, pin/unpin header buttons, image picker dropdown
3. Wire all tRPC mutations and queries
4. Verify in simulator

### Phase 5: Polish + verify
1. Type-check mobile
2. Test all interactions in simulator
3. Commit

## Wiring Checklist

### Phase 1
- [ ] `thought.listConnections` procedure added and type-checks
- [ ] `thought.duplicate` procedure added and type-checks
- [ ] `thought.get` returns comments
- [ ] PropertyChipBar renders chips, opens bottom sheet pickers
- [ ] MaturityPicker calls `thought.updateProperties` on selection
- [ ] TypePicker calls `thought.updateProperties` on selection
- [ ] ConfidencePicker calls `thought.updateProperties` on selection
- [ ] Cluster chip opens ClusterPicker, calls `thought.addToCluster`
- [ ] SourceLabel renders capture method icon + date

### Phase 2
- [ ] AIRefinementSection shows "Refine with AI" CTA when not refined
- [ ] AIRefinementSection shows collapsible refined content when refined
- [ ] AIRefinementSection calls `thought.refine` on CTA tap
- [ ] ConnectionsSection calls `thought.listConnections` and renders cards
- [ ] ConnectionsSection shows connection type badges
- [ ] ReactionsRow calls `thought.addReaction` on tap
- [ ] ReactionsRow calls `thought.removeReaction` on long-press
- [ ] ActivityLog calls `thought.listEvents` with pagination
- [ ] ActivityLog shows last 2 events collapsed, expandable

### Phase 3
- [ ] CommentThread displays comments from `thought.get` response
- [ ] CommentThread input calls `thought.addComment`
- [ ] CommentThread swipe-to-delete calls `thought.deleteComment`
- [ ] OverflowMenu Refine triggers AI refinement
- [ ] OverflowMenu Add to Cluster opens ClusterPicker
- [ ] OverflowMenu Duplicate calls `thought.duplicate`
- [ ] OverflowMenu Archive calls `thought.update` with `isArchived: true`
- [ ] OverflowMenu Copy copies content to clipboard
- [ ] OverflowMenu Share opens system share sheet
- [ ] OverflowMenu Delete shows confirm dialog, calls `thought.delete`

### Phase 4
- [ ] Detail view renders all sections in correct order
- [ ] ScrollView wraps all sections, CommentThread input fixed at bottom
- [ ] KeyboardAvoidingView works with comment input
- [ ] Back navigation works (including from cluster context)
- [ ] Auto-save still works for content edits
- [ ] All tRPC invalidations fire correctly after mutations
