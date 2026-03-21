import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — IdeaFuel',
  description:
    'The story behind IdeaFuel. We\'re building the validation layer that every startup should have before writing a line of code.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 lg:py-28">
      <header className="mb-16">
        <h1 className="font-display text-5xl font-extrabold uppercase text-white md:text-6xl">
          About
        </h1>
        <p className="mt-4 text-lg text-[#928e87]">
          The story behind IdeaFuel.
        </p>
      </header>

      <div className="space-y-8 text-[16px] leading-[1.8] text-[#c4c0ba]">
        <p>
          Most startups don&apos;t fail because the founder couldn&apos;t code fast enough. They fail
          because the founder built the wrong thing. The idea was untested. The market was assumed. The
          &ldquo;competitor research&rdquo; was a Google search and a prayer.
        </p>

        <p>
          IdeaFuel exists because validation shouldn&apos;t require an MBA, a $5,000 market research
          report, or six months of customer interviews you never quite get around to scheduling. It
          should take 15 minutes and a willingness to hear the truth about your idea.
        </p>

        <div className="my-12 h-px bg-[#2a2a2a]" />

        <h2 className="font-display text-3xl font-extrabold uppercase text-white">
          What we believe
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-[17px] font-semibold text-white">
              Validation is a feature, not a phase
            </h3>
            <p>
              The startup world treats validation like something you do once before building. We think
              it&apos;s a continuous process — from first idea through product-market fit and into
              expansion. That&apos;s why IdeaFuel supports both Launch and Expand modes.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-[17px] font-semibold text-white">
              Data beats intuition
            </h3>
            <p>
              Your gut is useful for deciding what restaurant to eat at. For deciding whether to spend
              two years building a business, you need demand signals, competitive analysis, and market
              sizing grounded in actual numbers. IdeaFuel&apos;s research pipeline pulls real data from
              the web, social platforms, and search trends — not templates with blanks.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-[17px] font-semibold text-white">
              AI should do the grunt work
            </h3>
            <p>
              The strategic thinking is your job. Interviewing yourself, researching competitors,
              sizing markets, building financial models, and formatting reports — that&apos;s the AI&apos;s
              job. We use advanced reasoning models for interviews, deep-research AI for market analysis,
              and generation models for reports. You make the decisions. We do the homework.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-[17px] font-semibold text-white">
              Honesty over encouragement
            </h3>
            <p>
              Most tools in this space are designed to make you feel good about your idea. We&apos;d
              rather tell you the truth. If demand signals are weak, we say so. If the competitive
              landscape is brutal, you&apos;ll see it. A bad idea validated early saves years and money.
              A good idea validated thoroughly gives you the confidence to go all in.
            </p>
          </div>
        </div>

        <div className="my-12 h-px bg-[#2a2a2a]" />

        <h2 className="font-display text-3xl font-extrabold uppercase text-white">
          What we&apos;ve built
        </h2>

        <p>
          IdeaFuel is a comprehensive validation platform. Structured AI interviews that extract 42+
          business data points. A 4-phase research pipeline that scours the web for real market data.
          13 report types from business plans to expansion business cases. Financial modeling with
          industry templates and scenario comparison. Daily trend picks powered by search data
          analysis. PDF exports that are ready for investors.
        </p>

        <p>
          It&apos;s everything a founder needs between &ldquo;I have an idea&rdquo; and &ldquo;I&apos;m
          building this.&rdquo;
        </p>
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="mt-16 rounded-2xl border border-[#2a2a2a] bg-[#1a1917] p-10 text-center">
        <h2 className="font-display text-3xl font-extrabold uppercase text-white">
          Ready to validate?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-[#928e87]">
          Start with a free interview and see what IdeaFuel finds about your market.
        </p>
        <Link
          href="/auth/signin?view=signup"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#e32b1a] px-8 py-4 text-sm font-semibold uppercase tracking-[1px] text-white shadow-[0_0_25px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(227,43,26,0.5)]"
        >
          Start for Free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
