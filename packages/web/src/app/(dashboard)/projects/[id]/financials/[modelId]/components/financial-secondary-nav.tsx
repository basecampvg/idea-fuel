'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar, TOP_BAR_HEIGHT } from '@/components/layout/sidebar-context';
import {
  LayoutDashboard,
  Settings2,
  BarChart3,
  GitCompare,
  Camera,
  Target,
  Download,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getNavSections(projectId: string, modelId: string): NavSection[] {
  const base = `/projects/${projectId}/financials/${modelId}`;
  return [
    {
      title: 'Model',
      items: [
        { label: 'Dashboard', href: base, icon: LayoutDashboard },
        { label: 'Assumptions', href: `${base}/assumptions`, icon: Settings2 },
      ],
    },
    {
      title: 'Analysis',
      items: [
        { label: 'Statements', href: `${base}/statements`, icon: BarChart3 },
        { label: 'Break-Even', href: `${base}/analysis/break-even`, icon: Target },
        { label: 'Scenarios', href: `${base}/scenarios`, icon: GitCompare },
        { label: 'Snapshots', href: `${base}/snapshots`, icon: Camera },
      ],
    },
    {
      title: 'Output',
      items: [
        { label: 'Export', href: `${base}/export`, icon: Download },
      ],
    },
  ];
}

interface FinancialSecondaryNavProps {
  model: {
    id: string;
    name: string;
    status: string;
  };
  projectId: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'text-muted-foreground' },
  ACTIVE: { label: 'Active', color: 'text-primary' },
  ARCHIVED: { label: 'Archived', color: 'text-muted-foreground/50' },
};

export function FinancialSecondaryNav({ model, projectId }: FinancialSecondaryNavProps) {
  const pathname = usePathname();
  const { sidebarWidth } = useSidebar();
  const navSections = getNavSections(projectId, model.id);
  const status = statusLabels[model.status] ?? statusLabels.DRAFT;
  const base = `/projects/${projectId}/financials/${model.id}`;

  function isActive(href: string) {
    if (href === base) {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(href + '/');
  }

  return (
    <aside
      className="fixed bottom-0 z-40 w-[240px] flex flex-col bg-background border-r border-border transition-[left] duration-200 ease-out motion-reduce:duration-0"
      style={{ left: sidebarWidth, top: TOP_BAR_HEIGHT }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <Link
          href={`/projects/${projectId}/financials`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Models</span>
        </Link>
        <h2 className="mt-2 text-sm font-semibold text-foreground truncate" title={model.name}>
          {model.name}
        </h2>
        <div className={`mt-1 text-xs font-medium ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-5' : 'mt-2'}>
            <div className="px-3 mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                      ${active
                        ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-px'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`}
                      strokeWidth={active ? 2 : 1.5}
                    />
                    <span className="font-medium truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
