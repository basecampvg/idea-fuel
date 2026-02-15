---
title: Light Theme Color Overhaul
type: feat
date: 2026-02-15
---

# Light Theme Color Overhaul

## Overview

Replace the placeholder light theme (flat grays, no warmth) with a curated 5-color warm palette. Update CSS variables in `globals.css`, derive secondary tokens, fix hardcoded dark-only colors in chart/status components, and convert stray Tailwind gray classes so the light theme is fully functional and cohesive.

## Color Palette

| Role | Hex | HSL | CSS Variable |
|------|-----|-----|-------------|
| Main Background | #FBF9F6 | `40 33% 97%` | `--background` |
| Accent | #D24421 | `13 73% 48%` | `--primary`, `--accent`, `--ring` |
| Text | #2D2D2C | `0 0% 17%` | `--foreground` |
| Border | #D4D3D1 | `30 3% 82%` | `--border`, `--input` |
| Secondary BG | #E5E5E5 | `0 0% 90%` | `--card`, `--popover` |

### Derived Tokens (from base palette)

| Token | Derivation | HSL |
|-------|-----------|-----|
| `--primary-foreground` | White on accent | `0 0% 100%` |
| `--secondary` | Accent darkened | `13 73% 38%` |
| `--secondary-foreground` | White | `0 0% 100%` |
| `--muted` | Midpoint bg/card | `30 5% 93%` |
| `--muted-foreground` | Text at ~55% lightness | `0 0% 45%` |
| `--accent-foreground` | White | `0 0% 100%` |
| `--card-foreground` | Same as text | `0 0% 17%` |
| `--popover-foreground` | Same as text | `0 0% 17%` |
| `--destructive` | Keep red | `0 84% 50%` |
| `--success` | Green (not orange) | `142 71% 40%` |
| `--warning` | Amber | `38 92% 50%` |
| `--info` | Blue | `217 91% 50%` |

### Sidebar Tokens (currently missing from light theme)

| Token | HSL |
|-------|-----|
| `--sidebar` | `40 20% 95%` |
| `--sidebar-foreground` | `0 0% 17%` |
| `--sidebar-primary` | `13 73% 48%` |
| `--sidebar-primary-foreground` | `0 0% 100%` |
| `--sidebar-accent` | `30 10% 90%` |
| `--sidebar-accent-foreground` | `0 0% 17%` |
| `--sidebar-border` | `30 3% 82%` |
| `--sidebar-ring` | `13 73% 48%` |

### Chart Tokens (new — add to both themes)

| Token | Light HSL | Dark HSL (keep existing) |
|-------|-----------|--------------------------|
| `--chart-stroke` | `13 73% 48%` | `10 80% 55%` |
| `--chart-axis` | `0 0% 45%` | `40 5% 55%` |
| `--chart-grid` | `30 3% 82%` | `0 0% 100% / 0.08` |
| `--chart-tooltip-bg` | `0 0% 95%` | `40 8% 9%` |
| `--chart-tooltip-border` | `30 3% 82%` | `40 6% 18%` |
| `--chart-tooltip-text` | `0 0% 17%` | `0 0% 100%` |

### Gradient Accent (update for warm palette)

```css
/* Light theme — warmer, pops against off-white */
--gradient-accent: linear-gradient(135deg,
  hsl(13, 73%, 48%) 0%,
  hsl(20, 80%, 55%) 50%,
  hsl(30, 85%, 62%) 100%);
```

## Implementation Plan

### Phase 1: Core CSS Variables

**File:** `packages/web/src/app/globals.css`

1. Update the `html.light` block (lines 33-91) with all new color values from the palette and derived tokens tables above
2. Add the 8 missing sidebar variables to the light theme
3. Add chart-specific CSS variables to both light and dark theme blocks
4. Update the `--gradient-accent` for light theme
5. Update the `@theme` block to include new Tailwind color mappings for chart tokens
6. Verify score colors are visible on `#FBF9F6` — darken orange scores if needed:
   - `--score-opportunity`: consider `10 80% 35%` (darker)
   - `--score-feasibility`: consider `10 75% 40%` (darker)

### Phase 2: Chart Component Cleanup

Replace all hardcoded HSL/hex values with CSS variable references:

**keyword-chart.tsx** (6 hardcoded values)
- Lines 296-297: gradient `stopColor` → `hsl(var(--chart-stroke))`
- Line 309: grid stroke → `hsl(var(--chart-grid))`
- Lines 315, 322: tick fill → `hsl(var(--chart-axis))`
- Lines 329-334: tooltip bg/border/color → CSS variables
- Line 341: line stroke → `hsl(var(--chart-stroke))`

**spark-keyword-chart.tsx** (6 hardcoded values)
- Lines 226-228: gradient → `hsl(var(--chart-stroke))`
- Line 240: grid → `hsl(var(--chart-grid))`
- Lines 246, 253: tick fill → `hsl(var(--chart-axis))`
- Lines 261-265: tooltip → CSS variables
- Line 273: line stroke → `hsl(var(--chart-stroke))`

**market-sizing.tsx** (8 hardcoded values)
- Lines 48, 53, 58: card accent → `hsl(var(--primary))`
- Line 118: segment bar colors array → derive from primary with opacity steps

### Phase 3: Status/Results Component Cleanup

**market-analysis.tsx**
- Line 50: hardcoded `rgba(0, 212, 255, 0.2)` → use CSS variable

**spark-results.tsx**
- Lines 62-78: `iconBg` hardcoded hsla → use `hsl(var(--primary) / 0.15)`
- Lines 104-114: accent colors → CSS variables

**Leave as-is:**
- Brand colors (Reddit `#ff4500`, Twitter `#1da1f2`, Facebook `#1877f2`)
- Semantic red `#ef4444` for negative indicators
- Tailwind color utilities (`blue-500`, `amber-500`, `red-500`) in badges — these are consistent across themes

### Phase 4: Tailwind Gray Class Cleanup

Replace direct `gray-*` Tailwind classes with CSS variable equivalents in UI components. Cold grays clash with warm off-white background.

| File | Gray Classes | Replace With |
|------|-------------|-------------|
| `components/ui/input.tsx` | `text-gray-700`, `text-gray-400`, `bg-gray-50`, `border-gray-300` | `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border` |
| `components/ui/textarea.tsx` | Same as input | Same replacements |
| `components/ui/empty-state.tsx` | `border-gray-200`, `bg-gray-50`, `bg-gray-100`, `text-gray-400`, `text-gray-900`, `text-gray-500` | `border-border`, `bg-muted`, `bg-card`, `text-muted-foreground`, `text-foreground` |
| `components/layout/header.tsx` | `border-gray-200`, `text-gray-400`, `bg-gray-50` | `border-border`, `text-muted-foreground`, `bg-muted` |
| `components/ui/light-pillar.tsx` | `text-gray-500` (fallback) | `text-muted-foreground` |

## Acceptance Criteria

- [ ] Light theme uses all 5 specified colors from the palette
- [ ] Switching between light/dark theme shows distinct, polished appearances
- [ ] Dark theme is visually unchanged
- [ ] Sidebar renders correctly in light mode (all 8 sidebar vars defined)
- [ ] Charts render correctly on light background (axes visible, tooltips readable)
- [ ] Market sizing segment bars use theme-aware colors
- [ ] No hardcoded dark-only HSL values remain in chart components
- [ ] Score colors (opportunity, problem, feasibility, whynow) are visible on light bg
- [ ] No cold `gray-*` Tailwind classes remain in UI components (replaced with CSS vars)
- [ ] Gradient accent looks vibrant against warm off-white

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `packages/web/src/app/globals.css` | Update `html.light` block, add sidebar vars, add chart vars to both themes, update gradient, update `@theme` |
| 2 | `packages/web/.../keyword-chart.tsx` | Replace 6 hardcoded colors with CSS vars |
| 3 | `packages/web/.../spark-keyword-chart.tsx` | Replace 6 hardcoded colors with CSS vars |
| 4 | `packages/web/.../market-sizing.tsx` | Replace 8 hardcoded colors with CSS vars |
| 5 | `packages/web/.../market-analysis.tsx` | Replace 1 hardcoded rgba |
| 6 | `packages/web/.../spark-results.tsx` | Replace ~6 hardcoded hsla/accent values |
| 7 | `packages/web/src/components/ui/input.tsx` | Replace gray-* classes |
| 8 | `packages/web/src/components/ui/textarea.tsx` | Replace gray-* classes |
| 9 | `packages/web/src/components/ui/empty-state.tsx` | Replace gray-* classes |
| 10 | `packages/web/src/components/layout/header.tsx` | Replace gray-* classes |
| 11 | `packages/web/src/components/ui/light-pillar.tsx` | Replace gray-500 fallback |

**Total: 11 files**

## Out of Scope

- Dark theme changes (except adding new CSS variable definitions so chart/sidebar vars exist)
- Mobile app theming
- Typography changes
- Layout or component structure changes
- Brand/platform colors (Reddit, Twitter, Facebook)
- Semantic red (#ef4444) used for negative indicators
- Landing page hardcoded colors (low priority, address later)

## References

- Brainstorm: [2026-02-15-light-theme-overhaul-brainstorm.md](../brainstorms/2026-02-15-light-theme-overhaul-brainstorm.md)
- Theme system: `packages/web/src/app/globals.css` (Tailwind v4 CSS-first config)
- Theme provider: `next-themes` with `attribute="class"`, `defaultTheme="dark"`
