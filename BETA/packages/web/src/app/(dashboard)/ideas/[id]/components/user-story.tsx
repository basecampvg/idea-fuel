'use client';

import { BookOpen } from 'lucide-react';

export interface UserStoryData {
  scenario: string;
  protagonist: string;
  problem: string;
  solution: string;
  outcome: string;
}

interface UserStoryProps {
  userStory?: UserStoryData | null;
}

export function UserStory({ userStory }: UserStoryProps) {
  if (!userStory) return null;

  return (
    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2a] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-[#8b5cf6]" />
        </div>
        <h2 className="text-base font-semibold text-white">The Story</h2>
      </div>

      <div className="space-y-4">
        {/* Scenario - Main narrative */}
        <p className="text-[#a0a0b0] leading-relaxed whitespace-pre-line">
          {userStory.scenario}
        </p>

        {/* Key elements in a subtle grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#1e1e2a]">
          <div>
            <p className="text-xs text-[#6a6a7a] uppercase tracking-wider mb-1">The User</p>
            <p className="text-sm text-white">{userStory.protagonist}</p>
          </div>
          <div>
            <p className="text-xs text-[#6a6a7a] uppercase tracking-wider mb-1">Their Problem</p>
            <p className="text-sm text-[#a0a0b0]">{userStory.problem}</p>
          </div>
          <div>
            <p className="text-xs text-[#6a6a7a] uppercase tracking-wider mb-1">The Solution</p>
            <p className="text-sm text-[#a0a0b0]">{userStory.solution}</p>
          </div>
          <div>
            <p className="text-xs text-[#6a6a7a] uppercase tracking-wider mb-1">The Outcome</p>
            <p className="text-sm text-[#22c55e]">{userStory.outcome}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
