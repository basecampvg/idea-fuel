# Phase 1 Handoff: SCALE Tier + Constants + DB Migration + Billing Fix
**Plan:** mobile-subscriptions-plan-2026-03-27.md
**Phase:** 1 of 3
**Status:** COMPLETE
**Built by:** Builder
**Date:** 2026-03-27

## What Was Built

### 1. SCALE Tier Type (`packages/shared/src/types/index.ts`)
- Added `'SCALE'` to `SubscriptionTier` union type

### 2. SCALE Validator (`packages/shared/src/validators/index.ts`)
- Added `'SCALE'` to `subscriptionTierSchema` z.enum

### 3. SCALE Subscription Features (`packages/shared/src/constants/subscription.ts`)
- Added `SCALE` to `SUBSCRIPTION_FEATURES`: 10 SPARK, 5 LIGHT, 2 IN_DEPTH, 100 financial models, full report tier access, all interview modes, priority support, premium AI quality
- Added `SCALE` to `SUBSCRIPTION_PRICING`: $279.99/month USD

### 4. SCALE Labels & Descriptions (`packages/shared/src/constants/index.ts`)
- Added `SCALE` to `SUBSCRIPTION_TIER_LABELS`: "Scale"
- Added `SCALE` to `SUBSCRIPTION_TIER_DESCRIPTIONS`: "Expand pipeline with advanced analysis tools"
- Added `export * from './revenuecat'` to barrel export

### 5. RevenueCat Constants (`packages/shared/src/constants/revenuecat.ts`) — NEW FILE
- `REVENUECAT_PRODUCT_MAP`: Maps product IDs (ideafuel_mobile_monthly, ideafuel_pro_monthly, ideafuel_enterprise_monthly, ideafuel_scale_monthly) to SubscriptionTier values
- `TIER_RANK`: Numeric rank per tier for upgrade/downgrade comparisons (FREE=0, MOBILE=1, PRO=2, ENTERPRISE=3, SCALE=4, TESTER=99)
- `MOBILE_IAP_PRICES`: Fallback price display strings per tier
- `MOBILE_IAP_FEATURES`: UI copy arrays with feature bullet points per tier for mobile plan cards

### 6. SCALE DB Enum (`packages/server/src/db/schema.ts`)
- Added `'SCALE'` to `subscriptionTierEnum` pgEnum values

### 7. Drizzle Migration (`packages/server/drizzle/0012_rich_phil_sheldon.sql`)
- Generated migration: `ALTER TYPE "public"."SubscriptionTier" ADD VALUE 'SCALE';`
- Snapshot updated in `drizzle/meta/0012_snapshot.json`
- Journal updated in `drizzle/meta/_journal.json`

### 8. AI_PRESETS Ripple Fix (`packages/server/src/lib/openai.ts`)
- Added `SCALE` entry to all 19 preset categories, matching ENTERPRISE-level parameters (premium tier with xhigh/high reasoning)

### 9. TIER_STYLES Ripple Fix (`packages/web/src/components/layout/top-nav-bar.tsx`)
- Added `SCALE` entry: `'bg-violet-500/15 text-violet-600 dark:text-violet-400'`

### 10. tierIcons & tierColors Ripple Fix (`packages/web/src/components/subscription/tier-card.tsx`)
- Added `Rocket` icon import from lucide-react
- Added `SCALE` to `tierIcons`: Rocket
- Added `SCALE` to `tierColors`: violet-500 palette

### 11. Billing Validity Fix (`packages/server/src/routers/billing.ts`)
- Updated `getSubscriptionStatus` query: removed `!!user.stripeSubscriptionId` requirement
- New check: `user.subscription !== 'FREE' && (stripeCurrentPeriodEnd ? stripeCurrentPeriodEnd > now : true)`
- Allows RevenueCat subscribers (who have no stripeSubscriptionId) to be recognized as active subscribers

### 12. user.me Query Update (`packages/server/src/routers/user.ts`)
- Added `stripeSubscriptionId: true` and `stripeCurrentPeriodEnd: true` to the `user.me` query columns
- Mobile Plans screen can now detect Stripe subscribers and show "Active via Web" state

## Verification

- `tsc --noEmit` passes for all 3 packages: shared, server, web (zero errors)
- Migration SQL verified: single ALTER TYPE statement
- All `Record<SubscriptionTier, ...>` maps updated (19 AI_PRESETS categories, TIER_STYLES, tierIcons, tierColors, SUBSCRIPTION_FEATURES, SUBSCRIPTION_PRICING)
- All exports verified through barrel files

## Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/types/index.ts` | Added SCALE to SubscriptionTier |
| `packages/shared/src/validators/index.ts` | Added SCALE to subscriptionTierSchema |
| `packages/shared/src/constants/subscription.ts` | Added SCALE to SUBSCRIPTION_FEATURES + SUBSCRIPTION_PRICING |
| `packages/shared/src/constants/index.ts` | Added SCALE to labels/descriptions, re-export revenuecat |
| `packages/shared/src/constants/revenuecat.ts` | NEW: REVENUECAT_PRODUCT_MAP, TIER_RANK, MOBILE_IAP_PRICES, MOBILE_IAP_FEATURES |
| `packages/server/src/db/schema.ts` | Added SCALE to subscriptionTierEnum |
| `packages/server/drizzle/0012_rich_phil_sheldon.sql` | NEW: ALTER TYPE migration |
| `packages/server/src/lib/openai.ts` | Added SCALE to all 19 AI_PRESETS |
| `packages/server/src/routers/billing.ts` | Fixed subscription validity check for RevenueCat |
| `packages/server/src/routers/user.ts` | Added stripeSubscriptionId + stripeCurrentPeriodEnd to user.me |
| `packages/web/src/components/layout/top-nav-bar.tsx` | Added SCALE to TIER_STYLES |
| `packages/web/src/components/subscription/tier-card.tsx` | Added SCALE to tierIcons + tierColors |

## Notes for Phase 2
- `REVENUECAT_PRODUCT_MAP` in revenuecat.ts is ready for the webhook handler to import and use for product-to-tier mapping
- `TIER_RANK` is ready for the mobile Plans screen to determine upgrade/downgrade direction
- `user.me` now returns `stripeSubscriptionId` which Phase 3 needs for Stripe subscriber detection
- The billing validity fix ensures RevenueCat-only subscribers (no stripeSubscriptionId) are recognized as active
