'use client';

import Link from 'next/link';
import { ChevronRight, Check } from 'lucide-react';

export interface ValueTier {
  tier: 'entry' | 'core' | 'premium' | 'vip';
  name: string;
  price: string;
  features: string[];
}

interface ValueLadderProps {
  valueLadder?: ValueTier[] | null;
  ideaId: string;
}

const TIER_CONFIG = {
  entry: {
    label: 'ENTRY',
    gradient: 'from-primary/60 to-primary/40',
    dotColor: 'bg-muted-foreground',
  },
  core: {
    label: 'CORE',
    gradient: 'from-primary/70 to-primary/50',
    dotColor: 'bg-primary/70',
  },
  premium: {
    label: 'PREMIUM',
    gradient: 'from-primary/50 to-primary/40',
    dotColor: 'bg-primary/50',
  },
  vip: {
    label: 'VIP/DFY',
    gradient: 'from-primary to-primary/80',
    dotColor: 'bg-primary',
  },
};

const DEFAULT_TIERS: ValueTier[] = [
  { tier: 'entry', name: 'Starter', price: '$29/mo', features: ['Basic features', 'Email support'] },
  { tier: 'core', name: 'Pro', price: '$99/mo', features: ['Full platform', 'Priority support'] },
  { tier: 'premium', name: 'Premium', price: '$299/mo', features: ['All features', '1:1 coaching'] },
  { tier: 'vip', name: 'Enterprise', price: 'Custom', features: ['Done-for-you', 'White glove'] },
];

function TierCard({ tier, isLast }: { tier: ValueTier; isLast: boolean }) {
  const config = TIER_CONFIG[tier.tier] || TIER_CONFIG.core;

  return (
    <div className="flex items-center">
      {/* Tier Card */}
      <div className="flex-1 min-w-[150px] rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors">
        {/* Tier Label with gradient dot */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground">
            {config.label}
          </span>
        </div>

        {/* Price */}
        <p className="text-lg font-semibold text-foreground mb-1">{tier.price}</p>

        {/* Name */}
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{tier.name}</h3>

        {/* Features */}
        <ul className="space-y-1.5">
          {tier.features.slice(0, 3).map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
              <span className="line-clamp-1">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex items-center justify-center px-2 text-muted-foreground">
          <ChevronRight className="w-5 h-5 hidden sm:block" />
          <ChevronRight className="w-5 h-5 sm:hidden rotate-90" />
        </div>
      )}
    </div>
  );
}

export function ValueLadder({ valueLadder: rawValueLadder, ideaId }: ValueLadderProps) {
  // Parse valueLadder if it's a string (Prisma JSON field)
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

  const tiers = valueLadder && Array.isArray(valueLadder) && valueLadder.length > 0 ? valueLadder : DEFAULT_TIERS;

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Value Ladder</h2>
        <Link
          href={`/ideas/${ideaId}/reports?type=VALUE_LADDER`}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span>View Full Report</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tier Cards - Horizontal flow */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-0">
        {tiers.map((tier, index) => (
          <TierCard key={tier.tier} tier={tier} isLast={index === tiers.length - 1} />
        ))}
      </div>

      {/* Progress bar showing ladder progression */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Entry</span>
          <span>VIP</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-muted-foreground via-primary/50 via-primary/70 to-primary"
            style={{ width: '100%' }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Start with Entry to validate demand, then upsell to higher tiers
        </p>
      </div>
    </div>
  );
}
