'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { IDEA_STATUS_LABELS } from '@forge/shared';

// Status configuration with colors and icons
type IdeaStatus = 'CAPTURED' | 'INTERVIEWING' | 'RESEARCHING' | 'COMPLETE';

const statusConfig: Record<IdeaStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  CAPTURED: {
    label: 'Captured',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  INTERVIEWING: {
    label: 'Interview',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  RESEARCHING: {
    label: 'Researching',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  COMPLETE: {
    label: 'Complete',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
};

// Forge flame logo
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

// Navigation icons with consistent styling
const icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  vault: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  discover: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const navigation = [
  { name: 'New Idea', href: '/dashboard', icon: icons.plus, isAction: true },
  { name: 'Vault', href: '/ideas', icon: icons.vault },
  { name: 'Discover', href: '/discover', icon: icons.discover },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: icons.settings },
  { name: 'Profile', href: '/profile', icon: icons.user },
];

// Pin icon for submenu header
const pinIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

// Vault submenu component
function VaultSubmenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const submenuRef = useRef<HTMLDivElement>(null);

  // DEV MODE: Check if we're in development for graceful fallback
  const isDev = process.env.NODE_ENV === 'development';

  // Fetch recent ideas
  const { data, isLoading } = trpc.idea.list.useQuery(
    { limit: 5 },
    {
      enabled: isOpen,
      retry: isDev ? false : 3,
    }
  );

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        // Check if clicked on the sidebar trigger button
        const target = event.target as HTMLElement;
        if (!target.closest('[data-vault-trigger]')) {
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
        fixed top-0 left-[72px] h-full w-[280px] z-40
        bg-[var(--background-elevated)]/95 backdrop-blur-xl
        border-r border-[var(--border)]
        transition-all duration-300 ease-out
        ${isOpen
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-4 pointer-events-none'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-20 px-4 border-b border-[var(--border)]">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Vault</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] transition-colors"
          title="Close"
        >
          {pinIcon}
        </button>
      </div>

      {/* New Idea Action */}
      <div className="px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors group"
          onClick={onClose}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">New Idea</span>
        </Link>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border)] mx-3" />

      {/* Recent Section */}
      <div className="px-3 py-3">
        <h3 className="px-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
          Recent
        </h3>

        {isLoading ? (
          <div className="px-3 py-4 text-sm text-[var(--muted-foreground)]">
            Loading...
          </div>
        ) : ideas.length === 0 ? (
          <div className="px-3 py-4 text-sm text-[var(--muted-foreground)]">
            No ideas yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {ideas.map((idea) => {
              const status = statusConfig[idea.status as IdeaStatus] || statusConfig.CAPTURED;
              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="block px-3 py-2.5 rounded-xl hover:bg-[var(--card-bg)] transition-colors group"
                  onClick={onClose}
                >
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-[var(--foreground)] truncate flex-1 group-hover:text-[var(--accent)] transition-colors">
                      {idea.title}
                    </span>
                  </div>

                  {/* Status and meta row */}
                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bgColor}`}>
                      <span className={status.color}>{status.icon}</span>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>

                    {/* Counts */}
                    {idea._count && (idea._count.interviews > 0 || idea._count.reports > 0) && (
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        {idea._count.interviews > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {idea._count.interviews}
                          </span>
                        )}
                        {idea._count.reports > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            {idea._count.reports}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* View All */}
      <div className="px-3 py-2 border-t border-[var(--border)]">
        <Link
          href="/ideas"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] transition-colors"
          onClick={onClose}
        >
          <span className="text-sm">View all ideas</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [vaultSubmenuOpen, setVaultSubmenuOpen] = useState(false);

  return (
    <>
    <aside className="fixed inset-y-0 left-0 z-50 w-[72px] flex flex-col bg-[var(--background-elevated)]/80 backdrop-blur-xl border-r border-[var(--border)]">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center">
        <Link
          href="/dashboard"
          className="group relative flex h-11 w-11 items-center justify-center"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-40" />

          {/* Logo container */}
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] shadow-lg shadow-[var(--accent)]/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[var(--accent)]/30">
            <LogoFlame className="h-6 w-6" />
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const isVault = item.name === 'Vault';

          if (item.isAction) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent)]/20 transition-all duration-300 hover:scale-105 hover:shadow-[var(--accent)]/40 active:scale-95 animate-fade-in-up"
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
                title={item.name}
              >
                {/* Subtle inner highlight */}
                <div className="absolute inset-[1px] rounded-[10px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                <span className="relative">{item.icon}</span>

                {/* Tooltip */}
                <span className="absolute left-full ml-3 hidden rounded-lg bg-[var(--background-elevated)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-xl group-hover:block whitespace-nowrap z-50">
                  {item.name}
                </span>
              </Link>
            );
          }

          // Vault item - button to toggle submenu
          if (isVault) {
            return (
              <button
                key={item.name}
                data-vault-trigger
                onClick={() => setVaultSubmenuOpen(!vaultSubmenuOpen)}
                className={`
                  group relative flex h-11 w-11 items-center justify-center rounded-xl
                  transition-all duration-300 animate-fade-in-up
                  ${
                    isActive || vaultSubmenuOpen
                      ? 'bg-[var(--card-bg)] text-[var(--accent)] shadow-inner'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--card-bg)] hover:text-[var(--foreground)]'
                  }
                `}
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
                title={item.name}
              >
                {/* Active indicator */}
                {(isActive || vaultSubmenuOpen) && (
                  <div className="absolute -left-3 h-6 w-1 rounded-r-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-secondary)]" />
                )}

                <span className="transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>

                {/* Tooltip - only show when submenu is closed */}
                {!vaultSubmenuOpen && (
                  <span className="absolute left-full ml-3 hidden rounded-lg bg-[var(--background-elevated)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-xl group-hover:block whitespace-nowrap z-50">
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
                group relative flex h-11 w-11 items-center justify-center rounded-xl
                transition-all duration-300 animate-fade-in-up
                ${
                  isActive
                    ? 'bg-[var(--card-bg)] text-[var(--accent)] shadow-inner'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--card-bg)] hover:text-[var(--foreground)]'
                }
              `}
              style={{ animationDelay: `${(index + 1) * 50}ms` }}
              title={item.name}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -left-3 h-6 w-1 rounded-r-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-secondary)]" />
              )}

              <span className="transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </span>

              {/* Tooltip */}
              <span className="absolute left-full ml-3 hidden rounded-lg bg-[var(--background-elevated)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-xl group-hover:block whitespace-nowrap z-50">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <nav className="flex flex-col items-center gap-1 px-3 py-4 border-t border-[var(--border)]">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex h-11 w-11 items-center justify-center rounded-xl
                transition-all duration-300
                ${
                  isActive
                    ? 'bg-[var(--card-bg)] text-[var(--accent)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--card-bg)] hover:text-[var(--foreground)]'
                }
              `}
              title={item.name}
            >
              <span className="transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </span>

              {/* Tooltip */}
              <span className="absolute left-full ml-3 hidden rounded-lg bg-[var(--background-elevated)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-xl group-hover:block whitespace-nowrap z-50">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>

    {/* Vault Submenu */}
    <VaultSubmenu
      isOpen={vaultSubmenuOpen}
      onClose={() => setVaultSubmenuOpen(false)}
    />
    </>
  );
}
