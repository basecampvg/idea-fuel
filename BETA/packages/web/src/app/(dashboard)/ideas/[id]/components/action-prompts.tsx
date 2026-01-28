'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronRight, ChevronDown, Check, Copy, Pencil, X, Save } from 'lucide-react';

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
  title?: string;
  subtitle?: string;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const originalPrompt = prompt.prompt.replace('{ideaTitle}', ideaTitle);
  const [editedPrompt, setEditedPrompt] = useState(originalPrompt);
  const [savedPrompt, setSavedPrompt] = useState(originalPrompt);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedPrompt, isEditing]);

  // Use saved prompt if edited, otherwise original
  const displayPrompt = hasBeenEdited ? savedPrompt : originalPrompt;

  const handleCopyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = isEditing ? editedPrompt : displayPrompt;
    await navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    onCopy(textToCopy);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Reset editing state when collapsing
    if (isExpanded) {
      setIsEditing(false);
      setEditedPrompt(originalPrompt);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    // Reset to saved prompt if exists, otherwise original
    setEditedPrompt(hasBeenEdited ? savedPrompt : originalPrompt);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPrompt(editedPrompt);
    setHasBeenEdited(true);
    setIsEditing(false);
  };

  return (
    <div
      className={`w-full rounded-xl bg-background border p-4 transition-all text-left ${
        isExpanded ? 'border-primary/30 bg-card' : 'border-border hover:border-border hover:bg-card'
      }`}
    >
      {/* Header row - clickable to expand */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between group"
      >
        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-sm font-medium text-foreground">
            {prompt.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {prompt.description}
          </p>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 ml-4">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-primary transition-transform" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          {/* Prompt text or textarea */}
          {isEditing ? (
            <div className="mb-3">
              <textarea
                ref={textareaRef}
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full rounded-lg bg-muted/30 border border-primary/30 p-3 text-xs text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px] overflow-hidden"
                autoFocus
              />
              <p className="text-xs text-muted-foreground/60 mt-1.5">
                Edit the prompt above, then copy when ready
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 p-3 mb-3">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {displayPrompt}
              </p>
              {hasBeenEdited && (
                <p className="text-xs text-primary/60 mt-1.5">
                  ✓ Custom prompt saved
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={handleCopyClick}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isCopied
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy to Clipboard
                </>
              )}
            </button>

            {/* Edit / Save / Cancel buttons */}
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Prompt
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Prompt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
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

export function ActionPrompts({ actionPrompts: rawActionPrompts, ideaTitle, title = 'Start Building in 1-click', subtitle = 'Turn this idea into your business with pre-built prompts' }: ActionPromptsProps) {
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
    <div className="rounded-2xl bg-background border border-border p-5">
      {/* Header with star icon */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary/50" />
        <h2 className="text-sm font-semibold text-foreground">
          {title}
        </h2>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mb-4">
          {subtitle}
        </p>
      )}

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
      <button className="mt-4 text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
        More prompts...
      </button>

      {/* Toast notification */}
      {lastCopied && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-card border border-primary/30 px-4 py-3 shadow-lg flex items-center gap-2 animate-fade-in-up">
          <Check className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">Prompt copied to clipboard</span>
        </div>
      )}
    </div>
  );
}
