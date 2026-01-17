'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { LoadingScreen } from '@/components/ui/spinner';
import { IDEA_STATUS_LABELS } from '@forge/shared';
import { ChevronRight, Plus, Lightbulb } from 'lucide-react';

type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

// Status styling matching the screenshots
const statusConfig: Record<IdeaStatus, { label: string; color: string; bgColor: string }> = {
  CAPTURED: {
    label: 'Draft',
    color: 'text-[#6a6a7a]',
    bgColor: 'bg-transparent',
  },
  INTERVIEWING: {
    label: 'Forging',
    color: 'text-[#e91e8c]',
    bgColor: 'bg-transparent',
  },
  RESEARCHING: {
    label: 'Researching',
    color: 'text-[#3b82f6]',
    bgColor: 'bg-[#3b82f6]/15',
  },
  COMPLETE: {
    label: 'Ready',
    color: 'text-[#e91e8c]',
    bgColor: 'bg-transparent',
  },
};

export default function IdeasPage() {
  const [filter, setFilter] = useState<IdeaStatus | 'ALL'>('ALL');
  // Note: The backend doesn't support status filtering yet, so we filter client-side
  const { data, isLoading, error } = trpc.idea.list.useQuery({});

  if (isLoading) {
    return <LoadingScreen message="Loading ideas..." />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 text-[#ef4444]">
        Failed to load ideas: {error.message}
      </div>
    );
  }

  const allIdeas = data?.items ?? [];
  // Client-side filtering since backend doesn't support status filter
  const ideas = filter === 'ALL' ? allIdeas : allIdeas.filter((idea) => idea.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Ideas Vault</h1>
          <p className="mt-1 text-[#6a6a7a]">
            Manage and develop your business ideas
          </p>
        </div>
        <Link href="/ideas/new">
          <button className="
            inline-flex items-center gap-2 px-5 py-2.5
            bg-[#e91e8c] text-white text-sm font-medium
            rounded-full
            shadow-[0_0_20px_rgba(233,30,140,0.3)]
            hover:shadow-[0_0_30px_rgba(233,30,140,0.5)]
            transition-all duration-300
          ">
            <Plus className="w-4 h-4" />
            New Idea
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['ALL', 'CAPTURED', 'INTERVIEWING', 'RESEARCHING', 'COMPLETE'] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-[#e91e8c]/20 text-[#e91e8c]'
                  : 'text-[#6a6a7a] hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              {status === 'ALL' ? 'All' : (statusConfig[status]?.label || IDEA_STATUS_LABELS[status])}
            </button>
          )
        )}
      </div>

      {/* Ideas List */}
      {ideas.length === 0 ? (
        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#1a1a24] flex items-center justify-center mb-4">
            <Lightbulb className="w-8 h-8 text-[#6a6a7a]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No ideas yet</h3>
          <p className="text-[#6a6a7a] mb-6">Get started by capturing your first business idea</p>
          <Link href="/ideas/new">
            <button className="
              inline-flex items-center gap-2 px-5 py-2.5
              bg-[#e91e8c] text-white text-sm font-medium
              rounded-full
              shadow-[0_0_20px_rgba(233,30,140,0.3)]
              hover:shadow-[0_0_30px_rgba(233,30,140,0.5)]
              transition-all duration-300
            ">
              Capture an Idea
            </button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] overflow-hidden">
          {ideas.map((idea, index) => {
            const status = statusConfig[idea.status as IdeaStatus] || statusConfig.CAPTURED;
            return (
              <Link key={idea.id} href={`/ideas/${idea.id}`}>
                <div className={`
                  flex items-center justify-between px-5 py-4
                  hover:bg-[#1a1a24] transition-colors cursor-pointer
                  ${index !== ideas.length - 1 ? 'border-b border-[#1e1e2a]' : ''}
                `}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {/* Status tag */}
                      <span className={`text-xs font-medium ${status.color} ${status.bgColor} px-2 py-0.5 rounded-full`}>
                        {status.label}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{idea.title}</h3>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-[#6a6a7a]">
                      {idea.description}
                    </p>
                  </div>
                  {/* Show Full Report link */}
                  <div className="flex items-center gap-1 text-[#00d4ff] text-sm font-medium shrink-0 ml-4">
                    <span>Show Full Report</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination info */}
      {data && data.pagination.total > 0 && (
        <p className="text-center text-sm text-[#6a6a7a]">
          Showing {ideas.length} of {data.pagination.total} ideas
        </p>
      )}
    </div>
  );
}
