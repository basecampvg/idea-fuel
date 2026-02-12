---
title: "feat: Landing Page for Lead Capture"
type: feat
date: 2026-02-12
brainstorm: docs/brainstorms/2026-02-12-landing-page-brainstorm.md
---

# Landing Page for Lead Capture

## Overview

Overhaul the IdeationLab landing page (`ideationlab.ai`) into a high-conversion lead capture page for entrepreneurs. Blends an interactive simulated demo with urgency-driven narrative storytelling across 6 sections. Designed for waitlist capture now, swappable to direct signup later.

**Brainstorm reference:** [2026-02-12-landing-page-brainstorm.md](../brainstorms/2026-02-12-landing-page-brainstorm.md)

## Problem Statement

The current landing page is functional but generic — hero headline, 3 value cards, a stats section, and a waitlist form. It doesn't showcase the product's power or create urgency. Entrepreneurs land, skim, and leave without understanding what IdeationLab actually does or why they need it.

## Proposed Solution

A 6-section landing page that walks visitors through an emotional journey:

1. **Hero** — Urgency hook + email capture + live waitlist counter
2. **Interactive Demo** — Type a business idea, see simulated analysis animate in
3. **Narrative Bridge** — Pain point stats that connect demo → features
4. **Feature Walkthrough** — Animated 3-step pipeline (Interview → Research → Report)
5. **Sample Report Showcase** — Live HTML preview of a real report
6. **Final CTA** — Repeat email capture with stronger urgency copy

**Dropped from v1:** Pricing preview (add later when tiers are finalized).

---

## Technical Approach

### Architecture

The landing page lives in the `(landing)` route group with its own layout (no sidebar, minimal header). All new components go in a dedicated `(landing)/components/` directory.

```
packages/web/src/app/(landing)/
├── page.tsx                    # Main landing page (rewrite)
├── layout.tsx                  # Landing layout (minor updates)
└── components/
    ├── hero-section.tsx        # Hero + CTA + waitlist counter
    ├── demo-section.tsx        # Interactive demo (client component)
    ├── demo-data.ts            # Pre-baked demo outputs + keyword matching
    ├── demo-result.tsx         # Animated demo result display
    ├── narrative-section.tsx   # Stats bridge between demo and features
    ├── pipeline-section.tsx    # 3-step feature walkthrough
    ├── report-showcase.tsx     # Live HTML sample report
    ├── final-cta-section.tsx   # Bottom email capture
    └── use-in-view.ts          # IntersectionObserver hook for scroll animations
```

**Key decisions:**
- `page.tsx` becomes a thin server component that composes section components
- Only `demo-section.tsx`, `hero-section.tsx`, and `final-cta-section.tsx` need `'use client'` (form state, animations)
- `demo-data.ts` is a plain TypeScript module with keyword→output mappings (no API, no database)
- Scroll-triggered animations use a lightweight `useInView` hook (IntersectionObserver), not a heavy animation library
- Animations play once per page load (`once: true` on observer)

### Existing Infrastructure (No Changes Needed)

| What | Status | File |
|------|--------|------|
| Waitlist API (POST) | Ready | `packages/web/src/app/api/waitlist/route.ts` |
| Waitlist count API (GET) | Ready | `packages/web/src/app/api/waitlist/route.ts` |
| EmailCapture table | Ready | `packages/server/src/db/schema.ts:559` |
| Beehiiv sync | Ready | Triggered by POST /api/waitlist |
| Subdomain routing | Ready | `packages/web/src/middleware.ts` |
| Landing layout | Ready | `packages/web/src/app/(landing)/layout.tsx` |
| CSS animations | Ready | `packages/web/src/app/globals.css` |

---

## Implementation Phases

### Phase 1: Foundation + Hero Section

**Goal:** Replace the current hero with urgency-driven messaging, live waitlist counter, and polished email capture.

#### Tasks

- [x] Create `(landing)/components/` directory
- [x] Build `hero-section.tsx` (`'use client'`)
  - Bold headline using Space Grotesk: "42% of startups fail because they skip this step."
  - Subheadline: "IdeationLab validates your business idea with AI-powered market research in minutes, not months."
  - Email capture form (reuse existing POST `/api/waitlist` logic)
  - Form states: idle → loading (spinner) → success (checkmark + position number) → error (inline message)
  - Live waitlist counter: fetch GET `/api/waitlist` on mount, display "Join X founders on the waitlist"
  - After successful submission: optimistic +1 on counter, set `localStorage` flag `waitlist_submitted`
  - Returning visitor detection: if `localStorage` flag exists, show "You're already on the list!" instead of form
- [x] Build `use-in-view.ts` hook
  - Wraps IntersectionObserver with `threshold` and `once` options
  - Returns `[ref, isInView]` tuple
  - Used by all scroll-animated sections
- [x] Refactor `page.tsx` into thin server component composing section components
- [x] Update `layout.tsx` if needed (add metadata/OG tags for SEO)

#### Key Files
- Create: `packages/web/src/app/(landing)/components/hero-section.tsx`
- Create: `packages/web/src/app/(landing)/components/use-in-view.ts`
- Modify: `packages/web/src/app/(landing)/page.tsx`
- Modify: `packages/web/src/app/(landing)/layout.tsx` (metadata only)

---

### Phase 2: Interactive Demo

**Goal:** Build the centerpiece — an input where visitors type a business idea and see a simulated report preview animate in.

#### Tasks

- [x] Build `demo-data.ts` — pre-baked outputs + keyword matching
  - **Data structure** per example:
    ```typescript
    interface DemoOutput {
      ideaTitle: string;
      marketSize: { value: string; growth: string; };
      competitors: Array<{ name: string; description: string; threat: 'high' | 'medium' | 'low'; }>;
      timingVerdict: { label: string; color: 'green' | 'yellow' | 'red'; reasoning: string; };
      viabilityScore: number; // 0-100
    }
    ```
  - **Pre-baked examples (4 total):**
    1. "Custom CRM for bed and breakfast industry" (primary)
    2. "AI-powered meal planning app" (consumer AI)
    3. "Personalized fitness coaching platform" (wellness vertical)
    4. Generic fallback (used when no keyword match)
  - **Keyword matching function:** `matchDemoOutput(input: string): DemoOutput`
    - Lowercase input, split into words
    - Score each example by keyword overlap (e.g., "crm" + "bed" + "breakfast" → example 1)
    - Threshold: at least 2 keyword hits → match. Otherwise → fallback
    - Fallback output framed as "Here's what a typical analysis looks like" (honest, not deceptive)

- [x] Build `demo-section.tsx` (`'use client'`)
  - Text input with placeholder: "Describe your business idea..."
  - Suggestion pills below input (3 clickable pills for pre-baked ideas)
  - Click pill → populate input + auto-trigger demo
  - Submit button: "Analyze" (disabled when empty)
  - Input constraints: max 200 chars, basic sanitization (strip HTML tags)
  - On submit: 500ms fake "thinking" delay → reveal `demo-result.tsx`

- [x] Build `demo-result.tsx` — animated result display
  - **Animation sequence (total ~4 seconds):**
    1. `0ms` — Container fades in
    2. `300ms` — Market size counter animates ($0 → final value) over 1.5s
    3. `800ms` — Competitor cards slide in one by one (300ms apart)
    4. `1800ms` — Timing verdict badge fades in with color
    5. `2500ms` — Viability score odometer animates (0 → final) over 1s
  - Cancel previous animation if user submits new idea (reset state, restart)
  - Mobile: Stack all elements vertically, same animation sequence

#### Key Files
- Create: `packages/web/src/app/(landing)/components/demo-data.ts`
- Create: `packages/web/src/app/(landing)/components/demo-section.tsx`
- Create: `packages/web/src/app/(landing)/components/demo-result.tsx`

---

### Phase 3: Narrative Bridge + Feature Walkthrough

**Goal:** Connect the demo moment to the full product story with pain-point stats and an animated pipeline breakdown.

#### Tasks

- [x] Build `narrative-section.tsx`
  - Transition line: "That took 8 seconds. Most founders spend 8 months guessing."
  - 3 pain-point stats in a row:
    - "42% of startups fail from no market need" (CB Insights)
    - "$XX,000 average spent before first customer" (illustrative)
    - "X months average time to validate an idea" (illustrative)
  - Each stat animates on scroll (fade-in-up with stagger)
  - Dark glass card with subtle border

- [x] Build `pipeline-section.tsx`
  - Headline: "How IdeationLab Works"
  - 3-step animated pipeline (scroll-triggered via `useInView`):
    1. **AI Interview** — Icon: MessageSquare
       - "We ask the questions investors will ask — in a 5-minute AI conversation"
    2. **Deep Research** — Icon: Search
       - "5 parallel AI researchers analyze your market, competitors, and timing"
    3. **Comprehensive Report** — Icon: FileText
       - "Get a business plan, competitive analysis, and financial model — in minutes"
  - Visual: numbered steps with connecting lines/arrows between them
  - Each step fades in sequentially on scroll (stagger-1, stagger-2, stagger-3)
  - Desktop: horizontal layout with arrows. Mobile: vertical stack with downward arrows

#### Key Files
- Create: `packages/web/src/app/(landing)/components/narrative-section.tsx`
- Create: `packages/web/src/app/(landing)/components/pipeline-section.tsx`

---

### Phase 4: Sample Report Showcase

**Goal:** Show a live HTML excerpt of a real report to prove the product's output quality.

#### Tasks

- [x] Build `report-showcase.tsx`
  - Headline: "See What You Get"
  - Embedded in a glass card styled as a "browser window" (fake title bar with dots)
  - Content: Live HTML mini-report for the B&B CRM idea, showing:
    - **Market Overview** header with TAM/SAM/SOM cards (adapt styling from `market-sizing.tsx`)
    - **Competitive Landscape** — 3 competitor cards in a grid
    - **Timing Analysis** — Verdict badge + 2-3 trend signals
  - Vertically scrollable within a fixed-height container (max-h-[500px] with overflow-y-auto)
  - Subtle gradient fade at bottom edge to indicate scrollability
  - Mobile: Same content, full-width, slightly shorter max-height
  - All data hardcoded (not fetched from API)

#### Key Files
- Create: `packages/web/src/app/(landing)/components/report-showcase.tsx`
- Reference: `packages/web/src/app/(dashboard)/projects/[id]/components/market-sizing.tsx` (styling patterns)

---

### Phase 5: Final CTA + Polish

**Goal:** Close the page with a strong CTA and polish responsive behavior, animations, and metadata.

#### Tasks

- [x] Build `final-cta-section.tsx` (`'use client'`)
  - Headline callback: "Don't be part of the 42%."
  - Subtext: "Join thousands of founders validating smarter."
  - Email capture form (same component/logic as hero, different copy)
  - Shares `localStorage` flag with hero (if submitted at hero, show success here too)

- [ ] Add new CSS to `globals.css` (only if needed)
  - Counter animation keyframes (for market size / viability score number rollup)
  - Browser window chrome styling for report showcase
  - Any new utility classes needed

- [x] SEO & metadata in `layout.tsx`
  - Page title: "IdeationLab — Validate Your Business Idea with AI"
  - Meta description: "Stop guessing. IdeationLab uses AI-powered deep research to validate your business idea in minutes. Market analysis, competitor intel, and timing signals."
  - Open Graph image (can be added later, use default for now)
  - Canonical URL: `https://ideationlab.ai`

- [ ] Responsive QA pass
  - Test all 6 sections on mobile (375px), tablet (768px), desktop (1280px+)
  - Verify demo input is thumb-friendly on mobile
  - Verify report showcase scrolls smoothly on touch devices
  - Verify animations don't cause layout shift (CLS)

- [x] Metadata capture enhancement
  - On email submit, include in `metadata` JSONB:
    - `referrer`: `document.referrer`
    - `utm_source`, `utm_medium`, `utm_campaign`: from URL search params
    - `demo_attempted`: boolean (did user interact with demo before submitting?)
    - `submission_location`: `'hero'` | `'final'` (which CTA?)
    - `device`: `'mobile'` | `'desktop'` (from viewport width)

#### Key Files
- Create: `packages/web/src/app/(landing)/components/final-cta-section.tsx`
- Modify: `packages/web/src/app/globals.css` (minimal additions)
- Modify: `packages/web/src/app/(landing)/layout.tsx` (metadata)
- Modify: `packages/web/src/app/api/waitlist/route.ts` (accept metadata field from client)

---

## CTA Swap Strategy

When ready to switch from waitlist → direct signup:

- **Mechanism:** Environment variable `NEXT_PUBLIC_CTA_MODE=waitlist|signup`
- **Default:** `waitlist`
- **When `signup`:** Button text changes to "Start Free", href changes to `/auth/signin`, form hides email input
- **Implementation:** Both hero and final CTA components read this env var
- **Swap process:** Change env var in Vercel dashboard → triggers redeploy → no code change needed

---

## Acceptance Criteria

### Functional Requirements
- [ ] Hero section displays urgency headline, email capture form, and live waitlist counter
- [ ] Email submission works end-to-end (POST → EmailCapture table → Beehiiv sync → success UI)
- [ ] Interactive demo accepts typed input or suggestion pill clicks
- [ ] Demo displays animated simulated results for 4 pre-baked examples (3 matched + 1 fallback)
- [ ] Keyword matching correctly routes similar inputs to the right example
- [ ] Fallback output clearly frames itself as a sample (not pretending to analyze the specific idea)
- [ ] Narrative section displays 3 pain-point statistics with scroll-triggered animation
- [ ] Pipeline section shows 3 steps with sequential scroll-triggered animation
- [ ] Report showcase displays live HTML mini-report in a scrollable container
- [ ] Final CTA repeats email capture with different copy
- [ ] Returning visitors (localStorage flag) see "You're already on the list" instead of forms
- [ ] Waitlist counter increments optimistically after user submission

### Non-Functional Requirements
- [ ] Page loads in <3s on 4G connection (no heavy animation libraries)
- [ ] All animations use CSS transitions/keyframes or requestAnimationFrame (no Framer Motion / GSAP)
- [ ] Scroll animations use IntersectionObserver (play once, no replay)
- [ ] WCAG AA: all interactive elements keyboard-accessible, proper aria-labels on form inputs
- [ ] No layout shift from animations (reserve space with min-height)

### Responsive Requirements
- [ ] Mobile (375px): All sections stack vertically, demo input is full-width, suggestion pills wrap
- [ ] Tablet (768px): 2-column layouts where appropriate
- [ ] Desktop (1280px+): Full horizontal layouts, pipeline steps side-by-side

---

## Design Constraints

- **Colors:** Use existing CSS variables only (`--primary`, `--accent`, `--background`, `--card`, `--border`)
- **Typography:** Space Grotesk (`font-display`) for section headlines, Inter (`font-sans`) for body
- **Components:** Reuse `.glass-card`, `.btn-ideationlab`, `.input-dark`, `.animate-fade-in-up`, stagger classes
- **Icons:** Lucide React (already in project)
- **No new dependencies** — CSS animations + IntersectionObserver only

---

## References

### Internal
- Current landing page: [page.tsx](../../packages/web/src/app/(landing)/page.tsx)
- Landing layout: [layout.tsx](../../packages/web/src/app/(landing)/layout.tsx)
- Waitlist API: [route.ts](../../packages/web/src/app/api/waitlist/route.ts)
- Global CSS: [globals.css](../../packages/web/src/app/globals.css)
- Market sizing component (styling reference): [market-sizing.tsx](../../packages/web/src/app/(dashboard)/projects/[id]/components/market-sizing.tsx)
- Spark results component (styling reference): [spark-results.tsx](../../packages/web/src/app/(dashboard)/projects/[id]/components/spark-results.tsx)
- DB schema (EmailCapture): [schema.ts:559](../../packages/server/src/db/schema.ts)

### Brainstorm
- [2026-02-12-landing-page-brainstorm.md](../brainstorms/2026-02-12-landing-page-brainstorm.md)
