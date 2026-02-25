interface ThreatBarProps {
  score: number; // 1-10
  label?: string;
}

export function ThreatBar({ score, label = 'Threat Level' }: ThreatBarProps) {
  const pct = score * 10;
  const color =
    score >= 8
      ? 'bg-red-500'
      : score >= 5
        ? 'bg-amber-500'
        : 'bg-blue-500';
  const textColor =
    score >= 8
      ? 'text-red-500'
      : score >= 5
        ? 'text-amber-500'
        : 'text-blue-500';

  return (
    <div className="w-[120px] shrink-0">
      <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-0.5">
        {label}
      </div>
      <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-600 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={`text-[11px] font-semibold mt-0.5 text-right ${textColor}`}
      >
        {score}/10
      </div>
    </div>
  );
}
