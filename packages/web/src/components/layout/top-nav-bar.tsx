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

// ideationLab bulb logo
function LogoBulb({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 42.34 56.89">
      <defs>
        <clipPath id="clippath">
          <circle fill="none" cx="20.84" cy="37.46" r="12.22"/>
        </clipPath>
        <radialGradient id="radial-gradient" cx="22.08" cy="41.72" r="18.37" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f6871f"/>
          <stop offset=".2" stopColor="#f26223"/>
          <stop offset=".41" stopColor="#f04327"/>
          <stop offset=".62" stopColor="#ee2d29"/>
          <stop offset=".82" stopColor="#ed202b"/>
          <stop offset="1" stopColor="#ed1c2c"/>
        </radialGradient>
        <radialGradient id="radial-gradient1" cx="24.63" cy="41.59" r="19.01" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f7941d"/>
          <stop offset="1" stopColor="#ef3e2d"/>
        </radialGradient>
        <radialGradient id="radial-gradient2" cx="25.4" cy="46.41" r="19.48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffcd03"/>
          <stop offset="1" stopColor="#f6882f"/>
        </radialGradient>
      </defs>
      <path fill="#f5f4ed" d="M20.84,54.15c-4.31,0-8.37-1.62-11.51-4.61-3.31-3.16-5.14-7.42-5.16-11.99,0-.6.43-1.14,1.02-1.2.67-.06,1.23.47,1.23,1.12,0,3.98,1.58,7.68,4.46,10.43,2.88,2.75,6.65,4.16,10.64,3.97,7.36-.34,13.38-6.37,13.72-13.72.18-3.99-1.23-7.77-3.97-10.64-2.75-2.88-6.45-4.46-10.43-4.46-6.43,0-8.82-4.4-8.82-7.18,0-1.26.78-2.18,1.89-2.25l3.99-.24c.23-.01.28-.34.06-.42l-4.62-1.69c-.55-.2-.86-.8-.69-1.38.12-.41.48-.7.9-.79l5.53-1.13c.22-.04.23-.35.02-.42l-5.58-1.75c-.56-.18-.93-.74-.81-1.32.14-.66.81-1.04,1.44-.85l10.59,3.32c.57.18.91.77.75,1.37-.11.42-.48.73-.9.82l-5.99,1.22c-.21.04-.24.34-.03.41l6.23,2.29c.5.18.81.69.73,1.22-.08.53-.52.93-1.05.96l-9.84.58c-.15,0-.27.13-.27.28,0,.09,0,.16,0,.16,0,1.98,1.47,4.12,6.48,4.52,4.6,0,8.88,1.83,12.06,5.16,3.18,3.33,4.81,7.69,4.6,12.3-.39,8.51-7.36,15.48-15.87,15.87-.27.01-.53.02-.8.02Z"/>
      <path fill="#fbb040" d="M8.11,26.94c-.94,0-1.7-.76-1.7-1.7s.76-1.7,1.7-1.7,1.7.76,1.7,1.7-.76,1.7-1.7,1.7ZM8.11,24.67c-.32,0-.57.26-.57.57s.26.57.57.57.57-.26.57-.57-.26-.57-.57-.57Z"/>
      <path fill="#fbb040" d="M15.85,28.61c-.62,0-1.13-.51-1.13-1.13s.51-1.13,1.13-1.13,1.13.51,1.13,1.13-.51,1.13-1.13,1.13ZM15.85,27.1c-.21,0-.38.17-.38.38s.17.38.38.38.38-.17.38-.38-.17-.38-.38-.38Z"/>
      <path fill="#f15a29" d="M18.68,36.45c-1.88,0-3.41-1.53-3.41-3.41s1.53-3.41,3.41-3.41,3.41,1.53,3.41,3.41-1.53,3.41-3.41,3.41ZM18.68,30.9c-1.18,0-2.14.96-2.14,2.14s.96,2.14,2.14,2.14,2.14-.96,2.14-2.14-.96-2.14-2.14-2.14Z"/>
      <path fill="#f7941d" d="M11.01,32.8c-1.44,0-2.6-1.17-2.6-2.6s1.17-2.6,2.6-2.6,2.6,1.17,2.6,2.6-1.17,2.6-2.6,2.6ZM11.01,28.72c-.81,0-1.48.66-1.48,1.48s.66,1.48,1.48,1.48,1.48-.66,1.48-1.48-.66-1.48-1.48-1.48Z"/>
      <g clipPath="url(#clippath)">
        <path fill="url(#radial-gradient)" d="M46.56,50.39c-16.33-9.44-32.65,3.95-48.98-5.48.48-1.85.95-3.69,1.43-5.54,15.37,5.44,30.75-10.61,46.12-5.16l1.43,16.19Z"/>
        <path fill="url(#radial-gradient1)" d="M37.32,53.17c-1.67-3.36-6.2-4.47-9.41-5.11-3.44-.58-5.56-.69-7.89-.58-2.07,0-4.33.23-6.62-.32-2.43-.46-4.87-1.7-10.66-2.69-1.02-1.31-1.71-2.52-2.38-3.6,12.3-.29,16.56,1.17,24-2.66,6.75-2.83,16.68-10.94,24.52-7.28-4.12,8.56-7.81,15.35-11.57,22.23Z"/>
        <path fill="url(#radial-gradient2)" d="M39.55,50.22c-4.84-1.62-13.46-1.54-18.46-.16-5.86,1.08-8.1,3.47-20.27-.47-1.12-2.4-1.78-4.85-2.45-7.25,14.96,2.25,21.17.59,27.98-.4,3.45-.53,7.26-.96,11.94-.91,4.57.06,10,.6,14.14,2.13-4.43,1.86-8.61,3.74-12.87,7.06Z"/>
      </g>
    </svg>
  );
}

const TIER_STYLES: Record<SubscriptionTier, string> = {
  FREE: 'bg-muted text-muted-foreground',
  PRO: 'bg-primary/15 text-primary',
  ENTERPRISE: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
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
      className="fixed top-0 left-0 right-0 z-[60] flex items-center border-b border-border bg-background/95 backdrop-blur-sm px-4"
      style={{ height: TOP_BAR_HEIGHT }}
    >
      {/* Left section: Logo / User / Project */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-foreground">
            <LogoBulb className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold">ideationLab</span>
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
