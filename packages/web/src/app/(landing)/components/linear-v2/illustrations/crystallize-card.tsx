'use client';

/**
 * Mock of the actual web Score Cards — 4 arc gauges (Opportunity, Problem,
 * Feasibility, Why Now) with confidence bars, plus a Business Fit summary
 * with revenue/execution/GTM/founder-fit indicators.
 */

const scores = [
  {
    label: 'Opportunity',
    value: 87,
    rating: 'Very Strong',
    color: 'hsl(7, 80%, 57%)',
    confidence: 'High',
  },
  {
    label: 'Problem',
    value: 82,
    rating: 'High Pain',
    color: 'hsl(326, 75%, 50%)',
    confidence: 'High',
  },
  {
    label: 'Feasibility',
    value: 74,
    rating: 'Strong',
    color: 'hsl(7, 75%, 50%)',
    confidence: 'Medium',
  },
  {
    label: 'Why Now',
    value: 79,
    rating: 'Strong',
    color: 'hsl(260, 60%, 60%)',
    confidence: 'High',
  },
];

export function CrystallizeCardIllustration() {
  return (
    <div className="relative z-10 flex h-[560px] flex-col px-5 py-5">
      {/* Project header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(227,43,26,0.2), rgba(219,77,64,0.1))',
            border: '1px solid rgba(227,43,26,0.2)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 1.7 0.9 3.2 2.3 4v2.5h4.4V10c1.4-0.8 2.3-2.3 2.3-4 0-2.5-2-4.5-4.5-4.5z" stroke="#E32B1A" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M6 14h4M6.5 15.5h3" stroke="#E32B1A" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-white">
            AI Meal Planner for Busy Parents
          </div>
          <div className="text-[11px]" style={{ color: '#6B6B69' }}>
            Validated · Apr 14, 2026
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em]"
          style={{ background: 'rgba(39,166,68,0.15)', color: '#27a644' }}
        >
          Proceed
        </span>
      </div>

      {/* 4 score arc gauges */}
      <div className="grid grid-cols-2 gap-2.5">
        {scores.map((s) => (
          <ArcGaugeCard key={s.label} {...s} />
        ))}
      </div>

      {/* Business Fit section */}
      <div className="mt-4 flex-1 overflow-hidden">
        <div
          className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: '#6B6B69' }}
        >
          Business Fit
        </div>

        <FitRow label="Revenue Potential" value="High" estimate="$2.4B TAM by 2027" pct={85} color="#27a644" />
        <FitRow label="Execution Difficulty" value="Moderate" estimate="6–9 months to MVP" pct={62} color="#fc7840" />
        <FitRow label="GTM Clarity" value="Clear" estimate="Parenting communities, app store" pct={78} color="#0393F8" />
        <FitRow label="Founder Fit" value="76%" estimate="Strong: domain, distribution" pct={76} color="#E32B1A" />
      </div>
    </div>
  );
}

function ArcGaugeCard({
  label,
  value,
  rating,
  color,
  confidence,
}: {
  label: string;
  value: number;
  rating: string;
  color: string;
  confidence: string;
}) {
  // Arc geometry — 180° semi-circle
  const radius = 32;
  const circumference = Math.PI * radius;
  const fillLength = (value / 100) * circumference;

  const confColor =
    confidence === 'High' ? '#E32B1A' : confidence === 'Medium' ? '#F59E0B' : '#F87171';

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: '#6B6B69' }}
          >
            {label}
          </div>
          <div className="font-mono text-[24px] font-bold tracking-[-0.02em] text-white">
            {value}
          </div>
          <div className="text-[10px]" style={{ color }}>
            {rating}
          </div>
        </div>
        <svg width="76" height="42" viewBox="0 0 76 42">
          <path
            d="M 6 38 A 32 32 0 0 1 70 38"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 6 38 A 32 32 0 0 1 70 38"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${circumference}`}
          />
        </svg>
      </div>

      <div
        className="mt-2 flex items-center gap-1.5 text-[9px]"
        style={{ color: '#555555' }}
      >
        <div className="h-1 w-1 rounded-full" style={{ background: confColor }} />
        {confidence} confidence
      </div>
    </div>
  );
}

function FitRow({
  label,
  value,
  estimate,
  pct,
  color,
}: {
  label: string;
  value: string;
  estimate: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span style={{ color: '#A8A8A6' }}>{label}</span>
        <span className="font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
      <div
        className="mb-1 h-[3px] overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-[10px]" style={{ color: '#555555' }}>
        {estimate}
      </div>
    </div>
  );
}
