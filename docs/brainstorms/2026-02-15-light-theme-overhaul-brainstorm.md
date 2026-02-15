# Light Theme Color Overhaul

**Date:** 2026-02-15
**Status:** Ready for planning

## What We're Building

Overhaul the web app's light theme with a new 5-color palette that replaces the current placeholder grays with a warm, intentional design system.

### New Color Palette

| Role | Hex | HSL (approx) | Usage |
|------|-----|---------------|-------|
| Main Background | #FBF9F6 | 40 33% 97% | Page background |
| Accent | #D24421 | 13 73% 48% | Buttons, links, active states |
| Text | #2D2D2C | 0 0% 17% | Primary text color |
| Border | #D4D3D1 | 30 3% 82% | Dividers, input borders |
| Secondary BG | #E5E5E5 | 0 0% 90% | Cards, panes, panels |

### Derived Colors (from base palette)

- **Hover accent:** Darken #D24421 by ~10%
- **Muted text:** #2D2D2C at reduced opacity
- **Focus ring:** #D24421 at ~40% opacity
- **Muted background:** Midpoint between #FBF9F6 and #E5E5E5
- **Destructive/success/warning:** Keep existing hues, adjust lightness to harmonize with warm palette

## Why This Approach

- **CSS-variable driven:** The app already uses Tailwind v4 `@theme` blocks + CSS custom properties. Updating the `html.light` block in `globals.css` cascades to all components automatically.
- **Minimal file changes:** ~4 files total (1 CSS + 3 chart components with hardcoded colors).
- **No dark theme impact:** Dark theme stays untouched. Only the `html.light` selector is modified.

## Key Decisions

1. **Light theme only** — Dark theme remains as-is
2. **Charts included** — Retheme chart gradients, axes, tooltips to match warm palette
3. **Derived colors auto-generated** — Hover, muted, focus states derived from the 5 base colors (no additional swatches)
4. **Fix chart hardcoding** — Move hardcoded HSL values in chart components to CSS variables so they respect theme switching

## Scope

### Files to Modify
- `packages/web/src/app/globals.css` — Update `html.light` block (~60 CSS variables)
- `packages/web/.../keyword-chart.tsx` — Replace hardcoded chart colors with CSS variables
- `packages/web/.../spark-keyword-chart.tsx` — Same
- `packages/web/.../market-sizing.tsx` — Same

### Out of Scope
- Dark theme changes
- Mobile app theming
- New components or layout changes
- Typography changes

## Open Questions

None — palette and scope are locked.
