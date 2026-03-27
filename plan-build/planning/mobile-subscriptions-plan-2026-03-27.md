# Build Plan: Mobile In-App Subscriptions (RevenueCat)
**Created:** 2026-03-27
**Spec:** plan-build/specs/mobile-subscriptions-spec-2026-03-27.md
**Brainstorm:** plan-build/brainstorm/mobile-subscriptions-brainstorm-2026-03-27.md
**Status:** Draft
**Project type:** Existing codebase
**Branch:** matt/mobile-quick-validation

## Overview
Integrate RevenueCat for native App Store / Play Store in-app subscriptions. 4 tiers (Mobile $7.99, Pro $54.99, Enterprise $139.99, Scale $279.99). Plans screen in Settings, updated paywall with real purchase flow, RevenueCat webhook for DB sync. Stripe web subscriptions continue unchanged. Users with active Stripe subs are blocked from mobile IAP to prevent double-billing.

## Component Inventory

| ID | Component | Package | Inputs | Outputs | External Deps |
|----|-----------|---------|--------|---------|---------------|
| C1 | SCALE Tier + Constants | shared | N/A | Types, features, pricing, product map, tier rank | None |
| C2 | DB Migration | server | N/A | SCALE enum value | Drizzle Kit |
| C3 | RevenueCat SDK Wrapper | mobile | User ID, API keys | Purchase, restore, offerings, customerInfo | `react-native-purchases`, RevenueCat API keys |
| C4 | RevenueCat Webhook | web | RevenueCat HTTP POST | user.subscription update, audit log | `REVENUECAT_WEBHOOK_AUTH_KEY` |
| C5 | Plans Screen | mobile | Offerings, user data | Purchase trigger, navigation | RevenueCat SDK |
| C6 | PlanCard Component | mobile | Tier data, price, state | Subscribe callback | None |
| C7 | Updated Paywall | mobile | CARD_LIMIT_REACHED error | Purchase or navigate to Plans | RevenueCat SDK |
| C8 | Settings Row | mobile | user.subscription | Navigate to Plans | tRPC client |
| C9 | AuthContext SDK Init | mobile | user.id, auth state | RevenueCat configured | RevenueCat SDK |

## Flow 0: Signup → First Purchase

### Account Creation
Existing flow — Google OAuth → user record created with `subscription = 'FREE'`.

### RevenueCat SDK Init
After auth succeeds and user object is available, `Purchases.configure({ apiKey, appUserID: user.id })` is called in AuthContext. This links the RevenueCat subscriber to our DB user.

### First Purchase
User navigates to Plans screen (via Settings "Manage Plan" or paywall) → taps Subscribe on a plan → App Store payment sheet → purchase confirmed via SDK → webhook updates DB.

### Auth Token Lifecycle
Existing — Bearer token from `expo-secure-store`. No changes for subscriptions.

## Integration Contracts

### IC1: Mobile → RevenueCat SDK (Configure)
```
Source: AuthContext (C9)
Target: RevenueCat SDK
What flows: { apiKey: string, appUserID: user.id }
How: Purchases.configure() call on auth success
Auth: Public API key from env (REVENUECAT_PUBLIC_IOS_KEY / ANDROID_KEY)
Error path: SDK configuration failure → log error, purchases won't work but app still functions
```

### IC2: Mobile → RevenueCat SDK (Get Offerings)
```
Source: Plans screen (C5)
Target: RevenueCat SDK
What flows: none (SDK knows the project from configure)
How: Purchases.getOfferings() → returns Offering with packages + localized prices
Auth: Already configured via IC1
Error path: Failed → use MOBILE_IAP_PRICES fallback constants
```

### IC3: Mobile → RevenueCat SDK (Purchase)
```
Source: Plans screen (C5) or Paywall (C7) → subscribe button tap
Target: RevenueCat SDK → App Store / Play Store
What flows: Package object from offerings
How: Purchases.purchasePackage(package) → returns CustomerInfo on success
Auth: User already identified via configure
Error path: PURCHASE_CANCELLED_ERROR → toast. Other error → toast "Payment failed". No DB change.
```

### IC4: RevenueCat → Server Webhook
```
Source: RevenueCat servers
Target: POST /api/webhooks/revenuecat (C4)
What flows: JSON body with event type, app_user_id, product_id, expiration date
How: HTTPS POST
Auth: Authorization header with REVENUECAT_WEBHOOK_AUTH_KEY
Error path: 401 → RevenueCat stops retrying. 500 → RevenueCat retries with backoff.
```

### IC5: Webhook → DB Update
```
Source: Webhook handler (C4)
Target: User table via Drizzle ORM
What flows: UPDATE users SET subscription = tier, stripeCurrentPeriodEnd = expiresDate
How: Direct DB update (same pattern as Stripe webhook)
Auth: ctx from Next.js API route (no user auth — webhook uses app_user_id)
Error path: User not found → return 200, log warning. DB error → return 500 (triggers retry).
```

### IC6: Plans Screen → user.me Query
```
Source: Plans screen (C5)
Target: user tRPC router
What flows: no input (userId from context)
How: trpc.user.me.useQuery()
Auth: Bearer token
Response: { subscription, stripeSubscriptionId, stripeCurrentPeriodEnd, ... }
Error path: Query error → show error state
```

### IC7: Plans Screen → App Store Settings (Cancel)
```
Source: Plans screen "Manage Subscription" link
Target: App Store / Play Store
What flows: Deep link URL
How: Linking.openURL('itms-apps://apps.apple.com/account/subscriptions') on iOS
Auth: N/A (user is already signed into their Apple ID)
Error path: Deep link fails → fallback to generic App Store URL
```

## End-to-End Flows

### Flow 1: New User Subscribes to Pro
```
1. [Mobile] App launches → AuthContext signs in → Purchases.configure({ apiKey, appUserID: user.id })
2. [Mobile] User taps Settings → "Manage Plan"
3. [Mobile] Plans screen: calls Purchases.getOfferings() + trpc.user.me.useQuery()
4. [Mobile] Shows: "Free Plan" header, 4 plan cards with prices from offerings
5. [Mobile] User taps "Subscribe" on Pro ($54.99/mo)
6. [Mobile] Calls Purchases.purchasePackage(proPackage)
7. [Mobile] App Store payment sheet appears → user authenticates → Apple processes
8. [Mobile] SDK returns CustomerInfo with active "premium" entitlement
9. [Mobile] UI updates: "Pro — Active" header, Pro card shows "Current Plan"
10. [RevenueCat] Sends INITIAL_PURCHASE webhook to /api/webhooks/revenuecat
11. [Server] Verifies auth key → maps ideafuel_pro_monthly → PRO
12. [Server] UPDATE users SET subscription = 'PRO', stripeCurrentPeriodEnd = expiresDate WHERE id = app_user_id
13. [Server] Logs audit: { action: 'SUBSCRIPTION_CHANGE', source: 'revenuecat', newTier: 'PRO' }
14. [Web] User opens web → user.subscription = 'PRO' → full access
```

### Flow 2: Stripe Subscriber Views Plans on Mobile
```
1. [Mobile] User with Enterprise Stripe sub opens Plans screen
2. [Mobile] trpc.user.me returns: subscription = 'ENTERPRISE', stripeSubscriptionId = 'sub_...'
3. [Mobile] Plans screen detects stripeSubscriptionId → shows "Enterprise — Active via Web"
4. [Mobile] All subscribe buttons disabled
5. [Mobile] "Manage on Web" button → Linking.openURL('https://app.ideafuel.ai/settings')
```

### Flow 3: Paywall → Quick Purchase
```
1. [Mobile] User runs Quick Validate → CARD_LIMIT_REACHED error
2. [Mobile] Updated Paywall BottomSheet opens
3. [Mobile] Shows MOBILE tier card ($7.99/mo) + "See All Plans" link
4. [Mobile] User taps "Subscribe to Mobile"
5. [Mobile] Purchases.purchasePackage(mobilePackage) → payment sheet → success
6. [Mobile] BottomSheet dismisses, card count refreshed
```

### Flow 4: Monthly Renewal
```
1. [RevenueCat] Sends RENEWAL webhook
2. [Server] Verifies auth → user found → updates stripeCurrentPeriodEnd to new date
3. [Server] Logs audit: { action: 'SUBSCRIPTION_RENEWAL', source: 'revenuecat' }
4. [Mobile/Web] No visible change — subscription stays active
```

### Flow 5: Cancellation + Expiration
```
1. [Mobile] User opens App Store settings → cancels subscription
2. [RevenueCat] Sends CANCELLATION webhook
3. [Server] Logs audit. Does NOT downgrade (user keeps access until period end).
4. [RevenueCat] At period end, sends EXPIRATION webhook
5. [Server] Sets user.subscription = 'FREE'. Clears stripeCurrentPeriodEnd.
6. [Mobile/Web] User sees FREE tier, features gated
```

## Convention Guide
Same as previous builds:
- Server routes: `camelCase.ts`
- Mobile screens: Expo Router file-based
- Mobile components: `PascalCase.tsx`
- Fonts: Outfit (headings), Geist (body), Geist Mono (badges/stats)
- Colors: from theme
- Haptics: success on purchase, error on failure

## Issues Found

### Issue 1: Subscription Validity Check Update
Current check in `billing.ts` line 149: `user.subscription !== 'FREE' && !!user.stripeSubscriptionId && (stripeCurrentPeriodEnd > now)`. For RevenueCat subscribers, `stripeSubscriptionId` is null. The webhook reuses `stripeCurrentPeriodEnd` for the RevenueCat expiration date, so the check becomes: `user.subscription !== 'FREE' && (stripeCurrentPeriodEnd ? stripeCurrentPeriodEnd > now : true)`. This needs to be updated in the billing router.
**Resolution:** Phase 1 — update the `getSubscriptionStatus` query in billing.ts.

### Issue 2: SCALE Ripple Fixes
Adding SCALE to SubscriptionTier will break `Record<SubscriptionTier, ...>` maps (same as MOBILE addition). Need to add SCALE entries to: AI_PRESETS (openai.ts), TIER_STYLES (top-nav-bar.tsx), tierIcons/tierColors (tier-card.tsx).
**Resolution:** Phase 1 — fix all compile errors after adding SCALE.

### Issue 3: user.me Query Needs stripeSubscriptionId
The mobile `user.me` query currently returns `subscription` but the Plans screen also needs `stripeSubscriptionId` to detect Stripe subscribers. Need to verify the query returns this field.
**Resolution:** Phase 1 — check and update user.me if needed.

## Wiring Checklist

### Phase 1: SCALE Tier + Constants + DB Migration + Billing Fix
- [ ] Add `SCALE` to SubscriptionTier in `packages/shared/src/types/index.ts`
- [ ] Add `SCALE` to `subscriptionTierSchema` in `packages/shared/src/validators/index.ts`
- [ ] Add `SCALE` to `SUBSCRIPTION_FEATURES` in `packages/shared/src/constants/subscription.ts`
- [ ] Add `SCALE` to `SUBSCRIPTION_PRICING` in `packages/shared/src/constants/subscription.ts`
- [ ] Add SCALE to `SUBSCRIPTION_TIER_LABELS` and `SUBSCRIPTION_TIER_DESCRIPTIONS` in `packages/shared/src/constants/index.ts`
- [ ] Create `packages/shared/src/constants/revenuecat.ts` with: `REVENUECAT_PRODUCT_MAP`, `TIER_RANK`, `MOBILE_IAP_PRICES`, `MOBILE_IAP_FEATURES` (UI copy arrays per tier)
- [ ] Add `SCALE` to `subscriptionTierEnum` pgEnum in `packages/server/src/db/schema.ts`
- [ ] Fix all `Record<SubscriptionTier, ...>` compile errors (AI_PRESETS, TIER_STYLES, tierIcons, tierColors)
- [ ] Generate Drizzle migration for SCALE enum value
- [ ] Update `getSubscriptionStatus` in `packages/server/src/routers/billing.ts`: change validity check to not require `stripeSubscriptionId` for RevenueCat subscribers
- [ ] Verify `user.me` query returns `stripeSubscriptionId` and `stripeCurrentPeriodEnd` — add if missing

### Phase 2: RevenueCat Webhook Handler (Server)
- [ ] Create `packages/web/src/app/api/webhooks/revenuecat/route.ts`
- [ ] Verify `Authorization` header against `REVENUECAT_WEBHOOK_AUTH_KEY` env var
- [ ] Parse webhook body: extract `event.type`, `event.app_user_id`, `event.product_id`, `event.expiration_at_ms`
- [ ] Handle `INITIAL_PURCHASE`: map product → tier, update user.subscription + stripeCurrentPeriodEnd
- [ ] Handle `RENEWAL`: update stripeCurrentPeriodEnd only
- [ ] Handle `PRODUCT_CHANGE`: map new product → new tier, update both fields
- [ ] Handle `CANCELLATION`: log only, no tier change
- [ ] Handle `EXPIRATION`: set user.subscription = 'FREE', clear stripeCurrentPeriodEnd
- [ ] Handle `BILLING_ISSUE_DETECTED`: log only, no tier change
- [ ] Handle unknown events: log + return 200
- [ ] Handle unknown user (app_user_id not in DB): log warning + return 200
- [ ] Audit log all events with `source: 'revenuecat_webhook'`
- [ ] Return 200 for success, 401 for auth failure, 500 for server errors

### Phase 3: Mobile SDK + Plans Screen + Paywall
- [ ] Install `react-native-purchases`: `npx expo install react-native-purchases`
- [ ] Add `expo-purchases` plugin to `app.json` if needed
- [ ] Create `packages/mobile/src/lib/purchases.ts`:
  - [ ] `initPurchases(userId: string)` — calls `Purchases.configure()`
  - [ ] `getOfferings()` — returns current offerings with packages
  - [ ] `purchasePackage(pkg)` — wraps SDK purchase with error handling
  - [ ] `restorePurchases()` — wraps SDK restore
  - [ ] `getCustomerInfo()` — returns current customer info
  - [ ] `logOutPurchases()` — calls `Purchases.logOut()`
- [ ] Update `packages/mobile/src/contexts/AuthContext.tsx`:
  - [ ] Call `initPurchases(user.id)` after successful sign-in (both Google OAuth and dev sign-in)
  - [ ] Call `logOutPurchases()` in signOut()
- [ ] Add RevenueCat API keys to `app.json` extra config
- [ ] Create `packages/mobile/src/components/ui/PlanCard.tsx`:
  - [ ] Tier name, price, feature list
  - [ ] "Subscribe" button (primary variant)
  - [ ] "Current Plan" badge state (disabled button)
  - [ ] "Active via Web" state (disabled button + message)
  - [ ] Disabled state for lower tiers
  - [ ] Loading state during purchase
- [ ] Create `packages/mobile/src/app/(tabs)/settings/plans.tsx` (or route via modal):
  - [ ] Current plan header: tier name + badge + period end date
  - [ ] "Restore Purchases" link
  - [ ] "Manage Subscription" link (deep link to App Store settings)
  - [ ] 4 PlanCard components with data from offerings + user.me
  - [ ] Stripe subscriber detection: if stripeSubscriptionId exists, show "Active via Web" + disable all
  - [ ] Tier ranking: disable subscribe for tiers ≤ current tier
  - [ ] Purchase handler: purchasePackage → success toast + invalidate user.me → UI updates
- [ ] Update `packages/mobile/src/components/ui/Paywall.tsx`:
  - [ ] Replace "Coming soon" toast with real MOBILE tier purchase
  - [ ] "Subscribe to Mobile — $7.99/mo" button → calls purchasePackage for MOBILE
  - [ ] "See All Plans" link → navigates to Plans screen
  - [ ] Loading state during purchase
  - [ ] Error handling: cancelled → dismiss, failed → toast
- [ ] Update `packages/mobile/src/app/(tabs)/settings.tsx`:
  - [ ] Add "Manage Plan" row showing current tier badge
  - [ ] Tapping navigates to Plans screen
- [ ] Register plans route in settings navigation (Stack or modal)

## Build Order

### Phase 1: SCALE Tier + Constants + Billing Fix
**Scope:** C1, C2 + billing validity fix + user.me check
**Why first:** Everything depends on SCALE tier existing and the subscription validity logic being correct.

### Phase 2: RevenueCat Webhook Handler
**Scope:** C4
**Why second:** Server endpoint can be built and tested independently (via curl). Doesn't depend on mobile SDK. Must exist before real purchases can sync to DB.

### Phase 3: Mobile SDK + Plans Screen + Paywall
**Scope:** C3, C5, C6, C7, C8, C9
**Why third:** Depends on Phase 1 (types/constants) and Phase 2 (webhook must exist for purchases to sync). This is the largest phase — SDK init, plans UI, paywall update, settings row.

**Note:** Phase 3 code can be written and UI tested with mock data before RevenueCat account / App Store products are set up. Real purchase testing requires the external setup.
