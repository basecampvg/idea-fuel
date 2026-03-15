'use client';

import { useState } from 'react';
import { Check, ChevronDown, ArrowRight } from 'lucide-react';
import type { ClassificationResult, BusinessTaxonomy, ExpandTrackId } from '@forge/shared';

interface ClassificationSummaryProps {
  classification: ClassificationResult;
  onConfirm: (overrides?: Partial<ClassificationResult>) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const taxonomyLabels: Record<BusinessTaxonomy, string> = {
  'services-local': 'Local Services',
  'services-professional': 'Professional Services',
  'saas': 'SaaS / Software',
  'ecommerce': 'E-Commerce',
  'physical-product': 'Physical Product',
  'content': 'Content / Media',
  'marketplace': 'Marketplace',
  'other': 'Other',
};

const trackLabels: Record<ExpandTrackId, { name: string; description: string }> = {
  A: { name: 'Product Line Audit', description: 'Current offerings, revenue, margins' },
  B: { name: 'Customer Intelligence', description: 'Customer profiles, churn, spending' },
  C: { name: 'Strategic Context', description: 'Goals, capital, risk tolerance' },
};

export function ClassificationSummary({
  classification,
  onConfirm,
  onBack,
  isSubmitting,
}: ClassificationSummaryProps) {
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrideTaxonomy, setOverrideTaxonomy] = useState<BusinessTaxonomy>(classification.taxonomy);
  const [overrideTrackOrder, setOverrideTrackOrder] = useState<[ExpandTrackId, ExpandTrackId, ExpandTrackId]>(
    classification.interviewTrackOrder
  );

  const hasOverrides =
    overrideTaxonomy !== classification.taxonomy ||
    JSON.stringify(overrideTrackOrder) !== JSON.stringify(classification.interviewTrackOrder);

  const handleConfirm = () => {
    if (hasOverrides) {
      onConfirm({
        taxonomy: overrideTaxonomy,
        interviewTrackOrder: overrideTrackOrder,
      });
    } else {
      onConfirm();
    }
  };

  const rotateTrackOrder = () => {
    setOverrideTrackOrder(prev => [prev[1], prev[2], prev[0]]);
  };

  return (
    <div className="w-full max-w-lg animate-fade-in-up">
      <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 shadow-xl shadow-black/5 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-3">
            <Check className="w-3.5 h-3.5" />
            Classification Complete
          </div>
          <h2 className="text-base font-semibold text-foreground">Here's what we found</h2>
          <p className="text-xs text-muted-foreground mt-1">Review and confirm, or customize below</p>
        </div>

        {/* Taxonomy */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Business Type</p>
          <p className="text-sm font-semibold text-foreground">
            {taxonomyLabels[showOverrides ? overrideTaxonomy : classification.taxonomy]}
          </p>
        </div>

        {/* Track Order */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Interview Track Order</p>
          <div className="space-y-2">
            {(showOverrides ? overrideTrackOrder : classification.interviewTrackOrder).map((trackId, idx) => (
              <div key={trackId} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-4">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{trackLabels[trackId].name}</p>
                  <p className="text-xs text-muted-foreground">{trackLabels[trackId].description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Research Modules */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Research Modules</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(classification.researchModuleConfig).map(([key, enabled]) => (
              <span
                key={key}
                className={`
                  px-2.5 py-1 rounded-md text-xs font-medium
                  ${enabled
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'bg-muted/30 text-muted-foreground line-through border border-border/30'
                  }
                `}
              >
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Override Toggle */}
        <button
          onClick={() => setShowOverrides(!showOverrides)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOverrides ? 'rotate-180' : ''}`} />
          Customize classification
        </button>

        {/* Override Controls */}
        {showOverrides && (
          <div className="space-y-3 p-4 rounded-xl bg-muted/10 border border-border/30 mb-4 animate-fade-in-up">
            {/* Taxonomy Override */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Business Type</label>
              <select
                value={overrideTaxonomy}
                onChange={(e) => setOverrideTaxonomy(e.target.value as BusinessTaxonomy)}
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {Object.entries(taxonomyLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Track Order Override */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Track Order</label>
              <button
                onClick={rotateTrackOrder}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground hover:bg-muted/50 transition-colors w-full"
              >
                {overrideTrackOrder.map((t, i) => (
                  <span key={t} className="flex items-center gap-1">
                    {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                    <span className="font-medium">Track {t}</span>
                  </span>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">Click to rotate</span>
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/30">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-accent text-accent-foreground font-medium text-sm
              shadow-lg shadow-accent/25
              hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02]
              active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100
              transition-all duration-200
            "
          >
            {isSubmitting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {hasOverrides ? 'Confirm with Changes' : 'Start Interview'}
          </button>
        </div>
      </div>
    </div>
  );
}
