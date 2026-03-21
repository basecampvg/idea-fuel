import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Target,
  BarChart3,
  Users,
  Rocket,
  TrendingUp,
  Shield,
  Download,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Business Plan Generator | Free Business Plan Creator — IdeaFuel',
  description:
    'Generate investor-ready business plans in minutes with AI. 13 report types including competitive analysis, go-to-market strategy, financial projections, and more.',
  openGraph: {
    title: 'AI Business Plan Generator — IdeaFuel',
    description: 'Generate investor-ready business plans in minutes with AI-powered research and analysis.',
  },
};

const reportSections = [
  { icon: FileText, title: 'Executive Summary', description: 'Concise overview of your entire business case' },
  { icon: Target, title: 'Market Narrative', description: 'TAM, SAM, SOM with real data backing every number' },
  { icon: BarChart3, title: 'Competitive Analysis', description: 'SWOT, positioning maps, and competitor tear-downs' },
  { icon: Users, title: 'Customer Profile', description: 'Demographics, psychographics, pain-point mapping' },
  { icon: Rocket, title: 'Go-to-Market Strategy', description: 'Launch timeline, channel strategy, acquisition plan' },
  { icon: TrendingUp, title: 'Financial Projections', description: 'P&L, cash flow, and break-even analysis' },
  { icon: Shield, title: 'Risk Analysis', description: 'Threat identification with mitigation strategies' },
  { icon: Sparkles, title: 'Value Proposition', description: 'Benefits breakdown with objection handlers' },
];

const allReportTypes = [
  'Business Plan',
  'Positioning Strategy',
  'Competitive Analysis',
  'Why Now Analysis',
  'Proof Signals',
  'Keywords & SEO',
  'Customer Profile',
  'Value Equation',
  'Value Ladder',
  'Go-to-Market',
  'Opportunity Scorecard',
  'Expansion Business Case',
  'Risk & Cannibalization',
];

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mb-24">
        <div className="mb-6 inline-block rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
          AI-Powered Reports
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
          Generate an investor-ready{' '}
          <span className="text-gradient-brand">business plan</span> in minutes
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#928e87]">
          Stop staring at blank templates. IdeaFuel interviews you about your idea, researches your
          market with real data, then generates a comprehensive business plan — complete with
          financial projections, competitive analysis, and go-to-market strategy.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth/signin?view=signup"
            className="inline-flex items-center justify-center rounded-full bg-[#e32b1a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
          >
            Generate Your Plan
          </Link>
          <Link
            href="/demo-report"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2a2a2a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-[#928e87] transition-all hover:border-[#e32b1a]/30 hover:text-white"
          >
            See Sample Report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-12 font-mono text-[11px] font-semibold uppercase tracking-[3px] text-[#5a5652]">
          How it works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Answer questions',
              body: 'Our AI conducts a structured interview — 10 to 18 questions that dig into your problem, customer, solution, and market timing. Every answer extracts up to 42 data points.',
            },
            {
              step: '02',
              title: 'We research your market',
              body: 'A 4-phase research pipeline analyzes competitors, validates demand signals from Reddit and Twitter, sizes your market, and scores your opportunity — all automatically.',
            },
            {
              step: '03',
              title: 'Get your reports',
              body: 'Choose from 13 report types. Each one is generated from your interview data and real market research — not templates filled with placeholder text. Export as PDF.',
            },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-8">
              <div className="mb-4 font-mono text-[13px] font-semibold text-[#e32b1a]">
                {item.step}
              </div>
              <h3 className="mb-3 text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-[15px] leading-relaxed text-[#928e87]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Report Sections ──────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          What&apos;s inside your business plan
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          Every section is grounded in data from your interview and our AI research pipeline — not
          generic filler from a template library.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {reportSections.map((section) => (
            <div
              key={section.title}
              className="flex items-start gap-4 rounded-xl border border-[#2a2a2a] bg-[#161513] p-6 transition-colors hover:border-[#2a2a2a]/80"
            >
              <section.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#e32b1a]" />
              <div>
                <h3 className="text-[15px] font-semibold text-white">{section.title}</h3>
                <p className="mt-1 text-[14px] text-[#928e87]">{section.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── All 13 Report Types ──────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          13 report types. One platform.
        </h2>
        <p className="mb-10 max-w-2xl text-[15px] text-[#928e87]">
          The business plan is just the start. Generate specialized reports for every stage of
          validation and growth.
        </p>
        <div className="flex flex-wrap gap-3">
          {allReportTypes.map((type) => (
            <span
              key={type}
              className="rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-2 text-[13px] font-medium text-[#e8e4df]"
            >
              {type}
            </span>
          ))}
        </div>
      </section>

      {/* ── Why not a template ───────────────────────────────── */}
      <section className="mb-24 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <h2 className="mb-6 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Templates are a lie
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-[15px] leading-relaxed text-[#928e87]">
              Every &ldquo;free business plan template&rdquo; you&apos;ve downloaded is the same recycled
              structure with blanks where your data should go. You fill it in, guess at the numbers,
              and call it a plan. It&apos;s not — it&apos;s a document that looks like a plan.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#928e87]">
              IdeaFuel generates reports from actual research. Competitor data is pulled from the
              web. Market sizing uses real search volume and industry benchmarks. Your financial
              projections come from structured assumptions — not vibes.
            </p>
          </div>
          <div className="space-y-4">
            {[
              'Real competitor data, not placeholder names',
              'Market sizing backed by search volume & benchmarks',
              'Financial projections from structured assumptions',
              'Positioning built on actual competitive gaps',
              'Export as professional PDF',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e32b1a]" />
                <span className="text-[15px] text-[#e8e4df]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PDF Export ────────────────────────────────────────── */}
      <section className="mb-24 flex items-center gap-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <Download className="hidden h-12 w-12 shrink-0 text-[#e32b1a] md:block" />
        <div>
          <h2 className="mb-2 text-xl font-semibold text-white">Export as PDF</h2>
          <p className="text-[15px] text-[#928e87]">
            Download professional, formatted business plans ready to share with investors, partners,
            or your co-founder. Multiple cover styles. Clean typography. No watermarks on paid plans.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="text-center">
        <h2 className="mx-auto max-w-xl font-display text-4xl font-extrabold uppercase text-white md:text-5xl">
          Your idea deserves better than a{' '}
          <span className="text-gradient-brand">template</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#928e87]">
          Generate your first AI-powered business plan in under 15 minutes. Free to start.
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
