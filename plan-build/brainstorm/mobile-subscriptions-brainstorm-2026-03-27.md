# Brainstorm: Mobile In-App Subscriptions (RevenueCat)
**Created:** 2026-03-27
**Spec:** plan-build/specs/mobile-subscriptions-spec-2026-03-27.md
**Status:** Draft
**Project type:** Existing codebase

## Vision
Replace the stubbed "Coming soon" paywall with real in-app purchases via RevenueCat. Users can subscribe to any IdeaFuel tier (Mobile, Pro, Enterprise, Scale) directly from their phone with one-tap Apple/Google Pay. Subscriptions sync cross-platform via webhooks — subscribe on mobile, access on web. Stripe web subscriptions continue unchanged; mobile IAP is additive.

## Existing Context

### Current Billing Architecture
- **Web**: Stripe Checkout sessions → Stripe webhooks → update `user.subscription` field
- **Webhook handler**: `packages/web/src/app/api/webhooks/stripe/route.ts` — processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- **Billing router**: `packages/server/src/routers/billing.ts` — `createCheckoutSession`, `createPortalSession`, `getSubscriptionStatus`
- **User fields**: `subscription`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `stripeCurrentPeriodEnd`
- **Tiers**: FREE, PRO, ENTERPRISE, TESTER, MOBILE (SCALE needs to be added)
- **Subscription validity**: `user.subscription !== 'FREE' && !!stripeSubscriptionId && stripeCurrentPeriodEnd > now`

### Current Mobile Paywall
- `packages/mobile/src/components/ui/Paywall.tsx` — shows "Coming soon" toast on subscribe, links to web for upgrade
- Used in sparkCard validate flow when cards run out (BottomSheet)

### Key Files to Modify
| File | Change |
|------|--------|
| `packages/server/src/db/schema.ts` | Add SCALE to enum |
| `packages/shared/src/constants/subscription.ts` | Add SCALE features + MOBILE_IAP_PRICES + REVENUECAT_PRODUCT_MAP + TIER_RANK |
| `packages/shared/src/types/index.ts` | Add SCALE to SubscriptionTier |
| `packages/shared/src/validators/index.ts` | Add SCALE to subscriptionTierSchema |
| `packages/mobile/src/components/ui/Paywall.tsx` | Replace stub with RevenueCat purchase flow |
| `packages/mobile/src/app/(tabs)/settings.tsx` | Add "Manage Plan" row |
| `packages/mobile/src/contexts/AuthContext.tsx` | Initialize RevenueCat SDK after auth |
| `packages/mobile/app.json` | Add expo-purchases plugin |

### Key Files to Create
| File | Purpose |
|------|---------|
| `packages/web/src/app/api/webhooks/revenuecat/route.ts` | RevenueCat webhook handler |
| `packages/mobile/src/app/(tabs)/settings/plans.tsx` | Plans screen (or standalone route) |
| `packages/mobile/src/components/ui/PlanCard.tsx` | Individual plan card component |
| `packages/mobile/src/lib/purchases.ts` | RevenueCat SDK wrapper (configure, purchase, restore, get offerings) |
| `packages/shared/src/constants/revenuecat.ts` | Product map, tier rank, IAP prices |

## Components Identified

### C1: SCALE Tier + Constants
- **Responsibility**: Add SCALE to SubscriptionTier enum, SUBSCRIPTION_FEATURES, subscription pricing. Add RevenueCat constants (product map, tier rank, IAP prices).
- **Upstream**: N/A (type/constant definitions)
- **Downstream**: All subscription-aware code, Plans screen, webhook handler
- **External dependencies**: None
- **Hands test**: PASS

### C2: DB Migration
- **Responsibility**: Add SCALE to pgEnum. May need to add ripple fixes to Record<SubscriptionTier,...> maps.
- **Upstream**: C1 (type definitions)
- **Downstream**: All DB queries involving subscription tier
- **External dependencies**: Drizzle Kit
- **Hands test**: PASS — same pattern as MOBILE tier addition

### C3: RevenueCat SDK Wrapper
- **Responsibility**: Initialize RevenueCat with user ID after auth. Expose `purchasePackage()`, `restorePurchases()`, `getOfferings()`, `getCustomerInfo()`. Clean up on logout.
- **Upstream**: AuthContext (provides user.id for SDK init), app.json (plugin config)
- **Downstream**: Plans screen (offerings + purchase), Paywall (purchase)
- **External dependencies**: `react-native-purchases` npm package, `REVENUECAT_PUBLIC_IOS_KEY` / `REVENUECAT_PUBLIC_ANDROID_KEY` env vars
- **Hands test**: PASS — RevenueCat SDK is well-documented for Expo. Requires dev build, not Expo Go.

### C4: RevenueCat Webhook Handler
- **Responsibility**: Receive RevenueCat webhook events, verify auth key, map product → tier, update user.subscription in DB, log to audit.
- **Upstream**: RevenueCat servers (HTTP POST)
- **Downstream**: User table (subscription field update), audit logs
- **External dependencies**: `REVENUECAT_WEBHOOK_AUTH_KEY` env var
- **Hands test**: PASS — mirrors existing Stripe webhook pattern. Next.js API route.

### C5: Plans Screen
- **Responsibility**: Full-screen plans page showing current plan header, 4 plan cards with features/pricing, subscribe buttons, restore purchases link.
- **Upstream**: RevenueCat offerings (prices), user.me query (current tier, Stripe sub status), RevenueCat customerInfo (active entitlements)
- **Downstream**: RevenueCat purchasePackage() on button tap, navigation to App Store settings for cancellation
- **External dependencies**: None beyond SDK + tRPC
- **Hands test**: PASS

### C6: PlanCard Component
- **Responsibility**: Individual plan card with tier name, price, feature list, subscribe/current badge, disabled state for lower tiers and Stripe subscribers.
- **Upstream**: Plans screen passes tier data, price, isCurrentPlan, isDisabled
- **Downstream**: Calls onSubscribe callback
- **External dependencies**: None (pure presentational)
- **Hands test**: PASS

### C7: Updated Paywall
- **Responsibility**: Replace "Coming soon" stub with real RevenueCat purchase flow. Shows in BottomSheet when cards run out.
- **Upstream**: sparkCard validate flow (CARD_LIMIT_REACHED error)
- **Downstream**: RevenueCat purchasePackage() for MOBILE tier, or navigate to full Plans screen
- **External dependencies**: RevenueCat SDK wrapper (C3)
- **Hands test**: PASS

### C8: Settings "Manage Plan" Row
- **Responsibility**: Add row to Settings screen that shows current tier + navigates to Plans screen.
- **Upstream**: user.me query (subscription tier)
- **Downstream**: Navigation to Plans screen
- **External dependencies**: None
- **Hands test**: PASS

### C9: AuthContext SDK Integration
- **Responsibility**: Initialize RevenueCat SDK after successful Google OAuth, clean up on logout.
- **Upstream**: Auth token exchange success
- **Downstream**: RevenueCat SDK configured globally for all subsequent purchase/offering calls
- **External dependencies**: RevenueCat SDK, user.id
- **Hands test**: PASS — AuthContext already manages lifecycle events

## Rough Dependency Map

```
SCALE Tier + Constants (C1)
    ↓
DB Migration (C2)
    ↓
RevenueCat SDK Wrapper (C3) ←── AuthContext Integration (C9)
    ↓
RevenueCat Webhook Handler (C4)
    ↓ (both depend on C1-C3)
PlanCard Component (C6)
    ↓
Plans Screen (C5) ←── Settings Row (C8)
    ↓
Updated Paywall (C7)
```

**Build order:**
1. C1 + C2: SCALE tier, constants, migration
2. C4: Webhook handler (server, no mobile deps)
3. C3 + C9: RevenueCat SDK wrapper + AuthContext init
4. C6: PlanCard component
5. C5: Plans screen
6. C7 + C8: Updated Paywall + Settings row

## Risk Assessment

### Critical: RevenueCat Requires Dev Build
`react-native-purchases` is a native module. Cannot test in Expo Go. Must use EAS dev build or TestFlight. This blocks real purchase testing until a dev build is created.

### Critical: External Setup Before Testing
RevenueCat account, App Store Connect products, and Google Play products must all be configured BEFORE the SDK can be tested. Code can be written first, but cannot be verified until external setup is complete.

### Medium: Subscription Validity Logic Change
Current validity check: `user.subscription !== 'FREE' && !!stripeSubscriptionId && (stripeCurrentPeriodEnd > now)`. For RevenueCat subscribers, `stripeSubscriptionId` will be null but `subscription` will be non-FREE. The validity check needs to be updated to: `user.subscription !== 'FREE' && (stripeCurrentPeriodEnd ? stripeCurrentPeriodEnd > now : true)`. This already exists in the current code but needs verification.

### Low: Apple Review
Apple reviews IAP implementations strictly. Must have working restore purchases, no external payment links that bypass IAP (the "Manage on Web" for Stripe subscribers is fine — it's managing an existing sub, not creating a new one).

## Open Questions
None — all resolved in spec.

## Risks and Concerns
- **TestFlight-only testing**: Cannot test purchases in Expo Go. Development iteration will be slower for purchase-related features.
- **Apple 30% margin**: The raised prices ($7.99, $54.99, etc.) mitigate this but mobile revenue per subscriber is lower than web.
- **Webhook reliability**: RevenueCat generally delivers within seconds, but the 24-hour manual reconciliation gap is a known v1 limitation.
