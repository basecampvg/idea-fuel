# Landing Page Rich Visuals Enhancement

**Date:** 2026-02-13
**Status:** Brainstormed
**Inspiration:** beehiiv.com landing page

---

## What We're Building

A full visual overhaul of the IdeationLab landing page, adding:

1. **Animated cursor demo** in the hero section — a scripted fake cursor that types a business idea, clicks "Forge", and shows the interview beginning, all inside a rendered browser window
2. **Dark glassmorphism visual system** — frosted glass cards, gradient glows, semi-transparent borders, depth layers
3. **Motion-powered animations** throughout — scroll-triggered reveals, staggered orchestrations, hover micro-interactions, parallax depth tracking
4. **Enhanced report showcase** — the mock report "builds itself" as the user scrolls, sections animating in as if generated live
5. **Mouse-tracking parallax** — floating UI elements that shift subtly based on cursor position, creating depth

---

## Why This Approach

**Approach chosen: "The beehiiv Blueprint"** — layer rich visuals onto the existing 6-section structure.

**Rationale:**
- Proven pattern used by beehiiv, Linear, Vercel, Stripe — the gold standard for SaaS landing pages
- Builds on existing section architecture (hero, narrative, pipeline, report contents, report showcase, CTA) rather than starting from scratch
- Motion (Framer Motion) is the best-supported animation library for React 19 + Next.js 15 — declarative, SSR-ready, 90% smaller than GSAP
- Glassmorphism over dark backgrounds is the current premium SaaS aesthetic (2025-2026 trend)
- Animated cursor demo is the highest-impact single addition — shows the product "in use" without requiring user interaction

**Alternatives considered:**
- **Cinematic Scroll Experience** — full-viewport sections with scroll-snapping. Rejected: scroll-jacking risks frustrating users, harder to maintain, mobile performance concerns.
- **Hybrid + Demo Island** — free-scroll with a dedicated demo section. Rejected: less cohesive than integrating the demo into the hero, cursor demo has maximum impact at the top.

---

## Key Decisions

### Animation Library: Motion (Framer Motion)
- Import from `motion/react` (React 19 compatible)
- Use for: `whileInView`, `viewport`, `initial/animate`, `whileHover`, scroll-driven animations
- No GSAP — Motion handles cursor keyframe animations via its `animate` function with timeline-like sequences
- Estimated bundle impact: ~15-20kb gzipped (core)

### Visual System: Dark Glassmorphism
- Deep dark backgrounds (keep warm black base from current theme)
- Cards: `backdrop-blur-xl bg-white/5 border border-white/10`
- Accent glows: Gradient blur circles behind key elements (orange/amber to match brand)
- Shift from current orange accent to a richer gradient palette (orange → amber → warm white)
- Floating elements with `box-shadow` depth and subtle borders

### Hero Section: Split Layout with Animated Cursor Demo
- **Desktop layout**: Two-column split — Left: headline + subtitle + email waitlist input | Right: browser window with cursor demo
- **Mobile layout**: Stacked — headline + subtitle + email input on top, static product screenshot with animated cards below
- **Browser container**: Rendered browser window frame (traffic light dots, URL bar) — similar to existing report showcase pattern
- **Demo flow** (~15-20 seconds, loops):
  1. Cursor moves to idea input field
  2. Types "An AI-powered meal planning app that reduces food waste" (typewriter effect)
  3. Cursor moves to "Forge" button, hovers (button glows)
  4. Click animation (button depresses)
  5. Screen transitions to interview view — first AI question appears
  6. Brief pause showing the interview UI
  7. Fade out, reset, loop
- **Cursor**: Custom SVG cursor icon with subtle trail/glow
- **Timing**: Scripted Motion keyframes with `delay` and `duration` per step
- **Fallback**: Static screenshot for users with `prefers-reduced-motion`

### Parallax Depth System
- Track mouse position via `onMouseMove` on the hero/section container
- Apply `transform: translate3d(x, y, 0)` to floating elements at different rates
- Layer depths: background (0.5x), midground (1x), foreground (1.5x)
- Disable on mobile (touch devices) — no mouse to track

### Report Showcase Enhancement
- Keep the browser window frame approach
- Instead of showing the full report statically, animate sections in sequentially as user scrolls
- Each report section (validation scores, market sizing, competitors, etc.) slides/fades in with Motion `whileInView`
- Progress bars animate from 0 to their final value
- Numbers count up (animated counters)

### Performance Guardrails
- Motion's `viewport={{ once: true }}` — animations fire once, not repeatedly
- `will-change: transform` only on actively animating elements
- Lazy-load below-fold sections
- `prefers-reduced-motion` media query: disable all animations, show static fallbacks
- Target: Lighthouse Performance score >= 90
- No Three.js on the landing page (unnecessary weight for 2D effects)

---

## Technical Implementation Notes

### New Dependencies
```
motion          # Core animation library (replaces manual CSS transitions)
```

### Files to Modify
- `packages/web/src/app/(landing)/components/hero-section.tsx` — Major rewrite for cursor demo
- `packages/web/src/app/(landing)/components/narrative-section.tsx` — Motion entrance animations
- `packages/web/src/app/(landing)/components/pipeline-section.tsx` — Motion + glassmorphism
- `packages/web/src/app/(landing)/components/report-contents-section.tsx` — Motion + glassmorphism
- `packages/web/src/app/(landing)/components/report-showcase.tsx` — Scroll-driven build animation
- `packages/web/src/app/(landing)/components/final-cta-section.tsx` — Motion entrance
- `packages/web/src/app/globals.css` — Glassmorphism utility classes, gradient variables
- `packages/web/src/app/(landing)/components/use-in-view.ts` — May be replaced by Motion's built-in `whileInView`

### New Components to Create
- `animated-cursor-demo.tsx` — The scripted cursor + product demo
- `browser-frame.tsx` — Reusable browser window chrome (extract from report-showcase)
- `parallax-container.tsx` — Mouse-tracking parallax wrapper
- `animated-counter.tsx` — Number count-up animation for stats

---

## Resolved Questions

1. **Cursor demo content**: Always the same idea — one carefully chosen example. Simpler, more predictable, lets us perfect the timing.
2. **Mobile hero**: Static product screenshot with glassmorphism cards animating in around it. No cursor demo on mobile (no mouse to simulate).
3. **Waitlist form placement**: Side by side on desktop — Left: headline + subtitle + email input, Right: browser frame with cursor demo. Stacks vertically on mobile.
4. **Sound effects**: TBD — start without, can add later if desired.

## Open Questions

1. **Which example idea to use in the demo**: Needs to be relatable, exciting, and show the product's value. Candidates: meal planning, AI tutor, marketplace, SaaS tool.
2. **Gradient palette**: Current orange accent vs. expanding to orange → amber → warm white gradient system.

---

## Success Criteria

- Users spend more time on the landing page (increased average session duration)
- Higher waitlist conversion rate
- Qualitative feedback: "this looks legit / professional / premium"
- Lighthouse Performance >= 90
- No layout shift (CLS near 0)
- Works on Safari, Chrome, Firefox, Edge
- Graceful degradation on mobile and low-power devices
