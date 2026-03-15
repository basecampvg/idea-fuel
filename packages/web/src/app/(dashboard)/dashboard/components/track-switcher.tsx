'use client';

import type { ExpandTrackId, ExpandTrackProgress } from '@forge/shared';

interface TrackSwitcherProps {
  trackProgress: ExpandTrackProgress;
  onSwitchTrack: (track: ExpandTrackId) => void;
  disabled?: boolean;
}

const TRACK_INFO: Record<ExpandTrackId, { name: string; shortName: string }> = {
  A: { name: 'Product Line', shortName: 'Product' },
  B: { name: 'Customers', shortName: 'Customer' },
  C: { name: 'Strategy', shortName: 'Strategy' },
};

export function TrackSwitcher({ trackProgress, onSwitchTrack, disabled }: TrackSwitcherProps) {
  const tracks: ExpandTrackId[] = ['A', 'B', 'C'];

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
      {tracks.map(track => {
        const progress = trackProgress[track];
        const isCurrent = trackProgress.currentTrack === track;
        const isComplete = progress.completed >= progress.total;
        const pct = Math.round((progress.completed / progress.total) * 100);

        return (
          <button
            key={track}
            onClick={() => onSwitchTrack(track)}
            disabled={disabled}
            className={`
              relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${isCurrent
                ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                : isComplete
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="hidden sm:inline">{TRACK_INFO[track].name}</span>
            <span className="sm:hidden">{track}</span>

            {/* Progress indicator */}
            <span className={`
              text-[10px] tabular-nums
              ${isComplete ? 'text-accent' : isCurrent ? 'text-primary/70' : 'text-muted-foreground/60'}
            `}>
              {progress.completed}/{progress.total}
            </span>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-border/30 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-accent' : isCurrent ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
