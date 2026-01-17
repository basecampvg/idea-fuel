'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';

// Words to cycle through in the typewriter
const typewriterWords = [
  'business?',
  'startup idea?',
  'side project?',
  'venture?',
  'big idea?',
];

// Typewriter component
function TypewriterText({ words }: { words: string[] }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const currentWord = words[currentWordIndex];

  const typeSpeed = 100; // ms per character when typing
  const deleteSpeed = 60; // ms per character when deleting
  const pauseAfterWord = 2000; // pause after completing a word
  const pauseAfterDelete = 300; // pause after deleting before next word

  const tick = useCallback(() => {
    if (!isDeleting) {
      // Typing
      if (displayText.length < currentWord.length) {
        setDisplayText(currentWord.substring(0, displayText.length + 1));
      } else {
        // Finished typing, wait then start deleting
        setTimeout(() => setIsDeleting(true), pauseAfterWord);
        return;
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        setDisplayText(displayText.substring(0, displayText.length - 1));
      } else {
        // Finished deleting, move to next word
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        return;
      }
    }
  }, [displayText, isDeleting, currentWord, words.length]);

  useEffect(() => {
    const speed = isDeleting ? deleteSpeed : typeSpeed;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [tick, isDeleting]);

  // Initial delay before starting
  useEffect(() => {
    const initialDelay = setTimeout(() => {
      setDisplayText(currentWord.charAt(0));
    }, 500);
    return () => clearTimeout(initialDelay);
  }, []);

  return (
    <span className="text-gradient font-bold">
      {displayText}
      <span className="typewriter-cursor">|</span>
    </span>
  );
}

// Forge flame icon
function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 22" fill="none">
      <path
        d="M11.015 0.557396C11.015 4.1024 12.884 5.8844 14.494 7.5784C16.034 9.1984 17.5 10.7414 17.5 13.6804C17.5 18.4924 13.747 21.9304 8.935 21.9304C4.122 21.9304 0 18.5094 0 13.6804C0 11.6414 0.962 9.6694 2.509 8.7814C2.814 8.6064 3.181 8.7884 3.312 9.1154C4.313 11.6144 5.547 11.5704 6.187 10.9304C6.575 10.5434 6.657 9.8144 6.183 8.8684C3.778 4.0564 8.046 0.589396 10.383 0.0143957C10.719 -0.0676043 10.998 0.212396 11.015 0.557396ZM8.935 20.4304C12.994 20.4304 16 17.5904 16 13.6804C16 11.3434 14.907 10.1914 13.322 8.5224L13.301 8.4994C11.861 6.9824 10.162 5.1484 9.652 1.9424C8.89694 2.38629 8.2454 2.98634 7.741 3.7024C6.954 4.8464 6.594 6.3354 7.525 8.1974C8.128 9.4024 8.302 10.9374 7.248 11.9914C6.591 12.6484 5.486 13.0914 4.292 12.5774C3.54 12.2534 2.939 11.6224 2.454 10.7874C1.887 11.4934 1.5 12.5274 1.5 13.6804C1.5 17.5274 4.788 20.4304 8.935 20.4304Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Report type indicators (display-only)
const reportTypes = [
  { name: 'Business Plan', icon: '📋' },
  { name: 'Positioning', icon: '🎯' },
  { name: 'Competitive Analysis', icon: '📊' },
  { name: 'Financial Forecasting', icon: '💰' },
];

// DEV MODE: Check if we're in development for mock data
const isDev = process.env.NODE_ENV === 'development';

export default function DashboardPage() {
  const router = useRouter();
  const [ideaDescription, setIdeaDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // In dev mode, don't fail if user query fails
  const { data: user, isLoading: userLoading, error: userError } = trpc.user.me.useQuery(
    undefined,
    { retry: isDev ? false : 3 }
  );
  const createIdea = trpc.idea.create.useMutation();
  const startInterview = trpc.idea.startInterview.useMutation();
  const startResearch = trpc.idea.startResearch.useMutation();

  // Show loading only if we're actually loading (not if there's an error in dev)
  if (userLoading && !userError) {
    return <LoadingScreen message="Loading..." />;
  }

  // Use mock name in dev if no user
  const firstName = user?.name?.split(' ')[0] || (isDev ? 'Developer' : 'there');

  // Forge (Lightning Mode) - Save idea and skip straight to research
  const handleForge = async () => {
    if (!ideaDescription.trim()) return;

    setIsSubmitting(true);
    try {
      // Create the idea
      const idea = await createIdea.mutateAsync({
        title: ideaDescription.substring(0, 50) + (ideaDescription.length > 50 ? '...' : ''),
        description: ideaDescription,
      });

      // Start Lightning interview (AI-only, no user interaction)
      await startInterview.mutateAsync({ ideaId: idea.id, mode: 'LIGHTNING' });

      // Start research immediately
      await startResearch.mutateAsync({ id: idea.id });

      // Navigate to the idea page (will show RESEARCHING status)
      router.push(`/ideas/${idea.id}`);
    } catch (error) {
      console.error('Failed to forge idea:', error);
      setIsSubmitting(false);
    }
  };

  // Save to Vault - Just save the idea without starting anything
  const handleSave = async () => {
    if (!ideaDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const idea = await createIdea.mutateAsync({
        title: ideaDescription.substring(0, 50) + (ideaDescription.length > 50 ? '...' : ''),
        description: ideaDescription,
      });
      router.push(`/ideas/${idea.id}`);
    } catch (error) {
      console.error('Failed to save idea:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 relative z-10">
      {/* Greeting Section */}
      <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
          Hey {firstName}, ready for your next
          <br />
          <TypewriterText words={typewriterWords} />
        </h1>
        <p className="text-[#a0a0b0] text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
          Transform your ideas into actionable plans, positioning strategies, and competitive analysis.
        </p>
      </div>

      {/* Idea Input Card */}
      <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div
          className={`
            rounded-2xl bg-[#12121a] border p-6 transition-all duration-500
            ${isFocused
              ? 'border-[#3a3a4a] shadow-2xl shadow-black/20'
              : 'border-[#2a2a38] shadow-lg shadow-black/10'
            }
          `}
        >
          {/* Textarea */}
          <div className="relative">
            <textarea
              value={ideaDescription}
              onChange={(e) => setIdeaDescription(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Describe your business idea..."
              className="
                w-full bg-transparent text-white text-base
                placeholder:text-[#6a6a7a]
                resize-none border-0 focus:outline-none focus:ring-0
                min-h-[120px] leading-relaxed
              "
              rows={4}
            />

            {/* Character count hint */}
            {ideaDescription.length > 0 && (
              <div className="absolute bottom-0 right-0 text-xs text-[#6a6a7a]">
                {ideaDescription.length} characters
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#1e1e2a] my-5" />

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleForge}
                disabled={!ideaDescription.trim() || isSubmitting}
                title="Lightning Mode: Skip interview, go straight to research"
                className="
                  inline-flex items-center gap-2 px-6 py-2.5
                  bg-[#e91e8c] text-white text-sm font-medium
                  rounded-full
                  shadow-[0_0_20px_rgba(233,30,140,0.3)]
                  hover:shadow-[0_0_30px_rgba(233,30,140,0.5)]
                  transition-all duration-300
                  disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed
                  group
                "
              >
                {isSubmitting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <FlameIcon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
                )}
                Forge
              </button>
              <button
                onClick={handleSave}
                disabled={!ideaDescription.trim() || isSubmitting}
                className="
                  inline-flex items-center gap-2 px-4 py-2.5
                  text-[#a0a0b0] text-sm font-medium
                  hover:text-white
                  transition-colors duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                Save
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Attachment */}
              <button
                className="p-2.5 rounded-xl text-[#6a6a7a] hover:text-white hover:bg-[#1a1a24] transition-all duration-300"
                title="Attach file"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
              {/* Microphone */}
              <button
                className="p-2.5 rounded-xl text-[#6a6a7a] hover:text-white hover:bg-[#1a1a24] transition-all duration-300"
                title="Voice input"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Indicators - cyan border pills with checkmarks */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {reportTypes.map((report, index) => (
            <div
              key={report.name}
              className="
                flex items-center gap-2 px-4 py-2 rounded-full
                border border-[#4ecdc4] bg-transparent
                text-sm text-[#4ecdc4]
                transition-all duration-300
                hover:bg-[#4ecdc4]/10
              "
              style={{ animationDelay: `${(index + 3) * 50}ms` }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="font-medium">{report.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-16 text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <button
          className="
            inline-flex items-center gap-2 px-5 py-2.5
            border border-[#4ecdc4]/50 text-[#4ecdc4] text-base
            rounded-xl bg-transparent
            hover:bg-[#4ecdc4]/10 hover:border-[#4ecdc4]/70
            transition-all duration-300
            mb-5 group
          "
        >
          <svg
            className="w-5 h-5 transition-transform group-hover:rotate-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          Refer a friend for credits
        </button>
        <p className="text-[#6a6a7a] text-sm tracking-wide">
          Start with an idea. Build something great.
        </p>
      </div>
    </div>
  );
}
