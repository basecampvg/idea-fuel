'use client';

import { useState } from 'react';

export function WaitlistFormHero() {
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
        try {
          localStorage.setItem('ideafuel_waitlist_submitted', 'true');
        } catch {
          /* ignore */
        }
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
      <div
        className="inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-[15px] font-medium text-white"
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          color: '#10B981',
        }}
        role="status"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        You&apos;re on the list. We&apos;ll be in touch.
      </div>
    );
  }

  return (
    <div className="w-full sm:w-auto">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center"
      >
        <label htmlFor="hero-waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="hero-waitlist-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="h-[52px] rounded-full border px-5 text-[15px] text-white outline-none transition-colors placeholder:text-[#6B6B69] focus:border-[#E32B1A]/50 sm:w-[280px]"
          style={{
            background: '#1A1A1A',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-[52px] items-center justify-center rounded-full px-7 text-[15px] font-medium text-white transition-all hover:brightness-[1.15] active:scale-[0.97] disabled:opacity-60"
          style={{ background: '#E32B1A' }}
        >
          {status === 'loading' ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  className="opacity-75"
                />
              </svg>
              Joining…
            </span>
          ) : (
            'Join the waitlist'
          )}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-[12.5px]" style={{ color: '#F87171' }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
