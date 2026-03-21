import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Flame,
  TrendingUp,
  Search,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  MessageSquare,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Daily Trend Picks | AI-Curated Business Opportunities — IdeaFuel',
  description:
    'Discover trending business opportunities every day. AI analyzes Google Trends, search data, and social signals to surface ideas with real demand.',
  openGraph: {
    title: 'Daily Trend Picks — IdeaFuel',
    description: 'AI-curated business opportunities from trending search data, updated daily.',
  },
};

const scoreDimensions = [
  {
    icon: TrendingUp,
    title: 'Growth Score',
    description: 'How fast the search trend is rising. We filter for 150%+ growth spikes to separate signal from noise.',
  },
  {
    icon: ShoppingCart,
    title: 'Purchase Proof',
    description: 'Evidence that people are spending money — ads in SERPs, shopping results, buy-stage intent signals.',
  },
  {
    icon: MessageSquare,
    title: 'Pain Point Score',
    description: 'AI triage of who has the problem, what it is, and how urgent it feels. Scored 1-5 on urgency.',
  },
  {
    icon: AlertTriangle,
    title: 'News Spike Risk',
    description: 'Filters out trends driven by celebrity news, sports, or current events — they disappear in 48 hours.',
  },
];

const pipeline = [
  { step: '01', title: 'Seed & expand', description: '20 commercial keyword categories generate hundreds of rising queries via Google Trends.' },
  { step: '02', title: 'Growth filter', description: 'Only trends with 150%+ growth spikes survive. Duplicates are removed.' },
  { step: '03', title: 'Intent filter', description: 'Non-commercial queries (news, celebrities, sports) are discarded. Only money-making intent passes.' },
  { step: '04', title: 'Enrich & score', description: 'Each candidate gets trend data, SERP analysis, and AI triage across 4 scoring dimensions.' },
  { step: '05', title: 'Pick the winner', description: 'The highest-confidence opportunity becomes your Daily Pick — with a full report explaining why.' },
];

export default function TrendsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mb-24">
        <div className="mb-6 inline-block rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
          Daily Trend Picks
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
          Business opportunities{' '}
          <span className="text-gradient-brand">before everyone else sees them</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#928e87]">
          Every day, IdeaFuel&apos;s AI scans trending search data, scores demand signals, and
          surfaces the single best business opportunity — complete with a thesis, pain point
          analysis, and suggested exploration angles.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/signin?view=signup"
            className="inline-flex items-center justify-center rounded-full bg-[#e32b1a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
          >
            See Today&apos;s Pick
          </Link>
        </div>
      </section>

      {/* ── What You Get ─────────────────────────────────────── */}
      <section className="mb-24 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          What&apos;s in each daily pick
        </h2>
        <p className="mb-8 max-w-2xl text-[15px] text-[#928e87]">
          Not just a keyword and a chart. Each pick is a mini research report.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            'One-line thesis explaining the opportunity',
            'Trend chart showing growth trajectory',
            'Pain point breakdown: who, what problem, urgency',
            'Purchase proof: buy stage and spending evidence',
            '2-3 exploration angles to test the idea',
            'Recommended next step (Spark, Light, or Forge)',
            'Related rising queries for adjacent ideas',
            'Transparency section: why this pick won',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 py-2">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-[#e32b1a]" />
              <span className="text-[14px] text-[#e8e4df]">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scoring ──────────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          How we score opportunities
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          Four dimensions. No vibes. Every score has data behind it.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {scoreDimensions.map((s) => (
            <div key={s.title} className="rounded-xl border border-[#2a2a2a] bg-[#161513] p-7">
              <s.icon className="mb-4 h-6 w-6 text-[#e32b1a]" />
              <h3 className="mb-2 text-[16px] font-semibold text-white">{s.title}</h3>
              <p className="text-[14px] leading-relaxed text-[#928e87]">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ─────────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-12 font-mono text-[11px] font-semibold uppercase tracking-[3px] text-[#5a5652]">
          The pipeline
        </h2>
        <div className="space-y-3">
          {pipeline.map((p) => (
            <div key={p.step} className="flex gap-6 rounded-xl border border-[#2a2a2a] bg-[#1a1917] px-6 py-5 md:px-8">
              <div className="shrink-0 font-mono text-[13px] font-semibold text-[#e32b1a]">
                {p.step}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">{p.title}</h3>
                <p className="mt-0.5 text-[14px] text-[#928e87]">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="text-center">
        <h2 className="mx-auto max-w-xl font-display text-4xl font-extrabold uppercase text-white md:text-5xl">
          The best ideas are{' '}
          <span className="text-gradient-brand">already trending</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#928e87]">
          You just need someone to find them. Let AI do the scanning.
        </p>
        <Link
          href="/auth/signin?view=signup"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#e32b1a] px-8 py-4 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
        >
          Start for Free
        </Link>
      </section>
    </div>
  );
}
