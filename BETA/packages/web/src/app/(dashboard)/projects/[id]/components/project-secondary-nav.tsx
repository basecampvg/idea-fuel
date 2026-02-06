'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/layout/sidebar-context';
import { deriveProjectStatus, projectStatusConfig } from '@/lib/project-status';
import {
  Paintbrush,
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
  Lightbulb,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getIdeaNavSections(projectId: string, ideaId: string): NavSection[] {
  // Idea sub-pages still live at /ideas/[ideaId] for now
  const base = `/ideas/${ideaId}`;
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
      title: 'History',
      items: [
        { label: 'Interview Summary', href: `${base}/interview-summary`, icon: MessageSquare },
      ],
    },
  ];
}

function getReportItems(ideaId: string): NavItem[] {
  const base = `/ideas/${ideaId}/reports`;
  return [
    { label: 'Business Plan', href: `${base}/business-plan`, icon: FileText },
    { label: 'Positioning', href: `${base}/positioning`, icon: Compass },
    { label: 'Competitive Analysis', href: `${base}/competitive-analysis`, icon: BarChart3 },
  ];
}

interface ProjectSecondaryNavProps {
  project: {
    id: string;
    title: string;
    ideas: { id: string; status: string }[];
  };
}

export function ProjectSecondaryNav({ project }: ProjectSecondaryNavProps) {
  const pathname = usePathname();
  const { sidebarWidth } = useSidebar();
  const status = deriveProjectStatus(project);
  const statusConfig = projectStatusConfig[status];
  const idea = project.ideas[0]; // First (only) idea, if any

  function isActive(href: string) {
    if (href === `/projects/${project.id}`) {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(href + '/');
  }

  return (
    <aside
      className="fixed inset-y-0 z-40 w-[240px] flex flex-col bg-background border-r border-border transition-[left] duration-200 ease-out"
      style={{ left: sidebarWidth }}
    >
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
        <div className={`mt-1 text-xs font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Canvas Section */}
        <div className="mt-2">
          <div className="px-3 mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Workspace
            </span>
          </div>
          <div className="space-y-0.5">
            <Link
              href={`/projects/${project.id}`}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                ${isActive(`/projects/${project.id}`)
                  ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-px'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
            >
              <Paintbrush
                className={`w-4 h-4 flex-shrink-0 ${isActive(`/projects/${project.id}`) ? 'text-primary' : ''}`}
                strokeWidth={isActive(`/projects/${project.id}`) ? 2 : 1.5}
              />
              <span className="font-medium">Canvas</span>
            </Link>
          </div>
        </div>

        {/* Idea sections - only visible when an idea exists */}
        {idea && (
          <>
            {/* Separator */}
            <div className="my-4 mx-3 h-px bg-border" />

            <div className="px-3 mb-2">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Idea Pipeline
                </span>
              </div>
            </div>

            {getIdeaNavSections(project.id, idea.id).map((section, idx) => (
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
                {getReportItems(idea.id).map((item) => {
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
          </>
        )}
      </nav>
    </aside>
  );
}
