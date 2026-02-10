# Idea Report Secondary Navigation

**Date:** 2026-02-06
**Status:** Ready for planning
**Author:** Matt + Claude

---

## What We're Building

Break the monolithic idea report page into sub-pages with a Supabase-style secondary sidebar navigation. Currently, all 17+ report sections render in a single scrollable page. The new design gives each section its own page, grouped under logical categories in an always-visible secondary menu.

### The Problem

- Report page is overwhelming — 17+ sections in one scroll
- No way to link directly to a specific section
- All data loads at once regardless of what the user wants to see
- No visual hierarchy distinguishing analysis from downloadable reports

### The Solution

A persistent secondary sidebar (Supabase-style) that appears when a user enters an idea from the Vault. Each menu item routes to its own sub-page with dedicated URL.

---

## Navigation Structure

```
OVERVIEW                          ← Category header
  Summary                         ← /ideas/[id]  (default landing)
  Business Fit                    ← /ideas/[id]/business-fit

MARKET                            ← Category header
  Market Analysis                 ← /ideas/[id]/market-analysis
  Market Sizing                   ← /ideas/[id]/market-sizing
  Why Now                         ← /ideas/[id]/why-now
  Keyword Trends                  ← /ideas/[id]/keyword-trends

VALIDATION                        ← Category header
  Proof Signals                   ← /ideas/[id]/proof-signals
  Social Proof                    ← /ideas/[id]/social-proof
  Pain Points                     ← /ideas/[id]/pain-points
  Competitors                     ← /ideas/[id]/competitors

STRATEGY                          ← Category header
  Offer / Value Ladder            ← /ideas/[id]/offer
  Tech Stack                      ← /ideas/[id]/tech-stack
  Action Prompts                  ← /ideas/[id]/action-prompts

HISTORY                           ← Category header
  Interview Summary               ← /ideas/[id]/interview-summary

─────────────────────────────────  ← Visual separator

REPORTS                           ← Category header (bottom section)
  Business Plan                   ← /ideas/[id]/reports/business-plan
  Positioning                     ← /ideas/[id]/reports/positioning
  Competitive Analysis            ← /ideas/[id]/reports/competitive-analysis
```

**Total: 15 sub-pages + layout**

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Menu visibility | Always visible | Supabase pattern — no toggle needed, consistent navigation |
| Default landing | Overview (Summary) | User sees scores + user story first, then drills into detail |
| Routing strategy | Nested route folders (Approach A) | Idiomatic Next.js App Router, per-page code splitting, shareable URLs |
| Data fetching | Fetch once in layout, share via context | Single tRPC call for idea+research, avoids waterfall requests |
| Business plan narrative | Stays in Overview | Quick context alongside scores without navigating to Reports |
| Report items behavior | Inline sub-page with status + action | Click shows preview, generation status, and Generate/Download button |
| Report items placement | Bottom of sidebar, visually separated | Distinguishes analysis (read) from reports (download/generate) |

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Icon Sidebar │ Secondary Sidebar  │  Content Area        │
│ (existing)   │                    │                      │
│              │  OVERVIEW          │  [Active sub-page    │
│  Home        │    Summary  ●      │   renders here]      │
│  Vault       │    Business Fit    │                      │
│  Reports     │                    │                      │
│  Settings    │  MARKET            │                      │
│              │    Market Analysis │                      │
│              │    Market Sizing   │                      │
│              │    Why Now         │                      │
│              │    Keyword Trends  │                      │
│              │                    │                      │
│              │  VALIDATION        │                      │
│              │    Proof Signals   │                      │
│              │    Social Proof    │                      │
│              │    Pain Points     │                      │
│              │    Competitors     │                      │
│              │                    │                      │
│              │  STRATEGY          │                      │
│              │    Offer           │                      │
│              │    Tech Stack      │                      │
│              │    Action Prompts  │                      │
│              │                    │                      │
│              │  HISTORY           │                      │
│              │    Interview       │                      │
│              │  ─────────────     │                      │
│              │  REPORTS           │                      │
│              │    Business Plan   │                      │
│              │    Positioning     │                      │
│              │    Comp. Analysis  │                      │
└─────────────────────────────────────────────────────────┘
```

---

## Why This Approach

1. **Nested routes** are idiomatic Next.js — the `[id]/layout.tsx` provides the sidebar, each section is a `page.tsx` that reuses existing components
2. **Fetch once in layout** avoids redundant API calls — the idea + research data is loaded once and shared via React context to all sub-pages
3. **Existing section components** (MarketSizing, Competitors, etc.) can be reused almost as-is — they just move from being inline sections to standalone pages
4. **Reports at the bottom** creates a clear mental model: top = analysis you read, bottom = documents you generate/download
5. **URL-based routing** enables deep linking, browser back/forward, and shareability

---

## File Structure (Proposed)

```
ideas/[id]/
├── layout.tsx                    ← Fetches data, provides context, renders sidebar + content
├── page.tsx                      ← Overview (Summary + Scores + Business Plan narrative)
├── business-fit/page.tsx
├── market-analysis/page.tsx
├── market-sizing/page.tsx
├── why-now/page.tsx
├── keyword-trends/page.tsx
├── proof-signals/page.tsx
├── social-proof/page.tsx
├── pain-points/page.tsx
├── competitors/page.tsx
├── offer/page.tsx
├── tech-stack/page.tsx
├── action-prompts/page.tsx
├── interview-summary/page.tsx
├── reports/
│   ├── business-plan/page.tsx
│   ├── positioning/page.tsx
│   └── competitive-analysis/page.tsx
└── components/
    ├── idea-secondary-nav.tsx    ← The Supabase-style sidebar component
    ├── idea-data-provider.tsx    ← React context for shared idea/research data
    └── ... (existing section components)
```

---

## Additional Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Empty sections | Always show all items | Sections with no data show empty state + prompt to run research. User sees full scope. |
| Spark mode | Different menu structure | Spark ideas have unique sections (verdict, reddit signals, facebook groups) — show a Spark-specific sidebar |

## Open Questions

1. **Mobile responsive behavior** — The menu is always visible on desktop, but what happens on mobile? Sheet/drawer? Different layout entirely?
2. **Active state indicator** — Should the sidebar show completion indicators (checkmarks, dots) for sections that have data vs. those that are empty?
3. **Spark menu structure** — Exact categories and items for Spark-specific sidebar (to be defined during planning)

---

## Next Steps

Run `/workflows:plan` to create the implementation plan with specific file changes, component designs, and build sequence.
