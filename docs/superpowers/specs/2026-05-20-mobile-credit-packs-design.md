# Credit Packs & Pure-Credit Architecture Design

## Overview

Adds a unified pay-as-you-go credit system to IdeaFuel, replacing the per-feature monthly counters with a single global credit balance. Each subscription tier grants a monthly credit allowance; users buy credit packs (Stripe on web, RevenueCat IAP on mobile) for additional usage. Credits are consumed by AI-powered features that have variable per-call cost: validation cards (2 credits) and sketches (1 credit). The architecture follows industry standard for credit-based AI products (OpenAI, Replicate, Runway, ElevenLabs): append-only ledger as source of truth, denormalized balance cache, two-level webhook idempotency, and inline paywalls at action buttons.

This consolidates the existing `creditTransactions` schema scaffolding (present in DB but unused) and retires the `users.mobileCardCount` per-feature counter.

## Goals

- Single global credit balance per user, usable across web and mobile
- Pay-as-you-go top-ups via RevenueCat consumables (iOS, Android) and Stripe Checkout (web)
- Tier-driven monthly credit grants that expire (use-it-or-lose-it); purchased credits never expire (Apple compliance)
- Production-grade webhook handling: signature verification, dedup, idempotent grants, refund support
- Inline paywall UX: cost shown at the action button, native purchase sheet at exhaustion
- No disruption to existing free-card and mobile-card UX (one-time migration)

## Non-Goals (defer to phase 2)

- Auto top-up / overage billing
- Credit gifting, team credit pools, referral grants, promo codes
- Yearly subscription pricing
- Negative-balance abuse handling beyond a simple floor (small refund-after-spend losses are absorbed)
- Web-to-mobile subscription migration (already addressed by existing subscriptions work)
- Adding credit gating to Spark / Light / In-Depth / Financial Model operations (those stay tier-gated; their API cost is bounded by tier limits)

## Credit Economy

### Per-operation cost

| Operation | Cost | Worst-case API cost | Per-credit cost |
|---|---|---|---|
| Validation card | 2 credits | ~$0.08 | $0.04 |
| Sketch | 1 credit | ~$0.05 | $0.05 |

Credit costs are shown at the action button before commit ("Generate sketch — 1 credit", "Validate idea — 2 credits") so users never spend without seeing the cost.

### Monthly tier grants

Granted on the user's subscription billing-cycle anchor. Reset on next anchor — unused credits from the tier grant expire. Purchased credits are tracked separately and never expire.

| Tier | Monthly grant | Equivalent in cards | Equivalent in sketches |
|---|---|---|---|
| FREE | 5 (one-time at signup, never resets) | 2 | 5 |
| MOBILE | 50 / month | 25 | 50 |
| PRO | 75 / month | 37 | 75 |
| ENTERPRISE | 200 / month | 100 | 200 |
| SCALE | 600 / month | 300 | 600 |
| TESTER | 1000 / month | 500 | 1000 |

When ordering ledger entries for balance calculation, expired tier-grant credits are excluded.

### Credit packs

Identical pricing on both platforms. Apple takes 30% (15% after year 1 for subscriptions, but consumables stay at 30%). Stripe takes ~3% + $0.30. Pricing matches across rails for simplicity, even though the web margin is ~25 percentage points better.

| Pack | Credits | Price | Worst-case margin (mobile) | Worst-case margin (web) |
|---|---|---|---|---|
| Small | 25 | $4.99 | 64% | 92% |
| Medium | 60 | $9.99 | 57% | 89% |
| Large | 150 | $19.99 | 46% | 87% |
| Bulk | 400 | $49.99 | 43% | 86% |

Worst-case assumes 100% sketch consumption (1 credit, $0.05). Realistic margins are ~10 percentage points higher since cards (the majority of credit burn) cost $0.04 per credit.

### Anti-steering compliance

Per Apple App Review Guideline 3.1.3(b), credits purchased via IAP can be consumed on the web, and credits purchased via Stripe can be consumed in the iOS app. **The iOS app must not advertise, link to, or hint at the web purchase option** (except inside the US storefront, where post-Epic rules permit external linking — out of scope for v1). Web app freely advertises Stripe purchase.

## Database Schema

### `creditLedger` (new, replaces `creditTransactions`)

Append-only ledger. Never updated, never deleted. Refunds insert new opposite-direction entries referencing the original.

```ts
{
  id: uuid PRIMARY KEY
  userId: text NOT NULL FK -> users.id (CASCADE)
  amount: integer NOT NULL CHECK (amount > 0)         // always positive
  direction: enum('debit', 'credit') NOT NULL         // debit decreases balance, credit increases it
  reason: enum(
    'purchase',         // user bought a pack
    'tier_grant',       // monthly subscription grant
    'starter',          // FREE-tier signup grant
    'consumption',      // user spent credits on an operation
    'refund',           // credits restored after failed operation or pack refund
    'admin_adjust',     // manual support adjustment
  ) NOT NULL
  referenceType: text NOT NULL                        // 'stripe_event' | 'revenuecat_event' | 'sketch' | 'spark_card' | 'subscription_cycle' | 'manual'
  referenceId: text NOT NULL                          // event ID, generation ID, billing cycle ID, etc.
  idempotencyKey: text UNIQUE NOT NULL                // = referenceType + ':' + referenceId
  expiresAt: timestamp NULL                           // set only for tier_grant; NULL for purchase/starter/admin
  createdAt: timestamp NOT NULL DEFAULT NOW()
  metadata: jsonb NULL                                // free-form context (pack SKU, prorated bool, etc.)
}
```

Indexes:
- `(userId, createdAt DESC)` for history queries
- `(userId, expiresAt)` for balance calculation (partial: WHERE direction='credit' AND reason='tier_grant')
- `(idempotencyKey)` UNIQUE for dedup
- `(referenceType, referenceId)` for refund lookup

### `users.creditBalance` (existing column, kept)

Denormalized cache. Always recomputable from ledger:

```sql
SELECT COALESCE(SUM(
  CASE WHEN direction = 'credit' THEN amount ELSE -amount END
), 0)
FROM credit_ledger
WHERE user_id = $1
  AND (expires_at IS NULL OR expires_at > NOW())
```

Updated in the same transaction as every ledger insert. A reconciliation cron job recomputes the cache nightly and logs any drift to alert on bugs.

### `processedWebhookEvents` (new)

Handler-level dedup. Separate from ledger idempotency (defense in depth).

```ts
{
  provider: enum('stripe', 'revenuecat') NOT NULL
  eventId: text NOT NULL
  receivedAt: timestamp NOT NULL DEFAULT NOW()
  PRIMARY KEY (provider, eventId)
}
```

Rows older than 90 days pruned by a cron job.

### `users.mobileCardCount`, `users.mobileCardResetAt` (existing, deprecated)

Kept in schema for one release cycle (rollback safety), but unread after migration. Removed in a follow-up migration once the ledger has run cleanly in production for 30 days.

## Server Architecture

### `packages/server/src/lib/credit-ledger.ts` (new)

Single source of truth for all credit operations. Every consumer in the codebase calls these functions; no direct ledger inserts elsewhere.

```ts
async function getBalance(userId: string, tx?: DbTransaction): Promise<number>

async function consumeCredits(
  userId: string,
  amount: number,
  refType: 'sketch' | 'spark_card',
  refId: string,
  tx?: DbTransaction
): Promise<{ balanceAfter: number; ledgerId: string }>
// Throws TRPCError('FORBIDDEN', 'INSUFFICIENT_CREDITS') if balance < amount.
// Idempotent: re-calling with same (refType, refId) is a no-op that returns the original result.

async function grantCredits(
  userId: string,
  amount: number,
  reason: 'purchase' | 'tier_grant' | 'starter' | 'admin_adjust',
  refType: string,
  refId: string,
  options?: { expiresAt?: Date; metadata?: Record<string, unknown> }
): Promise<{ balanceAfter: number; ledgerId: string }>
// Idempotent by (refType, refId).

async function refundCredits(
  refType: string,
  refId: string,
  reason?: string
): Promise<{ refunded: boolean }>
// Finds the original consumption entry, inserts matching credit entry. Idempotent.
```

All three functions:
1. Open (or join) a DB transaction
2. `SELECT ... FOR UPDATE` the user row
3. Insert ledger entry (UNIQUE constraint on `idempotencyKey` provides idempotency)
4. Update `users.creditBalance` atomically
5. Commit

### `packages/server/src/routers/credit.ts` (new)

tRPC procedures:

- `getBalance` — returns `{ balance: number, expiringCredits: { amount, expiresAt }[] }`
- `getHistory({ limit, cursor })` — paginated ledger view
- `listPacks()` — returns the 4 pack definitions (from shared constants)
- `createStripeCheckoutSession({ packId })` — returns `{ url }`. Mode: `payment` (not subscription). Metadata: `{ userId, packId, purpose: 'credit_pack' }`. Success URL: `/credits/success?session_id={CHECKOUT_SESSION_ID}`. Cancel URL: `/credits/cancel`.

### `packages/server/src/jobs/tier-grant-cron.ts` (new)

Scheduled BullMQ job (runs hourly; matches existing worker architecture on Railway). Both Stripe and RevenueCat subscribers store their cycle anchor in `users.stripeCurrentPeriodEnd` (the existing billing router unifies both sources into this column — see [packages/server/src/routers/billing.ts:155-160](packages/server/src/routers/billing.ts#L155-L160)). Each run iterates active subscriptions whose `stripeCurrentPeriodEnd` crosses the past hour, inserts a `tier_grant` ledger entry with `expiresAt = nextCycleAnchor` (cycle anchor + 1 month). Idempotency key: `subscription_cycle:${userId}:${cycleStartIso}` — re-running the job is safe.

On tier upgrade mid-cycle: trigger an immediate prorated grant via Stripe / RevenueCat subscription update webhook handlers. Proration formula: `floor((newTierGrant - oldTierGrant) * daysRemainingInCycle / daysInCycle)`.

On tier downgrade: no clawback (user keeps the existing grant until cycle end).

### Refactor: `packages/server/src/routers/sparkCard.ts`

Replace the `mobileCardCount` state machine in the `validate` mutation with:

```ts
// Replace the entire transaction block (lines ~107-216):
await consumeCredits(ctx.userId, 2, 'spark_card', projectId, tx);
```

The `freeCardUsed` flag is also retired. Free starter behavior is now handled by the FREE-tier 5-credit starter grant (covers 2 cards or 5 sketches).

Failure path: replace `await refundCard(...)` with `await refundCredits('spark_card', projectId)`.

### Refactor: `packages/server/src/routers/sketch.ts`

Add at top of `generate` mutation:

```ts
const consumption = await consumeCredits(ctx.userId, 1, 'sketch', sketchId, tx);
// ... existing Gemini call ...
// On failure:
await refundCredits('sketch', sketchId);
```

`sketchId` must be generated BEFORE the consume call (move `crypto.randomUUID()` to the top of the mutation).

### Webhook: RevenueCat (`packages/web/src/app/api/webhooks/revenuecat/route.ts`)

Add to existing handler:

1. **Verify signature** (existing).
2. **Dedup**: `INSERT INTO processed_webhook_events (provider, event_id) ON CONFLICT DO NOTHING RETURNING event_id`. If no row returned (conflict), respond 200 and exit.
3. **Branch on `event.type`**:
   - Existing subscription cases unchanged.
   - **New**: `INITIAL_PURCHASE` or `NON_RENEWING_PURCHASE` with `product_id` matching `REVENUECAT_CREDIT_PACK_MAP`:
     ```ts
     const pack = REVENUECAT_CREDIT_PACK_MAP[event.product_id];
     await grantCredits(
       userId,
       pack.credits,
       'purchase',
       'revenuecat_event',
       event.transaction_id,
       { metadata: { productId: event.product_id, store: event.store } }
     );
     ```
   - **New**: `CANCELLATION` with `cancellation_reason='CUSTOMER_SUPPORT'` AND original event was a consumable purchase:
     ```ts
     await refundCredits('revenuecat_event', event.original_transaction_id, 'apple_refund');
     ```
4. **Respond 200**.

Failure handling: any error before final 200 → respond 5xx, RevenueCat retries with exponential backoff for 72 hours.

### Webhook: Stripe (`packages/web/src/app/api/webhooks/stripe/route.ts`)

Add to existing handler:

1. **Verify signature** (existing).
2. **Dedup** via `processed_webhook_events` (same pattern as RevenueCat).
3. **Branch on `event.type`**:
   - Existing subscription cases unchanged.
   - **New**: `checkout.session.completed` with `mode='payment'` AND `metadata.purpose='credit_pack'`:
     ```ts
     const session = event.data.object;
     const packId = session.metadata.packId;
     const userId = session.metadata.userId;
     const pack = CREDIT_PACK_MAP[packId];
     await grantCredits(
       userId,
       pack.credits,
       'purchase',
       'stripe_event',
       session.id,
       { metadata: { packId, paymentIntentId: session.payment_intent } }
     );
     ```
   - **New**: `charge.refunded` referencing a credit-pack payment intent:
     ```ts
     // Look up original ledger entry by referenceId = session_id; insert refund.
     await refundCredits('stripe_event', sessionId, 'stripe_refund');
     ```
4. **Respond 200**.

### Reconciliation endpoint

`POST /api/credits/reconcile` (protected admin route) — fetches user's RevenueCat transaction history and Stripe payment intents, compares against ledger, and inserts any missing grants. Run manually if a user reports missing credits.

## Mobile UX (Expo / React Native)

### Header credit chip

Persistent in app shell, visible on Capture, Sketch, Validate, and Sandbox tabs. Shows `[💎 42]`. Tap navigates to `(modals)/credits/buy`.

Component: `packages/mobile/src/components/ui/CreditChip.tsx`. Reads from a tRPC subscription/poll of `credit.getBalance` (5-minute stale time, refetched on focus).

### Action button cost preview

Reusable `CostButton` component. Default state shows cost: `[Validate idea — 2 credits]`. When `balance < cost`:

- Button transforms to: `[Buy 25 credits — $4.99]`
- Tap triggers native IAP sheet via RevenueCat's `purchasePackage()`
- On successful purchase, button reverts to original cost preview; user can now tap again to execute the action

Component: `packages/mobile/src/components/ui/CostButton.tsx`. Props: `cost: number`, `label: string`, `onPress: () => void`.

### Low-balance warning

When `balance < 5`, the header chip turns subtle amber. Tap behavior unchanged.

### Buy Credits screen

Route: `packages/mobile/src/app/credits/buy.tsx`. Presented modally via Expo Router stack `presentation: 'modal'` option (matches existing modal patterns in the mobile app).

Content:
- Current balance (large)
- 4 pack cards in a vertical stack: credits, price, "per credit" sublabel
- Tap a card → native IAP sheet
- Footer: "Need help? Restore Purchases" button → calls `Purchases.restorePurchases()`, shows toast: "Consumable credit packs cannot be restored. If you're missing credits from a recent purchase, contact support."

Component: `packages/mobile/src/app/credits/buy.tsx`.

### Plans screen update

`packages/mobile/src/app/settings/plans.tsx`: replace "10 quick validation cards/month" copy with "50 credits/month — 25 cards or 50 sketches" (scale per tier). Add "Buy credit pack" button at bottom.

### iOS-specific UI scrubbing

- No "buy on web" text anywhere in the iOS bundle
- No `Linking.openURL('https://ideafuel.ai/credits')` from iOS code paths
- The web app's `/credits` page renders Stripe checkout; iOS uses RevenueCat only

## Web UX

### Header credit balance

Persistent next to user menu in app shell ([packages/web/src/components/layout/AppShell.tsx](packages/web/src/components/layout/AppShell.tsx) or equivalent). Tap → `/credits`.

### `/credits` page (new)

`packages/web/src/app/credits/page.tsx`. Server component. Shows:
- Current balance + breakdown of expiring tier credits
- 4 pack cards with Stripe Checkout buttons
- Ledger history (recent 50 entries) via tRPC

Pack tap → calls `credit.createStripeCheckoutSession`, redirects to Stripe.

### Success / cancel pages

- `/credits/success` — confirms purchase, links back to `/credits`
- `/credits/cancel` — shows cancellation message, links back

### Action button cost preview (web)

Equivalent to mobile pattern on sketch + validate flows. On exhaustion, opens modal with "Buy credits" → Stripe Checkout.

## Migration

### One-time migration

Database migration job, run in the same deploy as the consumption-logic flip:

```ts
// For each user with mobileCardCount > 0 OR freeCardUsed = false:
const starterCredits = user.freeCardUsed ? 0 : 5;
const cardCredits = user.mobileCardCount * 2;
const totalGrant = starterCredits + cardCredits;

if (totalGrant > 0) {
  await grantCredits(
    user.id,
    totalGrant,
    'starter',
    'migration',
    `2026-05-20:${user.id}`,
    { metadata: { previousCardCount: user.mobileCardCount, freeCardUsed: user.freeCardUsed } }
  );
}
```

Then deploy the new `sparkCard.ts` that calls `consumeCredits`. Existing in-flight card validations finish on the old logic (small window of dual-mode, ~30 seconds).

Existing PRO/ENTERPRISE/SCALE/MOBILE subscribers get their first monthly tier grant from the cron job on their next billing-cycle anchor (no immediate retroactive grant — they already have whatever was in their card counter, converted above).

### New-user signup grant

User-creation logic (Auth.js callback on web, expo-auth-session signup flow on mobile) inserts a `starter` ledger entry of `FREE_STARTER_GRANT` (5 credits) with idempotency key `starter:${userId}`. This is the only path that grants starter credits — the migration handles existing users, the signup hook handles new users.

## Constants & Configuration

### `packages/shared/src/constants/credits.ts` (new)

```ts
export const CREDIT_OP_COSTS = {
  validation_card: 2,
  sketch: 1,
} as const;

export const TIER_MONTHLY_GRANT: Record<SubscriptionTier, number> = {
  FREE: 0,        // starter is one-time, not monthly
  MOBILE: 50,
  PRO: 75,
  ENTERPRISE: 200,
  SCALE: 600,
  TESTER: 1000,
};

export const FREE_STARTER_GRANT = 5;

export const CREDIT_PACKS = [
  { id: 'pack_25',  credits: 25,  priceUsd: 4.99 },
  { id: 'pack_60',  credits: 60,  priceUsd: 9.99 },
  { id: 'pack_150', credits: 150, priceUsd: 19.99 },
  { id: 'pack_400', credits: 400, priceUsd: 49.99 },
] as const;

export const REVENUECAT_CREDIT_PACK_MAP: Record<string, { credits: number; packId: string }> = {
  ideafuel_credits_25:  { credits: 25,  packId: 'pack_25' },
  ideafuel_credits_60:  { credits: 60,  packId: 'pack_60' },
  ideafuel_credits_150: { credits: 150, packId: 'pack_150' },
  ideafuel_credits_400: { credits: 400, packId: 'pack_400' },
};

export const STRIPE_CREDIT_PACK_PRICE_IDS: Record<string, string | undefined> = {
  pack_25:  process.env.STRIPE_PRICE_CREDITS_25,
  pack_60:  process.env.STRIPE_PRICE_CREDITS_60,
  pack_150: process.env.STRIPE_PRICE_CREDITS_150,
  pack_400: process.env.STRIPE_PRICE_CREDITS_400,
};
```

### External configuration

- **App Store Connect**: 4 consumable products (`ideafuel_credits_25`, `_60`, `_150`, `_400`) at $4.99, $9.99, $19.99, $49.99
- **Google Play Console**: same 4 SKUs at same prices
- **RevenueCat dashboard**: products linked to a new "Credits" entitlement (non-blocking — not actually used to gate features, but useful for analytics)
- **Stripe dashboard**: 4 one-time Products with Prices, IDs stored in env vars

### New environment variables

```
STRIPE_PRICE_CREDITS_25=price_xxx
STRIPE_PRICE_CREDITS_60=price_xxx
STRIPE_PRICE_CREDITS_150=price_xxx
STRIPE_PRICE_CREDITS_400=price_xxx
```

## Edge Cases & Error Handling

- **User exhausts balance mid-operation**: not possible — consume happens before the API call. If balance is insufficient, action button shows "Buy credits" instead of "Generate".
- **API call fails after credits consumed**: refund called automatically. Refund is idempotent.
- **Concurrent consume races**: `SELECT FOR UPDATE` lock on user row serializes consumption.
- **Webhook delivered twice**: dedup via `processed_webhook_events`, and ledger idempotency key as backstop.
- **Webhook delivered out of order**: refund-before-purchase is impossible (refund references original); purchase-out-of-order is fine since balance is commutative.
- **User refunds a pack after spending the credits**: balance goes negative. Floor at -10 credits; below that, all consume operations throw `INSUFFICIENT_CREDITS` until balance recovers (next monthly grant or new purchase). Admin alert if balance ever goes below -10.
- **Tier downgrade with positive balance**: user keeps current credits; no future grants until they re-upgrade. Purchased credits still spendable.
- **Tier upgrade mid-cycle**: prorated grant inserted immediately.
- **Stripe webhook arrives before mobile RevenueCat webhook for the same user purchasing on both platforms simultaneously**: both grants apply independently. Both have unique idempotency keys (different `referenceType`).
- **Ledger ↔ balance drift**: nightly recompute job logs drift, auto-repairs if discrepancy < 50 credits, alerts if larger.

## Files Touched

### New files

**Server:**
- `packages/server/src/lib/credit-ledger.ts`
- `packages/server/src/routers/credit.ts`
- `packages/server/src/jobs/tier-grant-cron.ts`
- `packages/server/src/jobs/ledger-reconcile-cron.ts`
- `packages/server/src/db/migrations/XXXX_credit_ledger.sql`

**Shared:**
- `packages/shared/src/constants/credits.ts`

**Mobile:**
- `packages/mobile/src/app/credits/buy.tsx`
- `packages/mobile/src/components/ui/CreditChip.tsx`
- `packages/mobile/src/components/ui/CostButton.tsx`

**Web:**
- `packages/web/src/app/credits/page.tsx`
- `packages/web/src/app/credits/success/page.tsx`
- `packages/web/src/app/credits/cancel/page.tsx`
- `packages/web/src/components/credits/CreditChip.tsx`
- `packages/web/src/components/credits/PackCard.tsx`

### Modified files

**Server:**
- `packages/server/src/db/schema.ts` — add `creditLedger`, `processedWebhookEvents`; keep `creditTransactions` deprecated; keep `users.mobileCardCount` for rollback safety
- `packages/server/src/routers/sparkCard.ts` — replace state machine with `consumeCredits` / `refundCredits`
- `packages/server/src/routers/sketch.ts` — add `consumeCredits` before generate, `refundCredits` on failure
- `packages/server/src/routers/index.ts` — register `creditRouter`
- `packages/server/src/worker.ts` — register `tier-grant-cron` and `ledger-reconcile-cron` schedulers
- `packages/web/src/app/api/webhooks/revenuecat/route.ts` — add consumable purchase + refund handlers, dedup
- `packages/web/src/app/api/webhooks/stripe/route.ts` — add credit-pack purchase + refund handlers, dedup
- `packages/web/src/lib/auth/config.ts` — Auth.js `signIn` callback grants `FREE_STARTER_GRANT` on first sign-in

**Shared:**
- `packages/shared/src/constants/revenuecat.ts` — add 4 credit-pack product IDs

**Mobile:**
- `packages/mobile/src/lib/purchases.ts` — add `purchaseCreditPack(packId)` method
- `packages/mobile/src/app/settings/plans.tsx` — update copy, add Buy Credits link
- `packages/mobile/src/components/ui/Paywall.tsx` — update to show credit packs alongside subscription tiers

## Risks

- **App Store review:** Selling credits via Stripe on web for use in iOS is explicitly allowed under Guideline 3.1.3(b), but the iOS app must not link out or hint at web purchase. *Mitigation:* strict pre-submission code review of mobile Buy Credits screen; no string `ideafuel.ai/credits` anywhere in mobile bundle.
- **Refund abuse:** Apple/Google issue refunds asynchronously; a user could spend credits then refund. *Mitigation:* negative-balance floor at -10 credits; freeze new consumption until recovered. Admin dashboard surfaces all users with negative balance.
- **Webhook reliability:** A dropped webhook means a paid user has no credits. *Mitigation:* RevenueCat retries 72hr, Stripe retries 3 days. Reconciliation endpoint lets support manually replay. Nightly drift detection.
- **Migration window:** Existing users with `mobileCardCount > 0` mid-month need state converted without disruption. *Mitigation:* migration job runs in same deploy as consumption-logic flip; ~30 second dual-mode window is acceptable. Migration is idempotent — re-running it is a no-op due to ledger unique constraint.
- **Pricing parity attack:** A user could buy Stripe packs on web while subscribed to MOBILE tier on iOS (mobile price = web price, so no arbitrage). No mitigation needed.

## Open Questions

None — all major design decisions resolved during brainstorm. Implementation plan will surface execution-level questions.
