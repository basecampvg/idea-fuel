import type { ReactNode } from 'react';

/* ────────────────────────────────────────────────────────
   Shared UI Components for Report Dashboard + Full Report
   Readable font sizes (12-14px body, not 7-9px)
   ──────────────────────────────────────────────────────── */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[2px] text-[#e32b1a] first:mt-0">
      {children}
    </h4>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#161513] p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-[#928e87]">{label}</p>
      <p className="mt-1 font-display text-xl font-black leading-tight text-[#d4d4d4]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#928e87]">{sub}</p>}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'high' | 'medium' | 'low' | 'default' }) {
  const colors = {
    high: 'bg-[#e32b1a] text-white',
    medium: 'bg-[#e32b1a]/40 text-[#e32b1a]',
    low: 'bg-[#2a2a2a] text-[#928e87]',
    default: 'bg-[#2a2220] text-[#e32b1a]/90',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[variant]}`}>
      {children}
    </span>
  );
}

export function ScoreGauge({ label, value, maxValue, size = 'default' }: { label: string; value: number; maxValue: number; size?: 'default' | 'large' }) {
  const radius = size === 'large' ? 42 : 32;
  const circumference = Math.PI * radius;
  const filled = (value / maxValue) * circumference;
  const w = size === 'large' ? 100 : 76;
  const h = size === 'large' ? 58 : 44;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path
          d={`M 4 ${h - 2} A ${radius} ${radius} 0 0 1 ${w - 4} ${h - 2}`}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={`M 4 ${h - 2} A ${radius} ${radius} 0 0 1 ${w - 4} ${h - 2}`}
          fill="none"
          stroke="#e32b1a"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ opacity: 0.5 + (value / maxValue) * 0.5 }}
        />
        <text
          x={w / 2}
          y={h - 6}
          textAnchor="middle"
          className="fill-[#d4d4d4]"
          style={{ fontSize: size === 'large' ? '22px' : '16px', fontWeight: 800 }}
        >
          {value}
        </text>
      </svg>
      <span className="text-xs font-medium uppercase tracking-[1.5px] text-[#928e87]">{label}</span>
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.max(4, (value / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-sm font-bold tracking-[1.5px] text-[#d4d4d4]">{label}</span>
        <span className="font-display text-base font-black text-[#d4d4d4]">${value}M</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#2a2a2a]">
        <div className="h-full rounded-full bg-[#e32b1a]" style={{ width: `${pct}%`, opacity: 0.5 + (pct / 100) * 0.5 }} />
      </div>
    </div>
  );
}

export function ViewFullReportCTA() {
  return (
    <div className="mt-6 border-t border-[#2a2a2a] pt-4">
      <a
        href="/demo-report"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-center gap-2 rounded-lg border border-[#e32b1a]/30 bg-[#1a1210] px-4 py-3 text-sm font-bold text-[#e32b1a] transition-all hover:border-[#e32b1a] hover:bg-[#e32b1a]/10"
      >
        View Full Report
        <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
      </a>
    </div>
  );
}
