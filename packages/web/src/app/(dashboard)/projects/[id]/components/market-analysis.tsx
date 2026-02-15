'use client';

import { TrendingUp, Target, AlertTriangle, Sparkles, BarChart3, Shield, DollarSign, ArrowRight } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

export interface MarketAnalysisData {
  size: string;
  growth: string;
  trends: string[];
  opportunities: string[];
  threats: string[];
  marketDynamics?: {
    stage: 'emerging' | 'growing' | 'mature' | 'declining';
    consolidationLevel: string;
    entryBarriers: string[];
    regulatoryEnvironment: string;
  };
  keyMetrics?: {
    cagr: string;
    avgDealSize: string;
    customerAcquisitionCost: string;
    lifetimeValue: string;
  };
  adjacentMarkets?: Array<{
    name: string;
    relevance: string;
    crossoverOpportunity: string;
  }>;
}

interface MarketAnalysisProps {
  marketAnalysis?: MarketAnalysisData | null;
  title?: string;
  subtitle?: string;
}

const stageBadgeColors: Record<string, string> = {
  emerging: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  growing: 'bg-primary/20 text-primary border-primary/30',
  mature: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  declining: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function MarketAnalysis({ marketAnalysis, title = 'Market Analysis', subtitle }: MarketAnalysisProps) {
  if (!marketAnalysis) return null;

  return (
    <CollapsibleSection
      icon={<BarChart3 className="w-5 h-5 text-accent" />}
      iconBgColor="hsl(var(--accent) / 0.15)"
      title={title}
      subtitle={subtitle}
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
              <TrendingUp className="w-3 h-3 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Growth</p>
            </div>
            <p className="text-sm text-foreground">{marketAnalysis.growth}</p>
          </div>
        </div>

        {/* Key Metrics */}
        {marketAnalysis.keyMetrics && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Key Metrics</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'CAGR', value: marketAnalysis.keyMetrics.cagr },
                { label: 'Avg Deal Size', value: marketAnalysis.keyMetrics.avgDealSize },
                { label: 'CAC', value: marketAnalysis.keyMetrics.customerAcquisitionCost },
                { label: 'LTV', value: marketAnalysis.keyMetrics.lifetimeValue },
              ].map((metric) => (
                <div key={metric.label} className="p-3 rounded-lg bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{metric.label}</p>
                  <p className="text-xs font-medium text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Dynamics */}
        {marketAnalysis.marketDynamics && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Market Dynamics</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${stageBadgeColors[marketAnalysis.marketDynamics.stage] || 'bg-muted text-muted-foreground border-border'}`}>
                  {marketAnalysis.marketDynamics.stage.charAt(0).toUpperCase() + marketAnalysis.marketDynamics.stage.slice(1)}
                </span>
                <span className="text-xs text-muted-foreground">{marketAnalysis.marketDynamics.consolidationLevel}</span>
              </div>
              {marketAnalysis.marketDynamics.entryBarriers.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Entry Barriers</p>
                  <ul className="space-y-1">
                    {marketAnalysis.marketDynamics.entryBarriers.map((barrier, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary/60 mt-0.5 shrink-0">&bull;</span>
                        <span>{barrier}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {marketAnalysis.marketDynamics.regulatoryEnvironment && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Regulatory Environment</p>
                  <p className="text-xs text-foreground/80">{marketAnalysis.marketDynamics.regulatoryEnvironment}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trends */}
        {marketAnalysis.trends.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Trends</p>
            </div>
            <div className="space-y-2">
              {marketAnalysis.trends.map((trend, i) => (
                <div
                  key={i}
                  className="px-3 py-2 text-xs rounded-lg bg-accent/5 text-accent/90 border border-accent/15"
                >
                  {trend}
                </div>
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
                <Target className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Opportunities</p>
              </div>
              <ul className="space-y-2">
                {marketAnalysis.opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">+</span>
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
                <AlertTriangle className="w-4 h-4 text-primary/50" />
                <p className="text-sm font-medium text-foreground">Threats</p>
              </div>
              <ul className="space-y-2">
                {marketAnalysis.threats.map((threat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary/50 mt-1">!</span>
                    <span>{threat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Adjacent Markets */}
        {marketAnalysis.adjacentMarkets && marketAnalysis.adjacentMarkets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Adjacent Markets</p>
            </div>
            <div className="space-y-2">
              {marketAnalysis.adjacentMarkets.map((market, i) => (
                <div key={i} className="p-3 rounded-lg bg-card border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">{market.name}</p>
                  <p className="text-xs text-muted-foreground mb-1">{market.relevance}</p>
                  <p className="text-xs text-primary/80">{market.crossoverOpportunity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
