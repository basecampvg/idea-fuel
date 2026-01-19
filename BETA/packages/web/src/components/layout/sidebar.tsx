'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Plus,
  FolderOpen,
  Compass,
  Settings,
  ChevronRight,
  X,
  MessageSquare,
  FileText,
  MoreHorizontal,
} from 'lucide-react';

// Status configuration with semantic colors
type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

const statusConfig: Record<IdeaStatus, { label: string; dotColor: string }> = {
  CAPTURED: { label: 'Draft', dotColor: 'bg-zinc-400' },
  INTERVIEWING: { label: 'Interview', dotColor: 'bg-amber-400' },
  RESEARCHING: { label: 'Researching', dotColor: 'bg-blue-400' },
  COMPLETE: { label: 'Ready', dotColor: 'bg-emerald-400' },
};

// Forge flame logo - simplified
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

// Navigation items
const mainNav = [
  { name: 'New', href: '/dashboard', icon: Plus, isAction: true },
  { name: 'Library', href: '/ideas', icon: FolderOpen, hasSubmenu: true },
];

const bottomNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Vault/Library submenu component
function LibrarySubmenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const submenuRef = useRef<HTMLDivElement>(null);
  const isDev = process.env.NODE_ENV === 'development';

  const { data, isLoading } = trpc.idea.list.useQuery(
    { limit: 8 },
    { enabled: isOpen, retry: isDev ? false : 3 }
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-library-trigger]')) {
          onClose();
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const ideas = data?.items ?? [];

  return (
    <div
      ref={submenuRef}
      className={`
        fixed top-0 left-[60px] h-full w-[260px] z-40
        bg-background border-r border-border
        transition-all duration-200 ease-out
        ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        <span className="text-sm font-medium text-[var(--foreground)]">Library</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Idea */}
      <div className="p-2">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-colors"
        >
          <Plus className="w-4 h-4 text-[var(--muted-foreground)]" />
          <span className="text-sm">New Idea</span>
        </Link>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-3" />

      {/* Recent Ideas */}
      <div className="p-2">
        <div className="px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          Recent
        </div>

        {isLoading ? (
          <div className="px-3 py-6 text-sm text-[var(--muted-foreground)] text-center">
            Loading...
          </div>
        ) : ideas.length === 0 ? (
          <div className="px-3 py-6 text-sm text-[var(--muted-foreground)] text-center">
            No ideas yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {ideas.map((idea) => {
              const status = statusConfig[idea.status as IdeaStatus] || statusConfig.CAPTURED;
              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  onClick={onClose}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--muted)]/50 transition-colors"
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full ${status.dotColor} flex-shrink-0`} />

                  {/* Title */}
                  <span className="flex-1 text-sm text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {idea.title}
                  </span>

                  {/* Meta counts */}
                  {idea._count && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {idea._count.interviews > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          {idea._count.interviews}
                        </span>
                      )}
                      {idea._count.reports > 0 && (
                        <span className="flex items-center gap-0.5">
                          <FileText className="w-3 h-3" />
                          {idea._count.reports}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* View All - positioned after recent ideas */}
      <div className="p-2 pt-0">
        <Link
          href="/ideas"
          onClick={onClose}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-colors"
        >
          <span>View all</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <>
      {/* Main Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[60px] flex flex-col bg-background border-r border-border">
        {/* Logo */}
        <div className="flex h-14 items-center justify-center">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-foreground transition-transform hover:scale-105 active:scale-95"
          >
            <LogoFlame className="h-5 w-5" />
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1 px-2 py-3">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isLibrary = item.hasSubmenu;

            if (item.isAction) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#e91e8c] text-white transition-all hover:bg-[#d11a7d] active:scale-95 shadow-[0_0_12px_rgba(233,30,140,0.3)]"
                  title={item.name}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  {/* Tooltip */}
                  <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-[#f5f0e8] dark:bg-[#2a2825] text-[#1a1a18] dark:text-[#e8e4dc] text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                    {item.name}
                  </span>
                </Link>
              );
            }

            if (isLibrary) {
              return (
                <button
                  key={item.name}
                  data-library-trigger
                  onClick={() => setLibraryOpen(!libraryOpen)}
                  className={`
                    group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors
                    ${isActive || libraryOpen
                      ? 'bg-[var(--muted)] text-[var(--foreground)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
                    }
                  `}
                  title={item.name}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  {/* Active indicator */}
                  {(isActive || libraryOpen) && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--accent)]" />
                  )}
                  {/* Tooltip */}
                  {!libraryOpen && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-[#f5f0e8] dark:bg-[#2a2825] text-[#1a1a18] dark:text-[#e8e4dc] text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                      {item.name}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors
                  ${isActive
                    ? 'bg-[var(--muted)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
                  }
                `}
                title={item.name}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--accent)]" />
                )}
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-[#f5f0e8] dark:bg-[#2a2825] text-[#1a1a18] dark:text-[#e8e4dc] text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav className="flex flex-col items-center gap-1 px-2 py-3 border-t border-border">
          {/* Theme Toggle */}
          <div className="group relative flex h-10 w-10 items-center justify-center">
            <ThemeToggle />
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-[#f5f0e8] dark:bg-[#2a2825] text-[#1a1a18] dark:text-[#e8e4dc] text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
              Theme
            </span>
          </div>

          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors
                  ${isActive
                    ? 'bg-[var(--muted)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
                  }
                `}
                title={item.name}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-[#f5f0e8] dark:bg-[#2a2825] text-[#1a1a18] dark:text-[#e8e4dc] text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Library Submenu */}
      <LibrarySubmenu
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />
    </>
  );
}
