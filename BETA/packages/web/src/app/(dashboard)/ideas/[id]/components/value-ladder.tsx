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
    gradient: 'from-zinc-500 to-zinc-400',
    dotColor: 'bg-zinc-400',
  },
  core: {
    label: 'CORE',
    gradient: 'from-blue-500 to-blue-400',
    dotColor: 'bg-blue-400',
  },
  premium: {
    label: 'PREMIUM',
    gradient: 'from-amber-500 to-amber-400',
    dotColor: 'bg-amber-400',
  },
  vip: {
    label: 'VIP/DFY',
    gradient: 'from-emerald-500 to-emerald-400',
    dotColor: 'bg-emerald-400',
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
      <div className="flex-1 min-w-[150px] rounded-xl bg-[#1e1e28] border border-[#1f1f2e] p-4 hover:border-[#2a2a3d] transition-colors">
        {/* Tier Label with gradient dot */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500">
            {config.label}
          </span>
        </div>

        {/* Price */}
        <p className="text-xl font-bold text-white mb-1">{tier.price}</p>

        {/* Name */}
        <h3 className="text-sm font-medium text-zinc-400 mb-3">{tier.name}</h3>

        {/* Features */}
        <ul className="space-y-1.5">
          {tier.features.slice(0, 3).map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-zinc-500">
              <Check className="w-3 h-3 mt-0.5 flex-shrink-0 text-cyan-400" />
              <span className="line-clamp-1">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex items-center justify-center px-2 text-zinc-600">
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
    <div className="rounded-xl bg-[#13131a] border border-[#1f1f2e] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Value Ladder</h2>
        <Link
          href={`/ideas/${ideaId}/reports?type=VALUE_LADDER`}
          className="flex items-center gap-1 text-sm text-pink-400 hover:text-pink-300 transition-colors"
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
      <div className="mt-6 pt-4 border-t border-[#1f1f2e]">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>Entry</span>
          <span>VIP</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1f1f2e] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-zinc-500 via-blue-500 via-amber-500 to-emerald-500"
            style={{ width: '100%' }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-3 text-center">
          Start with Entry to validate demand, then upsell to higher tiers
        </p>
      </div>
    </div>
  );
}
