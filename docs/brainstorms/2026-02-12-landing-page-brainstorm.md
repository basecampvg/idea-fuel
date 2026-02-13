# Landing Page for Lead Capture — Brainstorm

**Date:** 2026-02-12
**Status:** Ready for planning
**Brand:** IdeationLab (ideationlab.ai)

---

## What We're Building

A high-conversion landing page for IdeationLab that captures entrepreneur leads (email waitlist now, direct signup later). The page blends an **interactive simulated demo** with **urgency-driven narrative storytelling** to make entrepreneurs feel "I need this NOW."

### Target Audience
- Entrepreneurs validating business ideas
- Solo founders and early-stage teams
- Top-of-funnel leads who haven't committed to a tool yet

### Core Emotional Hook
**Urgency** — Show them what they're risking by NOT validating their ideas properly. The 42% startup failure stat (from no market need) is the narrative anchor.

---

## Page Structure (Top to Bottom)

### 1. Hero Section + CTA
- Bold urgency headline (e.g., "42% of startups fail because they skip this step.")
- Subtext positioning IdeationLab as the fix
- Email capture form (waitlist mode now, swappable to direct signup later)
- Design: Existing mint green accent, Space Grotesk display font, animated entrance

### 2. Interactive Demo ("The Typewriter")
- Text input where visitors type a business idea (or pick from suggestions)
- On submit, a **simulated report preview** animates in section-by-section:
  - Market size estimate (animated counter)
  - Top 3 competitors (cards sliding in)
  - Timing verdict (green/yellow/red indicator)
  - Overall viability score
- Pre-baked outputs (3-5 convincing examples) mapped to keyword matching
- Fallback: If typed idea doesn't match, use a default compelling output
- Purpose: Let visitors *feel* the product before signing up
- No real API calls — zero cost per visitor

### 3. Narrative Bridge
- Transition from demo to storytelling: "That took 8 seconds. Most founders spend 8 months guessing."
- Brief stats/pain points about idea validation failures
- Sets up the "how it works" section

### 4. Feature Walkthrough (Pipeline Animation)
- Three-step animated pipeline:
  1. **AI Interview** — "We ask the questions investors will ask"
  2. **Deep Research** — "5 parallel AI researchers analyze your market"
  3. **Comprehensive Report** — "Business plan, competitive analysis, financial model"
- Each step animates on scroll (fade-in-up with stagger)
- Include small visual previews (mock UI screenshots or stylized illustrations)

### 5. Sample Report Showcase
- Embedded scrollable card showing a real (or realistic) report excerpt
- Highlights: TAM/SAM/SOM visualization, competitor grid, timing analysis
- "This is what you get" moment — tangible proof of output quality

### 6. Pricing Preview
- Three tiers displayed (FREE / PRO / ENTERPRISE)
- Aligned with existing InterviewMode + Subscription tier logic:
  - FREE: Lightning mode, basic report
  - PRO: Light + In-Depth interviews, pro/full reports
  - ENTERPRISE: Full suite, priority processing
- "Coming soon" or "Join waitlist for early access pricing" if not finalized

### 7. Final CTA
- Repeat email capture with stronger urgency copy
- "Don't be the 42%" or similar callback to hero narrative

---

## Why This Approach

**Blend of Approach A (Typewriter Demo) + Approach B (Scroll Story):**

- The interactive demo provides the instant wow moment — visitors experience the product's value in seconds
- The narrative storytelling builds emotional urgency between sections, preventing the page from feeling like a generic SaaS feature list
- Simulated demo means zero API costs and full control over the quality of the preview
- Staged CTA design (waitlist now, signup later) means the page works pre-launch AND post-launch

**Why not pure interactive or pure narrative:**
- Interactive alone feels like a gimmick without the story context
- Narrative alone misses the visceral "I need to try this" moment
- The blend lets each section reinforce the other

---

## Key Decisions

1. **CTA Strategy:** Waitlist email capture now, designed to swap to direct signup button later (same form component, different endpoint)
2. **Demo is fully simulated:** Pre-baked outputs animated in, no API calls. 3-5 keyword-matched examples with a smart fallback.
3. **Brand name:** IdeationLab (keep current, matches domain ideationlab.ai)
4. **Social proof:** None available yet — substitute with problem stats (42% failure rate, average validation cost/time) and "Join X others on the waitlist" counter
5. **Pricing:** Include a preview section even if tiers aren't finalized — sets expectations and qualifies leads
6. **No frontend-design skill file exists** — design patterns are inferred from existing codebase (mint green accent, Space Grotesk headings, dark theme, `.btn-forge`, `.glass-card`, `.animate-fade-in-up`)

---

## Resolved Questions

1. **Pre-baked demo outputs:** Primary example: "Custom CRM for the bed and breakfast industry" — a niche vertical SaaS idea that feels specific and believable. Add 2-3 fallback examples for keyword matching variety.
2. **Pricing tiers:** Placeholder tiers only — show FREE / PRO / ENTERPRISE with feature lists but no dollar amounts. Use "Coming soon" or "Join waitlist for early pricing" language.
3. **Waitlist counter:** Yes, show real count — "Join X entrepreneurs on the waitlist" pulled live from the database.
4. **Blog integration:** No blog on the landing page — keep it purely conversion-focused. Blog accessible via header/footer nav only.
5. **Responsive strategy:** Equal priority — desktop and mobile must both be excellent. The interactive demo needs thoughtful adaptation for small screens (simplified layout, tap-friendly interactions).

---

## Technical Notes

- **Existing foundation:** `packages/web/src/app/(landing)/page.tsx` already has hero + waitlist form + value cards
- **Route group:** `(landing)` with its own layout (minimal header, no sidebar)
- **Waitlist endpoint:** `/api/waitlist` already exists
- **Middleware:** Subdomain routing configured (root domain serves landing page)
- **Animation system:** `animate-fade-in-up`, stagger classes, and CSS keyframes already in `globals.css`
- **Components available:** Button (7 variants), Card, Badge, existing `.btn-forge` and `.glass-card` classes

---

## Next Step

Run `/workflows:plan` to create the implementation plan for this landing page.
