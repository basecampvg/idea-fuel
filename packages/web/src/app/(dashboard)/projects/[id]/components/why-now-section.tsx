'use client';

import { Clock, TrendingUp, Timer, ArrowRight, Zap } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface WhyNowData {
  marketTriggers: string[];
  timingFactors: string[];
  urgencyScore: number;
  windowOfOpportunity?: {
    opens: string;
    closesBy: string;
    reasoning: string;
  };
  catalysts?: Array<{
    event: string;
    impact: 'high' | 'medium' | 'low';
    timeframe: string;
    howToLeverage: string;
  }>;
  urgencyNarrative?: string;
}

interface WhyNowSectionProps {
  whyNow?: WhyNowData | null;
  title?: string;
  subtitle?: string;
}

const impactColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function UrgencyMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 75) return 'hsl(var(--primary))';
    if (score >= 50) return 'hsl(var(--primary) / 0.7)';
    return 'hsl(var(--destructive))';
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
      title={title}
    >
      <div className="space-y-5">
        {/* Urgency Score */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-2">Market Urgency</p>
          <UrgencyMeter score={whyNow.urgencyScore} />
        </div>

        {/* Urgency Narrative */}
        {whyNow.urgencyNarrative && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm text-foreground/80 italic">{whyNow.urgencyNarrative}</p>
          </div>
        )}

        {/* Window of Opportunity */}
        {whyNow.windowOfOpportunity && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium uppercase text-primary">Window of Opportunity</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground">Opens</p>
                  <p className="text-sm font-medium text-primary">{whyNow.windowOfOpportunity.opens}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground">Closes By</p>
                  <p className="text-sm font-medium text-primary">{whyNow.windowOfOpportunity.closesBy}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{whyNow.windowOfOpportunity.reasoning}</p>
            </div>
          </div>
        )}

        {/* Catalysts */}
        {whyNow.catalysts && whyNow.catalysts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium uppercase text-primary">Catalysts</p>
            </div>
            <div className="space-y-2">
              {whyNow.catalysts.map((catalyst, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{catalyst.event}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${impactColors[catalyst.impact] || ''}`}>
                        {catalyst.impact}
                      </span>
                      <span className="text-xs text-muted-foreground">{catalyst.timeframe}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{catalyst.howToLeverage}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Triggers */}
        {whyNow.marketTriggers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium uppercase text-primary">Market Triggers</p>
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
              <p className="text-sm font-medium uppercase text-primary">Timing Factors</p>
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
