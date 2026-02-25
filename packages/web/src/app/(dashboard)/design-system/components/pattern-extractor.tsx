'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Check, Loader2, FileCode, ExternalLink } from 'lucide-react';

// ---------------------------------------------------------------------------
// Pattern Extractor Button — shown on each pattern in the Patterns tab
// ---------------------------------------------------------------------------

interface PatternExtractorProps {
  patternId: string;
  suggestedName: string;
  fileName: string;
}

export function PatternExtractor({ patternId, suggestedName, fileName }: PatternExtractorProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'extracted' | 'exists' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Check if already extracted on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/dev/extract-component?check=${patternId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setStatus('exists');
          }
        }
      } catch {
        // Silently fail — will show as idle
      }
    };
    checkStatus();
  }, [patternId]);

  const handleExtract = useCallback(async (overwrite = false) => {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/dev/extract-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId, overwrite }),
      });

      if (res.status === 409 && !overwrite) {
        setStatus('exists');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Extract failed' }));
        throw new Error(data.error);
      }

      setStatus('extracted');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }, [patternId]);

  if (status === 'extracted') {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
          <Check className="w-3.5 h-3.5" />
          Extracted
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          components/ui/{fileName}
        </span>
      </div>
    );
  }

  if (status === 'exists') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <FileCode className="w-3.5 h-3.5" />
          Already exists
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          components/ui/{fileName}
        </span>
        <button
          type="button"
          onClick={() => handleExtract(true)}
          className="px-2 py-1 text-[10px] font-medium rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Overwrite
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleExtract(false)}
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        Extract {suggestedName}
      </button>
      <span className="text-[10px] text-muted-foreground">
        → components/ui/{fileName}
      </span>
      {error && (
        <span className="text-[10px] text-red-500">{error}</span>
      )}
    </div>
  );
}
