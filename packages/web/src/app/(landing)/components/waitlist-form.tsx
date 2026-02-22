'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export function WaitlistForm() {
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
          /* localStorage may be unavailable */
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
      <div className="flex items-center gap-2 rounded-2xl bg-green-500/10 px-6 py-4 text-green-400">
        <Check className="h-5 w-5" />
        <span className="font-medium">You&apos;re on the list!</span>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'loading'}
          aria-label="Email address"
          className="h-[54px] flex-1 rounded-2xl border border-[#cececd]/20 bg-[#1c1a17] px-5 text-sm text-[#d4d4d4] placeholder-[#928e87]/60 outline-none transition-colors focus:border-[#e32b1a]/50"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="h-[54px] shrink-0 rounded-xl bg-[#e32b1a] px-6 text-sm font-bold uppercase tracking-[1px] text-white transition-all hover:bg-[#c82617] disabled:opacity-50"
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
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
