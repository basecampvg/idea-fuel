'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ReportCitation } from '@forge/shared';

interface EvidenceSummaryFooterProps {
  citations: ReportCitation[];
}

function getReliabilityVariant(reliability: 'primary' | 'secondary' | 'estimate') {
  switch (reliability) {
    case 'primary': return 'success' as const;
    case 'secondary': return 'info' as const;
    case 'estimate': return 'warning' as const;
  }
}

export function EvidenceSummaryFooter({ citations }: EvidenceSummaryFooterProps) {
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0) return null;

  // Deduplicate sources by title+url
  const uniqueSources = Array.from(
    new Map(
      citations.map((c) => [c.source.title + (c.source.url || ''), c])
    ).values()
  );

  const breakdown = {
    primary: citations.filter((c) => c.source.reliability === 'primary').length,
    secondary: citations.filter((c) => c.source.reliability === 'secondary').length,
    estimate: citations.filter((c) => c.source.reliability === 'estimate').length,
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="font-medium">
          {citations.length} citation{citations.length !== 1 ? 's' : ''} from {uniqueSources.length} source{uniqueSources.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1 ml-1">
          {breakdown.primary > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {breakdown.primary} primary
            </span>
          )}
          {breakdown.secondary > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">
              {breakdown.secondary} secondary
            </span>
          )}
          {breakdown.estimate > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              {breakdown.estimate} estimate
            </span>
          )}
        </div>
        <span className="ml-auto">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <ul className="mt-2 space-y-1.5 pl-5">
          {uniqueSources.map((citation, i) => (
            <li key={i} className="flex items-center gap-2">
              <Badge variant={getReliabilityVariant(citation.source.reliability)} className="text-[10px] px-1.5 py-0">
                {citation.source.reliability}
              </Badge>
              {citation.source.url ? (
                <a
                  href={citation.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline flex items-center gap-1 truncate"
                >
                  {citation.source.title}
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground truncate">{citation.source.title}</span>
              )}
              {citation.source.date && (
                <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                  ({citation.source.date})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
