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
    description: 'Advanced plan offering bulk processing and integration with real-time...',
  },
];

// Number circle colors - tinted style (20% opacity background)
const TIER_COLORS: Record<string, string> = {
  lead_magnet: 'bg-primary/20 text-primary',
  frontend: 'bg-primary/20 text-primary/60',
  core: 'bg-primary/15 text-primary/50',
  backend: 'bg-primary/10 text-primary/40',
};

function OfferTierCard({ tier, index }: { tier: OfferTier; index: number }) {
  const colorClass = TIER_COLORS[tier.tier] || TIER_COLORS.lead_magnet;

  return (
    <div className="flex gap-4">
      {/* Number circle */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${colorClass}`}>
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Tier label */}
        <p className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase mb-1">
          {tier.label}
        </p>

        {/* Title with price */}
        <h3 className="text-sm font-semibold text-foreground">
          {tier.title}{' '}
          <span className="font-normal text-muted-foreground">({tier.price})</span>
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {tier.description}
        </p>
      </div>
    </div>
  );
}

// Helper to parse JSON if it's a string
function parseJson<T>(data: T | string | null | undefined): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as T;
}

export function OfferSection({ offerTiers: rawOfferTiers, title = 'Offer', subtitle }: OfferSectionProps) {
  // Parse JSON if needed
  const offerTiers = parseJson<OfferTier[]>(rawOfferTiers);

  // Use provided tiers or defaults
  const tiers = offerTiers && offerTiers.length > 0 ? offerTiers : DEFAULT_TIERS;

  return (
    <div className="rounded-2xl bg-background border border-border p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="space-y-5">
        {tiers.map((tier, index) => (
          <OfferTierCard key={tier.tier} tier={tier} index={index} />
        ))}
      </div>
    </div>
  );
}
