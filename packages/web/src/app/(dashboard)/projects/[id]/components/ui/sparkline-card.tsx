interface SparklineCardProps {
  label: string;
  value: string;
  trend?: string;
  trendColor?: 'green' | 'amber' | 'red';
  /** Array of Y values (0-28 range, lower = higher on chart) */
  sparkPoints?: number[];
}

export function SparklineCard({
  label,
  value,
  trend,
  trendColor = 'green',
  sparkPoints,
}: SparklineCardProps) {
  const pts = sparkPoints ?? [24, 20, 22, 16, 14, 10, 8, 6];
  const line = pts
    .map((y, i) => `${(i / (pts.length - 1)) * 100},${y}`)
    .join(' ');
  const area = `${line} 100,28 0,28`;

  const trendCls = {
    green: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  }[trendColor];

  return (
    <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-1">
        {label}
      </div>
      <div className="text-[22px] font-bold leading-none">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold mt-0.5 font-mono ${trendCls}`}>
          {trend}
        </div>
      )}
      <svg
        className="w-full h-7 mt-2"
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
      >
        <polyline points={area} className="fill-primary/[.06] stroke-none" />
        <polyline
          points={line}
          className="fill-none stroke-primary"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
