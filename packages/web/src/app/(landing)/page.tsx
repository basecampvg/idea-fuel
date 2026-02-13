'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Zap, Target, TrendingUp, Check, BarChart3, Users, Shield, Clock, Lightbulb, Globe, Code, DollarSign, MessageSquare } from 'lucide-react';
import { BrowserFrame } from './components/browser-frame';
import { AnimatedCursorDemo } from './components/animated-cursor-demo';
import { AnimatedCounter } from './components/animated-counter';
import { FloatingElements } from './components/parallax-container';

// ─── Animation variants ───
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const;
const viewportOnce = { once: true, margin: '-60px' as const };

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion();

  const appUrl =
    process.env.NODE_ENV === 'production'
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideationlab.ai'}`
      : '/dashboard';

  // Motion wrapper: skip animations when reduced motion is preferred
  const motionProps = prefersReducedMotion
    ? {}
    : { variants: fadeInUp, initial: 'hidden' as const, whileInView: 'visible' as const, viewport: viewportOnce, transition: { duration: 0.5, ease: EASE_SMOOTH } };

  return (
    <div className="relative overflow-hidden">
      {/* Floating decorative orbs */}
      <FloatingElements />

      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-card" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative px-6 pt-32 pb-16 lg:pt-36 lg:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left column: headline + email form */}
            <motion.div
              className="text-center lg:text-left"
              {...(prefersReducedMotion ? {} : { initial: 'hidden', animate: 'visible', variants: staggerContainer })}
            >
              {/* Badge */}
              <motion.div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                variants={fadeInUp}
              >
                <Zap className="h-4 w-4" />
                AI-Powered Business Validation
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                variants={fadeInUp}
              >
                Turn Ideas Into
                <span className="text-gradient block">Validated Businesses</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0 mx-auto"
                variants={fadeInUp}
              >
                Stop guessing. Let AI analyze market demand, competition, and timing
                to tell you if your business idea is worth pursuing.
              </motion.p>

              {/* Email form */}
              <motion.div className="mt-8 max-w-md lg:mx-0 mx-auto" variants={fadeInUp}>
                <WaitlistForm />
              </motion.div>

              {/* Social proof */}
              <motion.p className="mt-4 text-sm text-muted-foreground" variants={fadeInUp}>
                Get early access + exclusive insights. No spam.
              </motion.p>
            </motion.div>

            {/* Right column: browser frame with cursor demo */}
            <motion.div
              className="hidden lg:block"
              initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95, x: 20 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: EASE_SMOOTH }}
            >
              <BrowserFrame>
                <AnimatedCursorDemo />
              </BrowserFrame>
            </motion.div>

            {/* Mobile: static product cards instead of cursor demo */}
            <motion.div
              className="lg:hidden mx-auto w-full max-w-sm"
              {...motionProps}
            >
              <MobileHeroCards />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ VALUE PROPS SECTION ═══ */}
      <section className="relative px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="grid gap-5 md:grid-cols-3"
            {...(prefersReducedMotion ? {} : { initial: 'hidden', whileInView: 'visible', viewport: viewportOnce, variants: staggerContainer })}
          >
            {[
              { icon: Target, title: 'Market Validation', desc: 'Deep research into market size, growth trends, and customer demand signals before you invest a single dollar.' },
              { icon: Zap, title: 'Competitive Intel', desc: "Understand who you're up against. Get SWOT analysis, pricing comparisons, and positioning strategies." },
              { icon: TrendingUp, title: 'Timing Analysis', desc: 'Is now the right time? We analyze market momentum, emerging trends, and "why now" factors for your idea.' },
            ].map((prop) => (
              <motion.div key={prop.title} className="landing-glass" variants={fadeInUp}>
                <div className="icon-circle-outline mb-4">
                  <prop.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{prop.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{prop.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS / SOCIAL PROOF SECTION ═══ */}
      <section className="relative px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div className="landing-glass-strong" {...motionProps}>
            <p className="font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
              Stop building products nobody wants.
            </p>
            <p className="mt-4 text-muted-foreground">
              42% of startups fail because there&apos;s no market need. IdeationLab
              helps you validate before you build, saving you time, money, and
              heartbreak.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 border-t border-white/5 pt-8">
              <div>
                <p className="font-display text-2xl font-bold text-primary">
                  <AnimatedCounter value={10} suffix="+" />
                </p>
                <p className="text-sm text-muted-foreground">Report Types</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary">AI-Powered</p>
                <p className="text-sm text-muted-foreground">Deep Research</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary">&lt;10min</p>
                <p className="text-sm text-muted-foreground">Time to Insight</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ REPORT SHOWCASE SECTION ═══ */}
      <section className="relative px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div className="mb-10 text-center" {...motionProps}>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              See What You Get
            </h2>
            <p className="mt-3 text-muted-foreground">
              A comprehensive business validation report, generated in minutes.
            </p>
          </motion.div>

          <BrowserFrame url="ideationlab.ai/report/meal-planning-ai">
            <ReportShowcase prefersReducedMotion={!!prefersReducedMotion} />
          </BrowserFrame>
        </div>
      </section>

      {/* ═══ FINAL CTA SECTION ═══ */}
      <section className="relative px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div {...motionProps}>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
              Ready to validate your next big idea?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join the waitlist for early access and be first to know when we launch.
            </p>
            <div className="mt-8">
              <Link href={appUrl} className="btn-ideationlab inline-flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// ─── Waitlist Form (extracted for reuse) ───

function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setEmail('');
        try { localStorage.setItem('ideationlab_waitlist_submitted', 'true'); } catch {}
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-full bg-success/10 px-6 py-4 text-success lg:justify-start">
        <Check className="h-5 w-5" />
        <span className="font-medium">You&apos;re on the list!</span>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input-dark flex-1"
          disabled={status === 'loading'}
          aria-label="Email address"
        />
        <button type="submit" disabled={status === 'loading'} className="btn-ideationlab whitespace-nowrap">
          {status === 'loading' ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Joining...
            </span>
          ) : 'Join Waitlist'}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      )}
    </>
  );
}

// ─── Mobile Hero Cards (static product screenshot feel) ───

function MobileHeroCards() {
  return (
    <div className="landing-glass-strong relative overflow-hidden p-0">
      {/* Fake browser bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <div className="h-2 w-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto text-[10px] text-muted-foreground">ideationlab.ai</div>
      </div>
      {/* Product screenshot approximation */}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-primary/30" />
          <span className="text-xs font-medium text-foreground/70">IdeationLab</span>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-foreground/60">
          An AI-powered meal planning app...
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="landing-glass rounded-lg p-2 !py-2 !px-3">
            <p className="text-[10px] text-muted-foreground">Opportunity</p>
            <p className="text-sm font-bold text-primary">87/100</p>
          </div>
          <div className="landing-glass rounded-lg p-2 !py-2 !px-3">
            <p className="text-[10px] text-muted-foreground">Market Size</p>
            <p className="text-sm font-bold text-primary">$2.4B</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Report Showcase (scroll-driven build animation) ───

function ReportShowcase({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const sectionMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true, margin: '-40px' as const },
        transition: { duration: 0.45, ease: EASE_SMOOTH },
      };

  return (
    <div className="max-h-[500px] overflow-y-auto p-5 space-y-5 scrollbar-thin">
      {/* Report header */}
      <motion.div {...sectionMotion}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Meal Planning App</h3>
            <p className="text-xs text-muted-foreground">Full Business Validation Report</p>
          </div>
        </div>
      </motion.div>

      {/* Validation Scores */}
      <motion.div {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.1 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Validation Scores</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Opportunity', value: 87, color: 'bg-primary' },
            { label: 'Problem', value: 72, color: 'bg-accent' },
            { label: 'Feasibility', value: 91, color: 'bg-info' },
            { label: 'Timing', value: 68, color: 'bg-warning' },
          ].map((score) => (
            <div key={score.label} className="landing-glass rounded-xl !p-3">
              <p className="text-[10px] text-muted-foreground">{score.label}</p>
              <p className="text-lg font-bold text-foreground">
                <AnimatedCounter value={score.value} suffix="/100" />
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${score.color}`}
                  initial={prefersReducedMotion ? { width: `${score.value}%` } : { width: 0 }}
                  whileInView={prefersReducedMotion ? undefined : { width: `${score.value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3, ease: EASE_SMOOTH }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Market Sizing */}
      <motion.div {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.2 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Market Sizing</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'TAM', value: '$12.4B', sub: 'Total Addressable' },
            { label: 'SAM', value: '$3.1B', sub: 'Serviceable Available' },
            { label: 'SOM', value: '$310M', sub: 'Serviceable Obtainable' },
          ].map((market) => (
            <div key={market.label} className="landing-glass rounded-xl !p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{market.label}</p>
              <p className="text-base font-bold text-primary">{market.value}</p>
              <p className="text-[9px] text-muted-foreground/60">{market.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Competitors */}
      <motion.div {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.3 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Competitors</p>
        <div className="space-y-2">
          {[
            { name: 'Mealime', users: '2M+', threat: 'Medium' },
            { name: 'Eat This Much', users: '500K+', threat: 'High' },
            { name: 'Whisk', users: '1M+', threat: 'Low' },
          ].map((comp) => (
            <div key={comp.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{comp.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground"><Users className="inline h-3 w-3 mr-0.5" />{comp.users}</span>
                <span className={`text-[10px] font-medium ${comp.threat === 'High' ? 'text-destructive' : comp.threat === 'Medium' ? 'text-warning' : 'text-success'}`}>
                  {comp.threat}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Why Now */}
      <motion.div {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.4 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Why Now?</p>
        <div className="space-y-2">
          {[
            { icon: TrendingUp, text: 'Food waste reduction trending up 340% in search' },
            { icon: DollarSign, text: 'Average household food waste costs $1,500/year' },
            { icon: Code, text: 'AI recipe generation quality hit inflection point in 2025' },
          ].map((trigger, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
              <trigger.icon className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-xs text-foreground/80">{trigger.text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Social Proof */}
      <motion.div {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.5 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Social Signals</p>
        <div className="space-y-2">
          {[
            { source: 'Reddit', text: '"I waste so much food every week. Would pay for something that plans meals AND generates a grocery list."', votes: 847 },
            { source: 'Twitter/X', text: '"Just threw away $40 of groceries. Again. Someone please build a smart meal planner."', votes: 2100 },
          ].map((post, i) => (
            <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">{post.source}</span>
                <span className="text-[10px] text-primary ml-auto">+{post.votes}</span>
              </div>
              <p className="text-xs text-foreground/70 italic">{post.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
