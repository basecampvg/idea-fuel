'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { TOP_BAR_HEIGHT } from './sidebar-context';
import { ProjectSelector } from './project-selector';

// Forge flame logo (same SVG as sidebar)
function LogoFlame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 22" fill="none">
      <path
        d="M11.015 0.557396C11.015 4.1024 12.884 5.8844 14.494 7.5784C16.034 9.1984 17.5 10.7414 17.5 13.6804C17.5 18.4924 13.747 21.9304 8.935 21.9304C4.122 21.9304 0 18.5094 0 13.6804C0 11.6414 0.962 9.6694 2.509 8.7814C2.814 8.6064 3.181 8.7884 3.312 9.1154C4.313 11.6144 5.547 11.5704 6.187 10.9304C6.575 10.5434 6.657 9.8144 6.183 8.8684C3.778 4.0564 8.046 0.589396 10.383 0.0143957C10.719 -0.0676043 10.998 0.212396 11.015 0.557396ZM8.935 20.4304C12.994 20.4304 16 17.5904 16 13.6804C16 11.3434 14.907 10.1914 13.322 8.5224L13.301 8.4994C11.861 6.9824 10.162 5.1484 9.652 1.9424C8.89694 2.38629 8.2454 2.98634 7.741 3.7024C6.954 4.8464 6.594 6.3354 7.525 8.1974C8.128 9.4024 8.302 10.9374 7.248 11.9914C6.591 12.6484 5.486 13.0914 4.292 12.5774C3.54 12.2534 2.939 11.6224 2.454 10.7874C1.887 11.4934 1.5 12.5274 1.5 13.6804C1.5 17.5274 4.788 20.4304 8.935 20.4304Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BreadcrumbSeparator() {
  return (
    <span className="text-border text-lg font-light select-none">/</span>
  );
}

export function TopNavBar() {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith('/settings');

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[60] flex items-center border-b border-border bg-background/95 backdrop-blur-sm px-4"
      style={{ height: TOP_BAR_HEIGHT }}
    >
      {/* Left section: Logo + breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-foreground">
            <LogoFlame className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Forge</span>
        </Link>

        <BreadcrumbSeparator />

        {/* Project selector */}
        <ProjectSelector />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section: actions */}
      <div className="flex items-center gap-1">
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
