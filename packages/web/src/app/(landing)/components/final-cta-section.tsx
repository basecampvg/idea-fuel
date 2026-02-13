'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useInView } from './use-in-view';

const WAITLIST_STORAGE_KEY = 'ideationlab_waitlist_submitted';

export function FinalCtaSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [ref, isInView] = useInView({ threshold: 0.2 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const submitted = localStorage.getItem(WAITLIST_STORAGE_KEY);
      if (submitted) setAlreadySubmitted(true);
    }

    // Listen for storage changes (if hero submits, update this section)
    const handleStorage = () => {
      const submitted = localStorage.getItem(WAITLIST_STORAGE_KEY);
      if (submitted) setAlreadySubmitted(true);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const metadata = {
        referrer: document.referrer || undefined,
        submission_location: 'final' as const,
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
    <section ref={ref} className="relative px-6 py-24">
      <div
        className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
          isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Don&apos;t be part of the <span className="text-gradient">42%</span>.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Join founders who validate smarter. Get early access to IdeationLab.
        </p>

        <div className="mx-auto mt-8 max-w-md">
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
          <p className="mt-3 text-sm text-muted-foreground">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
