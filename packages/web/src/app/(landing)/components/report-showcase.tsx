'use client';

import { TrendingUp, ShieldAlert, Shield, ShieldCheck, Clock, BarChart3 } from 'lucide-react';
import { useInView } from './use-in-view';

const marketCards = [
  {
    label: 'TAM',
    fullLabel: 'Total Addressable Market',
    value: '$4.8B',
    growth: '+12.3%',
  },
  {
    label: 'SAM',
    fullLabel: 'Serviceable Available Market',
    value: '$1.2B',
    growth: '+14.1%',
  },
  {
    label: 'SOM',
    fullLabel: 'Serviceable Obtainable Market',
    value: '$180M',
    growth: '+18.7%',
  },
];

const competitors = [
  {
    name: 'Little Hotelier',
    type: 'Incumbent',
    threat: 'high' as const,
    strengths: 'Large install base, brand recognition',
    weakness: 'Dated UX, slow feature releases',
  },
  {
    name: 'Guesty',
    type: 'Challenger',
    threat: 'medium' as const,
    strengths: 'VC-funded, modern platform',
    weakness: 'Enterprise-focused, expensive for small B&Bs',
  },
  {
    name: 'Lodgify',
    type: 'Niche',
    threat: 'medium' as const,
    strengths: 'Website builder + booking engine',
    weakness: 'Limited CRM features, no AI capabilities',
  },
];

const trendSignals = [
  { label: 'B&B market growing 18% YoY post-pandemic', positive: true },
  { label: 'Legacy PMS tools have 2.3★ average reviews', positive: true },
  { label: '"B&B management software" searches up 340%', positive: true },
];

const threatColors = {
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-success',
};

const threatIcons = {
  high: ShieldAlert,
  medium: Shield,
  low: ShieldCheck,
};

export function ReportShowcase() {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="relative px-6 py-20">
      <div className="mx-auto max-w-4xl">
        {/* Section header */}
        <h2
          className={`text-center font-display text-3xl font-bold text-foreground transition-all duration-700 sm:text-4xl ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          See What You <span className="text-gradient">Get</span>
        </h2>
        <p
          className={`mt-3 text-center text-muted-foreground transition-all duration-700 delay-100 ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          A sample report for &quot;Custom CRM for Bed &amp; Breakfasts&quot;
        </p>

        {/* Browser window chrome */}
        <div
          className={`mt-8 overflow-hidden rounded-2xl border border-border transition-all duration-700 delay-200 ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-destructive/40" />
              <div className="h-3 w-3 rounded-full bg-warning/40" />
              <div className="h-3 w-3 rounded-full bg-success/40" />
            </div>
            <span className="ml-2 text-xs text-muted-foreground">
              IdeationLab Report — B&B CRM Analysis
            </span>
          </div>

          {/* Scrollable report content */}
          <div className="relative max-h-[520px] overflow-y-auto bg-background p-6">
            {/* Market Overview */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Market Overview
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {marketCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 p-4"
                  >
                    <p className="text-xs font-medium text-primary">{card.label}</p>
                    <p className="text-[10px] text-muted-foreground">{card.fullLabel}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-success">
                      <TrendingUp className="h-3 w-3" />
                      {card.growth}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitive Landscape */}
            <div className="mt-8">
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Shield className="h-4 w-4" />
                Competitive Landscape
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {competitors.map((comp) => {
                  const ThreatIcon = threatIcons[comp.threat];
                  return (
                    <div key={comp.name} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {comp.name}
                        </span>
                        <ThreatIcon
                          className={`h-4 w-4 ${threatColors[comp.threat]}`}
                        />
                      </div>
                      <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">
                        {comp.type}
                      </span>
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs">
                          <span className="text-success">+</span>{' '}
                          <span className="text-muted-foreground">{comp.strengths}</span>
                        </p>
                        <p className="text-xs">
                          <span className="text-destructive">−</span>{' '}
                          <span className="text-muted-foreground">{comp.weakness}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timing Analysis */}
            <div className="mt-8">
              <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4" />
                Timing Analysis
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-sm font-medium text-success">
                  Strong Timing — Act Now
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {trendSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-success">&#10003;</span>
                    {signal.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gradient fade at bottom */}
            <div className="pointer-events-none sticky bottom-0 -mb-6 h-12 bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
