'use client';

import {
  SectionLabel,
  StatCard,
  Badge,
  ScoreGauge,
  MarketFunnel,
} from '../components/report-ui';
import {
  SCORES,
  SCORE_JUSTIFICATIONS,
  SCORE_METADATA,
  MARKET_ANALYSIS,
  MARKET_SIZING,
  COMPETITORS,
  PAIN_POINTS,
  POSITIONING,
  WHY_NOW,
  PROOF_SIGNALS,
  REVENUE_POTENTIAL,
  EXECUTION,
  GTM,
  FOUNDER_FIT,
  VALUE_LADDER,
  USER_STORY,
  TECH_STACK,
  KEYWORDS,
  KEYWORD_TRENDS,
  ACTION_PROMPTS,
} from '../components/report-data';

/* ════════════════════════════════════════════════════════
   OVERVIEW > Summary
   ════════════════════════════════════════════════════════ */
export function FullScoresSection() {
  const justifications = Object.values(SCORE_JUSTIFICATIONS);
  return (
    <section id="scores" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Summary</h2>

      <div className="flex items-center justify-around gap-4">
        {SCORES.map((s) => (
          <ScoreGauge key={s.label} {...s} size="large" />
        ))}
      </div>

      <div className="flex gap-4 rounded-lg bg-[#0f0f0e] p-4">
        <div className="flex-1 text-center">
          <p className="font-display text-xl font-black text-[#d4d4d4]">{SCORE_METADATA.averageConfidence}%</p>
          <p className="text-xs uppercase tracking-[1px] text-[#928e87]">Avg Confidence</p>
        </div>
        <div className="w-px bg-[#222222]" />
        <div className="flex-1 text-center">
          <p className="font-display text-xl font-black text-[#d4d4d4]">{SCORE_METADATA.passCount}</p>
          <p className="text-xs uppercase tracking-[1px] text-[#928e87]">Passes</p>
        </div>
        <div className="w-px bg-[#222222]" />
        <div className="flex-1 text-center">
          <p className="font-display text-xl font-black text-[#d4d4d4]">&plusmn;{SCORE_METADATA.maxDeviation}</p>
          <p className="text-xs uppercase tracking-[1px] text-[#928e87]">Max Deviation</p>
        </div>
      </div>

      <SectionLabel>Score Justifications</SectionLabel>
      <div className="grid gap-4 lg:grid-cols-2">
        {justifications.map((j) => (
          <div key={j.score} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-display text-lg font-black text-[#d4d4d4]">{j.score}/100</span>
              <Badge variant={j.confidence === 'high' ? 'high' : j.confidence === 'low' ? 'low' : 'medium'}>{j.confidence}</Badge>
            </div>
            <p className="text-sm leading-relaxed text-[#928e87]">{j.justification}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   OVERVIEW > Business Fit
   ════════════════════════════════════════════════════════ */
export function FullBusinessFitSection() {
  return (
    <section id="business" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Business Fit</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue Potential" value={REVENUE_POTENTIAL.estimate.split(' ')[0]} sub={REVENUE_POTENTIAL.rating.toUpperCase()} />
        <StatCard label="Confidence" value={`${REVENUE_POTENTIAL.confidence}%`} />
        <StatCard label="Time to Revenue" value={REVENUE_POTENTIAL.timeToFirstRevenue.split('.')[0]} />
        <StatCard label="Gross Margins" value="75-85%" />
      </div>

      <SectionLabel>Revenue Model</SectionLabel>
      <p className="text-sm leading-relaxed text-[#928e87]">{REVENUE_POTENTIAL.revenueModel}</p>

      <SectionLabel>Unit Economics</SectionLabel>
      <p className="text-sm leading-relaxed text-[#928e87]">{REVENUE_POTENTIAL.unitEconomics}</p>

      <SectionLabel>Execution Difficulty</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Difficulty" value={EXECUTION.rating.toUpperCase()} />
        <StatCard label="MVP Timeline" value="9-12mo" sub={EXECUTION.mvpTimeEstimate.split(';')[0]} />
        <StatCard label="Solo Friendly" value={EXECUTION.soloFriendly ? 'Yes' : 'No'} />
      </div>

      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
        <p className="text-xs font-bold uppercase text-[#e32b1a]">Biggest Risk</p>
        <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{EXECUTION.biggestRisk}</p>
      </div>

      <SectionLabel>Founder Fit</SectionLabel>
      <div className="flex items-center gap-6">
        <ScoreGauge label="Fit" value={FOUNDER_FIT.percentage} maxValue={100} size="large" />
        <div className="flex-1">
          <p className="text-sm font-bold text-[#d4d4d4]">Critical Skill Needed</p>
          <p className="mt-1 text-sm text-[#928e87]">{FOUNDER_FIT.criticalSkillNeeded}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[1px] text-[#6b8a6b]">Strengths ({FOUNDER_FIT.strengths.length})</p>
          {FOUNDER_FIT.strengths.map((s, i) => (
            <p key={i} className="text-sm leading-snug text-[#6b8a6b]/80">+ {s}</p>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[1px] text-[#b44a3e]">Gaps ({FOUNDER_FIT.gaps.length})</p>
          {FOUNDER_FIT.gaps.map((g, i) => (
            <p key={i} className="text-sm leading-snug text-[#b44a3e]/80">- {g}</p>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
        <p className="text-xs font-bold uppercase text-[#928e87]">Recommended First Hire</p>
        <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{FOUNDER_FIT.recommendedFirstHire}</p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   MARKET > Market Analysis
   ════════════════════════════════════════════════════════ */
export function FullMarketSection() {
  return (
    <section id="market" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Market Analysis</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Market Size" value="$634M+" sub="Global 2024" />
        <StatCard label="Growth" value="8.2%" sub="CAGR → $1.19B by 2032" />
        <StatCard label="Stage" value={MARKET_ANALYSIS.dynamics.stage} sub={MARKET_ANALYSIS.dynamics.consolidationLevel.split('.')[0]} />
        <StatCard label="CAGR" value={MARKET_ANALYSIS.keyMetrics.cagr} sub={`Avg Deal: ${MARKET_ANALYSIS.keyMetrics.avgDealSize}`} />
      </div>

      <SectionLabel>Market Sizing (TAM / SAM / SOM)</SectionLabel>
      <MarketFunnel
        tam={{ value: MARKET_SIZING.tam.value, label: MARKET_SIZING.tam.formatted }}
        sam={{ value: MARKET_SIZING.sam.value, label: MARKET_SIZING.sam.formatted }}
        som={{ value: MARKET_SIZING.som.value, label: MARKET_SIZING.som.formatted }}
      />
      <p className="text-sm leading-relaxed text-[#928e87]">{MARKET_SIZING.methodology}</p>

      <SectionLabel>Target Segments</SectionLabel>
      <div className="space-y-2">
        {MARKET_SIZING.segments.map((s) => (
          <div key={s.name} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#d4d4d4]">{s.name}</span>
              <div className="flex gap-4">
                <span className="text-xs text-[#928e87]">TAM {s.tamContribution}%</span>
                <span className="text-xs text-[#928e87]">SAM {s.samContribution}%</span>
                <span className="text-xs text-[#928e87]">SOM {s.somContribution}%</span>
              </div>
            </div>
            <p className="mt-1 text-sm text-[#928e87]">{s.description}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Geographic Breakdown</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {MARKET_SIZING.geographic.map((g) => (
          <div key={g.region} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4 text-center">
            <p className="font-display text-2xl font-black text-[#d4d4d4]">{g.percentage}%</p>
            <p className="text-sm font-medium text-[#928e87]">{g.region}</p>
            <p className="mt-1 text-xs text-[#928e87]">{g.notes}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Market Trends ({MARKET_ANALYSIS.trends.length})</SectionLabel>
      {MARKET_ANALYSIS.trends.map((t, i) => (
        <div key={i} className="border-l-2 border-[#e32b1a]/30 py-2 pl-4">
          <p className="text-sm leading-relaxed text-[#928e87]">{t}</p>
        </div>
      ))}

      <SectionLabel>Threats ({MARKET_ANALYSIS.threats.length})</SectionLabel>
      {MARKET_ANALYSIS.threats.map((t, i) => (
        <div key={i} className="border-l-2 border-[#928e87]/30 py-2 pl-4">
          <p className="text-sm leading-relaxed text-[#928e87]">{t}</p>
        </div>
      ))}

      <SectionLabel>Opportunities ({MARKET_ANALYSIS.opportunities.length})</SectionLabel>
      {MARKET_ANALYSIS.opportunities.map((o, i) => (
        <div key={i} className="border-l-2 border-[#6b8a6b]/40 py-2 pl-4">
          <p className="text-sm leading-relaxed text-[#928e87]">{o}</p>
        </div>
      ))}

      <SectionLabel>Entry Barriers ({MARKET_ANALYSIS.dynamics.entryBarriers.length})</SectionLabel>
      {MARKET_ANALYSIS.dynamics.entryBarriers.map((b, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#928e87]" />
          <p className="text-sm text-[#928e87]">{b}</p>
        </div>
      ))}

      <SectionLabel>Adjacent Markets ({MARKET_ANALYSIS.adjacentMarkets.length})</SectionLabel>
      <div className="grid gap-3 lg:grid-cols-2">
        {MARKET_ANALYSIS.adjacentMarkets.map((m) => (
          <div key={m.name} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
            <p className="text-sm font-bold text-[#d4d4d4]">{m.name}</p>
            <p className="mt-1 text-xs text-[#928e87]">{m.relevance}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Assumptions ({MARKET_SIZING.assumptions.length})</SectionLabel>
      <ol className="list-decimal space-y-1 pl-5">
        {MARKET_SIZING.assumptions.map((a, i) => (
          <li key={i} className="text-sm text-[#928e87]">{a}</li>
        ))}
      </ol>

      <SectionLabel>Sources ({MARKET_SIZING.sources.length})</SectionLabel>
      {MARKET_SIZING.sources.map((s, i) => (
        <div key={i} className="flex items-center justify-between border-b border-[#222222] py-2 last:border-0">
          <span className="text-sm text-[#928e87]">{s.title}</span>
          <span className="text-xs text-[#928e87]">{s.date}</span>
        </div>
      ))}
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   MARKET > Why Now
   ════════════════════════════════════════════════════════ */
export function FullTimingSection() {
  return (
    <section id="timing" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Why Now</h2>

      <div className="flex items-center gap-8">
        <ScoreGauge label="Urgency" value={WHY_NOW.urgencyScore} maxValue={100} size="large" />
        <div className="flex-1">
          <p className="text-base font-bold text-[#d4d4d4]">Window of Opportunity</p>
          <p className="mt-1 text-sm text-[#6b8a6b]">Opens: {WHY_NOW.windowOfOpportunity.opens}</p>
          <p className="text-sm text-[#e32b1a]">Closes: {WHY_NOW.windowOfOpportunity.closesBy}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{WHY_NOW.windowOfOpportunity.reasoning}</p>
        </div>
      </div>

      <SectionLabel>Catalysts ({WHY_NOW.catalysts.length})</SectionLabel>
      <div className="space-y-3">
        {WHY_NOW.catalysts.map((c) => (
          <div key={c.event} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
            <div className="mb-2 flex items-start gap-2">
              <Badge variant={c.impact}>{c.impact}</Badge>
              <p className="text-sm font-bold text-[#d4d4d4]">{c.event}</p>
            </div>
            <p className="text-xs text-[#928e87]">{c.timeframe}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#928e87]">{c.howToLeverage}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Timing Factors ({WHY_NOW.timingFactors.length})</SectionLabel>
      {WHY_NOW.timingFactors.map((f, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e32b1a]" />
          <p className="text-sm text-[#928e87]">{f}</p>
        </div>
      ))}

      <SectionLabel>Market Triggers ({WHY_NOW.marketTriggers.length})</SectionLabel>
      {WHY_NOW.marketTriggers.map((t, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#928e87]" />
          <p className="text-sm text-[#928e87]">{t}</p>
        </div>
      ))}

      <SectionLabel>Urgency Narrative</SectionLabel>
      <div className="rounded-lg border border-[#e32b1a]/20 bg-[#110a08] p-5">
        <p className="text-sm leading-relaxed text-[#d4d4d4]">{WHY_NOW.urgencyNarrative}</p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   MARKET > Keyword Trends
   ════════════════════════════════════════════════════════ */
export function FullKeywordsSection() {
  return (
    <section id="blueprint-keywords" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Keyword Trends</h2>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-[#928e87]">Primary ({KEYWORDS.primary.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {KEYWORDS.primary.map((k) => (
              <span key={k} className="rounded bg-[#2a2220] px-2 py-1 text-xs text-[#e32b1a]/80">{k}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-[#928e87]">Secondary ({KEYWORDS.secondary.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {KEYWORDS.secondary.map((k) => (
              <span key={k} className="rounded bg-[#222222] px-2 py-1 text-xs text-[#928e87]">{k}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-[#928e87]">Long-tail ({KEYWORDS.longTail.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {KEYWORDS.longTail.map((k) => (
              <span key={k} className="rounded bg-[#222222] px-2 py-1 text-xs text-[#928e87]">{k}</span>
            ))}
          </div>
        </div>
      </div>

      <SectionLabel>Trends ({KEYWORD_TRENDS.length})</SectionLabel>
      <div className="grid gap-3 lg:grid-cols-3">
        {KEYWORD_TRENDS.map((kt) => (
          <div key={kt.keyword} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
            <p className="text-sm font-bold text-[#d4d4d4]">{kt.keyword}</p>
            <p className="text-xs text-[#928e87]">Volume: {kt.volume.toLocaleString()} &middot; Growth: +{kt.growth}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   VALIDATION > Proof Signals
   ════════════════════════════════════════════════════════ */
export function FullProofSignalsSection() {
  return (
    <section id="blueprint-demand" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Proof Signals</h2>

      <SectionLabel>Demand Strength</SectionLabel>
      <div className="flex items-center gap-6 mb-3">
        <ScoreGauge label="Demand" value={PROOF_SIGNALS.demandStrength.score} maxValue={100} size="large" />
        <div className="flex-1 text-sm text-[#928e87]">{PROOF_SIGNALS.demandStrength.spendingSignal}</div>
      </div>
      {PROOF_SIGNALS.demandIndicators.map((d, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b8a6b]" />
          <p className="text-sm text-[#928e87]">{d}</p>
        </div>
      ))}

      <SectionLabel>Risk Factors ({PROOF_SIGNALS.riskFactors.length})</SectionLabel>
      {PROOF_SIGNALS.riskFactors.map((r, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b44a3e]" />
          <p className="text-sm text-[#928e87]">{r}</p>
        </div>
      ))}

      <SectionLabel>Risk Mitigation ({PROOF_SIGNALS.riskMitigation.length})</SectionLabel>
      {PROOF_SIGNALS.riskMitigation.map((rm, i) => (
        <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={rm.severity}>{rm.severity}</Badge>
            <p className="text-sm font-bold text-[#d4d4d4]">{rm.risk}</p>
          </div>
          <p className="text-sm text-[#928e87]">{rm.mitigation}</p>
        </div>
      ))}

      <SectionLabel>Validation Experiments ({PROOF_SIGNALS.validationExperiments.length})</SectionLabel>
      {PROOF_SIGNALS.validationExperiments.map((v, i) => (
        <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
          <p className="text-sm font-bold text-[#d4d4d4]">{v.experiment}</p>
          <div className="mt-1 flex gap-4">
            <span className="text-xs text-[#928e87]">Cost: {v.cost}</span>
            <span className="text-xs text-[#928e87]">Time: {v.timeframe}</span>
          </div>
          <p className="mt-1 text-sm italic text-[#928e87]">{v.hypothesis}</p>
        </div>
      ))}

      <SectionLabel>Validation Opportunities ({PROOF_SIGNALS.validationOpportunities.length})</SectionLabel>
      {PROOF_SIGNALS.validationOpportunities.map((vo, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#222222] text-[10px] font-bold text-[#d4d4d4]">{i + 1}</span>
          <p className="text-sm text-[#928e87]">{vo}</p>
        </div>
      ))}
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   VALIDATION > Pain Points
   ════════════════════════════════════════════════════════ */
export function FullPainPointsSection() {
  const highCount = PAIN_POINTS.filter((p) => p.severity === 'high').length;
  const medCount = PAIN_POINTS.filter((p) => p.severity === 'medium').length;
  const lowCount = PAIN_POINTS.filter((p) => p.severity === 'low').length;

  return (
    <section id="pain-points" className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Pain Points</h2>
        <Badge>{PAIN_POINTS.length} validated</Badge>
      </div>

      <div className="flex gap-3">
        <Badge variant="high">{highCount} HIGH</Badge>
        <Badge variant="medium">{medCount} MEDIUM</Badge>
        <Badge variant="low">{lowCount} LOW</Badge>
      </div>

      <div className="space-y-3">
        {PAIN_POINTS.map((p, i) => (
          <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
            <div className="mb-2 flex items-start gap-3">
              <Badge variant={p.severity}>{p.severity}</Badge>
              <p className="text-sm font-bold leading-snug text-[#d4d4d4]">{p.problem}</p>
            </div>
            <p className="mb-2 text-sm italic leading-relaxed text-[#928e87]">{p.evidenceQuote}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#928e87]">{p.affectedSegment}</span>
              <span className="text-xs text-[#928e87]">{p.costOfInaction}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   VALIDATION > Competitors
   ════════════════════════════════════════════════════════ */
export function FullCompetitorsSection() {
  return (
    <section id="competitors" className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Competitors</h2>
        <Badge>{COMPETITORS.length} analyzed</Badge>
      </div>

      <div className="space-y-4">
        {COMPETITORS.map((c) => (
          <div key={c.name} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-base font-bold text-[#d4d4d4]">{c.name}</p>
                <p className="text-xs text-[#928e87]">{c.targetSegment} &middot; {c.fundingStage}</p>
              </div>
              <span className="shrink-0 text-sm font-medium text-[#e32b1a]">{c.pricingModel}</span>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-[#928e87]">{c.description}</p>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[1px] text-[#6b8a6b]">Strengths</p>
                {c.strengths.map((s, i) => (
                  <p key={i} className="text-sm leading-snug text-[#6b8a6b]/80">+ {s}</p>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[1px] text-[#b44a3e]">Weaknesses</p>
                {c.weaknesses.map((w, i) => (
                  <p key={i} className="text-sm leading-snug text-[#b44a3e]/80">- {w}</p>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[1px] text-[#e32b1a]">Vulnerability</p>
                <p className="text-sm leading-snug text-[#928e87]">{c.vulnerability}</p>
                <p className="mt-2 text-xs text-[#928e87]"><span className="font-bold text-[#d4d4d4]">Key Differentiator:</span> {c.keyDifferentiator}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   STRATEGY > Positioning
   ════════════════════════════════════════════════════════ */
export function FullPositioningSection() {
  return (
    <section id="strategy" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Positioning</h2>

      <SectionLabel>Unique Value Proposition</SectionLabel>
      <div className="rounded-lg border border-[#e32b1a]/30 bg-[#110a08] p-5">
        <p className="text-base font-medium leading-relaxed text-[#d4d4d4]">&ldquo;{POSITIONING.uniqueValueProposition}&rdquo;</p>
      </div>

      <SectionLabel>Target Audience</SectionLabel>
      <p className="text-sm leading-relaxed text-[#928e87]">{POSITIONING.targetAudience}</p>

      <SectionLabel>Differentiators ({POSITIONING.differentiators.length})</SectionLabel>
      <div className="space-y-2">
        {POSITIONING.differentiators.map((d, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e32b1a]" />
            <p className="text-sm text-[#d4d4d4]">{d}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Messaging Pillars ({POSITIONING.messagingPillars.length})</SectionLabel>
      <div className="grid gap-3 lg:grid-cols-2">
        {POSITIONING.messagingPillars.map((p, i) => (
          <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-3">
            <p className="text-sm text-[#d4d4d4]">{p}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Messaging Framework</SectionLabel>
      <div className="space-y-3">
        <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
          <p className="text-xs font-bold uppercase text-[#928e87]">Headline</p>
          <p className="mt-1 text-base font-bold text-[#d4d4d4]">{POSITIONING.messagingFramework.headline}</p>
        </div>
        <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
          <p className="text-xs font-bold uppercase text-[#928e87]">Subheadline</p>
          <p className="mt-1 text-sm text-[#d4d4d4]">{POSITIONING.messagingFramework.subheadline}</p>
        </div>
        <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
          <p className="text-xs font-bold uppercase text-[#928e87]">Elevator Pitch</p>
          <p className="mt-1 text-sm leading-relaxed text-[#928e87]">{POSITIONING.messagingFramework.elevatorPitch}</p>
        </div>
      </div>

      <SectionLabel>Ideal Customer Profile</SectionLabel>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
        <p className="text-base font-bold text-[#d4d4d4]">{POSITIONING.idealCustomerProfile.persona}</p>
        <p className="mt-1 text-sm text-[#928e87]">{POSITIONING.idealCustomerProfile.demographics}</p>
        <p className="mt-2 text-sm text-[#928e87]">{POSITIONING.idealCustomerProfile.psychographics}</p>
        <SectionLabel>Buying Triggers</SectionLabel>
        {POSITIONING.idealCustomerProfile.buyingTriggers.map((t, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e32b1a]" />
            <p className="text-sm text-[#928e87]">{t}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Objection Handlers ({POSITIONING.messagingFramework.objectionHandlers.length})</SectionLabel>
      {POSITIONING.messagingFramework.objectionHandlers.map((oh, i) => (
        <div key={i} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
          <p className="text-sm font-bold text-[#d4d4d4]">&ldquo;{oh.objection}&rdquo;</p>
          <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{oh.response}</p>
        </div>
      ))}

      <SectionLabel>Competitive Positioning</SectionLabel>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
        <p className="text-xs font-bold uppercase text-[#928e87]">Category: {POSITIONING.competitivePositioning.category}</p>
        <p className="mt-2 text-sm text-[#d4d4d4]">{POSITIONING.competitivePositioning.against}</p>
        <p className="mt-2 text-sm text-[#928e87]"><span className="font-bold text-[#d4d4d4]">Proof Point:</span> {POSITIONING.competitivePositioning.proofPoint}</p>
        <p className="mt-2 text-sm text-[#928e87]"><span className="font-bold text-[#d4d4d4]">Anchor Benefit:</span> {POSITIONING.competitivePositioning.anchorBenefit}</p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   STRATEGY > Offer / Value Ladder
   ════════════════════════════════════════════════════════ */
export function FullValueLadderSection() {
  return (
    <section id="business-value" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Offer / Value Ladder</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VALUE_LADDER.map((t) => (
          <div
            key={t.tier}
            className={`rounded-lg border p-4 ${
              t.highlighted ? 'border-[#e32b1a] bg-[#110a08]' : 'border-[#222222] bg-[#0A0A0A]'
            }`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-[#928e87]">{t.label}</p>
            <p className="mt-1 font-display text-xl font-black text-[#d4d4d4]">{t.price}</p>
            <p className="mt-2 text-sm font-bold text-[#d4d4d4]">{t.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#928e87]">{t.description}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Critical Path ({EXECUTION.criticalPath.length} steps)</SectionLabel>
      {EXECUTION.criticalPath.map((step, i) => (
        <div key={i} className="flex items-start gap-3 py-1">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#222222] text-xs font-bold text-[#d4d4d4]">{i + 1}</span>
          <p className="text-sm text-[#928e87]">{step}</p>
        </div>
      ))}

      <SectionLabel>Go-To-Market</SectionLabel>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="GTM Clarity" value={GTM.rating.toUpperCase()} sub={`${GTM.confidence}% confidence`} />
        <StatCard label="CAC" value="$15-25K" sub="Per resort (early stage)" />
        <StatCard label="First Milestone" value="3 Partners" sub="Within 6 months" />
      </div>

      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
        <p className="text-xs font-bold uppercase text-[#928e87]">Primary Channel</p>
        <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{GTM.primaryChannel}</p>
      </div>

      <SectionLabel>Channels ({GTM.channels.length})</SectionLabel>
      {GTM.channels.map((ch, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#928e87]" />
          <p className="text-sm text-[#928e87]">{ch}</p>
        </div>
      ))}
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   STRATEGY > Tech Stack
   ════════════════════════════════════════════════════════ */
export function FullTechStackSection() {
  return (
    <section id="blueprint-tech" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Tech Stack</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monthly Cost" value={`$${TECH_STACK.estimatedMonthlyCost.min}-$${TECH_STACK.estimatedMonthlyCost.max}`} sub={TECH_STACK.businessType} />
        <StatCard label="Stack Type" value="Full-Stack" sub="SaaS-optimized" />
      </div>
      <p className="text-sm leading-relaxed text-[#928e87]">{TECH_STACK.summary}</p>
      <p className="text-sm leading-relaxed text-[#928e87]">{TECH_STACK.scalabilityNotes}</p>

      {Object.entries(TECH_STACK.layers).map(([layer, items]) => (
        <div key={layer}>
          <SectionLabel>{layer}</SectionLabel>
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.name} className="flex items-center justify-between border-b border-[#222222] py-2 last:border-0">
                <div>
                  <p className="text-sm font-bold text-[#d4d4d4]">{item.name}</p>
                  <p className="text-xs text-[#928e87]">{item.purpose}</p>
                </div>
                <span className="text-xs text-[#928e87]">{item.cost}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <SectionLabel>Security Considerations</SectionLabel>
      {TECH_STACK.securityConsiderations.map((s, i) => (
        <div key={i} className="flex items-start gap-2 py-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#928e87]" />
          <p className="text-sm text-[#928e87]">{s}</p>
        </div>
      ))}

      {/* User Story included here as bonus context */}
      <SectionLabel>User Story</SectionLabel>
      <div className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
        <p className="text-base font-bold text-[#d4d4d4]">{USER_STORY.protagonist.name}</p>
        <p className="text-sm text-[#928e87]">{USER_STORY.protagonist.title} — {USER_STORY.protagonist.setting}</p>
      </div>
      <div className="rounded-lg border border-[#e32b1a]/20 bg-[#110a08] p-5">
        <p className="text-sm italic leading-relaxed text-[#d4d4d4]">{USER_STORY.quote}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#b44a3e]/30 bg-[#0A0A0A] p-4">
          <p className="text-xs font-bold uppercase text-[#b44a3e]">Before</p>
          <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{USER_STORY.dayInTheLife.before}</p>
        </div>
        <div className="rounded-lg border border-[#6b8a6b]/30 bg-[#0A0A0A] p-4">
          <p className="text-xs font-bold uppercase text-[#6b8a6b]">After</p>
          <p className="mt-2 text-sm leading-relaxed text-[#928e87]">{USER_STORY.dayInTheLife.after}</p>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   STRATEGY > Action Prompts
   ════════════════════════════════════════════════════════ */
export function FullActionPromptsSection() {
  return (
    <section id="blueprint-actions" className="space-y-6">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d4d4d4]">Action Prompts</h2>

      <div className="grid gap-3 lg:grid-cols-2">
        {ACTION_PROMPTS.map((ap) => (
          <div key={ap.id} className="rounded-lg border border-[#222222] bg-[#0A0A0A] p-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge>{ap.category}</Badge>
              <p className="text-sm font-bold text-[#d4d4d4]">{ap.title}</p>
            </div>
            <p className="text-sm text-[#928e87]">{ap.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
