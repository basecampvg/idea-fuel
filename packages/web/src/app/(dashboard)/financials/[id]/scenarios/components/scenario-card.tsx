'use client';

import { GitBranch, Star, Trash2 } from 'lucide-react';

interface ScenarioCardProps {
  scenario: {
    id: string;
    name: string;
    isBase: boolean;
    description: string | null;
    updatedAt: Date;
  };
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function ScenarioCard({ scenario, onDelete, isDeleting }: ScenarioCardProps) {
  return (
    <div className={`
      group rounded-xl border p-4 transition-all
      ${scenario.isBase
        ? 'border-primary/20 bg-primary/5'
        : 'border-border bg-card hover:border-border/80'
      }
      ${isDeleting ? 'opacity-50' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{scenario.name}</span>
          {scenario.isBase && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              <Star className="w-2.5 h-2.5" /> BASE
            </span>
          )}
        </div>
        {!scenario.isBase && onDelete && (
          <button
            onClick={() => onDelete(scenario.id)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground/40 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {scenario.description && (
        <p className="mt-2 text-xs text-muted-foreground/60 line-clamp-2">
          {scenario.description}
        </p>
      )}
      <div className="mt-3 text-[10px] text-muted-foreground/40">
        Updated {new Date(scenario.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
