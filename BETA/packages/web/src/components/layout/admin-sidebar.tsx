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
  ChevronDown,
  Sparkles,
} from 'lucide-react';

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

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
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
