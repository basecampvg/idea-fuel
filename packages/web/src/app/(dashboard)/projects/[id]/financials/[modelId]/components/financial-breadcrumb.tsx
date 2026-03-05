'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface FinancialBreadcrumbProps {
  modelId: string;
  modelName: string;
  projectId: string;
}

const ROUTE_LABELS: Record<string, string> = {
  assumptions: 'Assumptions',
  statements: 'Statements',
  scenarios: 'Scenarios',
  snapshots: 'Snapshots',
  export: 'Export',
  analysis: 'Analysis',
  'break-even': 'Break-Even',
};

export function FinancialBreadcrumb({ modelId, modelName, projectId }: FinancialBreadcrumbProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}/financials/${modelId}`;

  // Build breadcrumb segments from pathname
  const relativePath = pathname?.replace(base, '') ?? '';
  const segments = relativePath.split('/').filter(Boolean);

  // Don't show breadcrumb on the model dashboard (root)
  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [
    { label: modelName, href: base },
  ];

  let currentPath = base;
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[segment] ?? segment;
    crumbs.push({ label, href: currentPath });
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
            {isLast ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors truncate max-w-[160px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
