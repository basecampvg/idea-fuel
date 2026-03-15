'use client';

import { useState } from 'react';
import type { MoatAuditResult, MoatAssetType } from '@forge/shared';
import { Shield, ChevronDown } from 'lucide-react';

const MOAT_LABELS: Record<MoatAssetType, string> = {
  'customer-captivity': 'Customer Captivity',
  'inherited-distribution': 'Inherited Distribution',
  'proprietary-assets': 'Proprietary Assets',
  'cost-advantage': 'Cost Advantage',
  'network-effects': 'Network Effects',
};

function scoreColor(score: number) {
  if (score >= 60) return 'bg-emerald-500';
  if (score >= 30) return 'bg-amber-500';
  return 'bg-zinc-500';
}

function CollapsibleSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 280;

  if (!isLong) {
    return <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>;
  }

  return (
    <div>
      <p className={`text-sm text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
      >
        <span>{expanded ? 'Show less' : 'Read more'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}

export function MoatAuditSection({ data }: { data: MoatAuditResult }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">MOAT Profile</h2>
          <span className="ml-auto text-sm tabular-nums font-semibold text-muted-foreground">
            Overall Strength: {data.overallMoatStrength}/100
          </span>
        </div>
        <CollapsibleSummary text={data.summary} />
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.assets.map((asset) => (
          <div key={asset.type} className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">{MOAT_LABELS[asset.type] || asset.type}</h3>
              <span className="ml-auto text-xs tabular-nums font-semibold text-muted-foreground">
                {asset.score}/100
              </span>
            </div>

            {/* Score bar */}
            <div className="h-2 rounded-full bg-border/30 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${scoreColor(asset.score)}`}
                style={{ width: `${asset.score}%` }}
              />
            </div>

            {/* Transferability */}
            <div className="text-xs text-muted-foreground mb-2 leading-relaxed">
              <span className="font-medium text-foreground">Transferability:</span> {asset.transferability}
            </div>

            {/* Evidence */}
            {asset.evidence.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Evidence</div>
                <ul className="space-y-1">
                  {asset.evidence.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-primary/60 mt-0.5 flex-shrink-0">-</span>
                      <span className="leading-relaxed">{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
