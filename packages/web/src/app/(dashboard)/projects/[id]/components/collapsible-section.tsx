'use client';

import { ReactNode } from 'react';

interface CollapsibleSectionProps {
  icon: ReactNode;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  icon,
  iconBgColor,
  title,
  subtitle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: iconBgColor }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {children}
    </div>
  );
}
