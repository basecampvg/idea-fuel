'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Users } from 'lucide-react';

const WAITLIST_STORAGE_KEY = 'ideationlab_waitlist_submitted';

export function HeroSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const appUrl =
    process.env.NODE_ENV === 'production'
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ideationlab.ai'}`
      : '/dashboard';

  // Check localStorage for returning visitors + fetch waitlist count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const submitted = localStorage.getItem(WAITLIST_STORAGE_KEY);
      if (submitted) setAlreadySubmitted(true);
    }

    fetch('/api/waitlist')
      .then((res) => res.json())
      .then((data) => setWaitlistCount(data.count))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const metadata = {
        referrer: document.referrer || undefined,
        submission_location: 'hero' as const,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      };

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, metadata }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setEmail('');
        localStorage.setItem(WAITLIST_STORAGE_KEY, 'true');
        setAlreadySubmitted(true);
        // Optimistic +1
        if (waitlistCount !== null) setWaitlistCount(waitlistCount + 1);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <section className="relative px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
      <div className="mx-auto max-w-4xl text-center">
        {/* Urgency headline */}
        <h1 className="animate-fade-in-up font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
          <span className="text-muted-foreground">42% of startups fail because</span>
          <br />
          <span className="text-gradient">they skip this step.</span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-in-up stagger-1 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          IdeationLab validates your business idea with AI-powered market research
          in minutes, not months.
        </p>

        {/* Email Capture */}
        <div className="animate-fade-in-up stagger-2 mx-auto mt-10 max-w-md">
          {alreadySubmitted || status === 'success' ? (
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
                aria-label="Email address for waitlist"
                className="input-dark flex-1"
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-ideationlab whitespace-nowrap"
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
        </div>

        {/* Waitlist counter */}
        {waitlistCount !== null && waitlistCount > 0 && (
          <div className="animate-fade-in-up stagger-3 mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span>
              Join <span className="font-semibold text-foreground">{waitlistCount.toLocaleString()}</span> founders on the waitlist
            </span>
          </div>
        )}

        {/* App link */}
        <div className="animate-fade-in-up stagger-4 mt-6">
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
  );
}
