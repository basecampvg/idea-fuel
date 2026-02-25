interface SparklineCardProps {
  label: string;
  value: string;
  trend?: string;
  trendColor?: 'green' | 'amber' | 'red';
  /** Array of Y values (0-28 range, lower = higher on chart) */
  sparkPoints?: number[];
}

/**
 * Extracts a concise headline metric from a potentially long AI-generated string.
 * Returns { headline, detail } where headline is the short value and detail is
 * extra context (if any).
 */
function extractMetric(raw: string): { headline: string; detail: string | null } {
  const trimmed = raw.trim();

  // Handle "not specified" / "N/A" style values
  if (/not\s+specified|not\s+available|n\/?a|unknown|no\s+data/i.test(trimmed)) {
    return { headline: '—', detail: null };
  }

  // Try to extract a leading metric: dollar amounts, percentages, or number ranges
  // e.g. "$2,000-$3,000", "8.2% to 9.3%", "$50B", "~15%"
  const metricPattern =
    /^(~?\$?[\d,.]+\s*(?:billion|million|trillion|B|M|T|K|k)?\s*(?:[-–to]+\s*~?\$?[\d,.]+\s*(?:billion|million|trillion|B|M|T|K|k)?)?\s*%?)/i;
  const match = trimmed.match(metricPattern);

  if (match) {
    const headline = match[1].trim();
    const rest = trimmed.slice(match[0].length).replace(/^[\s,;:–-]+/, '').trim();
    return { headline, detail: rest || null };
  }

  // Try to find the first dollar/percent/number metric anywhere in the string
  const inlinePattern =
    /(~?\$[\d,.]+\s*(?:billion|million|trillion|B|M|T|K|k)?(?:\s*[-–to]+\s*\$?[\d,.]+\s*(?:billion|million|trillion|B|M|T|K|k)?)?|[\d,.]+\s*(?:[-–to]+\s*[\d,.]+\s*)?%)/i;
  const inlineMatch = trimmed.match(inlinePattern);

  if (inlineMatch) {
    return { headline: inlineMatch[1].trim(), detail: trimmed };
  }

  // No metric found — truncate the string as headline
  if (trimmed.length > 30) {
    return { headline: trimmed.slice(0, 28) + '…', detail: trimmed };
  }

  return { headline: trimmed, detail: null };
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
    green: 'text-success',
    amber: 'text-amber-500',
    red: 'text-primary',
  }[trendColor];

  const { headline, detail } = extractMetric(value);
  const isPlaceholder = headline === '—';

  return (
    <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden flex flex-col min-h-[130px]">
      <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">
        {label}
      </div>
      <div
        className={`text-[22px] font-bold leading-tight ${isPlaceholder ? 'text-muted-foreground/50' : ''}`}
      >
        {headline}
      </div>
      {detail && (
        <p className="text-[11px] leading-snug text-muted-foreground mt-1 line-clamp-2">
          {detail}
        </p>
      )}
      {!detail && trend && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${trendCls}`}>
          {trend}
        </div>
      )}
      <svg
        className="w-full h-7 mt-auto pt-1"
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
      >
        <polyline points={area} className={`stroke-none ${isPlaceholder ? 'fill-muted/20' : 'fill-primary/[.06]'}`} />
        <polyline
          points={line}
          className={`fill-none ${isPlaceholder ? 'stroke-muted-foreground/30' : 'stroke-primary'}`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
