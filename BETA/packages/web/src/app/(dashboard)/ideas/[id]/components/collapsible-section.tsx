'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

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
  defaultCollapsed = true,
  children,
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
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
        <button
          className="p-1.5 rounded-lg hover:bg-card transition-colors"
          aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
        >
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-180'
            }`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100 mt-5'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
