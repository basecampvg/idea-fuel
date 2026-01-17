'use client';

import { useState } from 'react';
import { Sparkles, ChevronRight, Check } from 'lucide-react';

export interface ActionPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'landing' | 'email' | 'social' | 'ads' | 'brand';
}

interface ActionPromptsProps {
  actionPrompts?: ActionPrompt[] | null;
  ideaTitle: string;
}

// Default prompts matching screenshot
const DEFAULT_PROMPTS: ActionPrompt[] = [
  {
    id: 'ad-creatives',
    title: 'Ad Creatives',
    description: 'High-converting ad copy and creative concepts',
    prompt: 'Create ad creatives for my business: {ideaTitle}.',
    category: 'ads',
  },
  {
    id: 'brand-package',
    title: 'Brand Package',
    description: 'Complete brand identity with logo, colors, and voice',
    prompt: 'Create a brand package for my business: {ideaTitle}.',
    category: 'brand',
  },
  {
    id: 'landing-page',
    title: 'Landing Page',
    description: 'Copy + wireframe blocks',
    prompt: 'Create a landing page for my business: {ideaTitle}.',
    category: 'landing',
  },
];

function PromptCard({
  prompt,
  ideaTitle,
  onCopy,
}: {
  prompt: ActionPrompt;
  ideaTitle: string;
  onCopy: (text: string) => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const handleClick = async () => {
    const finalPrompt = prompt.prompt.replace('{ideaTitle}', ideaTitle);
    await navigator.clipboard.writeText(finalPrompt);
    setIsCopied(true);
    onCopy(finalPrompt);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-xl bg-[#12121a] border border-[#1e1e2a] p-4 hover:border-[#3a3a4a] hover:bg-[#1a1a24] transition-all text-left group"
    >
      <div className="flex items-center justify-between">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white">
            {prompt.title}
          </h3>
          <p className="text-xs text-[#6a6a7a] mt-0.5">
            {prompt.description}
          </p>
        </div>

        {/* Arrow or check */}
        <div className="flex-shrink-0 ml-4">
          {isCopied ? (
            <Check className="w-4 h-4 text-[#22c55e]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6a6a7a] group-hover:text-[#a0a0b0] transition-colors" />
          )}
        </div>
      </div>
    </button>
  );
}

// Helper to parse JSON if it's a string
function parseJson<T>(data: T | string | null | undefined): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as T;
}

export function ActionPrompts({ actionPrompts: rawActionPrompts, ideaTitle }: ActionPromptsProps) {
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  // Parse actionPrompts if it's a string (Prisma JSON field)
  const actionPrompts = parseJson<ActionPrompt[]>(rawActionPrompts);

  // Use provided prompts or defaults
  const prompts = actionPrompts && Array.isArray(actionPrompts) && actionPrompts.length > 0 ? actionPrompts : DEFAULT_PROMPTS;

  const handleCopy = (text: string) => {
    setLastCopied(text);
    setTimeout(() => setLastCopied(null), 3000);
  };

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-5">
      {/* Header with star icon */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#fbbf24]" />
        <h2 className="text-base font-semibold text-white">
          Start Building in 1-click
        </h2>
      </div>

      {/* Subtitle */}
      <p className="text-xs text-[#6a6a7a] mb-4">
        Turn this idea into your business with pre-built prompts
      </p>

      {/* Prompt cards */}
      <div className="space-y-2">
        {prompts.map((prompt) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            ideaTitle={ideaTitle}
            onCopy={handleCopy}
          />
        ))}
      </div>

      {/* More prompts link */}
      <button className="mt-4 text-xs text-[#6a6a7a] hover:text-[#a0a0b0] transition-colors">
        More prompts...
      </button>

      {/* Toast notification */}
      {lastCopied && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#1a1a24] border border-[#22c55e]/30 px-4 py-3 shadow-lg flex items-center gap-2 animate-fade-in-up">
          <Check className="w-4 h-4 text-[#22c55e]" />
          <span className="text-sm text-white">Prompt copied to clipboard</span>
        </div>
      )}
    </div>
  );
}
