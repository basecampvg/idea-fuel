---
title: "feat: Expandable Sidebar with Mini Idea Cards"
type: feat
date: 2026-02-06
---

# feat: Expandable Sidebar with Mini Idea Cards

## Overview

Transform the fixed 60px icon-only sidebar into an expandable sidebar that supports three modes: **collapsed** (60px), **expanded** (240px), and **expand-on-hover**. When expanded, the sidebar shows navigation labels and a list of **5 mini idea cards** with status badges, titles, progress bars, and meta info. The sidebar auto-collapses when the idea secondary nav activates (`/ideas/[id]/*`).

## Problem Statement

The current sidebar crams ideas into a submenu overlay with tiny colored dots and truncated titles. Users can't scan status, progress, or activity without clicking into each idea. The fixed 60px width wastes screen real estate on wide monitors.

## Proposed Solution

### Architecture

1. **`SidebarContext`** — React Context providing `mode`, `isExpanded`, `setMode()`, shared across dashboard layout
2. **Refactored `Sidebar` component** — Reads context, renders at 60px or 240px with CSS width transition
3. **`IdeaMiniCard` component** — Compact card for the expanded sidebar
4. **Mode selector popover** — New icon at sidebar bottom, 3-option radio group
5. **Auto-collapse logic** — Pathname detection forces collapse on idea detail routes
6. **Content push** — Dashboard `<main>` gets dynamic `ml-[60px]`/`ml-[240px]` matching sidebar width

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Push vs. overlay | **Push content** | Consistent with secondary nav pattern; overlay hides content permanently in expanded mode |
| Default mode (no localStorage) | **Collapsed** | Matches current behavior, zero surprise |
| Library submenu fate | **Replace with inline cards** | Expanded sidebar subsumes the overlay; "New Idea" and "View all" move inline |
| Hover on idea detail routes | **Disabled** | Prevents conflict with IdeaSecondaryNav at `left-[60px]` |
| Mode selector icon | **New `PanelLeft` icon** | Separate from existing Settings link to `/settings` |
| Hover debounce | **200ms enter, 300ms leave** | Standard hover-intent; prevents flicker |
| Animation | **200ms ease-out** | Matches existing `LibrarySubmenu` transition |
| SSR hydration | **Render collapsed on server, read localStorage on mount, suppress initial transition** | Prevents layout flash |

## Technical Approach

### Phase 1: SidebarContext + Layout Wiring

Create the context, provider, and wire it into the dashboard layout. No visual changes yet — just plumbing.

**Files to create:**
- [x] `packages/web/src/components/layout/sidebar-context.tsx` — `SidebarProvider`, `useSidebar()` hook

**Files to modify:**
- [x] `packages/web/src/components/providers/dashboard-providers.tsx` — Wrap with `SidebarProvider`
- [x] `packages/web/src/app/(dashboard)/layout.tsx` — Add dynamic `ml-*` to `<main>` based on sidebar state

#### sidebar-context.tsx

```typescript
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

type SidebarMode = 'collapsed' | 'expanded' | 'hover';

interface SidebarContextValue {
  mode: SidebarMode;
  isExpanded: boolean;         // Computed: true if visually at 240px
  isAutoCollapsed: boolean;    // true when on idea detail route
  setMode: (mode: SidebarMode) => void;
  sidebarWidth: number;        // 60 or 240
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const STORAGE_KEY = 'forge_sidebar_mode';
const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 240;
const HOVER_ENTER_DELAY = 200;
const HOVER_LEAVE_DELAY = 300;

// Idea detail routes force collapse (secondary nav takes over)
function isIdeaDetailRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/ideas\/[^/]+/.test(pathname) && pathname !== '/ideas';
}
```

**Context logic:**
- `mode` from `localStorage` (default: `'collapsed'`)
- `isAutoCollapsed` = `true` when `isIdeaDetailRoute(pathname)`
- `isExpanded` = `mode === 'expanded' && !isAutoCollapsed` OR `(mode === 'hover' && hoverActive && !isAutoCollapsed)`
- `sidebarWidth` = `isExpanded ? 240 : 60`
- Hover handlers use `setTimeout` with refs for debounce; cleared on unmount
- On mount: read `localStorage`, set `mounted` flag, suppress initial CSS transition via a `data-no-transition` attribute removed after a frame

### Phase 2: Refactor Sidebar Component

Replace the fixed 60px sidebar with a width-transitioning sidebar that reads from context. Replace the `LibrarySubmenu` overlay with inline content.

**Files to modify:**
- [x] `packages/web/src/components/layout/sidebar.tsx` — Full refactor

#### Sidebar changes:

**Width & transition:**
```tsx
<aside
  className={`
    fixed inset-y-0 left-0 z-50 flex flex-col bg-background border-r border-border
    overflow-hidden transition-all duration-200 ease-out
  `}
  style={{ width: sidebarWidth }}
  onMouseEnter={onMouseEnter}
  onMouseLeave={onMouseLeave}
>
```

**Collapsed state (60px):** Icons centered, tooltips on hover (current behavior). No labels, no cards.

**Expanded state (240px):**
- Icons left-aligned with labels: `<Icon /> <span className="...">Label</span>`
- Labels fade in with `opacity` transition tied to `isExpanded`
- "New Idea" shows as full button with label
- Vault section shows inline idea cards (replaces submenu)
- "View all" link below cards
- Active indicator stays on left edge

**Remove:** `LibrarySubmenu` component entirely. Remove `libraryOpen` state.

**Add:** Mode selector button in bottom nav area (before Settings link).

### Phase 3: Mini Idea Cards

Create the `IdeaMiniCard` component and render 5 cards in the expanded sidebar.

**Files to create:**
- [x] `packages/web/src/components/layout/idea-mini-card.tsx`

#### IdeaMiniCard

```typescript
interface IdeaMiniCardProps {
  idea: {
    id: string;
    title: string;
    status: IdeaStatus;
    updatedAt: Date | string;
    _count: { interviews: number; reports: number };
    research: Array<{ status: string; progress: number }> | null;
  };
  isActive: boolean;
}
```

**Card layout (within ~200px usable width):**
```
┌─────────────────────────────┐
│ [●] Draft   title text tr...│  ← Row 1: status badge + title
│ ▓▓▓▓▓▓░░░░  2h · 💬1 📄3  │  ← Row 2: progress bar (if RESEARCHING) + meta
└─────────────────────────────┘
```

- **Status badge:** Colored pill using existing `statusConfig` colors, text label (Draft/Interview/Researching/Complete)
- **Title:** Single line, `truncate`, `text-sm`
- **Progress bar:** Only for `RESEARCHING` status. Uses `research[0].progress` (Int 0-100). Thin bar with `bg-primary` fill on `bg-muted` track.
- **Meta row:** Relative time (`formatDistanceToNow` from date-fns or manual), interview icon + count, report icon + count. All `text-xs text-muted-foreground`.
- **Active state:** `bg-primary/10 border-l-2 border-primary` (matches secondary nav pattern)
- **Hover state:** `hover:bg-muted/50`
- **Border:** `border border-border/50 rounded-lg`

**Data fetching:** Query `trpc.idea.list.useQuery({ limit: 5 })` always (not gated by `isOpen`). Use `staleTime: 30_000` so it doesn't refetch on every hover-expand. Show skeleton cards while loading.

### Phase 4: Mode Selector Popover

Add a sidebar mode selector at the bottom of the sidebar.

**Files to modify:**
- [ ] `packages/web/src/components/layout/sidebar.tsx` — Add mode selector button + popover

**Implementation:**
- New icon: `PanelLeft` from lucide-react (represents sidebar toggle)
- Click opens a small popover positioned to the right of the icon (`left-full ml-2`)
- Popover contains 3 options as a radio group:
  - `Columns2` icon + "Collapsed" — Always 60px
  - `PanelLeftOpen` icon + "Expanded" — Always 240px
  - `MousePointer` icon + "Auto (hover)" — Expand on hover
- Active option has `bg-primary/10 text-primary` highlight
- Click-outside dismisses popover
- Selecting an option calls `setMode()` from context, closes popover

### Phase 5: Update Dependent Components

Update components that hardcode sidebar width assumptions.

**Files to modify:**
- [x] `packages/web/src/app/(dashboard)/ideas/[id]/components/idea-secondary-nav.tsx` — Read `sidebarWidth` from context instead of hardcoded `left-[60px]`
- [x] `packages/web/src/app/(dashboard)/ideas/[id]/components/idea-layout-client.tsx` — Read `sidebarWidth` from context for margin calculation
- [x] `packages/web/src/components/layout/conditional-sidebar.tsx` — No changes needed (still returns null on /admin)

#### idea-secondary-nav.tsx changes:
```tsx
// Before:
<nav className="fixed inset-y-0 left-[60px] z-40 w-[240px] ...">

// After:
const { sidebarWidth } = useSidebar();
<nav style={{ left: sidebarWidth }} className="fixed inset-y-0 z-40 w-[240px] ...">
```

#### idea-layout-client.tsx changes:
```tsx
// Before:
<div className="ml-[240px] min-h-screen">

// After:
const { sidebarWidth } = useSidebar();
<div style={{ marginLeft: 240 }} className="min-h-screen"> // 240px secondary nav width
```
Note: The idea layout margin is always 240px (secondary nav width) since the sidebar is always collapsed (60px) on idea detail routes. The sidebar's 60px is accounted for by the secondary nav's `left: sidebarWidth`.

## Acceptance Criteria

### Functional Requirements

- [ ] Sidebar toggles between 60px and 240px with smooth CSS transition (200ms)
- [ ] Three modes work correctly: collapsed, expanded, expand-on-hover
- [ ] Mode persists in `localStorage` across page refreshes and sessions
- [ ] Expanded sidebar shows navigation labels next to icons
- [ ] Expanded sidebar shows 5 most recent ideas as mini cards
- [ ] Mini cards display: status badge, title (truncated), progress bar (RESEARCHING only), meta row
- [ ] Active idea card is visually distinct (accent border + tinted background)
- [ ] Clicking a mini card navigates to the idea detail page
- [ ] Sidebar auto-collapses to 60px on `/ideas/[id]/*` routes
- [ ] Sidebar restores to preferred mode when navigating away from idea detail
- [ ] Hover mode: 200ms delay before expand, 300ms delay before collapse
- [ ] Hover mode disabled on idea detail routes
- [ ] Mode selector popover appears when clicking the PanelLeft icon
- [ ] Library submenu overlay is removed (replaced by inline cards)
- [ ] Main content area shifts with sidebar width (push layout, not overlay)
- [ ] "New Idea" button and "View all" link appear in expanded sidebar
- [ ] Loading skeleton shown while idea cards data loads
- [ ] Empty state ("No ideas yet") shown when user has 0 ideas

### Non-Functional Requirements

- [ ] No hydration mismatch — render collapsed on server, read localStorage on client mount
- [ ] Suppress initial transition on page load (no flash from collapsed → expanded)
- [ ] `prefers-reduced-motion` respected — instant transitions for users who prefer it
- [ ] Keyboard accessible — mode selector operable via keyboard, focus management on collapse

## File Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `components/layout/sidebar-context.tsx` | SidebarProvider + useSidebar hook |
| Create | `components/layout/idea-mini-card.tsx` | Mini idea card component |
| Modify | `components/providers/dashboard-providers.tsx` | Wrap with SidebarProvider |
| Modify | `app/(dashboard)/layout.tsx` | Dynamic ml-* on main |
| Modify | `components/layout/sidebar.tsx` | Full refactor: expand/collapse, remove LibrarySubmenu, add mode selector |
| Modify | `ideas/[id]/components/idea-secondary-nav.tsx` | Dynamic left positioning |
| Modify | `ideas/[id]/components/idea-layout-client.tsx` | Dynamic margin from context |

All paths relative to `packages/web/src/`.

## References

- Brainstorm: `docs/brainstorms/2026-02-06-expandable-sidebar-idea-cards-brainstorm.md`
- Current sidebar: `packages/web/src/components/layout/sidebar.tsx`
- Admin sidebar pattern: `packages/web/src/components/layout/admin-sidebar.tsx`
- Idea secondary nav: `packages/web/src/app/(dashboard)/ideas/[id]/components/idea-secondary-nav.tsx`
- Dashboard layout: `packages/web/src/app/(dashboard)/layout.tsx`
- Subscription context pattern: `packages/web/src/components/subscription/subscription-context.tsx`
- Idea list endpoint: `packages/server/src/routers/idea.ts:22-60`
- Research model (progress field): `packages/server/prisma/schema.prisma:163-193`
- CSS transition variables: `packages/web/src/app/globals.css:25-28`
