# Phase 2 Handoff: RevenueCat Webhook Handler (Server)
**Plan:** mobile-subscriptions-plan-2026-03-27.md
**Phase:** 2 of 3
**Status:** COMPLETE
**Built by:** Builder
**Date:** 2026-03-27

## What Was Built

### 1. RevenueCat Webhook Route (`packages/web/src/app/api/webhooks/revenuecat/route.ts`) — NEW FILE
- Next.js API route with `export async function POST(request: Request)` pattern
- Mirrors the structure of the Stripe webhook handler at `packages/web/src/app/api/webhooks/stripe/route.ts`

### 2. Authorization Verification
- Reads `REVENUECAT_WEBHOOK_AUTH_KEY` from env
- Compares `Authorization` header against `Bearer ${authKey}`
- Returns 401 for auth failure, 500 if env var is not set

### 3. Event Parsing
- Parses JSON body, extracts `body.event` object
- Destructures `event.type`, `event.app_user_id`, `event.product_id`, `event.expiration_at_ms`
- Returns 400 for malformed JSON or missing event object

### 4. Event Handlers (6 handled, unknown logged)

| Event Type | DB Action | Audit Action |
|------------|-----------|--------------|
| `INITIAL_PURCHASE` | Maps product → tier via `REVENUECAT_PRODUCT_MAP`, updates `subscription` + `stripeCurrentPeriodEnd` | `SUBSCRIPTION_CHANGE` |
| `RENEWAL` | Updates `stripeCurrentPeriodEnd` only | `SUBSCRIPTION_RENEWAL` |
| `PRODUCT_CHANGE` | Maps new product → new tier, updates `subscription` + `stripeCurrentPeriodEnd` | `SUBSCRIPTION_CHANGE` |
| `CANCELLATION` | No DB change (user keeps access until period end) | `SUBSCRIPTION_CANCELLATION` |
| `EXPIRATION` | Sets `subscription = 'FREE'`, clears `stripeCurrentPeriodEnd` | `SUBSCRIPTION_CHANGE` |
| `BILLING_ISSUE_DETECTED` | No DB change | `SUBSCRIPTION_BILLING_ISSUE` |
| Unknown events | No DB change, logged to console | None |

### 5. User Not Found Handling
- All event handlers check if `app_user_id` exists in the DB
- If user not found: logs `console.warn` with event type + userId, returns early (handler returns, POST returns 200)
- If `app_user_id` is empty/missing in the event: logs warning, returns 200

### 6. Audit Logging
- Uses identical `logAudit` helper as Stripe webhook (inserts into `schema.auditLogs`)
- All audit entries include `source: 'revenuecat_webhook'` in metadata
- Includes `previousTier`, `newTier`, `productId`, and `event` type in metadata

### 7. Error Handling
- 200: Successful processing (including unknown events and unknown users)
- 400: Malformed JSON or missing event object
- 401: Authorization failure
- 500: Env var not configured or unhandled server error in event processing

## Verification

- `pnpm -C packages/web exec tsc --noEmit` passes with zero errors
- All 6 specified event types have dedicated handlers
- Unknown events logged + return 200 (default case in switch)
- Unknown users (not in DB) logged with `console.warn` + return 200
- All events produce audit log entries with `source: 'revenuecat_webhook'`
- Imports from `@forge/shared` (`REVENUECAT_PRODUCT_MAP`, `SubscriptionTier`) and `@forge/server` (`db`, `schema`) resolve correctly

## Files Changed

| File | Change |
|------|--------|
| `packages/web/src/app/api/webhooks/revenuecat/route.ts` | NEW: Full RevenueCat webhook handler |

## Notes for Phase 3
- The webhook endpoint is `POST /api/webhooks/revenuecat` — this URL needs to be configured in the RevenueCat dashboard
- The `REVENUECAT_WEBHOOK_AUTH_KEY` env var must be set in the deployment environment
- The webhook reuses `stripeCurrentPeriodEnd` for RevenueCat expiration dates (as designed in the plan)
- RevenueCat subscribers will NOT have `stripeSubscriptionId` set — the Phase 1 billing fix already handles this
- The mobile SDK (Phase 3) will trigger these webhooks when users make purchases
