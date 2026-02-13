'use client';

import { type ReactNode } from 'react';

interface BrowserFrameProps {
  children: ReactNode;
  url?: string;
  className?: string;
}

/**
 * Reusable browser window chrome with traffic light dots and URL bar.
 * Used for the hero cursor demo and the report showcase.
 */
export function BrowserFrame({ children, url = 'ideationlab.ai', className = '' }: BrowserFrameProps) {
  return (
    <div
      className={`landing-glass-strong overflow-hidden p-0 ${className}`}
      aria-hidden="true"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        {/* Traffic light dots */}
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        {/* URL bar */}
        <div className="mx-auto flex-1 max-w-[260px]">
          <div className="rounded-md bg-white/5 px-3 py-1 text-center text-xs text-muted-foreground">
            {url}
          </div>
        </div>
        {/* Spacer to balance traffic lights */}
        <div className="w-[52px]" />
      </div>

      {/* Content area */}
      <div className="relative bg-background/50">
        {children}
      </div>
    </div>
  );
}
