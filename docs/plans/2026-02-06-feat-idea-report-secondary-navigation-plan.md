---
title: "feat: Idea Report Secondary Navigation"
type: feat
date: 2026-02-06
deepened: 2026-02-06
brainstorm: docs/brainstorms/2026-02-06-idea-report-secondary-nav-brainstorm.md
---

# feat: Idea Report Secondary Navigation

## Enhancement Summary

**Deepened on:** 2026-02-06
**Sections enhanced:** 7
**Research sources:** Next.js App Router docs (Context7), architecture review, simplicity review, performance analysis, TypeScript patterns, frontend design skill, SpecFlow analysis

### Key Improvements from Research
1. **Eliminate explicit React context** — use tRPC React Query's built-in cache deduplication instead of a custom `IdeaDataProvider`. Each sub-page calls `useQuery` with the same key; React Query deduplicates automatically.
2. **Server + Client Component split for layout** — follow the admin pattern exactly: Server Component layout wrapping a Client Component, not a `'use client'` layout directly.
3. **Prevent context re-render cascades** — use React Query's `select` option in sub-pages to subscribe only to the data they need, preventing full re-renders on poll updates.
4. **Sidebar design differentiation** — give the idea sidebar its own visual identity (left accent border on active item, idea status indicator in header) rather than cloning admin sidebar exactly.

### Simplifications Applied
- **Removed:** Explicit `IdeaDataProvider` React context (React Query handles this)
- **Deferred to Phase 5:** Spark sidebar variant, admin config integration, mobile responsive
- **Simplified:** Empty state component — single generic component, not status-aware initially

---

## Overview

Break the monolithic idea report page (`ideas/[id]/page.tsx` + `status-complete.tsx`, 486 lines rendering 17+ sections) into individual sub-pages navigated via a Supabase-style secondary sidebar. Each section gets its own URL, enabling deep linking, code splitting, and a less overwhelming user experience.

## Problem Statement

The current idea detail page renders all 17+ analysis sections in a single scrollable page. This creates:

1. **Information overload** — users must scroll through everything to find specific sections
2. **No deep linking** — can't share or bookmark a specific section like Market Sizing
3. **No code splitting** — all 28 section components are eagerly loaded regardless of what the user wants to view
4. **No visual hierarchy** — analysis sections and downloadable reports are mixed together

## Proposed Solution

A persistent secondary sidebar (always visible, Supabase-style) that renders inside `ideas/[id]/layout.tsx`. Each section becomes its own routed page under the `[id]` folder. Data is fetched once via tRPC React Query (auto-deduplicated) and consumed by each sub-page independently.

### Navigation Structure

```
OVERVIEW                           /ideas/[id]               (default)
  Business Fit                     /ideas/[id]/business-fit

MARKET
  Market Analysis                  /ideas/[id]/market-analysis
  Market Sizing                    /ideas/[id]/market-sizing
  Why Now                          /ideas/[id]/why-now
  Keyword Trends                   /ideas/[id]/keyword-trends

VALIDATION
  Proof Signals                    /ideas/[id]/proof-signals
  Social Proof                     /ideas/[id]/social-proof
  Pain Points                      /ideas/[id]/pain-points
  Competitors                      /ideas/[id]/competitors

STRATEGY
  Offer / Value Ladder             /ideas/[id]/offer
  Tech Stack                       /ideas/[id]/tech-stack
  Action Prompts                   /ideas/[id]/action-prompts

HISTORY
  Interview Summary                /ideas/[id]/interview-summary

─────────────────────────────────
REPORTS
  Business Plan                    /ideas/[id]/reports/business-plan
  Positioning                      /ideas/[id]/reports/positioning
  Competitive Analysis             /ideas/[id]/reports/competitive-analysis
```

**15 sub-pages + 1 layout**

### Layout Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Icon Sidebar (60px) │ Idea Sidebar (240px) │ Content Area     │
│ (existing, fixed)   │ (new, fixed)         │ (ml-[300px])     │
│                     │                      │                  │
│  [Forge icon]       │  ← Back to Vault     │  [Active page    │
│  [Vault]            │  "Idea Title"        │   renders here]  │
│  [DailyPick]        │  ● COMPLETE          │                  │
│  [Settings]         │                      │                  │
│                     │  OVERVIEW            │                  │
│                     │  ▎ Summary  ●        │                  │
│                     │    Business Fit      │                  │
│                     │                      │                  │
│                     │  MARKET              │                  │
│                     │    Market Analysis   │                  │
│                     │    ...               │                  │
│                     │                      │                  │
│                     │  ─────────────       │                  │
│                     │  REPORTS             │                  │
│                     │    Business Plan     │                  │
│                     │    Positioning       │                  │
│                     │    Comp. Analysis    │                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Architecture

**Precedent: Admin Layout Pattern**

The admin section already implements this exact pattern:
- `admin/layout.tsx` — Server Component, handles auth, wraps `AdminLayoutClient`
- `admin/admin-layout-client.tsx` — Client Component, renders `AdminSidebar` + content with `ml-[260px]`
- `components/layout/admin-sidebar.tsx` — 260px sidebar with sectioned navigation (NavSection/NavItem interfaces)
- `components/layout/conditional-sidebar.tsx` — Hides main sidebar on `/admin` routes

We replicate this pattern for `ideas/[id]/`:
- `ideas/[id]/layout.tsx` — Server Component wrapper (thin, just wraps client component)
- `ideas/[id]/components/idea-layout-client.tsx` — Client Component, fetches data, renders sidebar + content
- `ideas/[id]/components/idea-secondary-nav.tsx` — 240px sidebar following `admin-sidebar.tsx` structure
- `conditional-sidebar.tsx` — No changes needed (main sidebar stays visible on idea routes)

**Key difference from admin:** Admin hides the main sidebar and uses `ml-[260px]`. The idea detail keeps the main sidebar (60px) and adds the secondary sidebar (240px), using `ml-[300px]` for content.

### Research Insights: Layout Architecture

**Server + Client Component Split (from Next.js docs)**

Next.js App Router best practice is to keep `layout.tsx` as a Server Component and delegate client interactivity to a child Client Component. This matches the admin pattern exactly:

```typescript
// ideas/[id]/layout.tsx — Server Component (no 'use client')
import { IdeaLayoutClient } from './components/idea-layout-client';

export default function IdeaLayout({ children }: { children: React.ReactNode }) {
  return <IdeaLayoutClient>{children}</IdeaLayoutClient>;
}
```

```typescript
// ideas/[id]/components/idea-layout-client.tsx — Client Component
'use client';
import { use } from 'react';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { IdeaSecondaryNav } from './idea-secondary-nav';
import { IdeaHeader } from './idea-header';
import { LoadingScreen } from '@/components/ui/spinner';

export function IdeaLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const isInterviewPage = pathname?.includes('/interview');

  const { data: idea, isLoading, error } = trpc.idea.get.useQuery(
    { id },
    { refetchInterval: (data) => data?.status === 'RESEARCHING' ? 3000 : false }
  );

  if (isLoading) return <LoadingScreen message="Loading idea..." />;
  if (error || !idea) return <ErrorCard message={error?.message} />;

  if (isInterviewPage) return <>{children}</>;

  return (
    <>
      <IdeaSecondaryNav idea={idea} ideaId={id} />
      <div className="ml-[300px] min-h-screen">
        <div className="max-w-[1120px] mx-auto px-6 py-8">
          <IdeaHeader idea={idea} />
          {children}
        </div>
      </div>
    </>
  );
}
```

**Why this matters:** A `'use client'` layout would force all children to be Client Components and prevent any Server Component optimization in sub-pages. The Server → Client wrapper preserves the option.

### Research Insights: Data Sharing Without Explicit Context

**React Query cache deduplication (simplicity improvement)**

The original plan proposed a `IdeaDataProvider` React context. After review, this is unnecessary — tRPC's React Query already deduplicates queries with the same key:

```typescript
// In layout client:
trpc.idea.get.useQuery({ id }); // Fetches data

// In any sub-page:
trpc.idea.get.useQuery({ id }); // Returns cached data instantly (no network request)
```

React Query guarantees:
- Same query key = shared cache entry
- If the layout already fetched, sub-pages get instant cached data
- Polling in the layout automatically updates all subscribers
- No extra React context layer, no custom provider

**Per-page selective subscription (performance improvement)**

Use React Query's `select` option to prevent unnecessary re-renders when polling updates data a sub-page doesn't care about:

```typescript
// competitors/page.tsx — only re-renders when competitors data changes
const { data: competitors } = trpc.idea.get.useQuery(
  { id },
  { select: (idea) => idea.research?.competitors }
);
```

This means when polling updates the research object (e.g., `progress` field changes), the Competitors page won't re-render unless `competitors` actually changed.

### Data Flow (Revised)

```
ideas/[id]/layout.tsx (Server Component)
└─ IdeaLayoutClient (Client Component)
   ├─ trpc.idea.get.useQuery({ id })      ← Fetches + polls (React Query cache)
   ├─ <IdeaSecondaryNav idea={idea} />     ← Sidebar (hidden on /interview route)
   ├─ <IdeaHeader idea={idea} />           ← Header above all sub-pages
   └─ <div className="ml-[300px]">
        {children}                         ← Sub-page calls same useQuery (cache hit)
      </div>
```

**Polling during research:** The layout handles polling. React Query's shared cache means sub-pages automatically get updated data:
```typescript
const { data: idea } = trpc.idea.get.useQuery({ id }, {
  refetchInterval: (query) => query.state.data?.status === 'RESEARCHING' ? 3000 : false,
});
```

**Interview page exclusion:** The layout conditionally hides the sidebar and removes the left margin when pathname includes `/interview`. This matches the `ConditionalSidebar` pattern.

### Research Insights: Performance

**Code splitting is automatic.** Next.js App Router code-splits each `page.tsx` by route segment. The current monolithic page eagerly imports all 28 components. The new approach means navigating to `/market-sizing` only loads the MarketSizing component.

**Navigation is instant.** Client-side navigation between sub-pages doesn't trigger new data fetches (cache hit). React Query's `staleTime` defaults handle freshness. The only network activity is the 3s polling during RESEARCHING status.

**Bundle overhead is negligible.** 15 new page.tsx files at ~20-30 lines each add minimal code. The routing metadata is already part of Next.js's build manifest.

### Implementation Phases

#### Phase 1: Foundation (Infrastructure)

Create the core infrastructure: layout, sidebar component.

**Tasks:**

- [x] Create `ideas/[id]/layout.tsx` — Server Component wrapper
  - Thin wrapper that renders `IdeaLayoutClient`
  - Passes `params` and `children` through

- [x] Create `ideas/[id]/components/idea-layout-client.tsx` — Client Component
  - `'use client'` directive
  - Fetches idea via `trpc.idea.get.useQuery({ id })`
  - Polling: `refetchInterval` when status is RESEARCHING
  - Conditionally hides sidebar when pathname includes `/interview`
  - Renders `<IdeaSecondaryNav>` + `<IdeaHeader>` + content wrapper with `ml-[240px]`
  - Loading state: centered spinner
  - Error state: error card with back link

- [x] Create `ideas/[id]/components/idea-secondary-nav.tsx`
  - Follow `admin-sidebar.tsx` structure: `NavSection[]` with `NavItem[]`
  - Fixed position at `left: 60px`, width `240px`, `h-screen`, `overflow-y-auto`
  - Header: back arrow link to `/ideas` + idea title (truncated) + status badge
  - Category headers: OVERVIEW, MARKET, VALIDATION, STRATEGY, HISTORY
  - Separator + REPORTS section at bottom
  - Active item: left border accent (`border-l-2 border-primary`) + `bg-primary/10 text-primary`
  - Inactive items: `text-muted-foreground hover:bg-muted/50`
  - Each item is a `<Link>` with `href` built from `ideaId`
  - Lucide icons per section (see icon map below)

**Sidebar Icon Map:**
| Section | Icon | Lucide Name |
|---------|------|-------------|
| Summary | `LayoutDashboard` | Overview/dashboard |
| Business Fit | `Target` | Fit assessment |
| Market Analysis | `TrendingUp` | Market trends |
| Market Sizing | `PieChart` | TAM/SAM/SOM |
| Why Now | `Clock` | Timing |
| Keyword Trends | `Search` | Search trends |
| Proof Signals | `Radio` | Signals |
| Social Proof | `Users` | Social |
| Pain Points | `AlertTriangle` | Pain |
| Competitors | `Swords` | Competition |
| Offer | `Layers` | Value ladder |
| Tech Stack | `Code` | Technology |
| Action Prompts | `Zap` | Actions |
| Interview Summary | `MessageSquare` | Chat |
| Business Plan (report) | `FileText` | Document |
| Positioning (report) | `Compass` | Direction |
| Competitive Analysis (report) | `BarChart3` | Analysis |

- [x] Verify no changes needed to `conditional-sidebar.tsx`
  - Main icon sidebar should remain visible on idea detail routes
  - Currently only hides on `/admin` — no change needed

**Success criteria:** Navigating to `/ideas/[id]` shows the secondary sidebar alongside the main icon sidebar. The existing page.tsx renders in the content area. No visual regressions on other pages.

#### Phase 2: Overview Page (Refactor page.tsx)

Transform the current monolithic `page.tsx` into the Overview sub-page.

**Tasks:**

- [x] Refactor `ideas/[id]/page.tsx` to become the Overview
  - Remove `trpc.idea.get.useQuery()` — use same query key (cache hit from layout)
  - Remove loading/error states — layout handles these
  - Keep status branching logic:
    - `CAPTURED` → `<StatusCaptured />` (interview mode selection)
    - `INTERVIEWING` → `<StatusInterviewing />`
    - `RESEARCHING` → `<SparkProgress />` or `<StatusResearching />`
    - `COMPLETE` (regular) → Summary view: `<UserStory />` + `<ScoreCards />` + `<BusinessPlanSection />`
    - `COMPLETE` (spark) → `<SparkResults />` + `<NextStepPromotion />`
  - Remove the 17 section renders from COMPLETE status — those move to sub-pages
  - Keep delete functionality and actions bar
  - Move backfill banner here (from status-complete.tsx)

- [x] Move `<IdeaHeader />` rendering to the layout client component
  - Renders above `{children}` for consistency across all sub-pages

### Research Insight: TypeScript Pattern for Sub-Pages

Use a custom hook that wraps `trpc.idea.get.useQuery` with the `select` option for type-safe, performant data access:

```typescript
// ideas/[id]/components/use-idea-section.ts
'use client';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export function useIdeaSection<T>(
  selector: (idea: IdeaGetOutput) => T | null | undefined
) {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = trpc.idea.get.useQuery(
    { id: params.id },
    { select: selector }
  );
  return { data: data ?? null, isLoading };
}

// Usage in market-sizing/page.tsx:
const { data } = useIdeaSection((idea) => idea.research?.marketSizing as MarketSizingData | null);
```

**Benefits:**
- Type-safe selector per sub-page
- Automatic React Query deduplication (same query key as layout)
- `select` prevents re-renders when unrelated data changes
- No need for `useParams` in every page — encapsulated in the hook

**Success criteria:** `/ideas/[id]` shows a clean Overview with status-appropriate content. The sidebar navigation works. Section components are no longer rendered inline.

#### Phase 3: Analysis Sub-Pages (13 pages)

Each sub-page is a thin wrapper that consumes the shared query and renders the existing component.

**Pattern for each sub-page:**

```typescript
// ideas/[id]/market-sizing/page.tsx
'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { MarketSizing } from '../components/market-sizing';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { SectionEmptyState } from '../components/section-empty-state';
import type { MarketSizingData } from '@forge/shared';

export default function MarketSizingPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.marketSizing as MarketSizingData | null
  );
  const panes = useDashboardConfig();

  if (!data) {
    return <SectionEmptyState section="Market Sizing" />;
  }

  return (
    <MarketSizing
      marketSizing={data}
      title={panes.marketSizing.title}
      subtitle={panes.marketSizing.subtitle}
    />
  );
}
```

**Tasks:**

- [x] Create `ideas/[id]/components/use-idea-section.ts` — shared hook with `select`
- [x] Create `ideas/[id]/components/section-empty-state.tsx`
  - Generic empty state: icon + "No data available yet" + subtle explanation
  - Keep it simple initially — don't branch by status (YAGNI). Can enhance later.

- [x] Create `ideas/[id]/business-fit/page.tsx` — wraps `<BusinessFit />`
- [x] Create `ideas/[id]/market-analysis/page.tsx` — wraps `<MarketAnalysis />`
- [x] Create `ideas/[id]/market-sizing/page.tsx` — wraps `<MarketSizing />` (empty state — component not on this branch)
- [x] Create `ideas/[id]/why-now/page.tsx` — wraps `<WhyNowSection />`
- [x] Create `ideas/[id]/keyword-trends/page.tsx` — wraps `<KeywordChart />`
- [x] Create `ideas/[id]/proof-signals/page.tsx` — wraps `<ProofSignals />`
- [x] Create `ideas/[id]/social-proof/page.tsx` — wraps `<SocialProofSection />`
- [x] Create `ideas/[id]/pain-points/page.tsx` — wraps `<PainPointsSection />`
- [x] Create `ideas/[id]/competitors/page.tsx` — wraps `<CompetitorsSection />`
- [x] Create `ideas/[id]/offer/page.tsx` — wraps `<OfferSection />`
- [x] Create `ideas/[id]/tech-stack/page.tsx` — wraps `<TechStackSection />` (empty state — component not on this branch)
- [x] Create `ideas/[id]/action-prompts/page.tsx` — wraps `<ActionPrompts />`
- [x] Create `ideas/[id]/interview-summary/page.tsx` — wraps interview summary card (extracted from status-complete.tsx)

**Success criteria:** All 13 sub-pages render their section component with data from React Query cache. Empty states show when data is missing. Sidebar highlights the active page.

#### Phase 4: Report Sub-Pages (3 pages)

Report sub-pages show generation status + preview + Generate/Download actions.

**Tasks:**

- [x] Create shared `ideas/[id]/components/report-page.tsx`
  - Reusable component for all 3 report sub-pages
  - Props: `reportType`, `title`
  - Uses existing `DownloadCard` component (which handles all states: locked/ready/generating/error)
  - Uses `useIdea` hook for data access

- [x] Create `ideas/[id]/reports/business-plan/page.tsx` — `<ReportPage type="BUSINESS_PLAN" />`
- [x] Create `ideas/[id]/reports/positioning/page.tsx` — `<ReportPage type="POSITIONING" />`
- [x] Create `ideas/[id]/reports/competitive-analysis/page.tsx` — `<ReportPage type="COMPETITIVE_ANALYSIS" />`

### Research Insight: Report Page States

```typescript
// Report sub-page state machine:
type ReportState =
  | { status: 'locked'; reason: string }        // Research not complete
  | { status: 'not_generated' }                  // Ready to generate
  | { status: 'generating'; progress?: number }  // In progress
  | { status: 'complete'; report: Report }       // Ready to download
  | { status: 'failed'; error: string }          // Generation failed

function getReportState(idea: Idea, reportType: string): ReportState {
  if (!idea.research || idea.research.status !== 'COMPLETE') {
    return { status: 'locked', reason: 'Complete research to unlock reports' };
  }
  const report = idea.reports?.find(r => r.type === reportType);
  if (!report) return { status: 'not_generated' };
  if (report.status === 'GENERATING') return { status: 'generating' };
  if (report.status === 'FAILED') return { status: 'failed', error: 'Generation failed' };
  return { status: 'complete', report };
}
```

**Success criteria:** Each report sub-page shows the correct status and allows generation/download. The REPORTS section in the sidebar is visually separated from analysis sections.

#### Phase 5: Polish and Edge Cases (Deferred Items)

These items are tracked but intentionally deferred to keep Phases 1-4 focused:

- [ ] **Spark mode sidebar** — When idea has `sparkStatus`, render a different sidebar structure with Spark-specific sections (Verdict, Trend Signal, Reddit Signals, Facebook Groups). Create Spark-specific sub-pages as needed.

- [ ] **Admin config integration** — When `useDashboardConfig()` sets a section to `visible: false`, hide the corresponding sidebar item.

- [ ] **Mobile responsive** — On screens < 768px, hide the secondary sidebar and show a dropdown or sheet for section navigation.

- [ ] **Status-aware empty states** — Enhance the generic empty state to show contextual messages based on idea status (CAPTURED: "Start an interview", RESEARCHING: "Research in progress with progress %").

- [ ] **Delete `status-complete.tsx`** — Once all sections are confirmed working in sub-pages, remove this 486-line file.

- [ ] **Update backfill banner** — Move to Overview page or layout.

---

## Acceptance Criteria

### Functional Requirements

- [ ] Clicking an idea in the Vault shows the Overview page with the secondary sidebar visible
- [ ] Each of the 15 sidebar items navigates to its own URL-routed sub-page
- [ ] The Overview page is the default landing (`/ideas/[id]`)
- [ ] All sub-page URLs are shareable and bookmarkable (deep linking works)
- [ ] Browser back/forward navigates between visited sub-pages
- [ ] Data is fetched once — React Query deduplicates across layout and sub-pages
- [ ] The sidebar highlights the currently active section
- [ ] Sections without data show an empty state
- [ ] All sidebar items are always visible regardless of data availability
- [ ] REPORTS section is visually separated at the bottom of the sidebar
- [ ] Report sub-pages show generation status and Generate/Download actions
- [ ] The interview page (`/ideas/[id]/interview`) does NOT show the secondary sidebar
- [ ] The main icon sidebar remains visible alongside the secondary sidebar

### Non-Functional Requirements

- [ ] Each sub-page loads only the component it needs (automatic Next.js code splitting by route)
- [ ] No visual regressions on non-idea-detail pages (Vault, Dashboard, Admin, etc.)
- [ ] Sub-pages using `select` only re-render when their specific data changes
- [ ] Type safety — `useIdeaSection()` returns properly typed data via selector

---

## File Inventory

### New Files (22)

| File | Purpose |
|------|---------|
| `ideas/[id]/layout.tsx` | Server Component wrapper |
| `ideas/[id]/components/idea-layout-client.tsx` | Client Component: data fetching, sidebar, content wrapper |
| `ideas/[id]/components/idea-secondary-nav.tsx` | Supabase-style secondary sidebar |
| `ideas/[id]/components/use-idea-section.ts` | Shared hook: useQuery + select for sub-pages |
| `ideas/[id]/components/section-empty-state.tsx` | Empty state for sections without data |
| `ideas/[id]/components/report-page.tsx` | Reusable report sub-page component |
| `ideas/[id]/business-fit/page.tsx` | Business Fit sub-page |
| `ideas/[id]/market-analysis/page.tsx` | Market Analysis sub-page |
| `ideas/[id]/market-sizing/page.tsx` | Market Sizing sub-page |
| `ideas/[id]/why-now/page.tsx` | Why Now sub-page |
| `ideas/[id]/keyword-trends/page.tsx` | Keyword Trends sub-page |
| `ideas/[id]/proof-signals/page.tsx` | Proof Signals sub-page |
| `ideas/[id]/social-proof/page.tsx` | Social Proof sub-page |
| `ideas/[id]/pain-points/page.tsx` | Pain Points sub-page |
| `ideas/[id]/competitors/page.tsx` | Competitors sub-page |
| `ideas/[id]/offer/page.tsx` | Offer / Value Ladder sub-page |
| `ideas/[id]/tech-stack/page.tsx` | Tech Stack sub-page |
| `ideas/[id]/action-prompts/page.tsx` | Action Prompts sub-page |
| `ideas/[id]/interview-summary/page.tsx` | Interview Summary sub-page |
| `ideas/[id]/reports/business-plan/page.tsx` | Business Plan report page |
| `ideas/[id]/reports/positioning/page.tsx` | Positioning report page |
| `ideas/[id]/reports/competitive-analysis/page.tsx` | Competitive Analysis report page |

### Modified Files (2)

| File | Change |
|------|--------|
| `ideas/[id]/page.tsx` | Refactor from monolithic page to Overview sub-page |
| `ideas/[id]/components/status-complete.tsx` | Remove section rendering (sections move to sub-pages). Delete in Phase 5. |

### Existing Components (Reused As-Is)

| Component | Used By Sub-Page |
|-----------|-----------------|
| `business-fit.tsx` | `/business-fit` |
| `market-analysis.tsx` | `/market-analysis` |
| `market-sizing.tsx` | `/market-sizing` |
| `why-now-section.tsx` | `/why-now` |
| `keyword-chart.tsx` | `/keyword-trends` |
| `proof-signals.tsx` | `/proof-signals` |
| `social-proof-section.tsx` | `/social-proof` |
| `pain-points-section.tsx` | `/pain-points` |
| `competitors-section.tsx` | `/competitors` |
| `offer-section.tsx` | `/offer` |
| `tech-stack-section.tsx` | `/tech-stack` |
| `action-prompts.tsx` | `/action-prompts` |
| `score-cards.tsx` | Overview page |
| `user-story.tsx` | Overview page |
| `business-plan-section.tsx` | Overview page |
| `status-captured.tsx` | Overview page (CAPTURED status) |
| `status-interviewing.tsx` | Overview page (INTERVIEWING status) |
| `status-researching.tsx` | Overview page (RESEARCHING status) |
| `spark-results.tsx` | Overview page (Spark COMPLETE) |
| `spark-progress.tsx` | Overview page (Spark RESEARCHING) |
| `idea-header.tsx` | Layout client (renders above all sub-pages) |
| `download-card.tsx` | Report sub-pages |
| `report-grid.tsx` | Report sub-pages |
| `next-step-promotion.tsx` | Overview page |

---

## Data Model Reference

The `trpc.idea.get` query returns:

```typescript
{
  id: string;
  title: string;
  description: string;
  status: 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';
  interviews: Interview[];
  reports: Report[];
  research: Research | null;  // Contains all 30+ analysis fields
  createdAt: Date;
  updatedAt: Date;
}
```

**Sub-page → data field mapping:**

| Sub-Page | Research Field(s) | Select Expression |
|----------|-------------------|-------------------|
| Overview | `userStory`, `businessPlan`, scores | `(idea) => ({ userStory: idea.research?.userStory, ... })` |
| Business Fit | `revenuePotential`, `executionDifficulty`, `gtmClarity`, `founderFit` | `(idea) => ({ ...businessFitFields })` |
| Market Analysis | `marketAnalysis` | `(idea) => idea.research?.marketAnalysis` |
| Market Sizing | `marketSizing` | `(idea) => idea.research?.marketSizing` |
| Why Now | `whyNow` | `(idea) => idea.research?.whyNow` |
| Keyword Trends | `keywordTrends` | `(idea) => idea.research?.keywordTrends` |
| Proof Signals | `proofSignals` | `(idea) => idea.research?.proofSignals` |
| Social Proof | `socialProof` | `(idea) => idea.research?.socialProof` |
| Pain Points | `painPoints` | `(idea) => idea.research?.painPoints` |
| Competitors | `competitors` | `(idea) => idea.research?.competitors` |
| Offer | `valueLadder` | `(idea) => idea.research?.valueLadder` |
| Tech Stack | `techStack` | `(idea) => idea.research?.techStack` |
| Action Prompts | `actionPrompts` | `(idea) => idea.research?.actionPrompts` |
| Interview Summary | `idea.interviews[]` | `(idea) => idea.interviews` |
| Reports/* | `idea.reports[]` | `(idea) => idea.reports` |

---

## Edge Cases & SpecFlow Findings

### Status-Specific Sidebar Behavior

| Status | Sidebar | Overview Content | Sub-Pages |
|--------|---------|-----------------|-----------|
| CAPTURED | All items visible | Interview mode selection (Lightning/Light/In-Depth) | Empty state |
| INTERVIEWING | All items visible | Interview progress card | Empty state |
| RESEARCHING | All items visible | Research progress (polls every 3s) | Empty state (data fills progressively) |
| COMPLETE | All items visible | Summary + Scores + Business Plan narrative | Full section data |
| FAILED | All items visible | Error card + retry options | Partial data where available |

### Interview Page Exclusion

The layout client conditionally hides sidebar when pathname includes `/interview`:

```typescript
const pathname = usePathname();
const isInterviewPage = pathname?.includes('/interview');

if (isInterviewPage) return <>{children}</>; // Full-width, no sidebar
```

### Report Prerequisites

Report sub-pages use a state machine (see Phase 4 research insight):
- **No research** → Locked state: "Complete research to unlock reports"
- **Research in progress** → Locked state: "Reports available after research completes"
- **Research complete, report not generated** → "Generate" button
- **Report generating** → Spinner + "Generating..." status
- **Report complete** → Preview + Download button
- **Report failed** → Error + Regenerate button

### Other 7 Report Types

The sidebar shows 3 primary reports (Business Plan, Positioning, Competitive Analysis). The remaining 7 report types remain accessible via a "View All Reports" link on the Overview page. No feature regression.

### Research Insight: Preventing Stale Navigation

When a user navigates directly to a sub-page URL (e.g., bookmarked `/ideas/[id]/competitors`):
1. Layout mounts and fires `trpc.idea.get.useQuery({ id })`
2. Sub-page also fires `trpc.idea.get.useQuery({ id })` — React Query deduplicates to single request
3. Both receive data simultaneously when the request completes
4. No waterfall — layout and sub-page are not sequential

This is better than the context approach where the sub-page would need to wait for the layout's context to be populated.

---

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Layout wraps interview page with sidebar | Conditional rendering based on pathname (proven pattern in ConditionalSidebar) |
| React Query cache miss on direct navigation | Layout and sub-page both call useQuery — React Query deduplicates to single request |
| Large initial payload (full research object) | No change from current behavior. Future: split into per-section endpoints |
| 15+ new route folders increase file count | Each page.tsx is ~20-30 lines (thin wrapper). Manageable. |
| Polling causes unnecessary re-renders | Sub-pages use `select` option — only re-render when their specific data slice changes |
| Spark sidebar needs different structure | Deferred to Phase 5 |

---

## Verification Plan

After each phase, verify:

1. **Phase 1:** Navigate to `/ideas/[id]` — secondary sidebar appears alongside main sidebar. Content area shows existing page.tsx output. Navigate to `/ideas/[id]/interview` — no sidebar shown.

2. **Phase 2:** Overview page shows status-appropriate content. No sections rendered inline for COMPLETE status (only summary, scores, business plan).

3. **Phase 3:** Click each sidebar item — navigates to correct sub-page URL. Browser back works. Data loads instantly from cache. Empty states show for ideas without research.

4. **Phase 4:** Report pages show correct status. Generate button works. Download works for completed reports.

5. **Cross-cutting:** Run `pnpm type-check` from BETA root. Verify no type errors. Test with a CAPTURED idea, RESEARCHING idea, and COMPLETE idea.

---

## References

### Internal

- Admin sidebar: `BETA/packages/web/src/components/layout/admin-sidebar.tsx` — NavSection/NavItem pattern
- Admin layout (client): `BETA/packages/web/src/app/(dashboard)/admin/admin-layout-client.tsx` — Sidebar + content with margin
- Conditional sidebar: `BETA/packages/web/src/components/layout/conditional-sidebar.tsx` — Route-based sidebar hiding
- Dashboard layout: `BETA/packages/web/src/app/(dashboard)/layout.tsx` — ConditionalSidebar + DashboardProviders
- Current idea page: `BETA/packages/web/src/app/(dashboard)/ideas/[id]/page.tsx` — Status branching, data fetching
- StatusComplete: `BETA/packages/web/src/app/(dashboard)/ideas/[id]/components/status-complete.tsx` — All 17 sections
- SparkResults: `BETA/packages/web/src/app/(dashboard)/ideas/[id]/components/spark-results.tsx` — Spark-specific sections
- Dashboard config: `BETA/packages/web/src/hooks/use-dashboard-config.ts` — Section visibility control
- Subscription context: `BETA/packages/web/src/components/subscription/subscription-context.tsx` — React context pattern precedent

### External

- Next.js App Router Layouts: https://nextjs.org/docs/app/api-reference/file-conventions/layout
- Next.js Route Groups: https://nextjs.org/docs/app/getting-started/project-structure#route-groups
- Next.js Context in Layouts: https://nextjs.org/docs/app/getting-started/server-and-client-components
- React Query select option: https://tanstack.com/query/latest/docs/react/guides/render-optimizations

### Brainstorm

- `docs/brainstorms/2026-02-06-idea-report-secondary-nav-brainstorm.md`
