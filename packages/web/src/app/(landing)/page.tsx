'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Target, TrendingUp, Check } from 'lucide-react';

export default function LandingPage() {
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
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  const appUrl =
    process.env.NODE_ENV === 'production'
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideationlab.ai'}`
      : '/dashboard';

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-card" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" />
            AI-Powered Business Validation
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up stagger-1 font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Turn Ideas Into
            <span className="text-gradient block">Validated Businesses</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Stop guessing. Let AI analyze market demand, competition, and timing
            to tell you if your business idea is worth pursuing.
          </p>

          {/* Email Capture */}
          <div className="animate-fade-in-up stagger-3 mx-auto mt-10 max-w-md">
            {status === 'success' ? (
              <div className="flex items-center justify-center gap-2 rounded-full bg-success/10 px-6 py-4 text-success">
                <Check className="h-5 w-5" />
                <span className="font-medium">You&apos;re on the list!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-dark flex-1"
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-forge whitespace-nowrap"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Joining...
                    </span>
                  ) : (
                    'Join Waitlist'
                  )}
                </button>
              </form>
            )}
            {status === 'error' && (
              <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Get early access + exclusive insights. No spam.
            </p>
          </div>

          {/* CTA to App */}
          <div className="animate-fade-in-up stagger-4 mt-8">
            <Link
              href={appUrl}
              className="group inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-primary"
            >
              Already have access? Launch App
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Value Prop 1 */}
            <div className="glass-card animate-fade-in-up stagger-1">
              <div className="icon-circle-outline mb-4">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Market Validation
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Deep research into market size, growth trends, and customer
                demand signals before you invest a single dollar.
              </p>
            </div>

            {/* Value Prop 2 */}
            <div className="glass-card animate-fade-in-up stagger-2">
              <div className="icon-circle-outline mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Competitive Intel
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Understand who you&apos;re up against. Get SWOT analysis, pricing
                comparisons, and positioning strategies.
              </p>
            </div>

            {/* Value Prop 3 */}
            <div className="glass-card animate-fade-in-up stagger-3">
              <div className="icon-circle-outline mb-4">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Timing Analysis
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Is now the right time? We analyze market momentum, emerging
                trends, and &quot;why now&quot; factors for your idea.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass-card">
            <p className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Stop building products nobody wants.
            </p>
            <p className="mt-4 text-muted-foreground">
              42% of startups fail because there&apos;s no market need. IdeationLab
              helps you validate before you build, saving you time, money, and
              heartbreak.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 border-t border-border/50 pt-8">
              <div>
                <p className="font-display text-2xl font-bold text-primary">10+</p>
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
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Ready to validate your next big idea?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join the waitlist for early access and be first to know when we launch.
          </p>
          <div className="mt-8">
            <Link href={appUrl} className="btn-forge inline-flex items-center gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
