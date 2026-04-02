'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import { trpc } from '@/lib/trpc/client';
import type { InterviewQuestion, InterviewAnswer } from '@forge/shared';
import { CUSTOMER_INTERVIEW_MIN_COMPLETION_SECONDS } from '@forge/shared';

interface InterviewFormProps {
  uuid: string;
  sessionToken: string;
  questions: InterviewQuestion[];
  title: string;
  description?: string | null;
  waitlistEnabled?: boolean;
  newsletterEnabled?: boolean;
  prefillName?: string;
  prefillEmail?: string;
  onComplete: () => void;
}

type Screen = 'welcome' | 'question' | 'contact' | 'submitting';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function InterviewForm({
  uuid,
  sessionToken,
  questions,
  title,
  description,
  waitlistEnabled = false,
  newsletterEnabled = false,
  prefillName = '',
  prefillEmail = '',
  onComplete,
}: InterviewFormProps) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [freeTextDraft, setFreeTextDraft] = useState('');
  const [contactName, setContactName] = useState(prefillName);
  const [contactEmail, setContactEmail] = useState(prefillEmail);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const [joinedNewsletter, setJoinedNewsletter] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [startTime] = useState<number>(() => Date.now());
  const [animKey, setAnimKey] = useState(0);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = questions[currentIndex];
  const totalSteps = questions.length + 1; // questions + contact
  const progress =
    screen === 'welcome'
      ? 0
      : screen === 'question'
      ? ((currentIndex + 1) / totalSteps) * 100
      : 100;

  // Focus textarea when question changes and it's a free text question
  useEffect(() => {
    if (screen === 'question' && currentQuestion?.type === 'FREE_TEXT') {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [currentIndex, screen, currentQuestion?.type]);

  // Sync free text draft when navigating to a question
  useEffect(() => {
    if (screen === 'question' && currentQuestion) {
      const existing = answers[currentQuestion.id];
      setFreeTextDraft(typeof existing === 'string' ? existing : '');
    }
  }, [currentIndex, screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render Turnstile when contact screen is shown
  useEffect(() => {
    if (screen === 'contact' && window.turnstile && turnstileContainerRef.current && !turnstileWidgetRef.current) {
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (siteKey) {
        turnstileWidgetRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => setTurnstileToken(token),
          theme: 'dark',
        });
      }
    }
  }, [screen]);

  const submitResponse = trpc.customerInterview.submitResponse.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (err) => {
      setError(err.message || 'Submission failed. Please try again.');
      setScreen('contact');
    },
  });

  function advanceToNextQuestion() {
    setAnimKey((k) => k + 1);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setScreen('contact');
    }
  }

  function goBack() {
    setAnimKey((k) => k + 1);
    if (screen === 'contact') {
      setScreen('question');
      setCurrentIndex(questions.length - 1);
    } else if (screen === 'question' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (screen === 'question' && currentIndex === 0) {
      setScreen('welcome');
    }
  }

  function saveCurrentFreeText() {
    if (currentQuestion && currentQuestion.type === 'FREE_TEXT' && freeTextDraft.trim()) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: freeTextDraft.trim() }));
    }
  }

  function handleFreeTextAdvance() {
    if (!currentQuestion) return;
    const value = freeTextDraft.trim();
    if (currentQuestion.required && !value) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    advanceToNextQuestion();
  }

  function handleAutoAdvance(questionId: string, value: string | number | boolean) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Small delay so user sees selection before advancing
    setTimeout(() => {
      setAnimKey((k) => k + 1);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setScreen('contact');
      }
    }, 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFreeTextAdvance();
    }
  }

  const handleSubmit = useCallback(async () => {
    if (honeypot) return; // Bot detected

    // Minimum time check
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds < CUSTOMER_INTERVIEW_MIN_COMPLETION_SECONDS) {
      setError('Please take a moment to read each question carefully.');
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    setScreen('submitting');
    setError('');

    // Build answers array
    const answersArray: InterviewAnswer[] = questions.map((q) => ({
      questionId: q.id,
      value: answers[q.id] ?? '',
    }));

    submitResponse.mutate({
      uuid,
      sessionToken,
      answers: answersArray,
      respondentName: contactName.trim() || undefined,
      respondentEmail: contactEmail.trim() || undefined,
      joinedWaitlist,
      joinedNewsletter,
      turnstileToken: turnstileToken || 'dev-bypass',
    });
  }, [
    honeypot,
    startTime,
    turnstileToken,
    questions,
    answers,
    uuid,
    sessionToken,
    contactName,
    contactEmail,
    joinedWaitlist,
    joinedNewsletter,
    submitResponse,
  ]);

  // ============================================================
  // WELCOME SCREEN
  // ============================================================
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-neutral-800 z-50">
          <div className="h-full bg-[#E32B1A] transition-all duration-500" style={{ width: '0%' }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-2xl mx-auto w-full">
          <div className="animate-in fade-in duration-300 w-full">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h1>
            {description && (
              <p className="text-neutral-400 text-lg mb-8 leading-relaxed">{description}</p>
            )}
            <p className="text-neutral-500 text-sm mb-8">
              {questions.length} question{questions.length !== 1 ? 's' : ''} &middot; Takes 2-5 minutes
            </p>
            <button
              onClick={() => {
                setScreen('question');
                setAnimKey((k) => k + 1);
              }}
              className="bg-[#E32B1A] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#c42516] transition-colors"
            >
              Start →
            </button>
          </div>
        </div>

        <div className="pb-6 flex justify-center">
          <a
            href="https://ideafuel.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-400 transition-colors text-sm"
          >
            <span>Powered by</span>
            <span className="font-semibold text-[#E32B1A]">IdeaFuel</span>
          </a>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUBMITTING SCREEN
  // ============================================================
  if (screen === 'submitting') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-in fade-in duration-300 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#E32B1A] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Submitting your responses...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // QUESTION SCREEN
  // ============================================================
  if (screen === 'question' && currentQuestion) {
    const questionNumber = currentIndex + 1;
    const selectedAnswer = answers[currentQuestion.id];

    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-neutral-800 z-50">
          <div
            className="h-full bg-[#E32B1A] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-2xl mx-auto w-full">
          <div key={animKey} className="animate-in fade-in duration-300 w-full">
            {/* Question number */}
            <p className="text-neutral-500 text-sm mb-3">
              {questionNumber} <span className="text-neutral-700">/ {questions.length}</span>
            </p>

            {/* Question text */}
            <h2 className="text-2xl font-semibold text-white mb-8 leading-snug">
              {currentQuestion.text}
              {currentQuestion.required && (
                <span className="text-[#E32B1A] ml-1">*</span>
              )}
            </h2>

            {/* FREE_TEXT */}
            {currentQuestion.type === 'FREE_TEXT' && (
              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  value={freeTextDraft}
                  onChange={(e) => setFreeTextDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors resize-none"
                />
                <p className="text-neutral-600 text-xs">Press Enter to continue</p>
              </div>
            )}

            {/* SCALE */}
            {currentQuestion.type === 'SCALE' && (
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAutoAdvance(currentQuestion.id, val)}
                    className={`w-12 h-12 rounded-full border-2 font-semibold text-lg transition-all ${
                      selectedAnswer === val
                        ? 'bg-[#E32B1A] border-[#E32B1A] text-white scale-110'
                        : 'border-neutral-700 text-neutral-400 hover:border-[#E32B1A]/50 hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}

            {/* MULTIPLE_CHOICE */}
            {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAutoAdvance(currentQuestion.id, option)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedAnswer === option
                        ? 'bg-[#E32B1A]/10 border-[#E32B1A] text-white'
                        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* YES_NO */}
            {currentQuestion.type === 'YES_NO' && (
              <div className="flex gap-3">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAutoAdvance(currentQuestion.id, opt === 'Yes')}
                    className={`px-8 py-3 rounded-full border-2 font-semibold transition-all ${
                      selectedAnswer === (opt === 'Yes')
                        ? 'bg-[#E32B1A] border-[#E32B1A] text-white'
                        : 'border-neutral-700 text-neutral-400 hover:border-[#E32B1A]/50 hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-8 max-w-2xl mx-auto w-full">
          <button
            onClick={() => {
              saveCurrentFreeText();
              goBack();
            }}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {currentQuestion.type === 'FREE_TEXT' && (
            <button
              onClick={handleFreeTextAdvance}
              disabled={currentQuestion.required && !freeTextDraft.trim()}
              className="flex items-center gap-2 bg-[#E32B1A] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#c42516] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {currentIndex === questions.length - 1 ? 'Continue' : 'Next'}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div className="pb-6 flex justify-center">
          <a
            href="https://ideafuel.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-400 transition-colors text-sm"
          >
            <span>Powered by</span>
            <span className="font-semibold text-[#E32B1A]">IdeaFuel</span>
          </a>
        </div>
      </div>
    );
  }

  // ============================================================
  // CONTACT CAPTURE SCREEN
  // ============================================================
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Turnstile script */}
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-neutral-800 z-50">
        <div className="h-full bg-[#E32B1A] transition-all duration-500" style={{ width: '100%' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-2xl mx-auto w-full">
        <div key={animKey} className="animate-in fade-in duration-300 w-full">
          <h2 className="text-2xl font-semibold text-white mb-2">Almost done!</h2>
          <p className="text-neutral-400 mb-8">
            Optionally leave your contact info — or just submit anonymously.
          </p>

          <div className="space-y-4">
            {/* Honeypot — hidden from real users */}
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              className="hidden"
            />

            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">
                Your name <span className="text-neutral-600">(optional)</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">
                Email <span className="text-neutral-600">(optional)</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-4 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-[#E32B1A]/50 transition-colors"
              />
            </div>

            {waitlistEnabled && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={joinedWaitlist}
                  onChange={(e) => setJoinedWaitlist(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#E32B1A]"
                />
                <span className="text-neutral-300 text-sm">
                  Join the waitlist — be first to know when we launch
                </span>
              </label>
            )}

            {newsletterEnabled && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={joinedNewsletter}
                  onChange={(e) => setJoinedNewsletter(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#E32B1A]"
                />
                <span className="text-neutral-300 text-sm">
                  Subscribe to updates and insights from this project
                </span>
              </label>
            )}

            {/* Turnstile widget */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div ref={turnstileContainerRef} className="mt-2" />
            )}

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitResponse.isPending}
              className="w-full bg-[#E32B1A] text-white py-3 rounded-full font-semibold hover:bg-[#c42516] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitResponse.isPending ? 'Submitting...' : 'Submit Responses'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center px-6 pb-8 max-w-2xl mx-auto w-full">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="pb-6 flex justify-center">
        <a
          href="https://ideafuel.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-400 transition-colors text-sm"
        >
          <span>Powered by</span>
          <span className="font-semibold text-[#E32B1A]">IdeaFuel</span>
        </a>
      </div>
    </div>
  );
}
