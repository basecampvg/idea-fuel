'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { getDisplayStatus, projectStatusConfig } from '@/lib/project-status';
import { ChevronDown, Search, Plus, Check, Rocket, TrendingUp } from 'lucide-react';

const STATUS_DOT_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted-foreground',
  ACTIVE: 'bg-primary',
  COMPLETE: 'bg-primary',
};

const MODE_TAG_CONFIG: Record<string, { label: string; icon: typeof Rocket; className: string }> = {
  LAUNCH: {
    label: 'Launch',
    icon: Rocket,
    className: 'bg-primary/15 text-primary border-primary/20',
  },
  EXPAND: {
    label: 'Expand',
    icon: TrendingUp,
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
};

export function ProjectSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect current project from URL
  const projectMatch = pathname?.match(/^\/projects\/([^/]+)/);
  const currentProjectId = projectMatch?.[1] ?? null;

  const { data } = trpc.project.list.useQuery(
    { limit: 50 },
    { staleTime: 30_000 }
  );

  const { data: currentProject } = trpc.project.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId, staleTime: 30_000 }
  );

  const createMutation = trpc.project.create.useMutation({
    onSuccess: (project) => {
      setOpen(false);
      router.push(`/projects/${project.id}`);
    },
  });

  const projects = data?.items ?? [];
  const filtered = search
    ? projects.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Auto-focus search when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const displayName = currentProject?.title ?? 'Select a project';
  const currentStatus = currentProject
    ? getDisplayStatus(currentProject.status)
    : null;
  const currentModeConfig = currentProject ? MODE_TAG_CONFIG[currentProject.mode] : null;
  const CurrentModeIcon = currentModeConfig?.icon;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors
          hover:bg-muted/50
          ${open ? 'bg-muted/50' : ''}
          ${currentProjectId ? 'text-foreground' : 'text-muted-foreground'}
        `}
      >
        {currentStatus && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[currentStatus] ?? 'bg-muted-foreground'}`}
          />
        )}
        <span className="max-w-[200px] truncate font-medium">{displayName}</span>
        {currentModeConfig && CurrentModeIcon && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${currentModeConfig.className}`}>
            <CurrentModeIcon className="w-2.5 h-2.5" />
            {currentModeConfig.label}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[300px] rounded-xl border border-border bg-card shadow-xl z-[60] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Find project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-foreground"
              />
            </div>
          </div>

          {/* Project list */}
          <div className="max-h-[280px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                {search ? 'No projects match your search' : 'No projects yet'}
              </p>
            ) : (
              filtered.map((project) => {
                const status = getDisplayStatus(project.status);
                const isSelected = project.id === currentProjectId;
                const modeConfig = MODE_TAG_CONFIG[project.mode];
                const ModeIcon = modeConfig?.icon;
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setOpen(false);
                      setSearch('');
                      router.push(`/projects/${project.id}`);
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors
                      ${isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'text-foreground hover:bg-muted/50'
                      }
                    `}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[status] ?? 'bg-muted-foreground'}`}
                    />
                    <span className="flex-1 truncate">{project.title}</span>
                    {modeConfig && ModeIcon && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${modeConfig.className}`}>
                        <ModeIcon className="w-2.5 h-2.5" />
                        {modeConfig.label}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* New project action */}
          <div className="border-t border-border p-2">
            <button
              onClick={() => {
                createMutation.mutate({ title: 'Untitled Project', description: '' });
              }}
              disabled={createMutation.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>New project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
