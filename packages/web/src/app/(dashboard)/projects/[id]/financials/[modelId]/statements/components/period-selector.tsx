'use client';

type PeriodView = 'monthly' | 'quarterly' | 'annual';

interface PeriodSelectorProps {
  value: PeriodView;
  onChange: (view: PeriodView) => void;
}

const OPTIONS: { value: PeriodView; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            px-3 py-1 text-xs font-medium rounded-md transition-all
            ${value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
