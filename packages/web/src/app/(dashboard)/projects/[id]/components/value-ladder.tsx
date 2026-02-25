'use client';

import Link from 'next/link';
import { ChevronRight, Check, Star, Crown, Zap, Shield } from 'lucide-react';

export interface ValueTier {
  tier: 'entry' | 'core' | 'premium' | 'vip';
  name: string;
  price: string;
  features: string[];
}

interface ValueLadderProps {
  valueLadder?: ValueTier[] | null;
  projectId: string;
}

const TIER_CONFIG = {
  entry: {
    label: 'ENTRY',
    icon: Zap,
    accentClass: 'text-muted-foreground',
    borderClass: 'border-border',
    badgeBg: 'bg-muted',
    badgeText: 'text-muted-foreground',
    checkClass: 'text-muted-foreground',
    featured: false,
  },
  core: {
    label: 'CORE',
    icon: Star,
    accentClass: 'text-primary',
    borderClass: 'border-primary/50',
    badgeBg: 'bg-primary/10',
    badgeText: 'text-primary',
    checkClass: 'text-primary',
    featured: true,
  },
  premium: {
    label: 'PREMIUM',
    icon: Crown,
    accentClass: 'text-primary/80',
    borderClass: 'border-border',
    badgeBg: 'bg-primary/5',
    badgeText: 'text-primary/80',
    checkClass: 'text-primary/70',
    featured: false,
  },
  vip: {
    label: 'VIP / DFY',
    icon: Shield,
    accentClass: 'text-foreground',
    borderClass: 'border-border',
    badgeBg: 'bg-foreground/5',
    badgeText: 'text-foreground',
    checkClass: 'text-foreground/70',
    featured: false,
  },
};

const DEFAULT_TIERS: ValueTier[] = [
  {
    tier: 'entry',
    name: 'Starter',
    price: '$29/mo',
    features: ['Basic features', 'Email support'],
  },
  {
    tier: 'core',
    name: 'Pro',
    price: '$99/mo',
    features: ['Full platform', 'Priority support'],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '$299/mo',
    features: ['All features', '1:1 coaching'],
  },
  {
    tier: 'vip',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Done-for-you', 'White glove'],
  },
];

function parsePrice(price: string): { amount: string; period: string } | null {
  const match = price.match(/^(\$[\d,.]+)\s*\/?\s*(.*)$/);
  if (match) return { amount: match[1], period: match[2] || '' };
  return null;
}

function TierColumn({ tier, index }: { tier: ValueTier; index: number }) {
  const config = TIER_CONFIG[tier.tier] || TIER_CONFIG.core;
  const Icon = config.icon;
  const parsed = parsePrice(tier.price);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-card p-5 transition-all duration-200 ${
        config.featured
          ? `${config.borderClass} shadow-[0_0_24px_-4px_hsl(var(--primary)/0.15)] scale-[1.02]`
          : `${config.borderClass} hover:border-primary/20`
      }`}
    >
      {/* Recommended badge */}
      {config.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
            <Star className="w-2.5 h-2.5 fill-current" />
            Recommended
          </span>
        </div>
      )}

      {/* Tier header */}
      <div className="text-center pt-1">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${config.badgeBg} ${config.badgeText}`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </div>
      </div>

      {/* Product name */}
      <h3 className="text-center text-base font-semibold text-foreground mt-4">
        {tier.name}
      </h3>

      {/* Price */}
      <div className="text-center mt-3 mb-4">
        {parsed ? (
          <>
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {parsed.amount}
            </span>
            {parsed.period && (
              <span className="text-sm text-muted-foreground ml-1">
                /{parsed.period}
              </span>
            )}
          </>
        ) : (
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {tier.price}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-4" />

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${config.badgeBg}`}
            >
              <Check className={`w-2.5 h-2.5 ${config.checkClass}`} />
            </div>
            <span className="text-muted-foreground leading-snug">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* Tier number */}
      <div className="mt-4 pt-3 border-t border-border text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Tier {index + 1}
        </span>
      </div>
    </div>
  );
}

export function ValueLadder({
  valueLadder: rawValueLadder,
  projectId,
}: ValueLadderProps) {
  let valueLadder: ValueTier[] | null = null;
  if (rawValueLadder) {
    if (typeof rawValueLadder === 'string') {
      try {
        valueLadder = JSON.parse(rawValueLadder);
      } catch {
        valueLadder = null;
      }
    } else if (Array.isArray(rawValueLadder)) {
      valueLadder = rawValueLadder;
    }
  }

  const tiers =
    valueLadder && Array.isArray(valueLadder) && valueLadder.length > 0
      ? valueLadder
      : DEFAULT_TIERS;

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Value Ladder</h2>
        <Link
          href={`/projects/${projectId}/reports?type=VALUE_LADDER`}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span>View Full Report</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Pricing columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {tiers.map((tier, index) => (
          <TierColumn key={tier.tier} tier={tier} index={index} />
        ))}
      </div>

      {/* Bottom insight */}
      <p className="text-sm text-muted-foreground mt-5 text-center">
        Start with Entry to validate demand, then upsell through the ladder
      </p>
    </div>
  );
}
