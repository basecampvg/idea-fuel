'use client';

import Link from 'next/link';
import { IDEA_STATUS_LABELS } from '@forge/shared';

type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

const statusConfig: Record<IdeaStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  CAPTURED: {
    label: 'Draft',
    color: 'text-[#6a6a7a]',
    bgColor: 'bg-transparent',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  INTERVIEWING: {
    label: 'Forging',
    color: 'text-[#e91e8c]',
    bgColor: 'bg-transparent',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  RESEARCHING: {
    label: 'Researching',
    color: 'text-[#3b82f6]',
    bgColor: 'bg-[#3b82f6]/15',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  COMPLETE: {
    label: 'Ready',
    color: 'text-[#e91e8c]',
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
    status: string;
    createdAt: Date;
  };
}

export function IdeaHeader({ idea }: IdeaHeaderProps) {
  const status = statusConfig[idea.status as IdeaStatus] || statusConfig.CAPTURED;

  return (
    <div>
      <Link
        href="/ideas"
        className="inline-flex items-center text-sm text-[#a0a0b0] hover:text-white transition-colors"
      >
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Vault
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{idea.title}</h1>
            {/* Status tag - different styling based on status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
              {status.icon}
              <span>{status.label}</span>
            </div>
          </div>
          <p className="mt-1.5 text-sm text-[#6a6a7a]">
            Created {new Date(idea.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
