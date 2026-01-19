'use client';

import { TrendingUp, Target, AlertTriangle, Sparkles, BarChart3 } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface MarketAnalysisData {
  size: string;
  growth: string;
  trends: string[];
  opportunities: string[];
  threats: string[];
}

interface MarketAnalysisProps {
  marketAnalysis?: MarketAnalysisData | null;
}

export function MarketAnalysis({ marketAnalysis }: MarketAnalysisProps) {
  if (!marketAnalysis) return null;

  return (
    <CollapsibleSection
      icon={<BarChart3 className="w-5 h-5 text-accent" />}
      iconBgColor="rgba(0, 212, 255, 0.2)"
      title="Market Analysis"
    >
      <div className="space-y-5">
        {/* Size & Growth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Market Size</p>
            <p className="text-sm text-foreground">{marketAnalysis.size}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-[#22c55e]" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Growth</p>
            </div>
            <p className="text-sm text-foreground">{marketAnalysis.growth}</p>
          </div>
        </div>

        {/* Trends */}
        {marketAnalysis.trends.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
              <p className="text-sm font-medium text-foreground">Trends</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {marketAnalysis.trends.map((trend, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 text-xs rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20"
                >
                  {trend}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities & Threats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opportunities */}
          {marketAnalysis.opportunities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-[#22c55e]" />
                <p className="text-sm font-medium text-foreground">Opportunities</p>
              </div>
              <ul className="space-y-2">
                {marketAnalysis.opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-[#22c55e] mt-1">+</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Threats */}
          {marketAnalysis.threats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                <p className="text-sm font-medium text-foreground">Threats</p>
              </div>
              <ul className="space-y-2">
                {marketAnalysis.threats.map((threat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-[#f59e0b] mt-1">!</span>
                    <span>{threat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
