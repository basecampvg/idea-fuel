'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar, TOP_BAR_HEIGHT } from '@/components/layout/sidebar-context';
import { type ProjectStatus, projectStatusConfig } from '@/lib/project-status';
import { trpc } from '@/lib/trpc/client';
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  PieChart,
  Clock,
  Search,
  Radio,
  Users,
  AlertTriangle,
  Swords,
  Layers,
  Code,
  Zap,
  MessageSquare,
  FileText,
  Compass,
  BarChart3,
  ArrowLeft,
  Sparkles,
  Settings2,
  GitCompare,
  Camera,
  Download,
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

/** Routes that belong to the Go to Market dashboard */
const GTM_ROUTES = ['/offer', '/tech-stack', '/action-prompts'];

/** Routes that belong to the Financial dashboard */
const FINANCIAL_ROUTES = ['/financials'];

/** Routes that belong to the Reporting dashboard */
const REPORTING_ROUTES = ['/reports/', '/insights'];

function getActiveDashboard(pathname: string | null, projectId: string): 'research' | 'gtm' | 'financial' | 'reporting' {
  if (!pathname) return 'research';
  const relative = pathname.replace(`/projects/${projectId}`, '');
  if (FINANCIAL_ROUTES.some((r) => relative.startsWith(r))) return 'financial';
  if (REPORTING_ROUTES.some((r) => relative.startsWith(r))) return 'reporting';
  if (GTM_ROUTES.some((r) => relative.startsWith(r))) return 'gtm';
  return 'research';
}

function getResearchSections(projectId: string): NavSection[] {
  const base = `/projects/${projectId}`;
  return [
    {
      title: 'Overview',
      items: [
        { label: 'Summary', href: base, icon: LayoutDashboard },
        { label: 'Business Fit', href: `${base}/business-fit`, icon: Target },
      ],
    },
    {
      title: 'Market',
      items: [
        { label: 'Market Analysis', href: `${base}/market-analysis`, icon: TrendingUp },
        { label: 'Market Sizing', href: `${base}/market-sizing`, icon: PieChart },
        { label: 'Why Now', href: `${base}/why-now`, icon: Clock },
        { label: 'Keyword Trends', href: `${base}/keyword-trends`, icon: Search },
      ],
    },
    {
      title: 'Validation',
      items: [
        { label: 'Proof Signals', href: `${base}/proof-signals`, icon: Radio },
        { label: 'Social Proof', href: `${base}/social-proof`, icon: Users },
        { label: 'Pain Points', href: `${base}/pain-points`, icon: AlertTriangle },
        { label: 'Competitors', href: `${base}/competitors`, icon: Swords },
      ],
    },
    {
      title: 'History',
      items: [
        { label: 'Interview Summary', href: `${base}/interview-summary`, icon: MessageSquare },
      ],
    },
  ];
}

function getGtmSections(projectId: string): NavSection[] {
  const base = `/projects/${projectId}`;
  return [
    {
      title: 'Strategy',
      items: [
        { label: 'Offer / Value Ladder', href: `${base}/offer`, icon: Layers },
        { label: 'Tech Stack', href: `${base}/tech-stack`, icon: Code },
        { label: 'Action Prompts', href: `${base}/action-prompts`, icon: Zap },
      ],
    },
    {
      title: 'History',
      items: [
        { label: 'Interview Summary', href: `${base}/interview-summary`, icon: MessageSquare },
      ],
    },
  ];
}

function getFinancialSections(projectId: string, pathname: string | null): NavSection[] {
  const base = `/projects/${projectId}`;

  // Extract modelId only when pathname is under /financials/[modelId]/...
  const financialsPrefix = `${base}/financials`;
  const isUnderFinancials = pathname?.startsWith(financialsPrefix) ?? false;
  const financialsRelative = isUnderFinancials ? pathname!.slice(financialsPrefix.length) : '';
  const modelIdMatch = financialsRelative.match(/^\/([^/]+)/);
  const modelId = modelIdMatch?.[1];

  // Inside a specific model — show model-level nav
  if (modelId && modelId !== 'new') {
    const modelBase = `${base}/financials/${modelId}`;
    return [
      {
        title: 'Model',
        items: [
          { label: 'Dashboard', href: modelBase, icon: LayoutDashboard },
          { label: 'Assumption Cards', href: `${modelBase}/assumptions`, icon: Settings2 },
        ],
      },
      {
        title: 'Analysis',
        items: [
          { label: 'Statements', href: `${modelBase}/statements`, icon: BarChart3 },
          { label: 'Break-Even', href: `${modelBase}/analysis/break-even`, icon: Target },
          { label: 'Scenarios', href: `${modelBase}/scenarios`, icon: GitCompare },
          { label: 'Snapshots', href: `${modelBase}/snapshots`, icon: Camera },
        ],
      },
      {
        title: 'Output',
        items: [
          { label: 'Export', href: `${modelBase}/export`, icon: Download },
        ],
      },
    ];
  }

  // Top-level financials page
  return [
    {
      title: 'Financials',
      items: [
        { label: 'Financial Models', href: `${base}/financials`, icon: BarChart3 },
      ],
    },
  ];
}

function getReportingSections(projectId: string): NavSection[] {
  const base = `/projects/${projectId}`;
  return [
    {
      title: 'Reports',
      items: [
        { label: 'Business Plan', href: `${base}/reports/business-plan`, icon: FileText },
        { label: 'Positioning', href: `${base}/reports/positioning`, icon: Compass },
        { label: 'Competitive Analysis', href: `${base}/reports/competitive-analysis`, icon: BarChart3 },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'AI Insights', href: `${base}/insights`, icon: Sparkles },
      ],
    },
  ];
}

interface ProjectSecondaryNavProps {
  project: {
    id: string;
    title: string;
    status: string;
  };
}

export function ProjectSecondaryNav({ project }: ProjectSecondaryNavProps) {
  const pathname = usePathname();
  const { sidebarWidth } = useSidebar();
  const { data: currentUser } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const isDevRole = currentUser?.role === 'SUPER_ADMIN';
  const activeDashboard = getActiveDashboard(pathname, project.id);

  // Gate financial dashboard behind dev role — fall back to research
  const effectiveDashboard = activeDashboard === 'financial' && !isDevRole ? 'research' : activeDashboard;
  const navSections = effectiveDashboard === 'financial'
    ? getFinancialSections(project.id, pathname)
    : effectiveDashboard === 'reporting'
      ? getReportingSections(project.id)
      : effectiveDashboard === 'gtm'
        ? getGtmSections(project.id)
        : getResearchSections(project.id);
  const status = projectStatusConfig[project.status as ProjectStatus] || projectStatusConfig.CAPTURED;

  function isActive(href: string) {
    // Exact match for base routes (Summary page, Model dashboard)
    if (href === `/projects/${project.id}` || href.match(/\/financials\/[^/]+$/)) {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(href + '/');
  }

  return (
    <aside className="fixed bottom-0 z-40 w-[240px] flex flex-col bg-background border-r border-border transition-[left] duration-200 ease-out motion-reduce:duration-0" style={{ left: sidebarWidth, top: TOP_BAR_HEIGHT }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Vault</span>
        </Link>
        <h2 className="mt-2 text-sm font-semibold text-foreground truncate" title={project.title}>
          {project.title}
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
