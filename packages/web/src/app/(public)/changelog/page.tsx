import type { Metadata } from 'next';
import { Flame } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog — IdeaFuel',
  description: 'See what\'s new in IdeaFuel. Latest features, improvements, and updates.',
};

const entries = [
  {
    date: 'March 2026',
    items: [
      {
        title: 'Mega menu navigation',
        description: 'New full-width dropdown navigation with product, resources, and quick links across all marketing pages.',
        tag: 'UI',
      },
      {
        title: 'Marketing pages launch',
        description: 'Dedicated pages for AI Business Plan Generator, Market Research, AI Interviews, Financial Projections, and Daily Trend Picks.',
        tag: 'Content',
      },
      {
        title: 'Daily Trend Picks pipeline v2',
        description: 'Upgraded to 6-stage pipeline with intent filtering, post-filter expansion, and bounded enrichment. News spike risk scoring prevents false positives.',
        tag: 'Feature',
      },
    ],
  },
  {
    date: 'February 2026',
    items: [
      {
        title: 'Financial modeling engine',
        description: '4 industry templates (SaaS, E-commerce, Services, General) with beginner-to-expert assumption levels. Scenario comparison, break-even analysis, and AI-generated financial narratives.',
        tag: 'Feature',
      },
      {
        title: 'Expand Mode',
        description: 'Multi-track interviews for existing businesses seeking growth opportunities. MOAT scoring, adjacency scanning, and expansion business case reports.',
        tag: 'Feature',
      },
      {
        title: '13 report types',
        description: 'Added Value Ladder, Opportunity Scorecard, Expansion Business Case, and Risk & Cannibalization reports. PDF export for all report types.',
        tag: 'Feature',
      },
    ],
  },
  {
    date: 'January 2026',
    items: [
      {
        title: 'Research pipeline v2',
        description: '4-phase research pipeline with deep web research, social signal analysis, structured synthesis, and creative report generation.',
        tag: 'Feature',
      },
      {
        title: 'Spark mode',
        description: 'Quick 5-minute validation: keyword discovery, Reddit/Facebook scanning, TAM estimation, and competitor profiles — no interview required.',
        tag: 'Feature',
      },
      {
        title: 'Opportunity scoring',
        description: 'Every project gets scored 0-100 across Opportunity, Problem, Feasibility, and Why Now dimensions with confidence levels.',
        tag: 'Feature',
      },
    ],
  },
];

const tagColors: Record<string, string> = {
  Feature: 'bg-[#e32b1a]/10 text-[#e32b1a]',
  UI: 'bg-blue-500/10 text-blue-400',
  Content: 'bg-emerald-500/10 text-emerald-400',
  Fix: 'bg-amber-500/10 text-amber-400',
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 lg:py-28">
      <header className="mb-16">
        <h1 className="font-display text-5xl font-extrabold uppercase text-white md:text-6xl">
          Changelog
        </h1>
        <p className="mt-4 text-lg text-[#928e87]">
          What&apos;s new in IdeaFuel. Features, improvements, and fixes.
        </p>
      </header>

      <div className="space-y-16">
        {entries.map((entry) => (
          <section key={entry.date}>
            <h2 className="mb-8 flex items-center gap-3 font-mono text-[13px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
              <Flame className="h-4 w-4" />
              {entry.date}
            </h2>
            <div className="space-y-6">
              {entry.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#2a2a2a] bg-[#1a1917] p-6"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-[16px] font-semibold text-white">{item.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tagColors[item.tag] ?? tagColors.Feature}`}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-[#928e87]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
