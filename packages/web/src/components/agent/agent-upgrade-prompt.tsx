'use client';

import { Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';

export function AgentUpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        AI Agent — PRO Feature
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        Get an AI research assistant that can search your project data,
        answer questions, and add insights to your reports.
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground
          text-sm font-medium hover:bg-primary/90 transition-colors
          shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to PRO
      </Link>
    </div>
  );
}
