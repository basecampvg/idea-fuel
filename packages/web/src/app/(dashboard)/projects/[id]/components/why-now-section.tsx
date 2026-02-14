'use client';

import { Zap, Clock, TrendingUp } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface WhyNowData {
  marketTriggers: string[];
  timingFactors: string[];
  urgencyScore: number;
}

interface WhyNowSectionProps {
  whyNow?: WhyNowData | null;
  title?: string;
  subtitle?: string;
}

function UrgencyMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 75) return 'hsl(10, 80%, 55%)';
    if (score >= 50) return 'hsl(10, 60%, 60%)';
    return 'hsl(0, 84%, 60%)';
  };

  const getLabel = () => {
    if (score >= 75) return 'High Urgency';
    if (score >= 50) return 'Moderate Urgency';
    return 'Low Urgency';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: getColor() }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums" style={{ color: getColor() }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">{getLabel()}</span>
      </div>
    </div>
  );
}

export function WhyNowSection({ whyNow, title = 'Why Now?', subtitle }: WhyNowSectionProps) {
  if (!whyNow) return null;

  return (
    <CollapsibleSection
      icon={<Zap className="w-5 h-5 text-primary" />}
      iconBgColor="hsla(10, 80%, 55%, 0.15)"
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-5">
        {/* Urgency Score */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Market Urgency</p>
          <UrgencyMeter score={whyNow.urgencyScore} />
        </div>

        {/* Market Triggers */}
        {whyNow.marketTriggers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Market Triggers</p>
            </div>
            <ul className="space-y-2">
              {whyNow.marketTriggers.map((trigger, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">&#8594;</span>
                  <span>{trigger}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timing Factors */}
        {whyNow.timingFactors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Timing Factors</p>
            </div>
            <ul className="space-y-2">
              {whyNow.timingFactors.map((factor, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">&#9679;</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
