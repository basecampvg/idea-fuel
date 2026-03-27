# Phase 3 Handoff: Mobile Screens (UI)

**Feature:** Notes (Brain Dump + AI Refinement)
**Phase:** 3 of 3
**Status:** COMPLETE
**Built by:** Phase Builder
**Date:** 2026-03-27

## What Was Built

### 1. IdeaCard Component (`packages/mobile/src/components/ui/IdeaCard.tsx`)
- Displays AI-refined idea: title (`fonts.outfit.bold`), description (`fonts.outfit.regular`), tag chips row
- "Refine" button (outline variant) with spinner during loading, disabled when refining or promoted
- "Promote to Idea" button (primary variant) with loading state, disabled if no refinement
- Promoted state: shows "Promoted" badge (green), promote button becomes "Promoted" with CheckCircle icon (disabled)
- Stale indicator text ("Based on earlier content -- tap Refine to update") when `lastRefinedAt < updatedAt`
- `FadeIn.duration(300)` entering animation
- Exported from `components/ui/index.ts`

### 2. Notes Stack Layout (`packages/mobile/src/app/(tabs)/notes/_layout.tsx`)
- Mirrors vault `_layout.tsx` pattern exactly
- Stack with two screens: `index` (list) and `[id]/index` (editor)
- Both screens have `headerShown: false` (custom headers in each screen)
- Back button with ChevronLeft, matching vault navigation

### 3. Notes List Screen (`packages/mobile/src/app/(tabs)/notes/index.tsx`)
- FlatList with `trpc.note.list.useQuery()` (no input needed)
- Staggered `FadeInUp.delay(index * 80).springify()` animation per item
- Title derivation: `refinedTitle ?? first 50 chars + '...' ?? 'Untitled Note'`
- Content preview (2 lines via `numberOfLines={2}`)
- Badges: "Promoted" (success/green), "Refined" (primary/brand), none for raw notes
- Left icon: CheckCircle (promoted, green), NotebookPen (refined, brand), NotebookPen (raw, dim)
- "New Note" FAB (floating action button, bottom-right) when notes exist
- Long-press to delete with confirmation dialog
- Empty state: NotebookPen icon in circle + message + "New Note" CTA button
- Pull-to-refresh via RefreshControl
- `note.create` mutation: navigates to editor on success, invalidates list

### 4. Note Editor Screen (`packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`)
- Loads note via `trpc.note.get.useQuery({ id })`
- Auto-save via `useNoteAutoSave` hook (debounce 1.5s, max interval 30s)
- Auto-triggers `note.refine` at 50 chars (first time only, tracked via `hasAutoRefined` ref)
- IdeaCard rendered at top when refinement exists (with all props wired)
- "Based on earlier content" stale indicator via `lastRefinedAt < updatedAt` comparison
- Flush save on navigation away (`beforeRemove` listener)
- Save status indicator (Saving.../Saved/Failed) in header
- Delete button (Trash2 icon) in header with confirmation dialog
- `KeyboardAvoidingView` with offset 100 on iOS
- Refinement error state: tappable "Couldn't refine -- tap to retry" banner
- Refining loading state: brand-colored indicator with "AI is refining your idea..."
- ScrollView wrapping IdeaCard + TextInput for proper keyboard handling
- Auto-focus on new empty notes

### 5. useNoteAutoSave Hook (`packages/mobile/src/hooks/useNoteAutoSave.ts`)
- Adapted from `useAutoSave` but uses `trpc.note.update` instead of `trpc.project.update`
- Synchronous `getContent` (uses ref instead of async editor API)
- Same patterns: debounce timer, max interval timer, flush on background, error retry
- Invalidates `note.get` and `note.list` on successful save

### 6. Notes Tab Registration (`packages/mobile/src/app/(tabs)/_layout.tsx`)
- Added `NotebookPen` to lucide-react-native imports
- Added `notes` case to CustomTabBar icon mapping
- Added `<Tabs.Screen name="notes">` between Vault and Settings
- Added `tabPress` listener with `router.replace` (matching vault pattern for stack reset)

## Verification Results
- No TypeScript errors in any new files (all tsc errors are pre-existing in `_layout.tsx`)
- No TODO/FIXME markers in any new files
- Directory structure correct: `notes/_layout.tsx`, `notes/index.tsx`, `notes/[id]/index.tsx`
- Stack layout registers both screens (index + [id]/index)
- Notes tab appears in CustomTabBar with NotebookPen icon
- IdeaCard exported from `components/ui/index.ts`

## Deviations from Plan

### 1. Created `useNoteAutoSave` hook instead of reusing `useAutoSave`
**Reason:** The existing `useAutoSave` hook is tightly coupled to `trpc.project.update` -- it calls the mutation directly inside the hook. The hook's `field` parameter only controls which key in the `data` payload (`notes` or `title`), but the endpoint itself is hardcoded. Creating a note-specific variant was the cleanest path, as documented in the plan's Issue 2 resolution.

### 2. TextInput instead of MarkdownEditor for note content
**Reason:** The vault detail uses a custom `MarkdownEditor` component (with ref-based async content retrieval). For the brain dump feature, a simple `TextInput` with `multiline` is more appropriate -- notes are raw brain dumps, not formatted documents. This also simplifies the auto-save hook (synchronous `getContent` via ref rather than async editor API).

### 3. Promote haptic fires in IdeaCard component (not in editor screen)
**Reason:** The plan says `triggerHaptic('success')` on promote. The haptic is triggered in IdeaCard's promote button `onPress` handler (before calling `onPromote`), so it fires immediately on tap. The `promoteMutation.onSuccess` callback in the editor also fires `triggerHaptic('success')`, giving a second haptic on server confirmation. This double-haptic provides good feedback for both tap acknowledgment and success confirmation.

## Decisions Made

1. **FAB only shows when notes exist** -- when empty, the CTA in the empty state is the only way to create a note. Once at least one note exists, the FAB appears. This avoids visual clutter on the empty state.

2. **Flush then setTimeout(500) before refine** -- auto-refine flushes the save first with a 500ms delay before calling `note.refine`. This ensures the server has the latest content when refining. The server reads content from the DB during refinement.

3. **ScrollView wrapping content** -- the editor uses a ScrollView around the IdeaCard + TextInput instead of a flat TextInput. This allows the IdeaCard to be visible above the editor and scroll together. TextInput has `scrollEnabled={false}` to delegate scrolling to the parent ScrollView.

4. **Tab order: Capture, Vault, Notes, Settings** -- Notes is placed between Vault and Settings since it's a secondary creation path (brain dump) that feeds into the Vault.

## Files Created/Modified

### Created
- `packages/mobile/src/components/ui/IdeaCard.tsx`
- `packages/mobile/src/hooks/useNoteAutoSave.ts`
- `packages/mobile/src/app/(tabs)/notes/_layout.tsx`
- `packages/mobile/src/app/(tabs)/notes/index.tsx`
- `packages/mobile/src/app/(tabs)/notes/[id]/index.tsx`

### Modified
- `packages/mobile/src/app/(tabs)/_layout.tsx` -- added NotebookPen import, notes icon in CustomTabBar, Tabs.Screen for notes
- `packages/mobile/src/components/ui/index.ts` -- added IdeaCard export
