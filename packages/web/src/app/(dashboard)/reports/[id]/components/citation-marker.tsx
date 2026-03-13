'use client';

import { ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import type { ReportCitation } from '@forge/shared';

interface CitationMarkerProps {
  citation: ReportCitation;
  index: number;
}

function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'bg-primary';
    case 'medium': return 'bg-primary/50';
    case 'low': return 'bg-red-500';
  }
}

function getReliabilityVariant(reliability: 'primary' | 'secondary' | 'estimate') {
  switch (reliability) {
    case 'primary': return 'success' as const;
    case 'secondary': return 'info' as const;
    case 'estimate': return 'warning' as const;
  }
}

export function CitationMarker({ citation, index }: CitationMarkerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.1rem] px-1 ml-0.5 text-[10px] font-semibold leading-none rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer align-super"
          aria-label={`Citation ${index + 1}: ${citation.source.title}`}
        >
          {index + 1}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="start">
        <div className="p-3 space-y-2.5">
          {/* Source title */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {citation.source.url ? (
                <a
                  href={citation.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-accent hover:underline flex items-center gap-1"
                >
                  <span className="truncate">{citation.source.title}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : (
                <span className="text-sm font-medium text-foreground">{citation.source.title}</span>
              )}
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={getReliabilityVariant(citation.source.reliability)}>
              {citation.source.reliability}
            </Badge>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(citation.confidence)}`} />
              <span className="text-[10px] text-muted-foreground capitalize">{citation.confidence} confidence</span>
            </div>
          </div>

          {/* Date */}
          {citation.source.date && (
            <p className="text-[11px] text-muted-foreground">
              Published: {citation.source.date}
            </p>
          )}

          {/* Claim text */}
          <div className="pt-1.5 border-t border-border">
            <p className="text-[11px] text-muted-foreground">Supports claim:</p>
            <p className="text-xs text-foreground/80 mt-0.5 italic">&ldquo;{citation.claim}&rdquo;</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
