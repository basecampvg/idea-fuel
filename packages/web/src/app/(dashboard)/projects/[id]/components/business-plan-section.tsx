'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!businessPlan) return null;

  // Show a preview (first ~600 chars up to a paragraph break) when collapsed
  const previewLength = 600;
  const previewEnd = businessPlan.indexOf('\n\n', previewLength);
  const preview = previewEnd > 0 ? businessPlan.slice(0, previewEnd) : businessPlan.slice(0, previewLength);
  const isLong = businessPlan.length > previewLength;

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>Collapse <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Expand <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      <div className={`prose prose-sm dark:prose-invert max-w-none ${!isExpanded && isLong ? 'relative' : ''}`}>
        <ReactMarkdown>{isExpanded || !isLong ? businessPlan : preview + '...'}</ReactMarkdown>
        {!isExpanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {!isExpanded && isLong && (
        <button
          onClick={() => setIsExpanded(true)}
          className="mt-4 w-full py-2 text-sm font-medium text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
        >
          Read Full Business Plan
        </button>
      )}
    </div>
  );
}
