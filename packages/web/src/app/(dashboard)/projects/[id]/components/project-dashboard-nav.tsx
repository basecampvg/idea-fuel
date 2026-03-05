'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FlaskConical,
  DollarSign,
  FileText,
  Rocket,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { useSidebar, TOP_BAR_HEIGHT } from '@/components/layout/sidebar-context';

const DASHBOARD_NAV_HEIGHT = 40;

interface DashboardTab {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  comingSoon?: boolean;
}

/** Routes that belong to the "Research" dashboard */
const RESEARCH_ROUTES = [
  '/market-analysis',
  '/market-sizing',
  '/why-now',
  '/keyword-trends',
  '/proof-signals',
  '/social-proof',
  '/pain-points',
  '/competitors',
  '/business-fit',
  '/interview-summary',
];

/** Routes that belong to the "Reporting" dashboard */
const REPORTING_ROUTES = ['/reports/', '/insights'];

/** Routes that belong to the "Financial" dashboard */
const FINANCIAL_ROUTES = ['/financials'];

/** Routes that belong to the "Go to Market" dashboard */
const GTM_ROUTES = ['/offer', '/tech-stack', '/action-prompts'];

function getTabs(projectId: string): DashboardTab[] {
  const base = `/projects/${projectId}`;
  return [
    {
      key: 'research',
      label: 'Research',
      icon: FlaskConical,
      href: base,
    },
    {
      key: 'financial',
      label: 'Financial',
      icon: DollarSign,
      href: `${base}/financials`,
    },
    {
      key: 'reporting',
      label: 'Reporting',
      icon: FileText,
      href: `${base}/reports/business-plan`,
    },
    {
      key: 'go-to-market',
      label: 'Go to Market',
      icon: Rocket,
      href: `${base}/offer`,
    },
  ];
}

function getActiveTab(pathname: string | null, projectId: string): string {
  if (!pathname) return 'research';
  const base = `/projects/${projectId}`;
  const relative = pathname.replace(base, '');

  if (FINANCIAL_ROUTES.some((r) => relative.startsWith(r))) return 'financial';
  if (REPORTING_ROUTES.some((r) => relative.startsWith(r))) return 'reporting';
  if (GTM_ROUTES.some((r) => relative.startsWith(r))) return 'go-to-market';
  if (RESEARCH_ROUTES.some((r) => relative.startsWith(r))) return 'research';

  // Project root (summary) defaults to research
  return 'research';
}

interface ProjectDashboardNavProps {
  projectId: string;
}

export { DASHBOARD_NAV_HEIGHT };

export function ProjectDashboardNav({ projectId }: ProjectDashboardNavProps) {
  const pathname = usePathname();
  const { sidebarWidth } = useSidebar();
  const tabs = getTabs(projectId);
  const activeTab = getActiveTab(pathname, projectId);

  const SECONDARY_NAV_WIDTH = 240;

  return (
    <div
      className="fixed z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{
        top: TOP_BAR_HEIGHT,
        left: sidebarWidth + SECONDARY_NAV_WIDTH,
        right: 0,
        height: DASHBOARD_NAV_HEIGHT,
      }}
    >
      <div className="flex items-center gap-2 px-6 h-full">
        {/* Label */}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mr-2 select-none">
          Dashboard:
        </span>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          const isDisabled = !!tab.comingSoon;

          const inner = (
            <span
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : isDisabled
                    ? 'text-muted-foreground/30 cursor-default'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <Icon className="w-3 h-3" strokeWidth={isActive ? 2.5 : 1.5} />
              {tab.label}
              {tab.comingSoon && (
                <Lock className="w-2.5 h-2.5 ml-0.5 opacity-50" />
              )}
            </span>
          );

          if (isDisabled) {
            return (
              <div key={tab.key} title="Coming Soon">
                {inner}
              </div>
            );
          }

          return (
            <Link key={tab.key} href={tab.href!}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
