'use client';

import { Check, X, Crown, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionTier } from '@forge/shared';
import {
  SUBSCRIPTION_FEATURES,
  SUBSCRIPTION_PRICING,
  SUBSCRIPTION_TIER_LABELS,
  SUBSCRIPTION_TIER_DESCRIPTIONS,
} from '@forge/shared';

interface TierCardProps {
  tier: SubscriptionTier;
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

const tierIcons: Record<SubscriptionTier, typeof Sparkles> = {
  FREE: Sparkles,
  PRO: Crown,
  ENTERPRISE: Building2,
};

const tierColors: Record<SubscriptionTier, { icon: string; border: string; glow: string }> = {
  FREE: {
    icon: 'text-muted-foreground',
    border: 'border-border',
    glow: '',
  },
  PRO: {
    icon: 'text-[#e91e8c]',
    border: 'border-[#e91e8c]/40',
    glow: 'shadow-[0_0_30px_hsl(var(--primary)/0.15)]',
  },
  ENTERPRISE: {
    icon: 'text-[#8b5cf6]',
    border: 'border-[#8b5cf6]/40',
    glow: 'shadow-[0_0_30px_rgba(139,92,246,0.15)]',
  },
};

export function TierCard({
  tier,
  isCurrentPlan,
  isRecommended = false,
  onSelect,
  disabled = false,
}: TierCardProps) {
  const features = SUBSCRIPTION_FEATURES[tier];
  const pricing = SUBSCRIPTION_PRICING[tier];
  const label = SUBSCRIPTION_TIER_LABELS[tier];
  const description = SUBSCRIPTION_TIER_DESCRIPTIONS[tier];
  const Icon = tierIcons[tier];
  const colors = tierColors[tier];

  const featureList = [
    {
      name: 'Ideas',
      value: features.maxIdeas === -1 ? 'Unlimited' : `${features.maxIdeas} ideas`,
      included: true,
    },
    {
      name: 'Reports per Idea',
      value: `${features.maxReportsPerIdea} reports`,
      included: true,
    },
    {
      name: 'Spark Mode',
      value: null,
      included: features.interviewModes.includes('SPARK'),
    },
    {
      name: 'Light Interview',
      value: null,
      included: features.interviewModes.includes('LIGHT'),
    },
    {
      name: 'In-Depth Interview',
      value: null,
      included: features.interviewModes.includes('IN_DEPTH'),
    },
    {
      name: 'Basic Reports',
      value: null,
      included: features.reportTierAccess.includes('BASIC'),
    },
    {
      name: 'Pro Reports',
      value: null,
      included: features.reportTierAccess.includes('PRO'),
    },
    {
      name: 'Full Reports',
      value: null,
      included: features.reportTierAccess.includes('FULL'),
    },
    {
      name: 'AI Quality',
      value: features.aiQuality.charAt(0).toUpperCase() + features.aiQuality.slice(1),
      included: true,
    },
    {
      name: 'Priority Support',
      value: null,
      included: features.prioritySupport,
    },
  ];

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl bg-card border p-6
        transition-all duration-300
        ${colors.border} ${colors.glow}
        ${isRecommended ? 'ring-2 ring-[#e91e8c]/30' : ''}
        ${isCurrentPlan ? 'bg-gradient-to-b from-card to-background' : ''}
      `}
    >
      {/* Badges */}
      <div className="absolute -top-3 left-0 right-0 flex justify-center gap-2">
        {isRecommended && (
          <Badge
            variant="default"
            className="bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] border-0 text-white"
          >
            Recommended
          </Badge>
        )}
        {isCurrentPlan && (
          <Badge variant="success">Current Plan</Badge>
        )}
      </div>

      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <div
          className={`
            mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full
            ${tier === 'PRO' ? 'bg-[#e91e8c]/10' : tier === 'ENTERPRISE' ? 'bg-[#8b5cf6]/10' : 'bg-muted'}
          `}
        >
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <h3 className="text-xl font-bold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {/* Pricing */}
      <div className="text-center mb-6">
        {pricing.price === 0 ? (
          <div className="text-3xl font-bold text-foreground">Free</div>
        ) : pricing.price === null ? (
          <div className="text-xl font-semibold text-foreground">Contact Us</div>
        ) : (
          <div>
            <span className="text-3xl font-bold text-foreground">${pricing.price}</span>
            <span className="text-muted-foreground">/{pricing.period}</span>
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-1">
        {featureList.map((feature) => (
          <li key={feature.name} className="flex items-center gap-2">
            {feature.included ? (
              <Check className="h-4 w-4 text-[#22c55e] flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            )}
            <span
              className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground/50'}`}
            >
              {feature.name}
              {feature.value && (
                <span className="text-muted-foreground ml-1">({feature.value})</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        variant={isCurrentPlan ? 'outline' : tier === 'PRO' ? 'accent' : 'secondary'}
        className="w-full"
        onClick={onSelect}
        disabled={disabled || isCurrentPlan}
      >
        {isCurrentPlan
          ? 'Current Plan'
          : pricing.price === null
          ? 'Contact Sales'
          : tier === 'FREE'
          ? 'Get Started'
          : 'Upgrade'}
      </Button>

      {/* Coming Soon tooltip for disabled state */}
      {disabled && !isCurrentPlan && (
        <p className="text-xs text-muted-foreground text-center mt-2">Coming Soon</p>
      )}
    </div>
  );
}
