'use client';

import { Check, X, Crown, Sparkles, Building2, FlaskConical, Zap } from 'lucide-react';
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
  isLoading?: boolean;
}

const tierIcons: Record<SubscriptionTier, typeof Sparkles> = {
  FREE: Sparkles,
  PRO: Crown,
  ENTERPRISE: Building2,
  SCALE: Zap,
  TESTER: FlaskConical,
};

const tierColors: Record<SubscriptionTier, { icon: string; border: string; glow: string }> = {
  FREE: {
    icon: 'text-muted-foreground',
    border: 'border-border',
    glow: '',
  },
  PRO: {
    icon: 'text-primary',
    border: 'border-primary/40',
    glow: 'shadow-[0_0_30px_hsl(var(--primary)/0.15)]',
  },
  ENTERPRISE: {
    icon: 'text-accent',
    border: 'border-accent/40',
    glow: 'shadow-[0_0_30px_rgba(139,92,246,0.15)]',
  },
  SCALE: {
    icon: 'text-amber-500',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
  },
  TESTER: {
    icon: 'text-emerald-500',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
  },
};

export function TierCard({
  tier,
  isCurrentPlan,
  isRecommended = false,
  onSelect,
  disabled = false,
  isLoading = false,
}: TierCardProps) {
  const features = SUBSCRIPTION_FEATURES[tier];
  const pricing = SUBSCRIPTION_PRICING[tier];
  const label = SUBSCRIPTION_TIER_LABELS[tier];
  const description = SUBSCRIPTION_TIER_DESCRIPTIONS[tier];
  const Icon = tierIcons[tier];
  const colors = tierColors[tier];

  const featureList = [
    {
      name: 'Spark Reports',
      value: features.reportLimits.SPARK > 0 ? `${features.reportLimits.SPARK} reports` : null,
      included: features.reportLimits.SPARK > 0,
    },
    {
      name: 'Light Interview Reports',
      value: features.reportLimits.LIGHT > 0 ? `${features.reportLimits.LIGHT} reports` : null,
      included: features.reportLimits.LIGHT > 0,
    },
    {
      name: 'In-Depth Interview Reports',
      value: features.reportLimits.IN_DEPTH > 0 ? `${features.reportLimits.IN_DEPTH === 1 ? '1 report' : `${features.reportLimits.IN_DEPTH} reports`}` : null,
      included: features.reportLimits.IN_DEPTH > 0,
    },
    {
      name: 'Full Reports',
      value: null,
      included: features.reportTierAccess.includes('FULL'),
    },
    {
      name: 'Expand Pipeline',
      value: null,
      included: !!features.expandPipelineAccess,
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
        ${isRecommended ? 'ring-2 ring-primary/30' : ''}
        ${isCurrentPlan ? 'bg-gradient-to-b from-card to-background' : ''}
      `}
    >
      {/* Badges */}
      <div className="absolute -top-3 left-0 right-0 flex justify-center gap-2">
        {isRecommended && (
          <Badge
            variant="default"
            className="bg-gradient-to-r from-primary to-accent border-0 text-white"
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
            ${tier === 'PRO' ? 'bg-primary/10' : tier === 'ENTERPRISE' ? 'bg-accent/10' : tier === 'SCALE' ? 'bg-amber-500/10' : 'bg-muted'}
          `}
        >
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {/* Pricing */}
      <div className="text-center mb-6">
        {pricing.price === 0 ? (
          <div className="text-2xl font-semibold text-foreground">Free</div>
        ) : pricing.price === null ? (
          <div className="text-lg font-semibold text-foreground">Contact Us</div>
        ) : (
          <div>
            <span className="text-2xl font-semibold text-foreground">${pricing.price}</span>
            <span className="text-muted-foreground">/{pricing.period}</span>
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-1">
        {featureList.map((feature) => (
          <li key={feature.name} className="flex items-center gap-2">
            {feature.included ? (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
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
        isLoading={isLoading}
      >
        {isCurrentPlan
          ? 'Current Plan'
          : pricing.price === null
          ? 'Contact Sales'
          : tier === 'FREE'
          ? 'Get Started'
          : 'Upgrade'}
      </Button>

      {/* Coming Soon tooltip — only show when not loading another tier */}
      {disabled && !isCurrentPlan && !isLoading && (
        <p className="text-xs text-muted-foreground text-center mt-2">Coming Soon</p>
      )}
    </div>
  );
}
