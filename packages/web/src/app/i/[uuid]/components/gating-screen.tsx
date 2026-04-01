'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { CustomerInterviewGating } from '@forge/shared';
import { NdaSignature } from './nda-signature';

interface GatingScreenProps {
  uuid: string;
  gating: CustomerInterviewGating;
  onUnlocked: (ndaData?: { fullName: string; email: string }) => void;
}

export function GatingScreen({ uuid, gating, onUnlocked }: GatingScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const verifyPassword = trpc.customerInterview.verifyPassword.useMutation({
    onSuccess: () => {
      onUnlocked();
    },
    onError: (err) => {
      if (err.message === 'INVALID_PASSWORD') {
        setError('Incorrect password. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    },
  });

  if (gating === 'NDA') {
    return (
      <NdaSignature
        uuid={uuid}
        onSigned={(ndaData) => onUnlocked(ndaData)}
      />
    );
  }

  // PASSWORD gating
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Please enter the password.');
      return;
    }
    verifyPassword.mutate({ uuid, password });
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in fade-in duration-300">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Required</h1>
          <p className="text-gray-400 text-sm">
            This interview is password-protected. Enter the password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full px-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={verifyPassword.isPending}
            className="w-full bg-[#E32B1A] text-white py-3 rounded-full font-semibold hover:bg-[#c42516] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifyPassword.isPending ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>

      {/* Powered by footer */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <a
          href="https://ideafuel.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors text-sm"
        >
          <span>Powered by</span>
          <span className="font-semibold text-[#E32B1A]">IdeaFuel</span>
        </a>
      </div>
    </div>
  );
}
