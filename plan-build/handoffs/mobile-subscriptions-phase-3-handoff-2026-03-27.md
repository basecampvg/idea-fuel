# Phase 3 Handoff: Mobile SDK + Plans Screen + Paywall
**Plan:** mobile-subscriptions-plan-2026-03-27.md
**Phase:** 3 of 3
**Status:** COMPLETE
**Built by:** Builder
**Date:** 2026-03-27

## What Was Built

### 1. react-native-purchases installed (v9.15.0)
- Added via `npx expo install react-native-purchases`
- No Expo config plugin needed (native module works with EAS/dev builds directly)

### 2. RevenueCat SDK Wrapper (`packages/mobile/src/lib/purchases.ts`) — NEW FILE
- **Graceful Expo Go fallback:** Dynamic `require()` in try/catch. If native module is missing (Expo Go), all functions log warnings and return gracefully instead of crashing.
- `initPurchases(userId)` — configures `Purchases` with platform-appropriate API key from `app.json` extra config + `appUserID`
- `getOfferings()` — returns current offerings or `null` on failure
- `purchasePackage(pkg)` — wraps SDK purchase; throws `{ cancelled: true }` on user cancel, rethrows on real errors
- `restorePurchases()` — wraps SDK restore
- `getCustomerInfo()` — returns customer info or `null`
- `logOutPurchases()` — calls `Purchases.logOut()`
- `isPurchasesAvailable()` — boolean check for UI conditional rendering

### 3. AuthContext Updated (`packages/mobile/src/contexts/AuthContext.tsx`)
- `initPurchases(data.user.id)` called after:
  - Google OAuth token exchange success (line 63)
  - Session restore on app mount (line 101)
  - Dev sign-in success (line 146)
- `logOutPurchases()` called at the top of `signOut()` (line 156) before clearing local state

### 4. RevenueCat API Keys in `app.json`
- Added `revenueCatPublicIosKey: ""` and `revenueCatPublicAndroidKey: ""` to `expo.extra`
- Keys are empty strings — must be filled in before building for TestFlight/production

### 5. PlanCard Component (`packages/mobile/src/components/ui/PlanCard.tsx`) — NEW FILE
- 5 states: `available`, `current`, `web-active`, `lower-tier`, `loading`
- Tier name with accent color, price in Geist Mono, feature list with check marks
- "Subscribe" button (primary variant) for `available` state
- "Current Plan" badge for `current` state
- "Active via Web" badge + "Manage on ideafuel.ai" message for `web-active` state
- "Included" label (disabled) for `lower-tier` state
- ActivityIndicator for `loading` state
- FadeIn animation with staggered delay per card (80ms * index)

### 6. Settings Directory Conversion
- Moved `settings.tsx` to `settings/index.tsx`
- Created `settings/_layout.tsx` — Stack navigator matching vault/notes pattern
- Plans screen registered as `settings/plans` route with "Manage Plan" header title
- Updated import paths in settings/index.tsx to reflect new directory depth (`../../` → `../../../`)

### 7. Plans Screen (`packages/mobile/src/app/(tabs)/settings/plans.tsx`) — NEW FILE
- **Current plan header:** tier name + badge ("Active" or "Web") + renewal date
- **4 PlanCard components** with data from offerings (localized prices) + fallback to `MOBILE_IAP_PRICES`
- **Stripe subscriber detection:** if `stripeSubscriptionId` exists → all cards show "Active via Web" + disabled
- **Tier ranking:** cards for tiers ≤ current tier show "Included" (disabled), using `TIER_RANK` from `@forge/shared`
- **Purchase handler:** `purchasePackage(pkg)` → success haptic + toast + `invalidateQueries(['user', 'me'])` → UI updates
- **Restore Purchases** link — calls `restorePurchases()` with success/error toast
- **Manage Subscription** link — deep links to App Store (`itms-apps://...`) or Play Store subscription settings
- **Manage on Web** link — for Stripe subscribers, opens `https://app.ideafuel.ai/settings`
- **SDK unavailable notice** — shown when `isPurchasesAvailable()` returns false (Expo Go)

### 8. Paywall Updated (`packages/mobile/src/components/ui/Paywall.tsx`)
- Replaced "Coming soon" toast with real MOBILE tier purchase
- Button text: "Subscribe to Mobile — $7.99/mo" (price from RevenueCat if available, fallback from constants)
- Loads MOBILE package from offerings on mount
- Loading state during purchase (spinner on button)
- Error handling: cancelled → dismiss silently, failed → error toast + error haptic
- Added "See All Plans" ghost button → navigates to `/(tabs)/settings/plans`
- New `onPurchaseSuccess` prop so parent BottomSheet can dismiss after purchase

### 9. Settings Index Updated (`packages/mobile/src/app/(tabs)/settings/index.tsx`)
- Added "Subscription" section between Profile and Account
- "Manage Plan" row with Crown icon + tier Badge showing current plan
- Tapping navigates to `/(tabs)/settings/plans`

## Verification

- `pnpm -C packages/mobile exec tsc --noEmit` — only 3 pre-existing errors in `_layout.tsx` (unrelated to this phase), zero new errors
- All routes registered: `settings/_layout.tsx` declares `index` and `plans` Stack screens
- tRPC calls match server: `trpc.user.me.useQuery()` used in plans.tsx and settings/index.tsx
- RevenueCat imports have try/catch fallback in `purchases.ts`
- No TODO/FIXME in any new or modified files
- `expo-purchases` plugin not needed — `react-native-purchases` has no Expo config plugin

## Files Changed

| File | Change |
|------|--------|
| `packages/mobile/package.json` | Added `react-native-purchases` ^9.15.0 |
| `packages/mobile/src/lib/purchases.ts` | NEW: RevenueCat SDK wrapper with Expo Go fallback |
| `packages/mobile/src/contexts/AuthContext.tsx` | Added `initPurchases` on 3 auth paths + `logOutPurchases` on sign-out |
| `packages/mobile/app.json` | Added `revenueCatPublicIosKey` + `revenueCatPublicAndroidKey` to extra |
| `packages/mobile/src/components/ui/PlanCard.tsx` | NEW: Plan card with 5 states, FadeIn animation |
| `packages/mobile/src/app/(tabs)/settings/_layout.tsx` | NEW: Settings Stack layout (index + plans screens) |
| `packages/mobile/src/app/(tabs)/settings/index.tsx` | MOVED from settings.tsx + added Manage Plan row with tier badge |
| `packages/mobile/src/app/(tabs)/settings/plans.tsx` | NEW: Full plans screen with offerings, purchase flow, Stripe detection |
| `packages/mobile/src/components/ui/Paywall.tsx` | Replaced "Coming soon" with real MOBILE purchase + "See All Plans" nav |

## Setup Required Before Testing

1. **RevenueCat API keys** — fill in `revenueCatPublicIosKey` and `revenueCatPublicAndroidKey` in `app.json` extra
2. **RevenueCat dashboard** — create products: `ideafuel_mobile_monthly`, `ideafuel_pro_monthly`, `ideafuel_enterprise_monthly`, `ideafuel_scale_monthly`
3. **App Store Connect / Google Play** — create matching IAP products with prices ($7.99, $54.99, $139.99, $279.99)
4. **RevenueCat webhook URL** — set to `https://<domain>/api/webhooks/revenuecat` with auth key
5. **Dev build** — `npx expo run:ios` or EAS build needed (Expo Go cannot run native purchases)
6. **Env var** — `REVENUECAT_WEBHOOK_AUTH_KEY` must be set in server environment
