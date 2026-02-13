'use client';

import { useState, useCallback } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { matchDemoOutput, suggestionPills } from './demo-data';
import { DemoResult } from './demo-result';
import { useInView } from './use-in-view';
import type { DemoOutput } from './demo-data';

export function DemoSection() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    output: DemoOutput;
    isFallback: boolean;
  } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const runDemo = useCallback(
    (value: string) => {
      const sanitized = value.replace(/<[^>]*>/g, '').slice(0, 200);
      if (!sanitized.trim()) return;

      setIsThinking(true);
      setResult(null);

      // 500ms fake "thinking" delay
      setTimeout(() => {
        const matched = matchDemoOutput(sanitized);
        setResult(matched);
        setIsThinking(false);
        setAnimationKey((k) => k + 1);
      }, 500);
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runDemo(input);
  };

  const handlePillClick = (suggestion: string) => {
    setInput(suggestion);
    runDemo(suggestion);
  };

  return (
    <section ref={ref} className="relative px-6 py-20">
      <div
        className={`mx-auto max-w-3xl transition-all duration-700 ${
          isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Section header */}
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Try It Now
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            See your idea analyzed in seconds
          </h2>
          <p className="mt-3 text-muted-foreground">
            Type a business idea below and watch our AI break it down instantly.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Describe your business idea..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={200}
                aria-label="Business idea for demo analysis"
                className="input-dark w-full pl-11"
                disabled={isThinking}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="btn-ideationlab whitespace-nowrap"
            >
              {isThinking ? (
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
                  Analyzing...
                </span>
              ) : (
                'Analyze'
              )}
            </button>
          </div>
        </form>

        {/* Suggestion pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {suggestionPills.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handlePillClick(suggestion)}
              disabled={isThinking}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <DemoResult
            data={result.output}
            isFallback={result.isFallback}
            animationKey={animationKey}
          />
        )}
      </div>
    </section>
  );
}
