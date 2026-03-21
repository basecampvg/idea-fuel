import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  Globe,
  BarChart3,
  Users,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Zap,
  Target,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Market Research Tool | Competitive Analysis for Startups — IdeaFuel',
  description:
    'Automated market research and competitive analysis for startups. AI-powered competitor discovery, market sizing, demand validation, and trend analysis.',
  openGraph: {
    title: 'AI Market Research & Competitive Analysis — IdeaFuel',
    description: 'Automate your startup market research with AI-powered competitive analysis, market sizing, and demand validation.',
  },
};

const researchCapabilities = [
  {
    icon: BarChart3,
    title: 'Market Sizing',
    description: 'TAM, SAM, SOM calculated from real search volume, industry data, and growth rates — not back-of-napkin guesses.',
  },
  {
    icon: Target,
    title: 'Competitor Discovery',
    description: '3-5 direct and indirect competitors analyzed with strengths, weaknesses, pricing, funding stage, and positioning.',
  },
  {
    icon: MessageSquare,
    title: 'Demand Validation',
    description: 'Social signals from Reddit, Twitter, Hacker News, and Indie Hackers. We find real conversations about the problem you solve.',
  },
  {
    icon: TrendingUp,
    title: 'Trend Analysis',
    description: 'Why-now triggers, market timing factors, and window-of-opportunity scoring so you know if the timing is right.',
  },
  {
    icon: Users,
    title: 'Pain Point Mapping',
    description: 'Severity scoring, affected segments, cost of inaction, and emotional impact — with evidence quotes from real users.',
  },
  {
    icon: Search,
    title: 'SEO & Keyword Intelligence',
    description: 'Primary, secondary, and long-tail search terms your customers are already using. Build content strategy on day one.',
  },
];

const phases = [
  { phase: 'Phase 1', title: 'Deep Research', pct: '0–30%', description: 'AI scours the web for market data, competitor intelligence, and industry benchmarks.' },
  { phase: 'Phase 2', title: 'Social Research', pct: '30–55%', description: 'Filtered analysis of Reddit, HN, Twitter, and Indie Hackers for demand signals and pain points.' },
  { phase: 'Phase 3', title: 'Synthesis', pct: '55–80%', description: 'Structured extraction of insights: scores, segments, positioning frameworks, and risk factors.' },
  { phase: 'Phase 4', title: 'Report Generation', pct: '80–100%', description: 'Human-readable analysis with opportunity scores, competitive maps, and actionable recommendations.' },
];

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mb-24">
        <div className="mb-6 inline-block rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
          AI Market Research
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
          Competitive analysis that{' '}
          <span className="text-gradient-brand">actually researches</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#928e87]">
          Most &ldquo;market research tools&rdquo; hand you a template and wish you luck. IdeaFuel
          runs a 4-phase AI research pipeline that pulls real competitor data, validates demand
          signals from social platforms, and sizes your market with actual numbers.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth/signin?view=signup"
            className="inline-flex items-center justify-center rounded-full bg-[#e32b1a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
          >
            Start Research
          </Link>
          <Link
            href="/demo-report"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2a2a2a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-[#928e87] transition-all hover:border-[#e32b1a]/30 hover:text-white"
          >
            See Sample Report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Research Pipeline ────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          4-phase research pipeline
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          From raw web data to structured insights. Every phase builds on the last.
        </p>
        <div className="space-y-4">
          {phases.map((p) => (
            <div key={p.phase} className="flex gap-6 rounded-xl border border-[#2a2a2a] bg-[#1a1917] p-6 md:p-8">
              <div className="shrink-0">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
                  {p.phase}
                </div>
                <div className="mt-1 font-mono text-[12px] text-[#5a5652]">{p.pct}</div>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[#928e87]">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Capabilities Grid ────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          What you get
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          Every analysis section is grounded in real data — not AI hallucinations about markets that
          don&apos;t exist.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {researchCapabilities.map((cap) => (
            <div key={cap.title} className="rounded-xl border border-[#2a2a2a] bg-[#161513] p-7">
              <cap.icon className="mb-4 h-6 w-6 text-[#e32b1a]" />
              <h3 className="mb-2 text-[16px] font-semibold text-white">{cap.title}</h3>
              <p className="text-[14px] leading-relaxed text-[#928e87]">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Spark Mode ───────────────────────────────────────── */}
      <section className="mb-24 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <div className="flex items-start gap-5">
          <Zap className="mt-1 hidden h-8 w-8 shrink-0 text-[#e32b1a] md:block" />
          <div>
            <h2 className="mb-3 font-display text-2xl font-extrabold uppercase text-white md:text-3xl">
              Need answers in 5 minutes?
            </h2>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[#928e87]">
              <strong className="text-white">Spark Mode</strong> runs a quick-fire validation:
              keyword discovery, Reddit and Facebook group scanning, top-down and bottom-up TAM
              estimation, and 3-5 competitor profiles — all in under 5 minutes. You get a confidence
              score and a verdict before you commit to the full deep dive.
            </p>
          </div>
        </div>
      </section>

      {/* ── Scoring ──────────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Opportunity scoring
        </h2>
        <p className="mb-10 max-w-2xl text-[15px] text-[#928e87]">
          Every project gets scored across four dimensions. No vague &ldquo;looks good&rdquo;
          verdicts — hard numbers with confidence levels and justifications.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Opportunity', description: 'Overall business viability', range: '0–100' },
            { label: 'Problem', description: 'Severity of pain point', range: '0–100' },
            { label: 'Feasibility', description: 'Execution difficulty', range: '0–100' },
            { label: 'Why Now', description: 'Market timing strength', range: '0–100' },
          ].map((score) => (
            <div key={score.label} className="rounded-xl border border-[#2a2a2a] bg-[#1a1917] p-6 text-center">
              <div className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
                {score.label}
              </div>
              <div className="text-[13px] text-[#928e87]">{score.description}</div>
              <div className="mt-2 font-mono text-[12px] text-[#5a5652]">{score.range}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data Sources ─────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-10 font-mono text-[11px] font-semibold uppercase tracking-[3px] text-[#5a5652]">
          Where we get the data
        </h2>
        <div className="flex flex-wrap gap-3">
          {['Web search (real-time)', 'Reddit', 'Twitter / X', 'Hacker News', 'Indie Hackers', 'Google Trends', 'SerpAPI', 'Industry reports', 'News & publications'].map((source) => (
            <span key={source} className="rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-2 text-[13px] font-medium text-[#e8e4df]">
              {source}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="text-center">
        <h2 className="mx-auto max-w-xl font-display text-4xl font-extrabold uppercase text-white md:text-5xl">
          Research your market.{' '}
          <span className="text-gradient-brand">For real.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#928e87]">
          Stop guessing at market size and making up competitor names. Start with real data.
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
