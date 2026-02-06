'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSidebar, TOP_BAR_HEIGHT, type SidebarMode } from './sidebar-context';
import { ProjectMiniCard, ProjectMiniCardSkeleton, type ProjectMiniCardProps } from './project-mini-card';
import {
  Plus,
  Archive,
  Settings,
  ChevronRight,
  Shield,
  PanelLeft,
  Columns2,
  PanelLeftOpen,
  MousePointer,
} from 'lucide-react';

// Navigation items
const mainNav = [
  { name: 'New', href: '/dashboard', icon: Plus, isAction: true },
  { name: 'Vault', href: '/projects', icon: Archive },
];

const bottomNav = [
  { name: 'Admin', href: '/admin', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Mode selector popover (portaled to body to escape sidebar overflow-hidden)
function ModeSelector() {
  const { mode, setMode, isExpanded, sidebarWidth } = useSidebar();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});

  // Close popover on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close popover if sidebar width changes (e.g. hover mode transition)
  useEffect(() => {
    setOpen(false);
  }, [sidebarWidth]);

  const options: { value: SidebarMode; label: string; icon: React.ElementType }[] = [
    { value: 'collapsed', label: 'Collapsed', icon: Columns2 },
    { value: 'expanded', label: 'Expanded', icon: PanelLeftOpen },
    { value: 'hover', label: 'Auto (hover)', icon: MousePointer },
  ];

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.bottom,
        left: rect.right + 8,
      });
    }
    setOpen(!open);
  };

  return (
    <div className={isExpanded ? 'w-full' : ''}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`
          group relative flex items-center rounded-lg transition-colors
          ${isExpanded ? 'h-10 gap-2.5 px-3 w-full' : 'h-10 w-10 justify-center'}
          ${open
            ? 'bg-[var(--muted)] text-[var(--foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
          }
        `}
        title="Sidebar mode"
      >
        <PanelLeft className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
        {isExpanded && <span className="text-sm font-medium">Layout</span>}
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="w-44 rounded-lg border border-border bg-card shadow-lg p-1 z-[100]"
          style={popoverStyle}
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setMode(opt.value);
                  setOpen(false);
                }}
                className={`
                  flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// Inline projects section for expanded sidebar
function SidebarProjects() {
  const isDev = process.env.NODE_ENV === 'development';
  const { data, isLoading } = trpc.project.list.useQuery(
    { limit: 5 },
    { staleTime: 30_000, retry: isDev ? false : 3 }
  );

  const projects = data?.items ?? [];

  return (
    <div className="px-2 mt-1">
      <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        Recent
      </div>

      {isLoading ? (
        <div className="space-y-1.5 mt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectMiniCardSkeleton key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="px-2 py-4 text-sm text-muted-foreground text-center">
          No projects yet
        </p>
      ) : (
        <div className="space-y-1.5 mt-1">
          {projects.map((project) => (
            <ProjectMiniCard key={project.id} project={project as ProjectMiniCardProps['project']} />
          ))}
        </div>
      )}

      <Link
        href="/projects"
        className="flex items-center justify-between px-2 py-2 mt-1 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span>View all</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isExpanded, sidebarWidth, onMouseEnter, onMouseLeave } = useSidebar();

  return (
    <aside
      className="fixed left-0 bottom-0 z-50 flex flex-col bg-background border-r border-border overflow-hidden transition-[width] duration-200 ease-out"
      style={{ width: sidebarWidth, top: TOP_BAR_HEIGHT }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main Navigation */}
      <nav className="flex flex-col gap-1 px-2 py-3">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          if (item.isAction) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex items-center rounded-lg bg-primary text-white transition-all hover:bg-primary/80 active:scale-95 shadow-[0_0_12px_hsl(var(--primary)/0.3)]
                  ${isExpanded ? 'h-10 gap-2.5 px-3' : 'h-10 w-10 justify-center'}
                `}
                title={item.name}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                {isExpanded && <span className="text-sm font-medium">New Project</span>}
                {!isExpanded && (
                  <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-card text-foreground text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center rounded-lg transition-colors
                ${isExpanded ? 'h-10 gap-2.5 px-3' : 'h-10 w-10 justify-center'}
                ${isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
                }
              `}
              title={item.name}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {isExpanded && <span className="text-sm font-medium">{item.name}</span>}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--accent)]" />
              )}
              {!isExpanded && (
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-card text-foreground text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider + Inline Projects — always mounted, hidden when collapsed to preserve query cache */}
      <div className={isExpanded ? '' : 'hidden'}>
        <div className="h-px bg-border mx-3" />
        <div className="flex-1 overflow-y-auto">
          <SidebarProjects />
        </div>
      </div>

      {/* Spacer when collapsed */}
      {!isExpanded && <div className="flex-1" />}

      {/* Bottom Navigation */}
      <nav className={`flex flex-col gap-1 px-2 py-3 border-t border-border ${isExpanded ? '' : 'items-center'}`}>
        {/* Theme Toggle */}
        <div className={`group relative flex items-center ${isExpanded ? 'w-full px-1' : 'h-10 w-10 justify-center'}`}>
          <ThemeToggle />
          {!isExpanded && (
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-card text-foreground text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
              Theme
            </span>
          )}
        </div>

        {/* Mode Selector */}
        <ModeSelector />

        {bottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center rounded-lg transition-colors
                ${isExpanded ? 'h-10 gap-2.5 px-3 w-full' : 'h-10 w-10 justify-center'}
                ${isActive
                  ? 'bg-[var(--muted)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
                }
              `}
              title={item.name}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {isExpanded && <span className="text-sm font-medium">{item.name}</span>}
              {!isExpanded && (
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-card text-foreground text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
