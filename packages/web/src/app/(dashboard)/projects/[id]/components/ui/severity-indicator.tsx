interface SeverityIndicatorProps {
  level: 'high' | 'medium' | 'low';
}

export function SeverityIndicator({ level }: SeverityIndicatorProps) {
  const color = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  }[level];

  return <div className={`w-1 h-7 rounded-sm shrink-0 ${color}`} />;
}
