'use client';

export interface OfferTier {
  tier: 'lead_magnet' | 'frontend' | 'core' | 'backend';
  label: string;
  title: string;
  price: string;
  description: string;
}

interface OfferSectionProps {
  offerTiers?: OfferTier[] | null;
  ideaTitle?: string;
  title?: string;
  subtitle?: string;
}

// Default tiers matching screenshot
const DEFAULT_TIERS: OfferTier[] = [
  {
    tier: 'lead_magnet',
    label: 'LEAD MAGNET',
    title: 'AI Card Identifier Demo Tool',
    price: 'Free',
    description: 'An online demo tool that allows users to upload card images for quick identification.',
  },
  {
    tier: 'frontend',
    label: 'FRONTEND',
    title: 'Starter Subscription Plan',
    price: '$50/month',
    description: 'Low-cost access to AI-driven card cataloging for up to 1000 cards per month.',
  },
  {
    tier: 'core',
    label: 'CORE',
    title: 'Pro Subscription Plan',
    price: '$150/month',
    description: 'Advanced plan offering bulk processing and integration with real-time market data.',
  },
];

// Tier config: featured = core
const TIER_CONFIG: Record<string, { featured: boolean; accentLabel: string }> = {
  lead_magnet: { featured: false, accentLabel: 'Entry' },
  frontend:    { featured: false, accentLabel: 'Starter' },
  core:        { featured: true,  accentLabel: 'Most Popular' },
  backend:     { featured: false, accentLabel: 'Enterprise' },
};

function parseJson<T>(data: T | string | null | undefined): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data as T;
}

export function OfferSection({ offerTiers: rawOfferTiers, title = 'Offer', subtitle }: OfferSectionProps) {
  const offerTiers = parseJson<OfferTier[]>(rawOfferTiers);
  const tiers = offerTiers && offerTiers.length > 0 ? offerTiers : DEFAULT_TIERS;

  // Determine featured index: prefer 'core', else middle
  const featuredIdx = tiers.findIndex((t) => t.tier === 'core');
  const effectiveFeaturedIdx = featuredIdx >= 0 ? featuredIdx : tiers.length > 2 ? 1 : 0;

  const cols =
    tiers.length === 1 ? 'grid-cols-1 max-w-sm' :
    tiers.length === 2 ? 'grid-cols-2 max-w-2xl' :
    tiers.length === 3 ? 'grid-cols-3' :
    'grid-cols-2 lg:grid-cols-4';

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className={`grid ${cols} gap-4 items-stretch`}>
        {tiers.map((tier, i) => {
          const featured = i === effectiveFeaturedIdx;
          const config = TIER_CONFIG[tier.tier] ?? { featured: false, accentLabel: tier.label };

          return (
            <div
              key={tier.tier}
              className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-300 ${
                featured
                  ? 'border-[#e32b1a]/40 bg-gradient-to-b from-[#e32b1a]/[0.06] to-[#1c1a17] shadow-[0_0_48px_rgba(227,43,26,0.08)]'
                  : 'border-[#2a2723] bg-[#1c1a17]'
              }`}
            >
              {/* Most Popular badge */}
              {featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-[#e32b1a] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[2px] text-white whitespace-nowrap">
                    {config.accentLabel}
                  </span>
                </div>
              )}

              {/* Tier label */}
              <p className={`font-mono text-[10px] font-bold uppercase tracking-[2px] mb-3 ${
                featured ? 'text-[#e32b1a]' : 'text-[#5a5652]'
              }`}>
                {tier.label}
              </p>

              {/* Title */}
              <h3 className={`font-display text-base font-bold leading-snug ${
                featured ? 'text-white' : 'text-[#d4d4d4]'
              }`}>
                {tier.title}
              </h3>

              {/* Price */}
              <div className="mt-4">
                <span className={`font-display text-3xl font-black tracking-tight ${
                  featured ? 'text-white' : 'text-[#d4d4d4]'
                }`}>
                  {tier.price}
                </span>
              </div>

              {/* Divider */}
              <div className="my-4 flex items-center gap-2">
                <div className={`h-px flex-1 ${featured ? 'bg-[#e32b1a]/30' : 'bg-[#2a2723]'}`} />
                {featured && <div className="h-1.5 w-1.5 rounded-full bg-[#e32b1a]" />}
                <div className={`h-px flex-1 ${featured ? 'bg-[#e32b1a]/30' : 'bg-[#2a2723]'}`} />
              </div>

              {/* Description */}
              <p className="text-xs text-[#928e87] leading-relaxed flex-1">
                {tier.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
