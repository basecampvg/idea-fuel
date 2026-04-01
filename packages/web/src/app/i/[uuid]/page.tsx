'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { CustomerInterviewGating, InterviewQuestion } from '@forge/shared';
import { GatingScreen } from './components/gating-screen';
import { InterviewForm } from './components/interview-form';
import { ThankYou } from './components/thank-you';

type Phase = 'loading' | 'gating' | 'form' | 'thankyou' | 'closed' | 'notfound';

export default function InterviewPage() {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;

  // Generate a stable session token for this page load
  const [sessionToken] = useState<string>(() => crypto.randomUUID());
  const [phase, setPhase] = useState<Phase>('loading');
  const [ndaData, setNdaData] = useState<{ fullName: string; email: string } | undefined>();

  const { data: interview, isError } = trpc.customerInterview.getByUuid.useQuery(
    { uuid },
    { retry: false }
  );

  useEffect(() => {
    if (isError) {
      setPhase('notfound');
      return;
    }
    if (!interview) return;

    if (interview.status === 'CLOSED') {
      setPhase('closed');
    } else if (interview.gating === 'PUBLIC') {
      setPhase('form');
    } else {
      setPhase('gating');
    }
  }, [interview, isError]);

  function handleGatingUnlocked(resolvedNdaData?: { fullName: string; email: string }) {
    if (resolvedNdaData) {
      setNdaData(resolvedNdaData);
    }
    setPhase('form');
  }

  function handleFormComplete() {
    setPhase('thankyou');
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E32B1A] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (phase === 'notfound') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-3">Interview not found</h1>
        <p className="text-gray-400 max-w-sm">
          This interview link is invalid or no longer available.
        </p>
      </div>
    );
  }

  // ── Closed ───────────────────────────────────────────────────────────────
  if (phase === 'closed') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-3">Interview closed</h1>
        <p className="text-gray-400 max-w-sm">
          This interview is no longer accepting responses.
        </p>
      </div>
    );
  }

  // ── Thank you ────────────────────────────────────────────────────────────
  if (phase === 'thankyou') {
    return <ThankYou />;
  }

  // ── Gating ───────────────────────────────────────────────────────────────
  if (phase === 'gating' && interview) {
    return (
      <GatingScreen
        uuid={uuid}
        gating={interview.gating as CustomerInterviewGating}
        onUnlocked={handleGatingUnlocked}
      />
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  if (phase === 'form' && interview) {
    return (
      <InterviewForm
        uuid={uuid}
        sessionToken={sessionToken}
        questions={interview.questions as InterviewQuestion[]}
        title={interview.title}
        description={interview.project?.description}
        waitlistEnabled={interview.waitlistEnabled ?? false}
        newsletterEnabled={interview.newsletterEnabled ?? false}
        prefillName={ndaData?.fullName}
        prefillEmail={ndaData?.email}
        onComplete={handleFormComplete}
      />
    );
  }

  // Fallback — should not reach here
  return null;
}
