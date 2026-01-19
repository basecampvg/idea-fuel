'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

// Summarize a long title/description to a shorter display title
function summarizeTitle(text: string, maxLength: number = 60): string {
  if (!text) return 'Untitled Idea';

  // Clean up the text - take first line if multiline
  const firstLine = text.split('\n')[0].trim();

  // If already short enough, return as-is
  if (firstLine.length <= maxLength) return firstLine;

  // Try to cut at a natural boundary (space, punctuation)
  const truncated = firstLine.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

const statusConfig: Record<IdeaStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  CAPTURED: {
    label: 'Draft',
    color: 'text-muted-foreground',
    bgColor: 'bg-transparent',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  INTERVIEWING: {
    label: 'Forging',
    color: 'text-primary',
    bgColor: 'bg-transparent',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  RESEARCHING: {
    label: 'Researching',
    color: 'text-info',
    bgColor: 'bg-info/15',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  COMPLETE: {
    label: 'Ready',
    color: 'text-primary',
    bgColor: 'bg-transparent',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
};

interface IdeaHeaderProps {
  idea: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
  };
}

export function IdeaHeader({ idea }: IdeaHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[idea.status as IdeaStatus] || statusConfig.CAPTURED;

  // Use description as the source for the display title, fall back to title
  const fullText = idea.description || idea.title;
  const displayTitle = summarizeTitle(fullText, 65);
  const hasMoreContent = fullText.length > 65 || (idea.description && idea.description !== idea.title);

  return (
    <div>
      <Link
        href="/ideas"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Vault
      </Link>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground">{displayTitle}</h1>
              {/* Status tag */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.icon}
                <span>{status.label}</span>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground/60">
              Created {new Date(idea.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Expandable full description */}
        {hasMoreContent && (
          <div className="mt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Hide full idea</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Show full idea</span>
                </>
              )}
            </button>

            {isExpanded && (
              <div className="mt-3 p-4 rounded-xl bg-card/50 border border-border">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {idea.description || idea.title}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
