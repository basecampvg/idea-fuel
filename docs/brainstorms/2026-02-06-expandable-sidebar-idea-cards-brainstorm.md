---
title: Expandable Sidebar with Mini Idea Cards
date: 2026-02-06
status: decided
---

# Expandable Sidebar with Mini Idea Cards

## What We're Building

An expandable main sidebar that transitions between a 60px icon-only view and a 240px expanded view showing navigation labels and a **mini idea cards** list. The sidebar supports three user-configurable modes: **collapsed**, **expanded**, and **expand-on-hover**. When the idea secondary nav activates (navigating to `/ideas/[id]/*`), the main sidebar auto-collapses to 60px to avoid double-wide sidebars.

## Why This Approach

The current sidebar locks ideas into a cramped list with colored dots and truncated titles — hard to scan and missing useful context. Users want to see status, progress, and activity at a glance without navigating away. A stateful expandable sidebar (Approach A) gives a native, integrated feel versus an overlay popup.

## Key Decisions

### 1. Three Sidebar Modes
- **Collapsed** (default): 60px, icons only. Current behavior.
- **Expanded**: 240px, icons + labels + ideas list. Stays open until toggled.
- **Expand on hover**: 60px at rest, expands to 240px on `mouseEnter`, collapses on `mouseLeave` (with debounce to prevent flicker).

**Mode selector:** Settings icon at the bottom of the sidebar opens a small popover/menu with the three options. Preference persists in `localStorage`.

### 2. Mini Idea Cards (Expanded State)
Each idea in the sidebar renders as a compact card showing:
- **Status badge** (colored pill: Draft/Interview/Researching/Complete)
- **Title** (1 line, truncated with ellipsis)
- **Progress bar** (only for RESEARCHING status — shows `research.progress` percentage)
- **Meta row**: relative timestamp ("2h ago"), interview count icon, report count icon

Cards have subtle borders, hover highlight, and the active idea is visually distinct (e.g., `bg-primary/10` + accent border).

**Limit:** Show 5 most recent ideas, then "View all →" link.

### 3. Auto-Collapse on Secondary Nav
When pathname matches `/ideas/[id]/*` (excluding `/ideas/[id]/interview`), the main sidebar auto-collapses to 60px regardless of the user's mode preference. This makes room for the idea secondary navigation sidebar. When navigating away from an idea detail page, the sidebar restores to the user's preferred mode.

### 4. CSS Transition Animation
Sidebar width transitions with `transition-all duration-200 ease-in-out`. Content inside fades/clips with `overflow-hidden` during collapse. Icons remain centered in both states.

### 5. State Management
- `SidebarContext` with `mode`, `isExpanded`, `isAutoCollapsed` state
- `localStorage` key: `sidebar-mode` (persists user preference across sessions)
- Read from `localStorage` synchronously on mount to prevent layout flash

## Data Available (from `idea.list` endpoint)
- `id`, `title`, `description`, `status`, `createdAt`, `updatedAt`
- `_count.interviews`, `_count.reports`
- `research.status`, `research.currentPhase`, `research.progress`

## Open Questions
- Should the sidebar expansion push content or overlay it? (Pushing is cleaner but causes layout reflow; overlay avoids reflow but can obscure content edge.) **Recommendation: Push content** — it's consistent with the secondary nav pattern.
- Hover-expand debounce timing: 150ms enter delay? 300ms leave delay? Needs testing.
- Should the "New Idea" button appear in the expanded sidebar or stay as the + icon only?

## References
- Current sidebar: `packages/web/src/components/layout/sidebar.tsx`
- Idea card pattern (grid): `packages/web/src/app/(dashboard)/ideas/page.tsx:200-285`
- Card components: `packages/web/src/components/ui/card.tsx`
- Secondary nav (just built): `packages/web/src/app/(dashboard)/ideas/[id]/components/idea-secondary-nav.tsx`
- Sidebar context pattern: Similar to admin sidebar at `packages/web/src/components/layout/admin-sidebar.tsx`
