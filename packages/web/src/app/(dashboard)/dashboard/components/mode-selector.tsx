'use client';

import { Rocket, TrendingUp } from 'lucide-react';
import type { ProjectMode } from '@forge/shared';

interface ModeSelectorProps {
  selected: ProjectMode | null;
  onSelect: (mode: ProjectMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ selected, onSelect, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
      <button
        onClick={() => onSelect('LAUNCH')}
        disabled={disabled}
        className={`
          group relative flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-300
          ${selected === 'LAUNCH'
            ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/30'
            : 'border-border/60 bg-card/50 hover:border-primary/30 hover:bg-card/80'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className={`
          p-3 rounded-xl transition-colors duration-300
          ${selected === 'LAUNCH' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary'}
        `}>
          <Rocket className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className={`font-semibold text-sm ${selected === 'LAUNCH' ? 'text-primary' : 'text-foreground'}`}>
            Launch something new
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Validate a new business idea from scratch
          </p>
        </div>
      </button>

      <button
        onClick={() => onSelect('EXPAND')}
        disabled={disabled}
        className={`
          group relative flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-300
          ${selected === 'EXPAND'
            ? 'border-accent/50 bg-accent/5 shadow-lg shadow-accent/10 ring-1 ring-accent/30'
            : 'border-border/60 bg-card/50 hover:border-accent/30 hover:bg-card/80'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className={`
          p-3 rounded-xl transition-colors duration-300
          ${selected === 'EXPAND' ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground group-hover:text-accent'}
        `}>
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className={`font-semibold text-sm ${selected === 'EXPAND' ? 'text-accent' : 'text-foreground'}`}>
            Grow what I have
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Expand an existing business with new offerings
          </p>
        </div>
      </button>
    </div>
  );
}
