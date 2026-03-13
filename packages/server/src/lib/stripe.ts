import Stripe from 'stripe';

// Lazy-initialized Stripe client — avoids crash at build time when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Maps subscription tier to the corresponding Stripe Price ID env var
export const STRIPE_PRICE_ID_MAP = {
  PRO: 'STRIPE_PRO_PRICE_ID',
  ENTERPRISE: 'STRIPE_ENTERPRISE_PRICE_ID',
} as const;

export type StripeTier = keyof typeof STRIPE_PRICE_ID_MAP;

/**
 * Get the Stripe Price ID for a given tier.
 * Reads from the corresponding environment variable.
 * Throws if the env var is not set.
 */
export function getStripePriceId(tier: StripeTier): string {
  const envVar = STRIPE_PRICE_ID_MAP[tier];
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  return priceId;
}
