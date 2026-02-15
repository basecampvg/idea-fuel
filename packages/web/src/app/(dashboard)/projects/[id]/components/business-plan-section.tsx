'use client';

import ReactMarkdown from 'react-markdown';
import { FileText } from 'lucide-react';

interface BusinessPlanSectionProps {
  businessPlan?: string | null;
  title?: string;
  subtitle?: string;
}

export function BusinessPlanSection({
  businessPlan,
  title = 'Business Plan',
  subtitle = 'Comprehensive investor-ready analysis',
}: BusinessPlanSectionProps) {
  if (!businessPlan) return null;

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{businessPlan}</ReactMarkdown>
      </div>
    </div>
  );
}
