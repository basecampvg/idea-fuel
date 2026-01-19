'use client';

import { Check, X } from 'lucide-react';
import type { SubscriptionTier } from '@forge/shared';
import { TIER_FEATURES, SUBSCRIPTION_TIER_LABELS } from '@forge/shared';

interface FeatureComparisonProps {
  currentTier: SubscriptionTier;
}

const tiers: SubscriptionTier[] = ['FREE', 'PRO', 'ENTERPRISE'];

export function FeatureComparison({ currentTier }: FeatureComparisonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground border-b border-border">
              Feature
            </th>
            {tiers.map((tier) => (
              <th
                key={tier}
                className={`
                  p-4 text-center text-sm font-semibold border-b border-border
                  ${tier === currentTier ? 'text-[#e91e8c] bg-[#e91e8c]/5' : 'text-foreground'}
                `}
              >
                {SUBSCRIPTION_TIER_LABELS[tier]}
                {tier === currentTier && (
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    (Current)
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIER_FEATURES.map((feature, index) => (
            <tr
              key={feature.id}
              className={index % 2 === 0 ? 'bg-background/50' : 'bg-card/50'}
            >
              <td className="p-4 border-b border-border">
                <div className="text-sm font-medium text-foreground">{feature.name}</div>
                <div className="text-xs text-muted-foreground">{feature.description}</div>
              </td>
              {tiers.map((tier) => {
                const value = feature[tier.toLowerCase() as 'free' | 'pro' | 'enterprise'];
                const isHighlighted = tier === currentTier;

                return (
                  <td
                    key={tier}
                    className={`
                      p-4 text-center border-b border-border
                      ${isHighlighted ? 'bg-[#e91e8c]/5' : ''}
                    `}
                  >
                    {typeof value === 'boolean' ? (
                      value ? (
                        <Check className="h-5 w-5 text-[#22c55e] mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-foreground font-medium">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Mobile-friendly version that stacks features vertically per tier
 */
export function FeatureComparisonMobile({ currentTier }: FeatureComparisonProps) {
  return (
    <div className="space-y-6">
      {tiers.map((tier) => {
        const isCurrentTier = tier === currentTier;
        return (
          <div
            key={tier}
            className={`
              rounded-xl border p-4
              ${isCurrentTier ? 'border-[#e91e8c]/40 bg-[#e91e8c]/5' : 'border-border bg-card'}
            `}
          >
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              {SUBSCRIPTION_TIER_LABELS[tier]}
              {isCurrentTier && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#e91e8c]/20 text-[#e91e8c]">
                  Current
                </span>
              )}
            </h3>
            <ul className="space-y-2">
              {TIER_FEATURES.map((feature) => {
                const value = feature[tier.toLowerCase() as 'free' | 'pro' | 'enterprise'];
                const included = typeof value === 'boolean' ? value : true;

                return (
                  <li key={feature.id} className="flex items-center gap-2 text-sm">
                    {included ? (
                      <Check className="h-4 w-4 text-[#22c55e] flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={included ? 'text-foreground' : 'text-muted-foreground/50'}>
                      {feature.name}
                      {typeof value === 'string' && (
                        <span className="text-muted-foreground ml-1">: {value}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
