'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Settings,
  Cpu,
  MessageSquare,
  Search,
  Users,
  ToggleLeft,
  Globe,
  BarChart3,
  LayoutGrid,
  TrendingUp,
  FileText,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
}

const navSections: NavSection[] = [
  {
    title: 'Configuration',
    items: [
      { id: 'ai', label: 'AI Models', icon: Cpu },
      { id: 'interview', label: 'Interview', icon: MessageSquare },
      { id: 'research', label: 'Research', icon: Search },
      { id: 'limits', label: 'Tier Limits', icon: Users },
    ],
  },
  {
    title: 'Features',
    items: [
      { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
      { id: 'domains', label: 'Search Domains', icon: Globe },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { id: 'analytics', label: 'Token Usage', icon: BarChart3 },
    ],
  },
  {
    title: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Pane Settings', icon: LayoutGrid },
      { id: 'dailyPick', label: 'Daily Pick', icon: TrendingUp },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'blog', label: 'Blog Posts', icon: FileText, href: '/admin/blog' },
    ],
  },
];

interface AdminSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  categoryCounts?: Record<string, number>;
}

export function AdminSidebar({ activeTab = 'ai', onTabChange, categoryCounts = {} }: AdminSidebarProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || activeTab;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">Admin</span>
          <span className="text-xs text-muted-foreground">Configuration</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-6' : ''}>
            {/* Section Header */}
            <div className="flex items-center gap-2 px-3 mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? false : currentTab === item.id;
                const count = categoryCounts[item.id];

                if (item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange?.(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                      ${isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={`
                        text-[10px] font-medium px-1.5 py-0.5 rounded-full
                        ${isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  );
}
