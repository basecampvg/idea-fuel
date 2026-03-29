'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import {
  SectionLabel,
  StatCard,
  Badge,
  ScoreGauge,
  MarketFunnel,
  ViewFullReportCTA,
} from './report-ui';
import {
  REPORT_TABS,
  SCORES,
  SCORE_METADATA,
  MARKET_ANALYSIS,
  MARKET_SIZING,
  COMPETITORS,
  PAIN_POINTS,
  POSITIONING,
  WHY_NOW,
  VALUE_LADDER,
  REVENUE_POTENTIAL,
  EXECUTION,
  GTM,
  USER_STORY,
  PROOF_SIGNALS,
  KEYWORDS,
  KEYWORD_TRENDS,
  TECH_STACK,
} from './report-data';

const CYCLE_DURATION = 6;
const TRANSITION_DURATION = 0.3;

/* ────────────────────────────────────────────────────────
   Panel 1: Summary (scores + keyword analysis)
   ──────────────────────────────────────────────────────── */
function SummaryPanel() {
  return (
    <div className="space-y-4">
      {/* Score Gauges */}
      <div className="flex items-center justify-between gap-2">
        {SCORES.map((s) => (
          <ScoreGauge key={s.label} {...s} />
        ))}
      </div>

      {/* Score Metadata */}
      <div className="flex gap-3 rounded-lg bg-[#0A0A0A] p-3">
        <div className="flex-1 text-center">
          <p className="font-display text-base font-black text-[#d4d4d4]">{SCORE_METADATA.averageConfidence}%</p>
          <p className="text-[10px] uppercase tracking-[1px] text-[#928e87]">Avg Confidence</p>
        </div>
        <div className="w-px bg-[#222222]" />
        <div className="flex-1 text-center">
          <p className="font-display text-base font-black text-[#d4d4d4]">{SCORE_METADATA.passCount}</p>
          <p className="text-[10px] uppercase tracking-[1px] text-[#928e87]">Passes</p>
        </div>
        <div className="w-px bg-[#222222]" />
        <div className="flex-1 text-center">
          <p className="font-display text-base font-black text-[#d4d4d4]">&plusmn;{SCORE_METADATA.maxDeviation}</p>
          <p className="text-[10px] uppercase tracking-[1px] text-[#928e87]">Max Deviation</p>
        </div>
      </div>

      {/* Keyword Analysis */}
      <SectionLabel>Keyword Analysis</SectionLabel>

      {/* Trending Keywords with volume + growth */}
      {KEYWORD_TRENDS.length > 0 && (
        <div className="space-y-2">
          {KEYWORD_TRENDS.map((t) => (
            <div key={t.keyword} className="flex items-center justify-between rounded-lg border border-[#222222] bg-[#0A0A0A] px-3 py-2">
              <span className="text-sm font-bold text-[#d4d4d4]">{t.keyword}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#928e87]">{t.volume.toLocaleString()} vol</span>
                <span className="font-mono text-xs font-bold text-[#6b8a6b]">+{t.growth}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary Keywords */}
      <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#928e87]">Primary</p>
      <div className="flex flex-wrap gap-1.5">
        {KEYWORDS.primary.map((k) => (
          <span key={k} className="rounded bg-[#2a2220] px-2 py-1 text-xs font-medium text-[#e32b1a]/90">{k}</span>
        ))}
      </div>

      {/* Long-Tail Keywords */}
      <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#928e87]">Long-Tail</p>
      <div className="flex flex-wrap gap-1.5">
        {KEYWORDS.longTail.slice(0, 8).map((k) => (
          <span key={k} className="rounded bg-[#0A0A0A] px-2 py-1 text-xs text-[#928e87]">{k}</span>
        ))}
      </div>

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 2: Market (trimmed — hero + sizing + segments + geo + 3 trends)
   ──────────────────────────────────────────────────────── */
function MarketPanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Market Size" value="$634M+" sub="Global 2024" />
        <StatCard label="Growth" value="8.2%" sub="CAGR → $1.19B by 2032" />
      </div>

      <SectionLabel>Market Sizing</SectionLabel>
      <MarketFunnel
        tam={{ value: MARKET_SIZING.tam.value, label: MARKET_SIZING.tam.formatted }}
        sam={{ value: MARKET_SIZING.sam.value, label: MARKET_SIZING.sam.formatted }}
        som={{ value: MARKET_SIZING.som.value, label: MARKET_SIZING.som.formatted }}
      />

      <SectionLabel>Target Segments</SectionLabel>
      <div className="space-y-2">
        {MARKET_SIZING.segments.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded border border-[#222222] bg-[#0A0A0A] px-3 py-2">
            <span className="text-sm font-bold text-[#d4d4d4]">{s.name}</span>
            <div className="flex gap-3">
              <span className="text-xs text-[#928e87]">SAM {s.samContribution}%</span>
              <span className="text-xs text-[#928e87]">SOM {s.somContribution}%</span>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Geographic Breakdown</SectionLabel>
      <div className="flex gap-2">
        {MARKET_SIZING.geographic.map((g) => (
          <div key={g.region} className="flex-1 rounded-lg border border-[#222222] bg-[#0A0A0A] p-3 text-center">
            <p className="font-display text-lg font-black text-[#d4d4d4]">{g.percentage}%</p>
            <p className="text-xs text-[#928e87]">{g.region}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Key Trends</SectionLabel>
      {MARKET_ANALYSIS.trends.slice(0, 3).map((t, i) => (
        <div key={i} className="border-l-2 border-[#e32b1a]/30 py-1.5 pl-3">
          <p className="text-sm leading-relaxed text-[#928e87]">{t}</p>
        </div>
      ))}

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 3: Competitors (trimmed — top 4, truncated)
   ──────────────────────────────────────────────────────── */
function CompetitorsPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-display text-2xl font-black text-[#d4d4d4]">{COMPETITORS.length}</span>
        <span className="text-sm uppercase tracking-[1px] text-[#928e87]">competitors analyzed</span>
      </div>

      {COMPETITORS.slice(0, 4).map((c) => (
        <div key={c.name} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#d4d4d4]">{c.name}</p>
            <span className="shrink-0 text-xs font-medium text-[#e32b1a]">{c.pricingModel.split(' ')[0]}</span>
          </div>

          <div className="mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[1px] text-[#6b8a6b]">Strengths</p>
            {c.strengths.slice(0, 2).map((s, i) => (
              <p key={i} className="text-xs leading-snug text-[#6b8a6b]/80">+ {s}</p>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1px] text-[#b44a3e]">Weaknesses</p>
            {c.weaknesses.slice(0, 1).map((w, i) => (
              <p key={i} className="text-xs leading-snug text-[#b44a3e]/80">- {w}</p>
            ))}
          </div>
        </div>
      ))}

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 4: Pain Points (trimmed — top 10, HIGH first)
   ──────────────────────────────────────────────────────── */
function PainPointsPanel() {
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...PAIN_POINTS].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const top10 = sorted.slice(0, 10);
  const highCount = PAIN_POINTS.filter((p) => p.severity === 'high').length;
  const medCount = PAIN_POINTS.filter((p) => p.severity === 'medium').length;
  const lowCount = PAIN_POINTS.filter((p) => p.severity === 'low').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl font-black text-[#d4d4d4]">{PAIN_POINTS.length}</span>
        <span className="text-sm uppercase tracking-[1px] text-[#928e87]">validated pain points</span>
      </div>
      <div className="flex gap-2">
        <Badge variant="high">{highCount} HIGH</Badge>
        <Badge variant="medium">{medCount} MEDIUM</Badge>
        <Badge variant="low">{lowCount} LOW</Badge>
      </div>

      {top10.map((p, i) => (
        <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
          <div className="flex items-start gap-2">
            <Badge variant={p.severity}>{p.severity}</Badge>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug text-[#d4d4d4]">{p.problem}</p>
              <p className="mt-1 text-xs text-[#928e87]">{p.affectedSegment}</p>
            </div>
          </div>
        </div>
      ))}

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 5: Positioning (trimmed — UVP, differentiators, headline, ICP, 2 handlers)
   ──────────────────────────────────────────────────────── */
function PositioningPanel() {
  return (
    <div className="space-y-4">
      <SectionLabel>Unique Value Proposition</SectionLabel>
      <div className="rounded-lg border border-[#e32b1a]/30 bg-[#110a08] p-4">
        <p className="text-sm font-medium leading-relaxed text-[#d4d4d4]">&ldquo;{POSITIONING.uniqueValueProposition}&rdquo;</p>
      </div>

      <SectionLabel>Differentiators</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {POSITIONING.differentiators.map((d) => (
          <span key={d} className="inline-flex items-center gap-1 rounded-full bg-[#2a2220] px-2.5 py-1 text-xs font-medium text-[#e32b1a]/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e32b1a]" />
            {d}
          </span>
        ))}
      </div>

      <SectionLabel>Messaging</SectionLabel>
      <div className="space-y-2">
        <div className="rounded border border-[#222222] bg-[#0A0A0A] p-3">
          <p className="text-[10px] font-bold uppercase text-[#928e87]">Headline</p>
          <p className="mt-1 text-sm font-bold text-[#d4d4d4]">{POSITIONING.messagingFramework.headline}</p>
        </div>
        <div className="rounded border border-[#222222] bg-[#0A0A0A] p-3">
          <p className="text-[10px] font-bold uppercase text-[#928e87]">Subheadline</p>
          <p className="mt-1 text-sm text-[#d4d4d4]">{POSITIONING.messagingFramework.subheadline}</p>
        </div>
      </div>

      <SectionLabel>Ideal Customer</SectionLabel>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
        <p className="text-sm font-bold text-[#d4d4d4]">{POSITIONING.idealCustomerProfile.persona}</p>
        <p className="mt-1 text-xs text-[#928e87]">{POSITIONING.idealCustomerProfile.demographics}</p>
      </div>

      <SectionLabel>Top Objection Handlers</SectionLabel>
      {POSITIONING.messagingFramework.objectionHandlers.slice(0, 2).map((oh, i) => (
        <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
          <p className="text-sm font-bold text-[#d4d4d4]">&ldquo;{oh.objection}&rdquo;</p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#928e87]">{oh.response}</p>
        </div>
      ))}

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 6: Timing (trimmed — score, window, 3 catalysts, narrative)
   ──────────────────────────────────────────────────────── */
function TimingPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <ScoreGauge label="Urgency" value={WHY_NOW.urgencyScore} maxValue={100} size="large" />
        <div className="flex-1">
          <p className="text-sm font-bold text-[#d4d4d4]">Window of Opportunity</p>
          <p className="mt-1 text-sm text-[#6b8a6b]">Opens: {WHY_NOW.windowOfOpportunity.opens}</p>
          <p className="text-sm text-[#e32b1a]">Closes: {WHY_NOW.windowOfOpportunity.closesBy}</p>
        </div>
      </div>

      <SectionLabel>Market Catalysts</SectionLabel>
      {WHY_NOW.catalysts.slice(0, 3).map((c) => (
        <div key={c.event} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
          <div className="mb-1.5 flex items-start gap-2">
            <Badge variant={c.impact}>{c.impact}</Badge>
            <p className="text-sm font-bold text-[#d4d4d4]">{c.event}</p>
          </div>
          <p className="text-xs text-[#928e87]">{c.timeframe}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#928e87]">{c.howToLeverage}</p>
        </div>
      ))}

      <SectionLabel>Urgency Narrative</SectionLabel>
      <div className="rounded-lg border border-[#e32b1a]/20 bg-[#110a08] p-4">
        <p className="text-sm leading-relaxed text-[#d4d4d4]">{WHY_NOW.urgencyNarrative}</p>
      </div>

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 7: Business (trimmed — revenue, value ladder, execution, GTM primary)
   ──────────────────────────────────────────────────────── */
function BusinessPanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Revenue Potential" value={REVENUE_POTENTIAL.estimate.split(' ')[0]} sub={REVENUE_POTENTIAL.rating.toUpperCase()} />
        <StatCard label="Confidence" value={`${REVENUE_POTENTIAL.confidence}%`} sub={REVENUE_POTENTIAL.timeToFirstRevenue.split('.')[0]} />
      </div>

      <SectionLabel>Value Ladder</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {VALUE_LADDER.map((t) => (
          <div
            key={t.tier}
            className={`rounded-lg border p-3 ${
              t.highlighted ? 'border-[#e32b1a] bg-[#110a08]' : 'border-[#222222] bg-[#0A0A0A]'
            }`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-[#928e87]">{t.label}</p>
            <p className="mt-1 font-display text-base font-black text-[#d4d4d4]">{t.price}</p>
            <p className="mt-1 text-xs font-bold text-[#d4d4d4]">{t.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-[#928e87]">{t.description}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Execution</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Difficulty" value={EXECUTION.rating.toUpperCase()} />
        <StatCard label="MVP Time" value="9-12mo" />
        <StatCard label="Solo" value={EXECUTION.soloFriendly ? 'Yes' : 'No'} />
      </div>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
        <p className="text-[10px] font-bold uppercase text-[#e32b1a]">Biggest Risk</p>
        <p className="mt-1 text-xs leading-relaxed text-[#928e87]">{EXECUTION.biggestRisk}</p>
      </div>

      <SectionLabel>Go-To-Market</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="GTM Clarity" value={GTM.rating.toUpperCase()} sub={`${GTM.confidence}% confidence`} />
        <StatCard label="CAC" value="$15-25K" sub="Per resort (early stage)" />
      </div>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
        <p className="text-[10px] font-bold uppercase text-[#928e87]">Primary Channel</p>
        <p className="mt-1 text-xs leading-relaxed text-[#928e87]">{GTM.primaryChannel}</p>
      </div>

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel 8: Blueprint (trimmed — user story, tech cost, keywords, 5 demand signals)
   ──────────────────────────────────────────────────────── */
function BlueprintPanel() {
  return (
    <div className="space-y-4">
      <SectionLabel>User Story</SectionLabel>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
        <p className="text-sm font-bold text-[#d4d4d4]">{USER_STORY.protagonist.name}</p>
        <p className="text-xs text-[#928e87]">{USER_STORY.protagonist.title} — {USER_STORY.protagonist.setting}</p>
      </div>
      <div className="rounded-lg border border-[#e32b1a]/20 bg-[#110a08] p-4">
        <p className="text-sm italic leading-relaxed text-[#d4d4d4]">{USER_STORY.quote}</p>
      </div>

      <SectionLabel>Tech Stack</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Monthly Cost" value={`$${TECH_STACK.estimatedMonthlyCost.min}-$${TECH_STACK.estimatedMonthlyCost.max}`} sub={TECH_STACK.businessType} />
        <StatCard label="Stack Type" value="Full-Stack" sub="SaaS-optimized" />
      </div>

      <SectionLabel>Keywords</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {KEYWORDS.primary.slice(0, 4).map((k) => (
          <span key={k} className="rounded bg-[#2a2220] px-2 py-1 text-xs text-[#e32b1a]/80">{k}</span>
        ))}
      </div>

      <SectionLabel>Demand Signals</SectionLabel>
      <div className="flex items-center gap-3 mb-2">
        <ScoreGauge label="Demand" value={PROOF_SIGNALS.demandStrength.score} maxValue={100} />
      </div>
      {PROOF_SIGNALS.demandIndicators.slice(0, 5).map((d, i) => (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b8a6b]" />
          <p className="text-xs text-[#928e87]">{d}</p>
        </div>
      ))}

      <ViewFullReportCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Panel Registry
   ──────────────────────────────────────────────────────── */
const PANELS = [
  SummaryPanel,
  MarketPanel,
  CompetitorsPanel,
  PainPointsPanel,
  PositioningPanel,
  TimingPanel,
  BusinessPanel,
  BlueprintPanel,
];

/* ────────────────────────────────────────────────────────
   Main Dashboard
   ──────────────────────────────────────────────────────── */
export function ReportDashboard({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const activeTabRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  const startCycle = useCallback((fromIndex: number) => {
    tweenRef.current?.kill();

    if (progressRef.current) {
      gsap.set(progressRef.current, { width: '0%' });
      tweenRef.current = gsap.to(progressRef.current, {
        width: '100%',
        duration: CYCLE_DURATION,
        ease: 'none',
        onComplete: () => {
          const next = (fromIndex + 1) % REPORT_TABS.length;
          transitionTo(next);
        },
      });
    }
  }, []);

  const transitionTo = useCallback(
    (nextIndex: number) => {
      const container = containerRef.current;
      if (!container) return;

      const currentPanel = container.querySelector(`[data-tab-panel="${activeTabRef.current}"]`);
      const nextPanel = container.querySelector(`[data-tab-panel="${nextIndex}"]`);

      if (currentPanel && nextPanel) {
        gsap.to(currentPanel, { opacity: 0, y: -6, duration: TRANSITION_DURATION, ease: 'power2.inOut' });
        gsap.fromTo(
          nextPanel,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: TRANSITION_DURATION, ease: 'power2.inOut', delay: 0.05 }
        );
      }

      const scrollEl = scrollRefs.current[nextIndex];
      if (scrollEl) scrollEl.scrollTop = 0;

      activeTabRef.current = nextIndex;
      setActiveTab(nextIndex);
      startCycle(nextIndex);
    },
    [startCycle]
  );

  const goToTab = useCallback(
    (index: number) => {
      if (index === activeTabRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      tweenRef.current?.kill();

      const currentPanel = container.querySelector(`[data-tab-panel="${activeTabRef.current}"]`);
      const nextPanel = container.querySelector(`[data-tab-panel="${index}"]`);

      if (currentPanel && nextPanel) {
        gsap.to(currentPanel, { opacity: 0, y: -6, duration: TRANSITION_DURATION, ease: 'power2.inOut' });
        gsap.fromTo(
          nextPanel,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: TRANSITION_DURATION, ease: 'power2.inOut', delay: 0.05 }
        );
      }

      const scrollEl = scrollRefs.current[index];
      if (scrollEl) scrollEl.scrollTop = 0;

      activeTabRef.current = index;
      setActiveTab(index);
      startCycle(index);
    },
    [startCycle]
  );

  useEffect(() => {
    startCycle(0);
    return () => {
      tweenRef.current?.kill();
    };
  }, [startCycle]);

  const handleMouseEnter = useCallback(() => {
    tweenRef.current?.pause();
  }, []);

  const handleMouseLeave = useCallback(() => {
    tweenRef.current?.resume();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex h-full flex-col ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tab Bar */}
      <div className="flex shrink-0 border-b border-[#222222]">
        {REPORT_TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => goToTab(i)}
            className={`flex-1 px-1 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.5px] transition-colors ${
              activeTab === i
                ? 'border-b-2 border-[#e32b1a] text-[#e32b1a]'
                : 'text-[#928e87] hover:text-[#d4d4d4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="relative min-h-0 flex-1">
        {PANELS.map((Panel, i) => (
          <div
            key={REPORT_TABS[i].id}
            data-tab-panel={i}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#222222]"
            ref={(el) => { scrollRefs.current[i] = el; }}
            style={{
              opacity: i === 0 ? 1 : 0,
              pointerEvents: activeTab === i ? 'auto' : 'none',
            }}
          >
            <Panel />
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="h-[2px] shrink-0 bg-[#222222]">
        <div ref={progressRef} className="h-full w-0 bg-[#e32b1a]" />
      </div>

      {/* Tab Counter */}
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <span className="font-mono text-xs tracking-[1px] text-[#928e87]">
          {activeTab + 1} / {REPORT_TABS.length}
        </span>
        <span className="text-[10px] uppercase tracking-[1px] text-[#928e87]/50">
          idea fuel report
        </span>
      </div>
    </div>
  );
}
