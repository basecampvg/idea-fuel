'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar, TOP_BAR_HEIGHT } from '@/components/layout/sidebar-context';
import { type ProjectStatus, projectStatusConfig } from '@/lib/project-status';
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

function getNavSections(projectId: string): NavSection[] {
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
      title: 'Strategy',
      items: [
        { label: 'Offer / Value Ladder', href: `${base}/offer`, icon: Layers },
        { label: 'Tech Stack', href: `${base}/tech-stack`, icon: Code },
        { label: 'Action Prompts', href: `${base}/action-prompts`, icon: Zap },
      ],
    },
    {
      title: 'Financials',
      items: [
        { label: 'Assumptions', href: `${base}/assumptions`, icon: Settings2 },
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

function getReportItems(projectId: string): NavItem[] {
  const base = `/projects/${projectId}/reports`;
  return [
    { label: 'Business Plan', href: `${base}/business-plan`, icon: FileText },
    { label: 'Positioning', href: `${base}/positioning`, icon: Compass },
    { label: 'Competitive Analysis', href: `${base}/competitive-analysis`, icon: BarChart3 },
    { label: 'AI Insights', href: `/projects/${projectId}/insights`, icon: Sparkles },
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
  const navSections = getNavSections(project.id);
  const reportItems = getReportItems(project.id);
  const status = projectStatusConfig[project.status as ProjectStatus] || projectStatusConfig.CAPTURED;

  function isActive(href: string) {
    // Exact match for the base route (Summary)
    if (href === `/projects/${project.id}`) {
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

        {/* Separator */}
        <div className="my-4 mx-3 h-px bg-border" />

        {/* Reports Section */}
        <div>
          <div className="px-3 mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Reports
            </span>
          </div>
          <div className="space-y-0.5">
            {reportItems.map((item) => {
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
      </nav>
    </aside>
  );
}
