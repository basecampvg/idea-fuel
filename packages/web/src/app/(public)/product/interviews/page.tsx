import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  Flame,
  Clock,
  CheckCircle2,
  ArrowRight,
  Brain,
  Database,
  Target,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Business Idea Validation Tool | Validate Your Idea with AI — IdeaFuel',
  description:
    'Validate your business idea with structured AI interviews. 10-18 questions that extract 42+ data points about your problem, customer, market, and business model.',
  openGraph: {
    title: 'AI Business Idea Validation — IdeaFuel',
    description: 'Validate your business idea in 15 minutes with structured AI interviews that actually dig into what matters.',
  },
};

const modes = [
  {
    icon: Zap,
    name: 'Spark',
    time: '~5 min',
    questions: '0 questions',
    description: 'Quick demand validation. Skips the interview and goes straight to market research — keyword discovery, competitor scan, and TAM estimation.',
    best: 'Quick gut check on a new idea',
  },
  {
    icon: MessageSquare,
    name: 'Light',
    time: '~15 min',
    questions: '10 questions',
    description: 'Covers problem, customer, solution, competition, and market timing. Gets you enough signal to decide if the idea is worth going deeper.',
    best: 'Early-stage exploration',
  },
  {
    icon: Flame,
    name: 'Forge',
    time: '~30 min',
    questions: '18 questions',
    description: 'Everything in Light plus revenue model, go-to-market, traction, execution risks, and moat formation. The full deep dive for serious ideas.',
    best: 'Ideas you want to actually build',
  },
];

const dataPoints = [
  'Problem statement & severity',
  'Customer segment & demographics',
  'Pain intensity & frequency',
  'Solution & key features',
  'Unique mechanism & MVP',
  'Direct & indirect competitors',
  'Competitive advantages',
  'Revenue model & pricing',
  'Go-to-market channels',
  'Why-now triggers',
  'Founder background & edge',
  'Execution risks & moat',
];

export default function InterviewsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mb-24">
        <div className="mb-6 inline-block rounded-full border border-[#2a2a2a] bg-[#1a1917] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[2px] text-[#e32b1a]">
          AI Interviews
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
          Validate your idea before you{' '}
          <span className="text-gradient-brand">waste months</span> building it
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#928e87]">
          Most founders skip validation entirely — or run a survey that tells them what they want to
          hear. IdeaFuel&apos;s structured AI interviews dig into the 42 data points that actually
          predict whether a business will work.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth/signin?view=signup"
            className="inline-flex items-center justify-center rounded-full bg-[#e32b1a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
          >
            Start Your Interview
          </Link>
          <Link
            href="/product/reports"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2a2a2a] px-7 py-3.5 text-sm font-semibold uppercase tracking-[1px] text-[#928e87] transition-all hover:border-[#e32b1a]/30 hover:text-white"
          >
            See What You Get <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Three Modes ──────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          Choose your depth
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-[#928e87]">
          Not every idea needs the same level of scrutiny. Pick the mode that matches where you are.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {modes.map((mode) => (
            <div key={mode.name} className="flex flex-col rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-8">
              <mode.icon className="mb-4 h-6 w-6 text-[#e32b1a]" />
              <h3 className="mb-1 text-xl font-semibold text-white">{mode.name}</h3>
              <div className="mb-4 flex gap-3">
                <span className="inline-flex items-center gap-1 text-[12px] text-[#5a5652]">
                  <Clock className="h-3 w-3" /> {mode.time}
                </span>
                <span className="text-[12px] text-[#5a5652]">{mode.questions}</span>
              </div>
              <p className="mb-4 flex-1 text-[14px] leading-relaxed text-[#928e87]">
                {mode.description}
              </p>
              <div className="rounded-lg bg-[#161513] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#5a5652]">
                  Best for
                </div>
                <div className="mt-0.5 text-[13px] text-[#e8e4df]">{mode.best}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className="mb-12 font-mono text-[11px] font-semibold uppercase tracking-[3px] text-[#5a5652]">
          How the interview works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Brain,
              title: 'Adaptive questions',
              body: 'The AI scores your answer quality in real-time (thin, adequate, or rich) and doubles down on weak areas. No two interviews go exactly the same way.',
            },
            {
              icon: Database,
              title: '42 data points extracted',
              body: 'Every response is analyzed for structured data: problem severity, customer demographics, competitive advantages, revenue models, and 38 more fields.',
            },
            {
              icon: Target,
              title: 'Research auto-triggers',
              body: 'When the interview finishes, a 4-phase research pipeline kicks off automatically — using your answers as the seed for real market analysis.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[#2a2a2a] bg-[#1a1917] p-7">
              <item.icon className="mb-4 h-6 w-6 text-[#e32b1a]" />
              <h3 className="mb-2 text-[16px] font-semibold text-white">{item.title}</h3>
              <p className="text-[14px] leading-relaxed text-[#928e87]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data Points ──────────────────────────────────────── */}
      <section className="mb-24 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 md:p-14">
        <h2 className="mb-3 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          42 data points. From your words.
        </h2>
        <p className="mb-10 max-w-2xl text-[15px] text-[#928e87]">
          The interview isn&apos;t a chat — it&apos;s a structured extraction. Every question is designed
          to pull specific signals that feed into your research and reports.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dataPoints.map((point) => (
            <div key={point} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#e32b1a]" />
              <span className="text-[14px] text-[#e8e4df]">{point}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="text-center">
        <h2 className="mx-auto max-w-xl font-display text-4xl font-extrabold uppercase text-white md:text-5xl">
          15 minutes now saves{' '}
          <span className="text-gradient-brand">6 months later</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-[#928e87]">
          The cost of skipping validation is building something nobody wants. Start with a conversation.
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
