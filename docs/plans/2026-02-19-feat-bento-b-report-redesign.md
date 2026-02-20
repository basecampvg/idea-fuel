# Bento B Report Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the Bento B design system (Geist fonts, updated color tokens, new data visualization components) to the report section React components.

**Architecture:** Swap fonts from Inter/Space Grotesk to Geist/Geist Mono, update dark and light CSS variable palettes to match the exported config, then redesign four key report sections (Market Analysis, Competitors, Pain Points, Proof Signals) to use the Bento B patterns: sparkline metric cards, threat-level bars, severity stacks with expand/collapse, and prose text outside cards.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4 (@theme blocks), next/font/google, Lucide React icons

---

## Phase 1: Theme Foundation

### Task 1: Swap Fonts to Geist + Geist Mono

**Files:**
- Modify: `packages/web/src/app/layout.tsx`
- Modify: `packages/web/src/app/globals.css` (lines 22-24)

**Step 1: Update font imports in layout.tsx**

Replace the Inter and Space_Grotesk imports with Geist and Geist_Mono:

```tsx
// BEFORE
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// className={`${inter.variable} ${spaceGrotesk.variable}`}

// AFTER
import { Geist, Geist_Mono } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

// className={`${geist.variable} ${geistMono.variable}`}
```

Note: We drop `--font-display` since Geist serves as both title and body font. The `--font-mono` variable is new for Geist Mono.

**Step 2: Update CSS variable fallbacks in globals.css**

```css
/* BEFORE (lines 22-24) */
--font-sans: var(--font-sans, 'Inter', system-ui, sans-serif);
--font-display: var(--font-display, 'Space Grotesk', 'Inter', system-ui, sans-serif);

/* AFTER */
--font-sans: var(--font-sans, 'Geist', system-ui, sans-serif);
--font-mono: var(--font-mono, 'Geist Mono', monospace);
```

Remove the `--font-display` line entirely — Geist is both.

**Step 3: Search and replace `font-display` usage across web package**

Search for any Tailwind classes or CSS references to `font-display` and replace with `font-sans` (since Geist handles both roles):

```bash
grep -r "font-display" packages/web/src/ --include="*.tsx" --include="*.css" -l
```

For each hit: `font-display` class → remove (Geist is already the sans default) or keep if a heavier weight distinction is needed via `font-semibold`/`font-bold`.

**Step 4: Add `--font-mono` to the @theme block in globals.css**

Inside the `@theme { ... }` block (around line 152), add:

```css
--font-family-mono: var(--font-mono);
```

This makes `font-mono` available as a Tailwind utility.

**Step 5: Verify**

Run: `pnpm type-check`
Expected: PASS (no type errors from font changes)

**Step 6: Commit**

```bash
git add packages/web/src/app/layout.tsx packages/web/src/app/globals.css
git commit -m "feat: swap fonts from Inter/Space Grotesk to Geist/Geist Mono"
```

---

### Task 2: Update Dark Theme CSS Variables

**Files:**
- Modify: `packages/web/src/app/globals.css` (lines 886-960, the `.dark, :root` block)

The user's exported dark config:
```
--accent: #E8513D       → 7 80% 57%
--bg: #121211           → 60 3% 7%
--bg-card: #141414      → 0 0% 8%
--text-primary: #E8E8E8 → 0 0% 91%
--border: #2A2A2A       → 0 0% 16%
```

**Step 1: Update the `.dark, :root` block**

```css
/* BEFORE */
.dark,
:root {
  --background: 40 10% 6%;
  --foreground: 40 5% 90%;
  --card: 40 8% 10%;
  --card-foreground: 40 5% 90%;
  --popover: 40 8% 10%;
  --popover-foreground: 40 5% 90%;
  --primary: 10 80% 55%;
  --primary-foreground: 0 0% 100%;
  --secondary: 10 40% 35%;
  --secondary-foreground: 0 0% 100%;
  --accent: 10 80% 55%;
  --accent-foreground: 0 0% 100%;
  --muted: 40 6% 15%;
  --muted-foreground: 40 5% 55%;
  --border: 40 6% 8%;
  --input: 40 6% 12%;
  --ring: 10 80% 55%;

/* AFTER */
.dark,
:root {
  --background: 60 3% 7%;
  --foreground: 0 0% 91%;
  --card: 0 0% 8%;
  --card-foreground: 0 0% 91%;
  --popover: 0 0% 8%;
  --popover-foreground: 0 0% 91%;
  --primary: 7 80% 57%;
  --primary-foreground: 0 0% 100%;
  --secondary: 7 40% 35%;
  --secondary-foreground: 0 0% 100%;
  --accent: 7 80% 57%;
  --accent-foreground: 0 0% 100%;
  --muted: 0 0% 12%;
  --muted-foreground: 0 0% 55%;
  --border: 0 0% 16%;
  --input: 0 0% 12%;
  --ring: 7 80% 57%;
```

Key shift: warm hues (HSL 40) → neutral (HSL 0) for a cooler, more modern feel. Accent shifts from `10 80% 55%` to `7 80% 57%` (#E8513D).

Also update:
- `--success: 142 71% 40%` (keep green, don't use orange for success)
- `--chart-stroke: 7 80% 57%` (match new accent)
- `--aurora-end: 0 0% 8%` (match new card)
- Sidebar vars to match new palette:
  ```css
  --sidebar: 0 0% 7%;
  --sidebar-foreground: 0 0% 91%;
  --sidebar-border: 0 0% 16%;
  --sidebar-accent: 0 0% 12%;
  --sidebar-accent-foreground: 0 0% 91%;
  ```

**Step 2: Commit**

```bash
git add packages/web/src/app/globals.css
git commit -m "feat: update dark theme tokens to Bento B palette"
```

---

### Task 3: Update Light Theme CSS Variables

**Files:**
- Modify: `packages/web/src/app/globals.css` (lines 35-114, the `html.light` block)

The user's exported light config:
```
--accent: #e8513d       → 7 80% 57%
--bg: #faf8f5           → 36 56% 97%
--bg-card: #ffffff       → 0 0% 100%
--text: #1a1a1a          → 0 0% 10%
--border: #E8E4DF        → 33 19% 89%
```

**Step 1: Update the `html.light` block**

```css
/* Key changes */
--background: 36 56% 97%;           /* was 40 33% 97% — close but slightly different */
--foreground: 0 0% 10%;             /* was 0 0% 17% — slightly darker text */
--card: 0 0% 100%;                  /* was 0 0% 90% — WHITE instead of gray (big change!) */
--card-foreground: 0 0% 10%;
--popover: 0 0% 100%;
--popover-foreground: 0 0% 10%;
--primary: 7 80% 57%;               /* was 13 73% 48% — shifts to match #E8513D */
--accent: 7 80% 57%;                /* match primary */
--muted: 33 10% 93%;                /* warm gray */
--muted-foreground: 0 0% 40%;       /* was 0 0% 45% — slightly darker */
--border: 33 19% 89%;               /* was 30 3% 82% — warmer, lighter */
--input: 33 19% 89%;
--ring: 7 80% 57%;
```

The biggest visual change: `--card` goes from gray (#E5E5E5) to white (#FFFFFF). This will make cards pop against the warm off-white background.

Also update all dependent variables (sidebar, chart-stroke, etc.) to use `7 80% 57%` for accent references.

**Step 2: Update the `--gradient-accent` in the light theme block**

```css
--gradient-accent: linear-gradient(135deg,
  hsl(7, 80%, 57%) 0%,
  hsl(15, 75%, 60%) 50%,
  hsl(25, 70%, 65%) 100%);
```

**Step 3: Also update the shared `:root` gradient**

```css
--gradient-accent: linear-gradient(135deg,
  hsl(7, 80%, 52%) 0%,
  hsl(7, 70%, 57%) 50%,
  hsl(7, 50%, 65%) 100%);
```

**Step 4: Commit**

```bash
git add packages/web/src/app/globals.css
git commit -m "feat: update light theme tokens to Bento B palette"
```

---

### Task 4: Update viewport themeColor in layout.tsx

**Files:**
- Modify: `packages/web/src/app/layout.tsx`

```tsx
// BEFORE
themeColor: [
  { media: '(prefers-color-scheme: light)', color: '#d9d9d9' },
  { media: '(prefers-color-scheme: dark)', color: '#11100E' },
],

// AFTER
themeColor: [
  { media: '(prefers-color-scheme: light)', color: '#faf8f5' },
  { media: '(prefers-color-scheme: dark)', color: '#121211' },
],
```

**Commit with Task 1 (already in layout.tsx).**

---

## Phase 2: Shared Report Micro-Components

These are small, reusable building blocks extracted from the Bento B prototype. Create them before redesigning individual sections.

### Task 5: Create ProseBlock component

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/[id]/components/ui/prose-block.tsx`

This renders a label + body text pair outside of cards — the key Bento B pattern for narrative content.

```tsx
interface ProseBlockProps {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function ProseBlock({ label, children, icon, badge }: ProseBlockProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
        {icon}
        {label}
        {badge}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed mb-6">
        {children}
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/ui/prose-block.tsx
git commit -m "feat: add ProseBlock component for Bento B prose text"
```

### Task 6: Create SparklineCard component

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/[id]/components/ui/sparkline-card.tsx`

Metric card with a tiny SVG sparkline chart. From the prototype's `.spark-card` pattern.

```tsx
interface SparklineCardProps {
  label: string;
  value: string;
  trend?: string;
  trendColor?: 'green' | 'amber' | 'red';
  /** Array of 6-8 Y values (0-28 range, lower = higher on chart) */
  sparkPoints?: number[];
}

export function SparklineCard({ label, value, trend, trendColor = 'green', sparkPoints }: SparklineCardProps) {
  // Generate SVG polyline points from sparkPoints array
  const points = sparkPoints
    ? sparkPoints.map((y, i) => `${(i / (sparkPoints.length - 1)) * 100},${y}`).join(' ')
    : '0,24 15,20 30,22 45,16 60,14 75,10 90,8 100,6';

  const areaPoints = `${points} 100,28 0,28`;

  const trendColorClass = {
    green: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  }[trendColor];

  return (
    <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-1">
        {label}
      </div>
      <div className="text-[22px] font-bold leading-none">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold mt-0.5 font-mono ${trendColorClass}`}>
          {trend}
        </div>
      )}
      <svg className="w-full h-7 mt-2" viewBox="0 0 100 28" preserveAspectRatio="none">
        <polyline
          points={areaPoints}
          className="fill-primary/[.06] stroke-none"
        />
        <polyline
          points={points}
          className="fill-none stroke-primary stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
        />
      </svg>
    </div>
  );
}
```

**Commit:**
```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/ui/sparkline-card.tsx
git commit -m "feat: add SparklineCard metric component with SVG sparkline"
```

### Task 7: Create ThreatBar component

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/[id]/components/ui/threat-bar.tsx`

Horizontal threat-level bar from the prototype's `.threat-wrap` pattern.

```tsx
interface ThreatBarProps {
  score: number; // 1-10
  label?: string;
}

export function ThreatBar({ score, label = 'Threat Level' }: ThreatBarProps) {
  const pct = score * 10;
  const color =
    score >= 8 ? 'bg-red-500' :
    score >= 5 ? 'bg-amber-500' :
    'bg-blue-500';
  const textColor =
    score >= 8 ? 'text-red-500' :
    score >= 5 ? 'text-amber-500' :
    'text-blue-500';

  return (
    <div className="w-[120px] shrink-0">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-0.5">
        {label}
      </div>
      <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-600 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`text-[11px] font-semibold font-mono mt-0.5 text-right ${textColor}`}>
        {score}/10
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/ui/threat-bar.tsx
git commit -m "feat: add ThreatBar competitor threat visualization"
```

### Task 8: Create SeverityIndicator component

**Files:**
- Create: `packages/web/src/app/(dashboard)/projects/[id]/components/ui/severity-indicator.tsx`

The colored vertical bar from the prototype's `.sev-ind` pattern.

```tsx
interface SeverityIndicatorProps {
  level: 'high' | 'medium' | 'low';
}

export function SeverityIndicator({ level }: SeverityIndicatorProps) {
  const color = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  }[level];

  return <div className={`w-1 h-7 rounded-sm shrink-0 ${color}`} />;
}
```

This is trivial but keeps severity color logic centralized.

**Commit with Task 7.**

---

## Phase 3: Report Section Redesigns

### Task 9: Redesign Market Analysis Section

**Files:**
- Modify: `packages/web/src/app/(dashboard)/projects/[id]/components/market-analysis.tsx`

**Current state:** 2-col size/growth cards, 4-col key metrics grid, market dynamics panel, trend list, opps/threats. All data inside cards.

**Target (Bento B):**
1. Prose blocks for Market Size and Market Growth (outside cards)
2. Bar chart card for regional breakdown (keep in card)
3. 4-col sparkline metric cards (CAGR, Deal Size, CAC, LTV)
4. Prose block for Market Dynamics with stage badge
5. Standalone Trends list (no card wrapper)
6. Two-col Opportunities/Threats lists (no card wrapper)

**Step 1: Restructure the component**

Replace the existing inner content with the Bento B layout. Key changes:
- `ProseBlock` for size/growth narratives instead of stat cards
- `SparklineCard` grid for key metrics instead of the 4-col plain grid
- Remove card wrappers from trends, opportunities, threats lists
- Market dynamics becomes a `ProseBlock` with italic text

**Step 2: Generate sparkline data from `keyMetrics`**

The AI pipeline populates `keyMetrics` as an array of `{ label, value, context }`. Map these to `SparklineCard` props. Since we don't have real time-series data, generate plausible ascending sparkline points using a simple algorithm based on the metric value.

**Step 3: Verify visually**

Run: `pnpm dev:web`
Navigate to a completed project → check Market Analysis section renders correctly in both dark and light modes.

**Step 4: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/market-analysis.tsx
git commit -m "feat: redesign Market Analysis to Bento B layout with sparklines and prose"
```

---

### Task 10: Redesign Competitors Section

**Files:**
- Modify: `packages/web/src/app/(dashboard)/projects/[id]/components/competitors-section.tsx`

**Current state:** 2-col grid of CompetitorCards with badges, description, strengths/weaknesses lists.

**Target (Bento B):** Full-width horizontal scored cards with:
- Left: name, meta (funding/pricing), description
- Middle: threat-level bar (animated fill)
- Right: compact strengths/weaknesses two-col

**Step 1: Replace the 2-col card grid with a vertical stack**

Each competitor becomes a full-width row (`.comp-sc` pattern):

```tsx
<div className="flex items-center gap-6 p-4 rounded-lg bg-card border border-border">
  <div className="flex-1 min-w-0">
    <div className="font-semibold text-sm flex items-center gap-1.5">
      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
      {competitor.name}
    </div>
    <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex gap-4">
      <span>{competitor.fundingStage}</span>
      <span>{competitor.pricingModel}</span>
    </div>
    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
      {competitor.description}
    </div>
  </div>
  <ThreatBar score={deriveThreatScore(competitor)} />
  <div className="flex gap-6 text-[11px] shrink-0">
    {/* Strengths column */}
    {/* Weaknesses column */}
  </div>
</div>
```

**Step 2: Derive threat score**

The current data doesn't have a `threatScore` field. Derive it from available signals:
- Direct competitor with low funding → 7-8
- Suite player with high funding → 6-7
- Free/DIY alternative → 4-5
- Marketplace/adjacent → 3-4

Use a heuristic based on `targetSegment`, `fundingStage`, and `keyDifferentiator` fields. Or default to 5 and let the user override later.

Actually, simpler: map `vulnerability` text length and `strengths`/`weaknesses` count to a rough score. Or just display without a score if the data doesn't support it, using the threat bar only when `threatLevel` is populated.

**Step 3: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/competitors-section.tsx
git commit -m "feat: redesign Competitors to Bento B scored cards with threat bars"
```

---

### Task 11: Redesign Pain Points Section

**Files:**
- Modify: `packages/web/src/app/(dashboard)/projects/[id]/components/pain-points-section.tsx`

**Current state:** 2-col grid of PainPointCards with severity badge, enriched metadata, evidence quotes.

**Target (Bento B):** Severity stack with expand/collapse. Each pain point is a `<details>` element:
- Summary row: severity indicator bar | problem name | cost | frequency | severity badge
- Expandable body: quote blockquote, 2-col metadata (current solutions + gaps)

**Step 1: Replace the 2-col grid with a vertical stack**

```tsx
<div className="flex flex-col gap-2">
  {sortedPainPoints.map((pp, i) => (
    <details key={i} className="rounded-lg bg-card border border-border overflow-hidden group" open={i === 0}>
      <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
        <SeverityIndicator level={mapSeverity(pp.severity)} />
        <span className="flex-1 font-semibold text-sm">{pp.problem || pp.title}</span>
        <span className="font-mono text-xs font-semibold text-primary">{pp.estimatedCost || ''}</span>
        <span className="text-[11px] text-muted-foreground font-mono">{pp.frequency || ''}</span>
        <SeverityBadge severity={pp.severity} />
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 border-t border-border/50">
        {/* Quote */}
        {pp.evidence?.[0] && (
          <blockquote className="italic text-[13px] text-muted-foreground border-l-2 border-amber-500 pl-4 my-2 leading-relaxed">
            "{pp.evidence[0]}"
          </blockquote>
        )}
        {/* 2-col: Current Solutions + Gaps */}
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          {pp.currentSolutions?.length > 0 && (
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-0.5">Current Solutions</h5>
              <ul className="space-y-0.5">{pp.currentSolutions.map(...)}</ul>
            </div>
          )}
          {pp.gaps?.length > 0 && (
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-wider text-red-500 font-mono mb-0.5">Gaps</h5>
              <ul className="space-y-0.5">{pp.gaps.map(...)}</ul>
            </div>
          )}
        </div>
      </div>
    </details>
  ))}
</div>
```

**Step 2: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/pain-points-section.tsx
git commit -m "feat: redesign Pain Points to Bento B severity stack with expand/collapse"
```

---

### Task 12: Redesign Proof Signals Section

**Files:**
- Modify: `packages/web/src/app/(dashboard)/projects/[id]/components/proof-signals.tsx`

**Current state:** Demand confidence bar, 3-col signal breakdown, demand indicators in a card, validation experiments in cards, risk mitigation cards.

**Target (Bento B):**
- Keep confidence bar and signal breakdown (they're already good)
- Pull "Demand Indicators" list OUT of card wrapper → standalone list with `ProseBlock`-style label
- Pull "Validation Experiments" OUT of outer card wrapper → standalone label + experiment cards directly

**Step 1: Find the demand indicators card wrapper and remove it**

Replace:
```tsx
<div className="p-4 rounded-xl bg-card border border-border">
  <h4>Demand Indicators</h4>
  <ul>...</ul>
</div>
```

With:
```tsx
<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-2">
  Demand Indicators
</div>
<ul className="space-y-1.5 mb-6">...</ul>
```

**Step 2: Find the validation experiments outer card wrapper and remove it**

Same pattern — keep the inner experiment cards but remove the outer container card.

**Step 3: Commit**

```bash
git add packages/web/src/app/\(dashboard\)/projects/\[id\]/components/proof-signals.tsx
git commit -m "feat: redesign Proof Signals with prose labels and unwrapped lists"
```

---

## Phase 4: Verification

### Task 13: Visual Verification

**Step 1:** Run `pnpm dev:web` and navigate to a completed project.

**Step 2:** Check each redesigned section in both dark and light modes:
- [ ] Market Analysis: prose blocks render outside cards, sparkline cards show, bar chart card intact
- [ ] Competitors: horizontal scored cards, threat bars animate, strengths/weaknesses compact
- [ ] Pain Points: severity stack renders, first item open by default, expand/collapse works
- [ ] Proof Signals: demand indicators and experiments render without card wrappers

**Step 3:** Check that unmodified sections (ScoreCards, MarketSizing, BusinessFit, WhyNow, UserStory, etc.) still render correctly with the new color tokens.

**Step 4:** Check mobile responsiveness — sparkline grid should stack at small widths.

### Task 14: Type Check & Commit

```bash
pnpm type-check
```

Fix any type errors, then final commit if needed.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `packages/web/src/app/layout.tsx` | Fonts: Inter/SpaceGrotesk → Geist/GeistMono |
| `packages/web/src/app/globals.css` | CSS vars: both dark and light palettes updated |
| `packages/web/src/app/(dashboard)/projects/[id]/components/ui/prose-block.tsx` | NEW: prose text outside cards |
| `packages/web/src/app/(dashboard)/projects/[id]/components/ui/sparkline-card.tsx` | NEW: metric card with SVG sparkline |
| `packages/web/src/app/(dashboard)/projects/[id]/components/ui/threat-bar.tsx` | NEW: animated threat-level bar |
| `packages/web/src/app/(dashboard)/projects/[id]/components/ui/severity-indicator.tsx` | NEW: colored severity bar |
| `packages/web/src/app/(dashboard)/projects/[id]/components/market-analysis.tsx` | Redesigned to Bento B |
| `packages/web/src/app/(dashboard)/projects/[id]/components/competitors-section.tsx` | Redesigned to Bento B |
| `packages/web/src/app/(dashboard)/projects/[id]/components/pain-points-section.tsx` | Redesigned to Bento B |
| `packages/web/src/app/(dashboard)/projects/[id]/components/proof-signals.tsx` | Redesigned to Bento B |
