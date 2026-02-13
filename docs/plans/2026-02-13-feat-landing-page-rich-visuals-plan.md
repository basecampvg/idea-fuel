---
title: "feat: Landing Page Rich Visuals Enhancement"
type: feat
date: 2026-02-13
brainstorm: docs/brainstorms/2026-02-13-landing-page-rich-visuals-brainstorm.md
---

# Landing Page Rich Visuals Enhancement

## Overview

Full visual overhaul of the IdeationLab landing page inspired by beehiiv.com, transforming it from a CSS-transition-based static page into a premium, animation-rich SaaS landing experience. The centerpiece is an animated cursor demo that shows the product "in use" — typing a business idea, clicking Forge, and revealing the interview UI — all scripted inside a rendered browser window.

**Key deliverables:**
1. Animated cursor demo in a split hero layout (desktop) / static screenshot (mobile)
2. Dark glassmorphism visual system across all sections
3. Motion-powered scroll animations, staggered reveals, hover micro-interactions
4. Enhanced report showcase that "builds itself" on scroll
5. Mouse-tracking parallax on floating decorative elements
6. `prefers-reduced-motion` fallbacks and performance guardrails

---

## Problem Statement / Motivation

The current landing page uses lightweight CSS transitions and a custom `useInView` hook. While functional, it lacks the visual richness and "wow factor" of best-in-class SaaS landing pages (beehiiv, Linear, Vercel). The page doesn't demonstrate the product in action — users must imagine what using IdeationLab looks like. An animated cursor demo + premium glassmorphism aesthetic will:

- **Build trust** — the page itself signals "this is a real, polished product"
- **Increase time-on-page** — animated demos are proven engagement hooks
- **Improve conversion** — showing > telling drives waitlist signups
- **Differentiate** — most early-stage products have generic landing pages

---

## Proposed Solution

**"The beehiiv Blueprint"** — layer rich visuals onto the existing 6-section structure using Motion (`motion/react`) as the animation foundation. Force dark mode on the landing page. Add floating decorative elements for parallax depth. Replace all manual CSS transitions with Motion's declarative API.

### Architecture

```
Landing Page Architecture (After Enhancement)
=============================================

Layout: (landing)/layout.tsx
  - Forces dark mode (className="dark" on html)
  - Fixed header with glassmorphism backdrop-blur
  - Footer with links

Page: (landing)/page.tsx (thin server component)
  ├── HeroSection (client) ← MAJOR REWRITE
  │   ├── Left column: headline + subtitle + email form
  │   └── Right column: BrowserFrame > AnimatedCursorDemo
  │       ├── Phase 1: "App" UI with input field
  │       ├── Phase 2: Typewriter types idea
  │       ├── Phase 3: Cursor clicks "Forge"
  │       └── Phase 4: Interview chat appears
  ├── NarrativeSection (client) ← Motion upgrade
  │   └── Stats cards with stagger + glassmorphism
  ├── PipelineSection (client) ← Motion upgrade
  │   └── 4-step process with stagger + glassmorphism
  ├── ReportContentsSection (client) ← Motion upgrade
  │   └── Icon grid with stagger + glassmorphism
  ├── ReportShowcase (client) ← ENHANCED
  │   └── BrowserFrame > sequential whileInView reveals
  │       ├── Animated counters (count up from 0)
  │       └── Animated progress bars (fill from 0%)
  ├── FinalCtaSection (client) ← Motion upgrade
  │   └── Email form with glassmorphism
  └── FloatingElements (client) ← NEW
      └── 4-6 gradient orbs with mouse-tracking parallax
```

### New Shared Components

| Component | Purpose | File |
|-----------|---------|------|
| `BrowserFrame` | Reusable browser window chrome (traffic light dots, URL bar) | `(landing)/components/browser-frame.tsx` |
| `AnimatedCursorDemo` | Scripted fake cursor + product walkthrough | `(landing)/components/animated-cursor-demo.tsx` |
| `ParallaxContainer` | Mouse-tracking parallax wrapper | `(landing)/components/parallax-container.tsx` |
| `AnimatedCounter` | Number count-up on scroll into view | `(landing)/components/animated-counter.tsx` |
| `FloatingElements` | Decorative gradient orbs for depth | `(landing)/components/floating-elements.tsx` |

---

## Technical Approach

### Cursor Demo Storyboard (15s loop)

```
Timeline (seconds)
0.0 ─── 0.5 ─── 3.5 ─── 4.0 ─── 4.5 ─── 5.0 ─── 5.5 ─── 9.0 ─── 12.0 ─── 13.5 ─── 15.0
  │       │       │       │       │       │       │       │        │         │         │
  │  Browser      │  Cursor      │  Button       │  Spinner     │   Hold    │   Fade   │
  │  window       │  moves to    │  depresses    │  appears     │   on      │   out    │
  │  appears,     │  "Forge"     │  + glow       │              │   chat    │   reset  │
  │  cursor in    │  button      │               │              │   state   │          │
  │  input field  │              │               │              │           │          │
  │               │              │               │              │           │          │
  └─ Typewriter ──┘              └─ Click ───────┘              │           │          │
     types idea                    animation                    └─ Chat ────┘          │
     55ms/char                                                    bubbles              │
     56 chars                                                     appear               │
                                                                  staggered            │
```

**Phase details:**

| Phase | Time | Duration | What Happens |
|-------|------|----------|-------------|
| Idle | 0.0s | 0.5s | Browser window with IdeationLab-like UI. Input field with blinking cursor placeholder |
| Type | 0.5s | 3.0s | "An AI-powered meal planning app that reduces food waste" typed at 55ms/char |
| Move | 3.5s | 0.5s | Cursor SVG animates from input to "Forge" button with eased motion path |
| Click | 4.0s | 0.5s | Button depresses (scale 0.95), orange glow pulse |
| Transition | 4.5s | 0.5s | Input area crossfades to loading state (pulsing dots) |
| Loading | 5.0s | 0.5s | Brief loading animation |
| Chat 1 | 5.5s | 1.5s | AI message bubble slides in: "Interesting idea! Tell me more about your meal planning concept..." |
| Chat 2 | 7.0s | 2.0s | Second message slides in with typing indicator → "Who is your target audience? Busy professionals, families, or students?" |
| Hold | 9.0s | 3.0s | Pause on completed interview state |
| Fade | 12.0s | 1.5s | Entire demo fades to 0 opacity |
| Reset | 13.5s | 1.5s | Invisible reset to Phase 1 state, then fade back in |

**Implementation:** Single `useEffect` with Motion's `animate` function using `sequence` for timeline control. All timing values as constants at top of file for easy tuning.

### Glassmorphism System

**Landing-page-specific classes** (do NOT modify global `.glass-card`):

```css
/* Landing page glassmorphism - scoped to (landing) layout */
.landing-glass {
  background: hsl(0 0% 100% / 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid hsl(0 0% 100% / 0.08);
  border-radius: 16px;
}

.landing-glass-strong {
  background: hsl(0 0% 100% / 0.08);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid hsl(0 0% 100% / 0.12);
  border-radius: 16px;
}

/* Mobile: reduce blur intensity for GPU performance */
@media (max-width: 768px) {
  .landing-glass,
  .landing-glass-strong {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
```

**Gradient glow elements** — positioned absolutely behind key sections:

```css
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  pointer-events: none;
}

.glow-orb-primary {
  background: hsl(15 85% 55%);  /* brand orange */
}

.glow-orb-amber {
  background: hsl(35 90% 55%);  /* warm amber */
}

.glow-orb-warm {
  background: hsl(45 80% 70%);  /* warm white */
}
```

### Dark Mode Enforcement

The landing page layout must force dark mode regardless of system preference:

```tsx
// (landing)/layout.tsx
export default function LandingLayout({ children }) {
  return (
    <div className="dark">
      {/* ... header, children, footer ... */}
    </div>
  )
}
```

This scopes dark mode to the landing page only. Dashboard pages respect user preference as before.

### Parallax System

```tsx
// parallax-container.tsx
'use client'
import { motion, useMotionValue, useSpring } from 'motion/react'

// Track mouse position relative to container center
// Apply transform: translate3d(x * rate, y * rate, 0) to children
// Rates: 0.5x (background), 1x (midground), 1.5x (foreground)
// Max displacement: ±25px
// Disabled when: matchMedia('(pointer: coarse)') OR viewport < 768px
// Spring config: { stiffness: 50, damping: 20 } for smooth lag
```

**Floating decorative elements** (4-6 gradient orbs):

| Element | Size | Color | Position | Depth Rate |
|---------|------|-------|----------|------------|
| Orb 1 | 300px | Orange (brand) | Hero top-right, behind browser frame | 0.5x |
| Orb 2 | 200px | Amber | Hero bottom-left, behind CTA | 1.0x |
| Orb 3 | 250px | Warm white | Pipeline section, center-right | 0.5x |
| Orb 4 | 350px | Orange/amber gradient | Report showcase, top-left | 0.5x |
| Orb 5 | 150px | Amber | Final CTA, bottom-right | 1.5x |

### Report Showcase Enhancement

The mock report uses **sequential `whileInView` triggers** (not scroll-linked). As the outer page scrolls and the browser window enters the viewport, inner sections animate in one by one:

```tsx
// Each report section wraps in:
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-50px" }}
  transition={{ duration: 0.5, delay: index * 0.15 }}
>
  {/* Section content */}
</motion.div>
```

**Animated counters** count from 0 to final value over 1.5s when in view. **Progress bars** fill from 0% to final width over 1s with eased timing.

### Reduced Motion Fallbacks

| Feature | Normal | Reduced Motion |
|---------|--------|----------------|
| Cursor demo | Full animated loop | Static screenshot of completed demo state |
| Scroll reveals | `whileInView` fade + slide | All content immediately visible |
| Number counters | Count from 0 to final | Show final value instantly |
| Progress bars | Animate fill | Show final width instantly |
| Parallax | Mouse-tracking offset | Elements at neutral (0,0) |
| Hover effects | Scale/glow on hover | No transform, subtle opacity change only |
| Stagger delays | 100-200ms between items | No delay, all items visible |

**Detection:**

```tsx
import { useReducedMotion } from 'motion/react'

function Component() {
  const prefersReducedMotion = useReducedMotion()
  // Use prefersReducedMotion to conditionally render static vs animated
}
```

### Screen Reader Accessibility

- Cursor demo: `aria-hidden="true"` on the entire browser frame
- Left column headline + subtitle conveys the same value proposition as text
- Add visually hidden `<p>` describing the demo for screen readers: "Watch a demo of IdeationLab analyzing a business idea"
- All form inputs retain proper `aria-label` and focus management
- Floating decorative orbs: `aria-hidden="true"`, `pointer-events: none`

---

## Implementation Phases

### Phase 1: Foundation (Motion + Glassmorphism + Dark Mode)

**Goal:** Install Motion, set up glassmorphism utilities, force dark mode, migrate existing animations.

**Tasks:**
- [ ] Install `motion` package: `pnpm add motion --filter @forge/web`
- [ ] Add landing-page glassmorphism CSS classes to `globals.css` (`.landing-glass`, `.landing-glass-strong`, `.glow-orb-*`)
- [ ] Force dark mode in `(landing)/layout.tsx` by wrapping content in `<div className="dark">`
- [ ] Replace custom `useInView` hook usage with Motion's `whileInView` in all 6 sections
- [ ] Update all section cards from current `.glass-card` to `.landing-glass` class
- [ ] Add `prefers-reduced-motion` check using `useReducedMotion()` from Motion
- [ ] Verify no visual regressions in existing functionality (waitlist form, UTM tracking, localStorage checks)

**Files modified:**
- `packages/web/package.json` — add `motion` dependency
- `packages/web/src/app/globals.css` — glassmorphism utilities, glow orb classes
- `packages/web/src/app/(landing)/layout.tsx` — dark mode enforcement
- `packages/web/src/app/(landing)/components/hero-section.tsx` — Motion migration
- `packages/web/src/app/(landing)/components/narrative-section.tsx` — Motion migration
- `packages/web/src/app/(landing)/components/pipeline-section.tsx` — Motion migration
- `packages/web/src/app/(landing)/components/report-contents-section.tsx` — Motion migration
- `packages/web/src/app/(landing)/components/report-showcase.tsx` — Motion migration
- `packages/web/src/app/(landing)/components/final-cta-section.tsx` — Motion migration

**Success criteria:**
- All sections use Motion for animations instead of manual CSS transitions
- Glassmorphism cards render correctly on dark background
- Landing page forces dark mode regardless of system preference
- `prefers-reduced-motion` shows all content immediately with no animation
- No hydration errors, no CLS

---

### Phase 2: Browser Frame + Cursor Demo

**Goal:** Build the centerpiece animated cursor demo inside a reusable browser frame component.

**Tasks:**
- [ ] Extract browser window chrome from `report-showcase.tsx` into reusable `browser-frame.tsx` (traffic light dots, URL bar, slot for content)
- [ ] Create `animated-cursor-demo.tsx` with the full 15s scripted loop:
  - Phase 1 (0-0.5s): Browser window idle state — "IdeationLab" UI with input field, blinking cursor
  - Phase 2 (0.5-3.5s): Typewriter effect at 55ms/char — "An AI-powered meal planning app that reduces food waste"
  - Phase 3 (3.5-4.5s): Cursor SVG moves to "Forge" button, click animation (scale 0.95 + glow)
  - Phase 4 (4.5-5.5s): Crossfade to loading state
  - Phase 5 (5.5-9.0s): Interview chat bubbles slide in (2 messages staggered)
  - Phase 6 (9.0-12.0s): Hold on interview state
  - Phase 7 (12.0-15.0s): Fade out, invisible reset, fade in to restart
- [ ] Custom cursor SVG component (pointer icon with subtle glow trail)
- [ ] IntersectionObserver to pause demo loop when not visible (save resources)
- [ ] `prefers-reduced-motion` fallback: render static screenshot of completed demo state
- [ ] `aria-hidden="true"` on demo, screen-reader-only description text

**Files created:**
- `packages/web/src/app/(landing)/components/browser-frame.tsx`
- `packages/web/src/app/(landing)/components/animated-cursor-demo.tsx`

**Files modified:**
- `packages/web/src/app/(landing)/components/report-showcase.tsx` — refactor to use `BrowserFrame`

**Success criteria:**
- Demo loops smoothly every 15s with no visual glitches
- Cursor movement feels natural (eased, not linear)
- Typewriter effect is readable (not too fast)
- Interview chat bubbles look authentic
- Demo pauses when scrolled out of view
- Static fallback renders for reduced-motion users

---

### Phase 3: Hero Section Rewrite (Split Layout)

**Goal:** Rewrite the hero section as a two-column split layout with the cursor demo on the right.

**Tasks:**
- [ ] Rewrite `hero-section.tsx` as split layout:
  - Desktop (`md:` and up): CSS Grid `grid-cols-2` — left column (headline + subtitle + email form) | right column (BrowserFrame + AnimatedCursorDemo)
  - Mobile: Stacked — headline + email form on top, static product screenshot with glassmorphism overlay cards below
- [ ] Headline and subtitle: Motion entrance animation (`initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`)
- [ ] Email form: preserve all existing logic (UTM tracking, localStorage, Beehiiv sync, waitlist count)
- [ ] Waitlist count display below email input
- [ ] Remove duplicate "Already have access? Launch App" link from hero (header already has it)
- [ ] Mobile hero: static screenshot image (product dashboard) with 2-3 glassmorphism stat cards animating in with Motion stagger
- [ ] Create or source the static product screenshot asset for mobile

**Files modified:**
- `packages/web/src/app/(landing)/components/hero-section.tsx` — full rewrite

**Files created:**
- `packages/web/public/images/product-screenshot.webp` — mobile hero image (or rendered via CSS/component)

**Success criteria:**
- Desktop: clean two-column layout, demo plays on the right, form works on the left
- Mobile: stacked layout with screenshot + animated cards, no cursor demo
- All waitlist functionality preserved (UTM, localStorage, count display)
- No layout shift on load

---

### Phase 4: Parallax + Floating Elements

**Goal:** Add mouse-tracking parallax and decorative gradient orbs for depth.

**Tasks:**
- [ ] Create `parallax-container.tsx`:
  - Track mouse position via `onMouseMove` relative to container center
  - Use Motion's `useMotionValue` + `useSpring` for smooth interpolation
  - Accept `rate` prop for depth multiplier (0.5x, 1.0x, 1.5x)
  - Cap displacement at ±25px
  - Disable when `matchMedia('(pointer: coarse)')` matches OR viewport < 768px
- [ ] Create `floating-elements.tsx`:
  - 5 gradient orbs (see table in Technical Approach) positioned absolutely
  - Each wrapped in `ParallaxContainer` with appropriate depth rate
  - `pointer-events: none`, `aria-hidden="true"`
  - Orbs use CSS `filter: blur(80px)` + `opacity: 0.15` for soft glow effect
- [ ] Integrate `FloatingElements` into the landing page layout or individual sections
- [ ] Verify no orbs overlap interactive elements or cause scrollbar expansion

**Files created:**
- `packages/web/src/app/(landing)/components/parallax-container.tsx`
- `packages/web/src/app/(landing)/components/floating-elements.tsx`

**Files modified:**
- `packages/web/src/app/(landing)/page.tsx` — add FloatingElements

**Success criteria:**
- Orbs subtly shift on mouse movement (desktop)
- No orb movement on touch devices
- No horizontal scrollbar from orbs (contained with `overflow: hidden` on parent)
- Orbs are purely decorative (no focus, no pointer events)
- Effect feels premium, not distracting

---

### Phase 5: Report Showcase Enhancement

**Goal:** Make the mock report "build itself" as the user scrolls into view.

**Tasks:**
- [ ] Refactor `report-showcase.tsx` to use `BrowserFrame` (extracted in Phase 2)
- [ ] Wrap each report section in `motion.div` with `whileInView` + staggered delay
- [ ] Create `animated-counter.tsx`:
  - Counts from 0 to target value over 1.5s using `useMotionValue` + `useTransform`
  - Triggers when in view (`whileInView`)
  - Fires once (`viewport={{ once: true }}`)
  - `prefers-reduced-motion`: shows final value immediately
  - Accepts `prefix` and `suffix` props for formatting ($, %, K, M, etc.)
- [ ] Animate progress bars: width transitions from `0%` to final value
- [ ] Animate TAM/SAM/SOM cards: scale in with stagger
- [ ] Social proof Reddit posts: slide in from left
- [ ] Competitor grid: fade in row by row
- [ ] All animations use `viewport={{ once: true }}` — no replay

**Files created:**
- `packages/web/src/app/(landing)/components/animated-counter.tsx`

**Files modified:**
- `packages/web/src/app/(landing)/components/report-showcase.tsx` — animation enhancement

**Success criteria:**
- Report sections appear sequentially as user scrolls
- Numbers count up smoothly
- Progress bars fill naturally
- Effect suggests "the AI just generated this"
- Reduced motion: all content visible immediately

---

### Phase 6: Polish + Performance + Cross-Browser

**Goal:** Final polish pass, performance optimization, cross-browser testing, bug fixes.

**Tasks:**
- [ ] Lighthouse audit (target >= 90 Performance on both mobile and desktop)
- [ ] Profile `backdrop-blur` performance on mid-range Android (Chrome DevTools > Performance)
  - If frame drops below 30fps on mobile: reduce blur from `blur(20px)` to `blur(12px)` or fallback to solid `bg-white/5`
- [ ] Verify CLS near 0 — add `min-height` to all animated sections
- [ ] Test `prefers-reduced-motion` end-to-end (every section)
- [ ] Cross-browser testing: Safari 17+, Chrome 120+, Firefox 120+, Edge 120+
  - Safari: verify `backdrop-filter` with `border-radius` + `overflow: hidden`
  - Firefox: verify `-webkit-backdrop-filter` fallback
- [ ] Fix cross-tab waitlist sync: add `window.dispatchEvent(new Event('waitlist-updated'))` after `localStorage.setItem` so FinalCTA section updates in same tab
- [ ] Lazy-load below-fold sections with `next/dynamic` or intersection-based loading
- [ ] Add `will-change: transform` only to actively parallax-moving elements, remove after animation settles
- [ ] Verify screen reader experience (VoiceOver on macOS/iOS, NVDA on Windows)
- [ ] Delete unused `use-in-view.ts` if no longer referenced

**Files modified:**
- Various — based on audit findings
- `packages/web/src/app/(landing)/components/final-cta-section.tsx` — waitlist sync fix

**Success criteria:**
- Lighthouse Performance >= 90 (mobile + desktop)
- CLS < 0.05
- No visual artifacts in Safari, Firefox, Chrome, Edge
- Screen reader provides coherent page narrative
- All animations respect `prefers-reduced-motion`

---

## Acceptance Criteria

### Functional Requirements

- [ ] Hero section displays two-column layout on desktop (headline+form left, cursor demo right)
- [ ] Hero section stacks vertically on mobile (headline+form top, screenshot+cards bottom)
- [ ] Animated cursor demo loops every ~15s: type idea → click Forge → show interview
- [ ] Cursor demo pauses when scrolled out of viewport
- [ ] All 6 sections use glassmorphism card styling
- [ ] All scroll-triggered animations use Motion's `whileInView`
- [ ] Report showcase sections animate in sequentially on scroll
- [ ] Number counters animate from 0 to final value
- [ ] Progress bars animate from 0% to final width
- [ ] Mouse-tracking parallax works on desktop with floating gradient orbs
- [ ] Parallax disabled on touch devices and small viewports
- [ ] Email waitlist form works (both hero and final CTA)
- [ ] UTM tracking preserved
- [ ] localStorage dedup preserved

### Non-Functional Requirements

- [ ] Lighthouse Performance >= 90 (mobile + desktop)
- [ ] CLS < 0.05
- [ ] Page loads in < 3s on 4G connection
- [ ] `prefers-reduced-motion` disables all animations, shows static content
- [ ] Cross-browser: Safari 17+, Chrome 120+, Firefox 120+, Edge 120+
- [ ] Screen reader accessible (cursor demo `aria-hidden`, form labels intact)
- [ ] No Three.js dependency on landing page
- [ ] Landing page forces dark mode independently of user preference

### Quality Gates

- [ ] All existing waitlist functionality preserved (manually test submit flow)
- [ ] No hydration errors in browser console
- [ ] No layout shift visible on page load
- [ ] Demo loop timing feels natural (not rushed, not sluggish)

---

## Dependencies & Prerequisites

| Dependency | Type | Status |
|-----------|------|--------|
| `motion` npm package | New dependency | Not installed |
| Product screenshot for mobile hero | Design asset | Needs creation |
| Browser frame extraction from report-showcase | Internal refactor | Phase 2 |

**No external API dependencies.** All animations are client-side. Waitlist API remains unchanged.

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `backdrop-blur` poor performance on mobile | Medium | High | Reduce blur intensity on mobile (12px vs 24px). Fallback to solid semi-transparent if <30fps |
| Motion bundle size impacts load time | Low | Medium | Motion core is ~15-20KB gzip. Monitor with `@next/bundle-analyzer` |
| Cursor demo feels robotic/unnatural | Medium | High | Use eased timing (cubic-bezier), variable typing speed, natural cursor paths. Iterate on timing |
| Safari backdrop-filter rendering bugs | Medium | Medium | Test early. Fall back to solid backgrounds per-browser if needed |
| Hydration mismatch from localStorage reads | Low | Medium | Render default state on server, read localStorage on mount, suppress initial transition |
| Parallax causes motion sickness | Low | Medium | Cap displacement at ±25px, respect `prefers-reduced-motion` |

---

## References & Research

### Internal References
- Brainstorm: [2026-02-13-landing-page-rich-visuals-brainstorm.md](../brainstorms/2026-02-13-landing-page-rich-visuals-brainstorm.md)
- Current hero: [hero-section.tsx](../../packages/web/src/app/(landing)/components/hero-section.tsx)
- Current report showcase: [report-showcase.tsx](../../packages/web/src/app/(landing)/components/report-showcase.tsx)
- Current CSS: [globals.css](../../packages/web/src/app/globals.css)
- Landing layout: [layout.tsx](../../packages/web/src/app/(landing)/layout.tsx)
- Landing page: [page.tsx](../../packages/web/src/app/(landing)/page.tsx)

### External References
- [Motion (Framer Motion) docs](https://motion.dev/docs)
- [Motion for React](https://motion.dev/docs/react-quick-start)
- [`useReducedMotion` hook](https://motion.dev/docs/react-use-reduced-motion)
- [Glassmorphism CSS generator](https://ui.glass/generator/)
- [beehiiv.com](https://beehiiv.com) — design inspiration

### Inspiration
- beehiiv.com — animated cursor demos, floating UI cards, dark glassmorphism
- linear.app — clean scroll animations, premium dark aesthetic
- vercel.com — gradient glows, understated parallax
