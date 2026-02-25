type SeverityLevel = 'high' | 'medium' | 'low' | 'proceed' | 'watchlist' | 'drop';

interface SeverityBadgeProps {
  level: SeverityLevel;
  label?: string;
  className?: string;
}

const levelStyles: Record<SeverityLevel, { bg: string; text: string; border: string; label: string }> = {
  high:      { bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20',    label: 'High' },
  medium:    { bg: 'bg-amber-500/10',  text: 'text-amber-500',  border: 'border-amber-500/20',  label: 'Medium' },
  low:       { bg: 'bg-blue-500/10',   text: 'text-blue-500',   border: 'border-blue-500/20',   label: 'Low' },
  proceed:   { bg: 'bg-primary/20',    text: 'text-primary',    border: 'border-primary/30',    label: 'Proceed' },
  watchlist:  { bg: 'bg-amber-500/10',  text: 'text-amber-500',  border: 'border-amber-500/20',  label: 'Watchlist' },
  drop:      { bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20',    label: 'Drop' },
};

export function SeverityBadge({ level, label, className = '' }: SeverityBadgeProps) {
  const s = levelStyles[level];
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${s.bg} ${s.text} ${s.border} ${className}`}
    >
      {label ?? s.label}
    </span>
  );
}
