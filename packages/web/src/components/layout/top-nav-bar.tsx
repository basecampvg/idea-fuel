'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Bot } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { TOP_BAR_HEIGHT } from './sidebar-context';
import { ProjectSelector } from './project-selector';
import { useSubscriptionContext } from '@/components/subscription/subscription-context';
import type { SubscriptionTier } from '@forge/shared';
import { useAgentSidebar } from '@/components/agent/agent-sidebar-context';

const TIER_STYLES: Record<SubscriptionTier, string> = {
  FREE: 'bg-muted text-muted-foreground',
  PRO: 'bg-primary/15 text-primary',
  ENTERPRISE: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  TESTER: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

function BreadcrumbSeparator() {
  return (
    <span className="text-border text-lg font-light select-none">/</span>
  );
}

export function TopNavBar() {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith('/settings');
  const { data: user } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const { tier } = useSubscriptionContext();
  const { isOpen: agentOpen, toggle: toggleAgent } = useAgentSidebar();

  const userName = user?.name ?? user?.email?.split('@')[0];
  const userImage = user?.image;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[60] flex items-center border-b border-border bg-background/95 backdrop-blur-sm px-6"
      style={{ height: TOP_BAR_HEIGHT }}
    >
      {/* Left section: Logo / User / Project */}
      <div className="flex items-center gap-3">
        {/* Logo — Idea Fuel branding */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <img
            src="/ideafuel-logo.svg"
            alt="Idea Fuel"
            className="h-7 w-auto"
          />
          <span className="font-mono text-base font-medium uppercase tracking-[3px]">
            <span className="text-foreground">idea</span>
            <span className="text-gradient-brand">fuel</span>
          </span>
        </Link>

        <BreadcrumbSeparator />

        {/* User + tier badge */}
        {userName && (
          <div className="flex items-center gap-2">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={20}
                height={20}
                className="rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-foreground">{userName}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${TIER_STYLES[tier]}`}>
              {tier}
            </span>
          </div>
        )}

        <BreadcrumbSeparator />

        {/* Project selector */}
        <ProjectSelector />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section: actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAgent}
          className={`
            flex h-8 w-8 items-center justify-center rounded-lg transition-colors
            ${agentOpen
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }
          `}
          title="AI Agent (Ctrl+J)"
        >
          <Bot className="w-4 h-4" />
        </button>
        <Link
          href="/settings"
          className={`
            flex h-8 w-8 items-center justify-center rounded-lg transition-colors
            ${isSettings
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }
          `}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
