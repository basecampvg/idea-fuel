# Phase 1 Handoff: Shared Types + DB Schema (Foundation)
**Plan:** mobile-quick-validation-plan-2026-03-26.md
**Phase:** 1 of 3
**Status:** COMPLETE
**Built by:** Builder
**Date:** 2026-03-26

## What Was Built

### 1. Shared Types (`packages/shared/src/types/index.ts`)
- Added `CardResult` interface with all fields from spec: verdict, summary, problemSeverity, marketSignal, tamEstimate, competitors, biggestRisk, nextExperiment, citations, rawResponse
- Added `CardChatMessage` interface: role ('assistant' | 'user'), content
- Added `MOBILE` to `SubscriptionTier` union type

### 2. Shared Constants (`packages/shared/src/constants/subscription.ts`)
- Added `MOBILE` tier to `SUBSCRIPTION_FEATURES` with: no report limits (all 0), no financial models, no report tier access, no interview modes, standard AI quality
- Added `MOBILE` tier to `SUBSCRIPTION_PRICING`: $5.99/month USD

### 3. Shared Constants (`packages/shared/src/constants/index.ts`)
- Added `MOBILE` to `SUBSCRIPTION_TIER_LABELS`: "Mobile"
- Added `MOBILE` to `SUBSCRIPTION_TIER_DESCRIPTIONS`: "Mobile quick validation cards"

### 4. Shared Validators (`packages/shared/src/validators/index.ts`)
- Added `MOBILE` to `subscriptionTierSchema` z.enum
- Added `cardChatMessageSchema`: role enum + content (min 1, max 500)
- Added `chatCardSchema`: projectId + turn (int, 0-3) + message (max 500, default '')
- Added `validateCardSchema`: projectId + chatMessages array (min 1, max 10)
- Added `promoteCardSchema`: projectId
- Added `cardResultSchema`: full Zod schema matching CardResult interface with all nested objects
- Exported inferred types: `CardChatMessageInput`, `ChatCardInput`, `ValidateCardInput`, `PromoteCardInput`, `CardResultInput`

### 5. DB Schema (`packages/server/src/db/schema.ts`)
- Added `MOBILE` to `subscriptionTierEnum` pgEnum
- Added to users table:
  - `freeCardUsed` (`free_card_used`): boolean, default false, NOT NULL
  - `mobileCardCount` (`mobile_card_count`): integer, default 0, NOT NULL
  - `mobileCardResetAt` (`mobile_card_reset_at`): timestamp(3), nullable
- Added to projects table:
  - `promoted`: boolean, default false, NOT NULL
  - `promotedAt` (`promoted_at`): timestamp(3), nullable
  - `cardResult` (`card_result`): jsonb, nullable

### 6. Drizzle Migration
- Generated: `packages/server/drizzle/0010_fair_alex_power.sql`
- Contains: `ALTER TYPE "SubscriptionTier" ADD VALUE 'MOBILE'` + `ALTER TABLE` for all 6 new columns with correct defaults

### 7. Ripple Fixes (not in original checklist)
- Added `MOBILE` to all 18 entries in `AI_PRESETS` in `packages/server/src/lib/openai.ts` (matched FREE tier values)
- Added `MOBILE` to `TIER_STYLES` in `packages/web/src/components/layout/top-nav-bar.tsx`
- Added `MOBILE` to `tierIcons` and `tierColors` in `packages/web/src/components/subscription/tier-card.tsx`

## Verification Results
- `pnpm --filter @forge/shared exec tsc --noEmit` — PASS (0 errors)
- `pnpm --filter @forge/server exec tsc --noEmit` — PASS (0 errors)
- `pnpm --filter @forge/web exec tsc --noEmit` — PASS (only pre-existing `.next/types` stale artifact errors, no new errors)
- Migration SQL verified: correct ALTER TYPE + ALTER TABLE statements with proper defaults

## Deviations from Plan
1. **Additional files modified:** The plan did not anticipate that adding `MOBILE` to the `SubscriptionTier` type would break `Record<SubscriptionTier, ...>` maps in the web package (`top-nav-bar.tsx`, `tier-card.tsx`) and the `AI_PRESETS` map in `openai.ts`. These were fixed to maintain type safety.
2. **SUBSCRIPTION_PRICING updated:** Added MOBILE tier pricing ($5.99/month) to `SUBSCRIPTION_PRICING` for consistency, even though the plan only mentioned `SUBSCRIPTION_FEATURES`.
3. **SUBSCRIPTION_TIER_LABELS/DESCRIPTIONS updated:** Added MOBILE entries for runtime label lookups.

## What Phase 2 Needs to Know
- `CardResult` and `CardChatMessage` types are exported from `@forge/shared`
- Zod schemas for all sparkCard endpoints are ready: `chatCardSchema`, `validateCardSchema`, `promoteCardSchema`, `cardResultSchema`
- DB columns exist but migration has NOT been applied to any database yet — Phase 2 should run migration before testing
- The `cardResult` column on projects is typed as `jsonb` — the router should cast it to `CardResult` when reading and validate with `cardResultSchema` when writing
- User columns `freeCardUsed`, `mobileCardCount`, `mobileCardResetAt` are ready for the eligibility logic
- Project columns `promoted`, `promotedAt`, `cardResult` are ready for the sparkCard router

## Files Modified
- `packages/shared/src/types/index.ts` — CardResult, CardChatMessage, MOBILE tier
- `packages/shared/src/constants/subscription.ts` — MOBILE in SUBSCRIPTION_FEATURES + SUBSCRIPTION_PRICING
- `packages/shared/src/constants/index.ts` — MOBILE in tier labels/descriptions
- `packages/shared/src/validators/index.ts` — sparkCard Zod schemas + MOBILE in subscriptionTierSchema
- `packages/server/src/db/schema.ts` — MOBILE enum value + user/project columns
- `packages/server/src/lib/openai.ts` — MOBILE in AI_PRESETS
- `packages/web/src/components/layout/top-nav-bar.tsx` — MOBILE in TIER_STYLES
- `packages/web/src/components/subscription/tier-card.tsx` — MOBILE in tierIcons/tierColors

## Files Created
- `packages/server/drizzle/0010_fair_alex_power.sql` — migration
