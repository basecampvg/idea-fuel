# Feature Spec: Mobile In-App Subscriptions (RevenueCat)
**Created:** 2026-03-27
**Status:** Draft
**Project type:** Existing codebase

## Problem Statement
The mobile app currently has stubbed payment buttons that show "Coming soon." Users who want to subscribe must leave the app and go to the web. This kills impulse purchases. By integrating RevenueCat for native App Store / Play Store subscriptions, users can subscribe with one tap via Apple/Google Pay — zero friction, maximum conversion.

## Users and Roles
- **Free mobile user**: Sees all plan options, can subscribe to any tier via IAP
- **Existing web subscriber** (via Stripe): Sees their current plan on mobile. Cannot purchase via mobile IAP — must manage via web. Prevents double-billing.
- **Mobile subscriber** (via RevenueCat): Full cross-platform access — same tier applies on web

## Scope

### In scope (this build)
- RevenueCat SDK integration (`react-native-purchases`)
- Plans screen accessible from Settings ("Manage Plan") and from the existing paywall
- 4 subscription products (monthly only):
  - **Mobile**: $7.99/mo (covers Apple's 30%, nets ~$5.59)
  - **Pro**: $54.99/mo (nets ~$38.49)
  - **Enterprise**: $139.99/mo (nets ~$97.99)
  - **Scale**: $279.99/mo (nets ~$195.99)
- Plan cards UI — current plan at top with credit count, plan cards below with feature lists
- Purchase flow: tap plan → native App Store/Play Store payment sheet → subscription activated
- Restore purchases button (required by App Store Review)
- RevenueCat webhook endpoint on server to sync subscription status to DB
- Map RevenueCat product IDs → IdeaFuel subscription tiers
- Update `user.subscription` field when RevenueCat webhook fires
- Block mobile IAP if user has active Stripe subscription (prevent double-billing)
- Replace the current stubbed Paywall.tsx with real purchase flow
- Add `SCALE` tier to SubscriptionTier enum + SUBSCRIPTION_FEATURES
- RevenueCat SDK initialization with user.id as appUserID after auth

### Out of scope (future / not planned)
- Annual pricing (monthly only for v1)
- Credit top-up packs via IAP (future)
- Promotional offers / free trials
- Family sharing
- Web-to-mobile subscription migration (Stripe subscribers keep Stripe; mobile IAP is for users without a Stripe sub)
- Subscription downgrade/cancellation UI (handled by App Store/Play Store native settings)
- Refund handling (handled by Apple/Google directly)
- Automated reconciliation cron job (manual dashboard check for v1)

### MVP vs stretch
- **MVP**: Plans screen + RevenueCat purchase flow + webhook sync + paywall replacement
- **Stretch**: Usage dashboard on plans screen (cards used, reports generated), annual toggle, periodic reconciliation job

## Functional Requirements

### Happy Path — New Subscription (No Existing Sub)
1. User taps "Manage Plan" in Settings (or hits paywall after cards run out)
2. Plans screen opens showing:
   - Current plan header: "Free Plan" with "0 cards remaining"
   - 4 plan cards: Mobile, Pro, Enterprise, Scale — each with price (fetched from RevenueCat offerings, fallback to hardcoded), features, and "Subscribe" button
   - "Restore Purchases" link at bottom
3. User taps "Subscribe" on Pro card
4. RevenueCat SDK calls `purchasePackage()` → native App Store payment sheet appears
5. User authenticates with Face ID / Touch ID / password
6. Apple processes payment → RevenueCat receives receipt → SDK resolves with updated `customerInfo`
7. Mobile app reads `customerInfo.entitlements` → sees "premium" active → updates local UI immediately to show "Pro — Active"
8. RevenueCat sends webhook to `https://app.ideafuel.ai/api/webhooks/revenuecat`
9. Server webhook handler: verifies auth key → maps product ID `ideafuel_pro_monthly` → PRO tier → updates `user.subscription = 'PRO'`, `user.stripeCurrentPeriodEnd` = expiration date
10. User sees Pro features unlocked everywhere (mobile optimistically, web after webhook)

### Happy Path — Existing Stripe Subscriber Opens Mobile
1. User logs in on mobile with same Google account
2. RevenueCat SDK configured with `appUserID = user.id`
3. Mobile reads `user.subscription` and `user.stripeSubscriptionId` from DB via `user.me` query
4. Plans screen shows: "Enterprise — Active via Web" header with current period end date
5. All subscribe buttons are disabled. Message: "Manage your subscription at ideafuel.ai/settings"
6. "Manage on Web" button opens `https://app.ideafuel.ai/settings` in browser

### Edge Cases and Error Handling
- **Purchase cancelled by user**: RevenueCat SDK returns `PURCHASE_CANCELLED_ERROR`. Show toast "Purchase cancelled." No subscription change.
- **Payment fails** (card declined, insufficient funds): RevenueCat SDK returns error. Show toast "Payment failed — please try again or update your payment method." No subscription change.
- **Webhook delivery delayed** (up to 60s): Mobile app already updated optimistically via SDK `customerInfo`. Server catches up when webhook arrives. If webhook doesn't arrive within 24 hours, manual reconciliation via RevenueCat dashboard (check subscriber status via REST API `GET /subscribers/{app_user_id}`).
- **User has active Stripe subscription**: All IAP subscribe buttons disabled. Plans screen shows "Active via Web" badge and "Manage on Web" button. Cannot purchase via mobile to prevent double-billing.
- **User wants to cancel mobile subscription**: "Manage Subscription" link deep-links to App Store subscription settings (iOS: `itms-apps://apps.apple.com/account/subscriptions`) or Play Store settings. Apple/Google handles cancellation → RevenueCat fires `EXPIRATION` webhook → server sets `user.subscription = 'FREE'`.
- **Restore purchases** (new device, reinstall): User taps "Restore Purchases." SDK calls `restorePurchases()`. If active subscription found, `customerInfo` updates → server webhook syncs if needed. If no active subscription found, show toast "No active subscriptions found."
- **User subscribes on mobile, then opens web**: Web reads `user.subscription` from DB (updated by webhook). Full access. No friction.
- **Network error during purchase**: SDK's `purchasePackage()` promise rejects. Show toast "Network error — please check your connection and try again." All subscribe buttons re-enable. No pending state persisted — purchase either completes or fails atomically from the SDK's perspective.
- **RevenueCat webhook auth fails**: Return HTTP 401. Log to audit table: `{ action: 'WEBHOOK_AUTH_FAILED', source: 'revenuecat', metadata: { ip, headers } }`. No subscription change.
- **Webhook for unknown user** (`app_user_id` not in DB): Return HTTP 200 (to stop RevenueCat retrying). Log warning to audit table: `{ action: 'WEBHOOK_USER_NOT_FOUND', metadata: { appUserId, productId } }`.
- **Subscription renewal** (monthly auto-renew): RevenueCat fires `RENEWAL` webhook. Server updates `user.stripeCurrentPeriodEnd` to new expiration date. `user.subscription` stays the same tier.
- **Billing issue** (expired card on renewal): RevenueCat fires `BILLING_ISSUE_DETECTED`. User keeps access during Apple/Google grace period (6-16 days). Server does NOT downgrade yet. When grace period expires without resolution, RevenueCat fires `EXPIRATION` → server sets `user.subscription = 'FREE'`.
- **Product change** (user upgrades/downgrades via App Store settings): RevenueCat fires `PRODUCT_CHANGE` webhook. Server maps new product ID → new tier → updates `user.subscription`.

### Data Validation Rules
- RevenueCat webhook: verify `Authorization` header matches `REVENUECAT_WEBHOOK_AUTH_KEY`
- Product ID must exist in `REVENUECAT_PRODUCT_MAP`
- `app_user_id` should match a user.id in DB (log + return 200 if not found)
- Mobile IAP blocked if `user.stripeSubscriptionId` is non-null AND `user.stripeCurrentPeriodEnd > now`
- Subscribe buttons for tiers at or below current tier are disabled (tier rank: FREE < MOBILE < PRO < ENTERPRISE < SCALE)

## RevenueCat SDK Initialization

Call `Purchases.configure({ apiKey: Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY, appUserID: user.id })` immediately after the user authenticates on mobile (in the AuthProvider, after token exchange succeeds).

On sign-out: call `Purchases.logOut()` to detach the RevenueCat subscriber from the device.

Prices displayed on plan cards: fetch from `Purchases.getOfferings()` at runtime. Use `MOBILE_IAP_PRICES` as fallback if the offerings call fails.

## RevenueCat Webhook Event Handling

Webhook endpoint: `POST /api/webhooks/revenuecat`

| Event Type | Server Action |
|---|---|
| `INITIAL_PURCHASE` | Map product → tier. Set `user.subscription = tier`. Set `stripeCurrentPeriodEnd = expiresDate`. Log audit. |
| `RENEWAL` | Update `user.stripeCurrentPeriodEnd = newExpiresDate`. Tier stays same. Log audit. |
| `PRODUCT_CHANGE` | Map new product → new tier. Update `user.subscription = newTier`. Update period end. Log audit. |
| `CANCELLATION` | No immediate change (user keeps access until period end). Log audit with cancellation reason. |
| `EXPIRATION` | Set `user.subscription = 'FREE'`. Clear period end. Log audit. |
| `BILLING_ISSUE_DETECTED` | Log audit. Do NOT downgrade. User keeps access during grace period. |
| `SUBSCRIBER_ALIAS` | Log only. No action needed for our architecture. |
| Unknown event type | Log + return 200. No action. |

Webhook response codes:
- `200` — event processed or intentionally ignored (all success cases + unknown user + unknown event type)
- `401` — auth key mismatch (RevenueCat will NOT retry)
- `500` — unexpected server error (RevenueCat WILL retry with exponential backoff)

## Mobile Source of Truth for Feature Gates

- **Mobile app UI** (plans screen, feature badges): Uses RevenueCat SDK `customerInfo.entitlements` for instant feedback after purchase. Falls back to `user.subscription` from DB (via `user.me` query) for the initial load.
- **Server-side endpoints** (sparkCard.validate, project.startInterview, etc.): Always uses `user.subscription` from DB. This is the canonical source of truth. Webhook updates it within seconds of purchase.
- **Edge case — user purchases, immediately hits server endpoint before webhook arrives**: Server rejects (user still shows FREE in DB). Mobile shows a "Setting up your plan..." message and retries after 3 seconds (max 3 retries). By then the webhook has usually arrived.

## Data Model (high level)

### Modified: User table
- No new columns needed. `user.subscription` field already covers all tiers. RevenueCat uses `user.id` as `appUserID` — no separate mapping field needed.

### Modified: SubscriptionTier enum
- Add `SCALE` to the pgEnum (requires `ALTER TYPE` migration)

### New: SUBSCRIPTION_FEATURES for SCALE
```
SCALE: {
  reportLimits: { SPARK: 10, LIGHT: 5, IN_DEPTH: 2 },
  financialModelLimit: 100,
  reportTierAccess: ['BASIC', 'PRO', 'FULL'],
  interviewModes: ['SPARK', 'LIGHT', 'IN_DEPTH'],
  prioritySupport: true,
  aiQuality: 'premium',
}
```

### Confirmed: MOBILE tier features (already exists)
```
MOBILE: {
  reportLimits: { SPARK: 0, LIGHT: 0, IN_DEPTH: 0 },
  financialModelLimit: 0,
  reportTierAccess: [],
  interviewModes: [],
  prioritySupport: false,
  aiQuality: 'standard',
}
```
Mobile tier grants 10 quick validation cards/month (tracked via `mobileCardCount` + `mobileCardResetAt`, already implemented).

### New: Constants
```typescript
// Tier ranking for disable-lower-tier logic
const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0, MOBILE: 1, PRO: 2, ENTERPRISE: 3, SCALE: 4, TESTER: 99,
};

// RevenueCat product → tier mapping
const REVENUECAT_PRODUCT_MAP: Record<string, SubscriptionTier> = {
  'ideafuel_mobile_monthly': 'MOBILE',
  'ideafuel_pro_monthly': 'PRO',
  'ideafuel_enterprise_monthly': 'ENTERPRISE',
  'ideafuel_scale_monthly': 'SCALE',
};

// Fallback prices (actual prices fetched from RevenueCat offerings)
const MOBILE_IAP_PRICES: Record<string, { monthly: string }> = {
  MOBILE: { monthly: '$7.99' },
  PRO: { monthly: '$54.99' },
  ENTERPRISE: { monthly: '$139.99' },
  SCALE: { monthly: '$279.99' },
};
```

## External Setup Required (NOT code — manual configuration)

### RevenueCat Dashboard
1. Create RevenueCat account + project ("IdeaFuel")
2. Connect App Store Connect (shared secret) and Google Play Console (service account JSON)
3. Create 4 products matching store product IDs
4. Create 1 entitlement: "premium"
5. Attach all 4 products to the "premium" entitlement
6. Create offering "default" with all 4 packages (one per tier)
7. Set webhook URL to `https://app.ideafuel.ai/api/webhooks/revenuecat`
8. Set webhook auth key
9. Copy API keys: public iOS key, public Android key

### App Store Connect
1. Create subscription group "IdeaFuel"
2. Create 4 auto-renewable subscription products:
   - `ideafuel_mobile_monthly` — $7.99
   - `ideafuel_pro_monthly` — $54.99
   - `ideafuel_enterprise_monthly` — $139.99
   - `ideafuel_scale_monthly` — $279.99
3. Subscription group allows upgrade/downgrade between tiers

### Google Play Console
1. Create 4 subscription products with same IDs and corresponding prices

### Environment Variables (new)
- `REVENUECAT_PUBLIC_IOS_KEY` — for mobile SDK (public, safe for client-side)
- `REVENUECAT_PUBLIC_ANDROID_KEY` — for mobile SDK (public, safe for client-side)
- `REVENUECAT_WEBHOOK_AUTH_KEY` — for server webhook verification (secret)

## Non-Functional Requirements
- **Purchase latency**: Native payment sheet — outside our control, typically <5 seconds
- **Webhook latency**: RevenueCat sends within seconds. Max expected: 60 seconds. Manual reconciliation if >24 hours.
- **Security**: Webhook verifies auth key. Server never trusts client-side subscription status for feature gating.

## Constraints
- **No web app changes** except the new RevenueCat webhook route
- **Branch**: `matt/mobile-quick-validation`
- **RevenueCat account + App Store Connect products must exist before SDK can be tested**
- **Expo**: `react-native-purchases` requires dev build (not Expo Go). Works in TestFlight.
- **Existing Stripe**: Web subscriptions continue unchanged. RevenueCat is additive.

## Plan Card Features (UI copy)

### Mobile ($7.99/mo)
- 10 quick validation cards/month
- AI-powered idea refinement
- Voice & text capture

### Pro ($54.99/mo)
- Everything in Mobile
- 5 Spark reports
- 3 Light interview reports
- 1 In-Depth deep dive
- 10 financial models
- Full research pipeline

### Enterprise ($139.99/mo)
- Everything in Pro
- 10 Spark reports
- 5 Light interview reports
- 2 In-Depth deep dives
- 50 financial models
- Priority support

### Scale ($279.99/mo)
- Everything in Enterprise
- Expand pipeline access
- 100 financial models
- Adjacency scan & competitor portfolio
- Demand mining & pricing ceiling
- Opportunity scorecard

## Open Questions
None — all resolved.
