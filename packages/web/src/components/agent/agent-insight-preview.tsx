'use client';

import { Check, X, FileText } from 'lucide-react';

interface AgentInsightPreviewProps {
  title: string;
  content: string;
  reportId?: string;
  onConfirm: () => void;
  onDismiss: () => void;
  isConfirming?: boolean;
}

export function AgentInsightPreview({
  title,
  content,
  onConfirm,
  onDismiss,
  isConfirming,
}: AgentInsightPreviewProps) {
  return (
    <div className="mx-3 my-2 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10">
        <FileText className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Add to Report</span>
      </div>

      {/* Content preview */}
      <div className="px-3 py-2">
        <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-3">{content}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-primary/10">
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium
            hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Check className="w-3 h-3" />
          {isConfirming ? 'Saving...' : 'Confirm'}
        </button>
        <button
          onClick={onDismiss}
          disabled={isConfirming}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium
            hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <X className="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
