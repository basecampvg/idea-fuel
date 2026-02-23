---
name: gsap-scrolltrigger
description: Build scroll-driven animations with GSAP and ScrollTrigger in React/Next.js. Use when implementing scroll pinning, horizontal scroll sections, parallax, scrubbed animations, or any GSAP-powered motion. Provides patterns for useGSAP hook, reduced motion, dynamic imports, and ScrollTrigger cleanup.
---

# GSAP ScrollTrigger — React/Next.js Patterns

## Quick Start

Before writing any GSAP code, **look up the latest docs via Context7**:

```
mcp__context7__resolve-library-id(libraryName: "gsap", query: "<your specific question>")
→ use library ID: /llmstxt/gsap_llms_txt (1656 snippets, highest coverage)

mcp__context7__query-docs(libraryId: "/llmstxt/gsap_llms_txt", query: "<specific pattern>")
```

**Always search Context7 first** for ScrollTrigger configs, gsap.matchMedia patterns, useGSAP hook usage, and any GSAP API you're unsure about. The docs are comprehensive and up to date.

**Official GSAP docs:** https://gsap.com/docs/v3/

## Project Setup

This project uses:
- **GSAP 3.x** + **@gsap/react** (installed in `packages/web`)
- **Next.js 15** App Router with `'use client'` directives
- **Dynamic imports** to code-split GSAP from non-animated routes
- **Tailwind CSS v4** for layout, GSAP for motion

### Installation

```bash
pnpm add gsap @gsap/react --filter @forge/web
```

Add to `next.config.ts` → `experimental.optimizePackageImports`:
```ts
optimizePackageImports: ['gsap']
```

## Core Patterns

### 1. useGSAP Hook (Preferred)

The `useGSAP` hook from `@gsap/react` handles cleanup automatically — critical for React 19 strict mode.

```tsx
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

function MyComponent() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.to('.box', { x: 360 }); // automatically reverted on unmount
  }, { scope: container }); // scope limits selector queries

  return <div ref={container}>...</div>;
}
```

### 2. Dynamic Import Pattern (Next.js SSR-Safe)

GSAP cannot run server-side. Always dynamically import in `useEffect` or `useGSAP`:

```tsx
'use client';

import { useRef, useEffect } from 'react';

function AnimatedSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: ReturnType<typeof import('gsap')['gsap']['context']>;

    async function animate() {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // All GSAP code here — scoped for cleanup
        gsap.from('.heading', { opacity: 0, y: 40, duration: 0.8 });
      }, ref);
    }

    animate();
    return () => { ctx?.revert(); };
  }, []);

  return <section ref={ref}>...</section>;
}
```

### 3. ScrollTrigger Pinning

Pin a section while animations play within it:

```js
ScrollTrigger.create({
  trigger: sectionRef.current,
  start: 'top top',
  end: '+=50%',       // pin for half a viewport of scroll
  pin: true,
  pinSpacing: true,   // push content below (default)
  anticipatePin: 1,   // smooth pin start
});
```

**Key rules:**
- `end: '+=500'` means 500px of scroll distance while pinned
- `pinSpacing: true` (default) pushes subsequent content down
- Use `anticipatePin: 1` to prevent visual jump at pin start
- Never pin more than 2 consecutive sections — feels broken to users

### 4. Horizontal Scroll (Vertical-Drives-Horizontal)

The showstopper pattern — vertical scrolling moves content horizontally:

```js
gsap.to(containerEl, {
  x: () => -(containerEl.scrollWidth - window.innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: sectionEl,
    start: 'top top',
    end: () => `+=${containerEl.scrollWidth - window.innerWidth}`,
    pin: true,
    scrub: 1,
    anticipatePin: 1,
    invalidateOnRefresh: true,  // recalculate on resize
  },
});
```

**Container setup:** `display: flex; width: 300vw;` with each panel `width: 100vw`.

**Mobile fallback:** Use `gsap.matchMedia()` to switch to vertical stacked layout below 1024px. Never use horizontal scroll on touch devices — it fights the user's scroll intent.

### 5. Scrub vs Toggle

| Pattern | Use When | Config |
|---------|----------|--------|
| **Scrub** | Animation tied to scroll position (parallax, progress bars) | `scrub: true` or `scrub: 1` (1s smoothing) |
| **Toggle** | Animation fires once on enter | `toggleActions: 'play none none none'` |

```js
// Scrub — parallax effect
gsap.to('.orb', {
  y: -120,
  scrollTrigger: { trigger: section, scrub: 1 },
});

// Toggle — entrance animation (fire once)
gsap.from('.card', {
  opacity: 0, y: 60, stagger: 0.15,
  scrollTrigger: {
    trigger: '.cards',
    start: 'top 75%',
    toggleActions: 'play none none none',
  },
});
```

### 6. Responsive with gsap.matchMedia()

Handle breakpoints and reduced motion:

```js
const mm = gsap.matchMedia();

mm.add('(min-width: 1024px)', () => {
  // Desktop: horizontal scroll with pinning
  gsap.to(container, { x: ..., scrollTrigger: { pin: true, scrub: 1 } });
});

mm.add('(max-width: 1023px)', () => {
  // Mobile: simple scroll-triggered reveals
  gsap.from('.card', { opacity: 0, y: 30, stagger: 0.1 });
});

mm.add('(prefers-reduced-motion: reduce)', () => {
  // Reduced motion: instant opacity, no transforms
  gsap.from('.card', { opacity: 0 });
});
```

### 7. Counting Numbers

Animate a number counting up on scroll:

```js
const obj = { val: 0 };
gsap.to(obj, {
  val: 42,
  duration: 1.5,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: el,
    start: 'top 80%',
    toggleActions: 'play none none none',
  },
  onUpdate() {
    el.textContent = Math.round(obj.val) + '%';
  },
});
```

### 8. SVG Line Drawing

Animate an SVG path drawing itself:

```js
const path = document.querySelector('.connector');
const length = path.getTotalLength();

gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
gsap.to(path, {
  strokeDashoffset: 0,
  scrollTrigger: { trigger: '.container', scrub: 0.5 },
});
```

## Cleanup & Lifecycle

### Route Change Cleanup

Kill all ScrollTrigger instances on unmount to prevent ghost animations:

```tsx
useEffect(() => {
  return () => {
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    });
  };
}, []);
```

### Resize Handling

ScrollTrigger caches positions. Refresh on resize:

```js
let timer: ReturnType<typeof setTimeout>;
function onResize() {
  clearTimeout(timer);
  timer = setTimeout(() => ScrollTrigger.refresh(), 250);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
```

### Function-Based Values

Always use functions for `end` values that depend on element sizes — they re-evaluate on refresh:

```js
// WRONG: cached at init time
end: `+=${el.offsetHeight}`

// RIGHT: recalculated on refresh
end: () => `+=${el.offsetHeight}`
```

## Accessibility

- Use `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)` for every animated section
- Add `aria-hidden="true"` on decorative parallax elements (orbs, grid patterns)
- Keep all content in the DOM — never use `display: none` on scroll-revealed content
- Set `overscroll-behavior: none` on pinned page containers (prevents iOS Safari rubber-banding)
- Use `will-change: transform` sparingly — only on actively animated elements

## Common Mistakes

For a full list, search Context7:
```
mcp__context7__query-docs(libraryId: "/llmstxt/gsap_llms_txt", query: "common ScrollTrigger mistakes")
```

Key ones:
1. **Not using function-based `end` values** — breaks on resize
2. **Missing `invalidateOnRefresh: true`** — cached start values go stale
3. **Forgetting cleanup in React** — leaked ScrollTriggers haunt other routes
4. **Pinning without `anticipatePin`** — visual jump at pin start
5. **Horizontal scroll on mobile** — fights touch intent, always provide fallback
6. **Stacking too many pins** — 3+ consecutive pinned sections feel broken

## Context7 Lookup Recipes

When implementing, use these targeted queries:

| Need | Context7 Query |
|------|---------------|
| Pin config options | `"ScrollTrigger pin pinSpacing anticipatePin"` |
| Horizontal scroll | `"horizontal scroll container pin scrub panels"` |
| Parallax layers | `"parallax scrollTrigger scrub different speeds"` |
| Reduced motion | `"prefers-reduced-motion gsap matchMedia accessibility"` |
| React cleanup | `"useGSAP hook React cleanup strict mode"` |
| Snap to sections | `"ScrollTrigger snap labels sections"` |
| Timeline + scroll | `"timeline scrollTrigger scrub stagger"` |
| Resize handling | `"ScrollTrigger refresh invalidateOnRefresh resize"` |
| Start/end strings | `"ScrollTrigger start end position strings"` |

## File Reference (This Project)

- V2 landing page: `packages/web/src/app/v2/`
- GSAP provider: `packages/web/src/app/v2/components/gsap-provider.tsx`
- Horizontal scroll: `packages/web/src/app/v2/components/horizontal-scroll.tsx`
- Hero (pinned): `packages/web/src/app/v2/components/hero-section.tsx`
- Brainstorm: `docs/brainstorms/2026-02-21-v2-landing-page-brainstorm.md`
- Plan: `docs/plans/2026-02-21-feat-v2-cinematic-landing-page-plan.md`
