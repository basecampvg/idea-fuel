import type { Metadata } from 'next';
import Link from 'next/link';
import {
  TrendingUp,
  Calculator,
  BarChart3,
  Layers,
  Download,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Clock,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Startup Financial Projections Template | AI Financial Modeling — IdeaFuel',
  description:
    'Build startup financial projections with AI-powered templates. P&L, cash flow, break-even analysis, and scenario modeling for SaaS, e-commerce, and services.',
  openGraph: {
    title: 'Startup Financial Projections — IdeaFuel',
    description: 'AI-powered financial modeling with industry templates, scenario comparison, and break-even analysis.',
  },
};

const templates = [
  {
    name: 'SaaS',
    metrics: 'MRR/ARR, churn, CAC, LTV',
    description: 'Built for recurring revenue businesses with cohort-based modeling.',
  },
  {
    name: 'E-commerce',
    metrics: 'Units, ASP, COGS, fulfillment',
    description: 'Unit economics focused with inventory and shipping cost modeling.',
  },
  {
    name: 'Services',
    metrics: 'Hours, rates, utilization',
    description: 'Billable-hour modeling with capacity planning and margin tracking.',
  },
  {
    name: 'General',
    metrics: 'Flexible inputs',
    description: 'Adaptable template for business models that don\'t fit the standard categories.',
  },
];

const features = [
  {
    icon: BarChart3,
    title: 'Three financial statements',
    description: 'P&L, cash flow, and balance sheet — generated from your assumptions. Monthly, quarterly, or annual views.',
  },
  {
    icon: GitBranch,
    title: 'Scenario comparison',
    description: 'Base case, conservative, and aggressive scenarios side by side. See how different assumptions change the outcome.',
  },
  {
    icon: TrendingUp,
    title: 'Break-even analysis',
    description: 'When do you stop burning cash? We calculate the month, the revenue required, and the unit economics to get there.',
  },
  {
    icon: Calculator,
    title: 'Assumption engine',
    description: 'Start with 5 inputs (beginner) or go deep with 30+ expert-level assumptions. Dependency graphs show how changes cascade.',
  },
  {
    icon: Layers,
    title: 'Snapshots & versioning',
    description: 'Save model states as you refine assumptions. Compare versions to see how your thinking evolved.',
  },
  {
    icon: Download,
    title: 'Export everywhere',
    description: 'Download as PDF or Excel. Share with investors, advisors, or your co-founder.',
  },
];

export default function FinancialsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mb-24">
        <div className="mb-6 inline-block rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
          Financial Modeling
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
          Financial projections for startups{' '}
          <span className="text-gradient-brand">that make sense</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#928e87]">
          Spreadsheet financial models break the moment you change one assumption. IdeaFuel builds
          yours from structured inputs — with dependency tracking, scenario comparison, and AI
          narratives that explain the numbers in plain English.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth/signin?view=signup"
            className="inline-flex items-center justify-center rounded-full bg-[#e32b1a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
          >
            Build Your Model
          </Link>
          <Link
            href="/product/reports"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2a2a2a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-[#928e87] transition-all hover:border-[#e32b1a]/30 hover:text-white"
          >
            See All Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Industry Templates ───────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Industry templates
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          Start with assumptions that make sense for your business model. Each template comes
          pre-configured with the metrics that matter.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.name} className="rounded-xl border border-[#2a2a2a] bg-[#1a1917] p-7">
              <h3 className="mb-1 text-lg font-semibold text-white">{t.name}</h3>
              <div className="mb-3 font-mono text-[12px] text-[#e32b1a]">{t.metrics}</div>
              <p className="text-[14px] text-[#928e87]">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Knowledge Levels ─────────────────────────────────── */}
      <section className="mb-24 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <h2 className="mb-3 font-display text-2xl font-extrabold uppercase text-white md:text-3xl">
          Start simple. Go deep when ready.
        </h2>
        <p className="mb-10 max-w-2xl text-[15px] text-[#928e87]">
          You don&apos;t need an MBA to build a financial model. Start with 5 inputs and add
          complexity as your understanding grows.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { level: 'Beginner', inputs: '5–8 inputs', description: 'Revenue, costs, and growth rate. Enough to see if the unit economics work.' },
            { level: 'Standard', inputs: '15–20 inputs', description: 'Add churn, CAC, payment terms, hiring plans. Realistic enough for early-stage fundraising.' },
            { level: 'Expert', inputs: '30+ inputs', description: 'Full assumption engine with dependency graphs, formula overrides, and granular cost categories.' },
          ].map((l) => (
            <div key={l.level}>
              <div className="mb-2 font-mono text-[12px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
                {l.level}
              </div>
              <div className="mb-2 text-[14px] font-medium text-white">{l.inputs}</div>
              <p className="text-[13px] leading-relaxed text-[#928e87]">{l.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Everything you need to model your business
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          Not another spreadsheet. A structured financial modeling tool built for founders.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-[#2a2a2a] bg-[#161513] p-7">
              <f.icon className="mb-4 h-6 w-6 text-[#e32b1a]" />
              <h3 className="mb-2 text-[16px] font-semibold text-white">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-[#928e87]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Narratives ────────────────────────────────────── */}
      <section className="mb-24 flex items-start gap-6 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <Clock className="mt-1 hidden h-8 w-8 shrink-0 text-[#e32b1a] md:block" />
        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">AI-generated financial narrative</h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#928e87]">
            Numbers alone don&apos;t tell the story. IdeaFuel generates a written narrative covering
            executive summary, revenue analysis, cost structure, and cash position — adapted for
            investor, loan, or internal audiences. Stop explaining spreadsheets. Let the model speak
            for itself.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="text-center">
        <h2 className="mx-auto max-w-xl font-display text-4xl font-extrabold uppercase text-white md:text-5xl">
          Know your numbers{' '}
          <span className="text-gradient-brand">before you spend them</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#928e87]">
          Build your first financial model in minutes. Free tier available.
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
