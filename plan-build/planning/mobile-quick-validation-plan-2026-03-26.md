# Build Plan: Mobile Quick Validation Cards
**Created:** 2026-03-26
**Spec:** plan-build/specs/mobile-quick-validation-spec-2026-03-26.md
**Brainstorm:** plan-build/brainstorm/mobile-quick-validation-brainstorm-2026-03-26.md
**Status:** Draft
**Project type:** Existing codebase
**Branch:** matt/mobile-quick-validation

## Overview
Build a lightweight mobile validation feature that uses Perplexity Sonar Pro to produce quick "validation cards" for business ideas. Free users get 1 card, paid mobile users ($5.99/mo stubbed) get 10/mo. Cards upsell to the full IdeaFuel web app via an "Unlock Full Research" deep link. No changes to the web app.

## Component Inventory

| ID | Component | Package | Inputs | Outputs | External Deps |
|----|-----------|---------|--------|---------|---------------|
| C1 | Sonar Pro Provider | server | research brief string | raw text + citations | Perplexity API (`sonar-pro`), `PERPLEXITY_API_KEY` |
| C2 | Card AI Service | server | project data + chat msgs | enriched brief, CardResult | Anthropic API (Haiku), `ANTHROPIC_API_KEY` |
| C3 | sparkCard Router | server | tRPC requests | tRPC responses | DB (ctx.db), Auth (ctx.userId) |
| C4 | Eligibility Logic | server | userId, db | boolean + consume/refund | DB transactions |
| C5 | DB Migration | server | N/A | schema changes | Drizzle Kit |
| C6 | Shared Types/Validators | shared | N/A | types, schemas, constants | None |
| C7 | Chat Screen | mobile | projectId | chatMessages array | tRPC client |
| C8 | Loading Screen | mobile | mutation state | navigation to card | None |
| C9 | Card Result Screen | mobile | CardResult data | promote action, URL open | RN Linking API |
| C10 | Paywall Screen | mobile | trigger event | toast or URL open | RN Linking API |
| C11 | Vault Detail Mods | mobile | project data | navigation to chat/card | tRPC client |

## Flow 0: Signup → First Use

### Account Creation
- **Trigger:** Google OAuth via `expo-auth-session` → `POST /api/auth/mobile/google`
- **Persisted:** User row in `User` table (id, email, name, image, subscription='FREE', freeCardUsed=false, mobileCardCount=0, mobileCardResetAt=null)
- **Validations:** Google token verification server-side
- **Response:** `{ token, refreshToken, user }` → stored in `expo-secure-store`

### Tenant Provisioning
- N/A — single-tenant, user-scoped data only

### Initial State
- **Empty state?** Yes — vault is empty, capture screen shown as default tab
- **Seed data:** None. User captures first idea via voice/text.

### First Productive Action (Quick Validation)
- **Action:** User captures idea → navigates to vault → taps idea → taps "Quick Validate"
- **Trace:** [Mobile] Quick Validate tap → eligibility check (inline) → [Mobile] Chat screen → 3 Q&A turns → [Mobile] calls `sparkCard.validate` mutation → [Server] tRPC `sparkCard.validate` → decrement `mobileCardCount` or flip `freeCardUsed` (DB transaction) → build research brief → call Perplexity Sonar Pro → call Anthropic Haiku extraction → save `cardResult` to project record → return `CardResult` → [Mobile] navigate to card result screen → render card
- **Proves:** Auth works cross-platform, DB writes/reads work, external API calls work (Sonar Pro + Haiku), card consumption/tracking works, card UI renders

### Auth Token Lifecycle
- **Issued at:** Google OAuth exchange response
- **Format:** Opaque server-issued token (not JWT — validated via DB lookup at `/api/auth/mobile/session`)
- **Storage:** `expo-secure-store` keys: `forge_auth_token`, `forge_refresh_token`
- **Sent via:** `Authorization: Bearer {token}` header on every tRPC request (injected in `trpc.ts` httpBatchLink)
- **Expiry:** Refresh token based. Session validated on app load with 5s timeout.

## Integration Contracts

### IC1: Mobile → sparkCard.chat
```
Source: Mobile chat screen (C7)
Target: sparkCard tRPC router (C3)
What flows: { projectId: string, turn: number, message: string }
How: tRPC mutation via httpBatchLink
Auth: Bearer token in header → ctx.userId via protectedProcedure
Response: { question?: string, complete: boolean }
Error path: TRPCError → mutation.error → show toast on mobile
```

### IC2: Mobile → sparkCard.validate
```
Source: Mobile chat screen (C7) after 3 turns complete
Target: sparkCard tRPC router (C3)
What flows: { projectId: string, chatMessages: CardChatMessage[] }
How: tRPC mutation via httpBatchLink
Auth: Bearer token → ctx.userId
Response: { cardResult: CardResult }
Error path: CARD_LIMIT_REACHED → navigate to paywall. SONAR_TIMEOUT | EXTRACTION_FAILED → show error toast + retry. Card refunded on API failure.
Timeout: 90 seconds (override default tRPC timeout for this call)
```

### IC3: Mobile → sparkCard.promote
```
Source: Card result screen (C9) "Unlock Full Research" button
Target: sparkCard tRPC router (C3)
What flows: { projectId: string }
How: tRPC mutation
Auth: Bearer token → ctx.userId
Response: { webUrl: string }
Error path: TRPCError → toast. On success: Linking.openURL(webUrl)
```

### IC4: sparkCard Router → Sonar Pro Provider
```
Source: sparkCard.validate procedure (C3)
Target: Sonar Pro provider (C1)
What flows: research brief string (enriched idea + chat answers)
How: Direct function call: sonarProResearch(brief) → Promise<{ text: string, citations: string[] }>
Auth: PERPLEXITY_API_KEY env var (already exists, read at provider init)
Error path: Timeout after 60s → throw typed error → router catches, refunds card, returns SONAR_TIMEOUT
```

### IC5: sparkCard Router → Card AI Service (Extraction)
```
Source: sparkCard.validate procedure (C3)
Target: Card AI service extractCardResult() (C2)
What flows: raw Sonar Pro response text
How: Direct function call: extractCardResult(sonarResponse) → Promise<CardResult>
Auth: ANTHROPIC_API_KEY env var (already exists)
Error path: Extraction fails or returns invalid JSON → fall back to raw response card, return partial CardResult with rawResponse populated
```

### IC6: sparkCard Router → DB (Eligibility + Consumption)
```
Source: sparkCard.validate procedure (C3)
Target: users table + projects table via Drizzle ORM (C4/C5)
What flows: Read user.freeCardUsed + user.mobileCardCount + user.mobileCardResetAt. Write: decrement count or flip freeCardUsed. Write: project.cardResult.
How: ctx.db.transaction() — atomic read + write
Auth: ctx.userId from tRPC context
Error path: CARD_LIMIT_REACHED → throw TRPCError({ code: 'FORBIDDEN' })
```

### IC7: Card AI Service → Anthropic SDK
```
Source: Card AI service (C2)
Target: Anthropic API
What flows: System prompt + user prompt (extraction template + Sonar Pro response)
How: Anthropic SDK client.messages.create() with model='claude-haiku-4-5-20251001', response_format=json
Auth: ANTHROPIC_API_KEY env var
Error path: API error → throw, caught by router → fallback card
```

## End-to-End Flows

### Flow 1: Happy Path — First Free Card
```
1. [Mobile] User taps "Quick Validate" on vault detail screen
2. [Mobile] Check: does project have cardResult? → No → proceed
3. [Mobile] Navigate to chat screen with projectId
4. [Mobile] Chat screen calls sparkCard.chat({ projectId, turn: 0, message: '' })
5. [Server] Return Q1: "What specific problem does this solve, and how painful is it?"
6. [Mobile] User types answer, sends sparkCard.chat({ projectId, turn: 1, message: answer1 })
7. [Server] Return Q2: "Who is your ideal customer? Be as specific as you can."
8. [Mobile] User types answer, sends sparkCard.chat({ projectId, turn: 2, message: answer2 })
9. [Server] Return Q3: "What would make your solution different from what exists today?"
10. [Mobile] User types answer, sends sparkCard.chat({ projectId, turn: 3, message: answer3 })
11. [Server] Return { complete: true }
12. [Mobile] Navigate to loading screen, call sparkCard.validate({ projectId, chatMessages })
13. [Server] BEGIN TRANSACTION
14. [Server] Read user: freeCardUsed=false → eligible
15. [Server] Set freeCardUsed=true
16. [Server] COMMIT
17. [Server] Build research brief: title + description + 3 chat answers
18. [Server] Call Sonar Pro: sonarProResearch(brief) → { text, citations } (~30s)
19. [Server] Call Haiku extraction: extractCardResult(text) → CardResult (~5s)
20. [Server] Validate CardResult against Zod schema
21. [Server] Update project: cardResult = result
22. [Server] Return { cardResult }
23. [Mobile] Navigate to card result screen, render card
24. [Mobile] User taps "Unlock Full Research"
25. [Mobile] Call sparkCard.promote({ projectId })
26. [Server] Update project: promoted=true, promotedAt=now
27. [Server] Return { webUrl: 'https://app.ideafuel.ai/projects/{id}' }
28. [Mobile] Linking.openURL(webUrl)
```

### Flow 2: Card Limit Reached
```
1. [Mobile] User taps "Quick Validate"
2. [Mobile] Navigate to chat screen, complete 3 questions
3. [Mobile] Call sparkCard.validate({ projectId, chatMessages })
4. [Server] Read user: freeCardUsed=true, mobileCardCount=0
5. [Server] Check mobileCardResetAt: not past due
6. [Server] Throw TRPCError({ code: 'FORBIDDEN', message: 'CARD_LIMIT_REACHED' })
7. [Mobile] mutation.error.message === 'CARD_LIMIT_REACHED'
8. [Mobile] Navigate to paywall screen
9. [Mobile] "Subscribe" → toast "Coming soon"
10. [Mobile] "Upgrade to IdeaFuel" → Linking.openURL('https://ideafuel.ai/plans')
```

### Flow 3: API Failure + Refund
```
1. [Mobile] User completes chat, calls sparkCard.validate
2. [Server] Card consumed (freeCardUsed=true or mobileCardCount decremented)
3. [Server] Call Sonar Pro → TIMEOUT after 60s
4. [Server] REFUND: restore freeCardUsed=false or increment mobileCardCount
5. [Server] Throw TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'SONAR_TIMEOUT' })
6. [Mobile] Show error toast "Validation failed — tap to retry"
7. [Mobile] User taps retry → repeats from sparkCard.validate (skips chat)
```

### Flow 4: Monthly Card Reset
```
1. [Server] sparkCard.validate called
2. [Server] Read user: mobileCardCount=0, mobileCardResetAt=2026-03-01 (past due)
3. [Server] BEGIN TRANSACTION
4. [Server] Set mobileCardCount=10, mobileCardResetAt=2026-04-01
5. [Server] Decrement mobileCardCount to 9
6. [Server] COMMIT
7. [Server] Proceed with validation
```

### Flow 5: Existing Card on Project
```
1. [Mobile] User taps "Quick Validate" on project that already has cardResult
2. [Mobile] Check: project.cardResult exists → navigate directly to card result screen
3. [Mobile] Card screen shows existing card + "Re-validate" button
4. [Mobile] User taps "Re-validate" → navigate to chat screen → new validation flow (consumes a card)
```

## Convention Guide

### File Naming
- Server routers: `camelCase.ts` (e.g., `sparkCard.ts`) — matches existing `project.ts`, `billing.ts`
- Server services: `kebab-case.ts` (e.g., `card-ai.ts`) — matches existing `spark-ai.ts`, `research-ai.ts`
- Server providers: `kebab-case.ts` inside provider directory (e.g., `providers/perplexity/sonar-pro.ts`)
- Mobile screens: `kebab-case.tsx` or `index.tsx` in route directory — matches existing Expo Router pattern
- Mobile components: `PascalCase.tsx` (e.g., `ValidationCard.tsx`) — matches existing `Button.tsx`, `Card.tsx`
- Shared types: Added to existing `types/index.ts`
- Shared constants: Added to existing `constants/subscription.ts`
- Shared validators: Added to existing `validators/index.ts`

### Function Naming
- Server: `camelCase` (e.g., `sonarProResearch`, `extractCardResult`, `buildResearchBrief`)
- Mobile: `camelCase` for functions, `PascalCase` for components

### Import Style
- Server: Named imports, absolute from package root (e.g., `import { CardResult } from '@forge/shared'`)
- Mobile: Relative imports within mobile package, shared types via tRPC inference

### Error Handling
- Server: Throw `TRPCError` with specific `code` and `message`. Use typed error messages: `CARD_LIMIT_REACHED`, `SONAR_TIMEOUT`, `EXTRACTION_FAILED`, `VALIDATION_FAILED`
- Mobile: Check `mutation.error.message` for typed errors, show appropriate UI (paywall, toast, retry)

### Database Patterns
- Use `ctx.db.transaction()` for atomic multi-table operations
- Column naming: `snake_case` in SQL, mapped to `camelCase` in Drizzle schema
- Defaults set in Drizzle schema definition, not in application code

### UI Patterns
- Colors: Always import from `../../lib/theme` — never hardcode hex values
- Haptics: `triggerHaptic('success')` on card generation, `triggerHaptic('error')` on failures
- Loading: Use `ThinkingIndicator` for AI processing, `LoadingScreen` for page loads
- Navigation: `router.push()` for forward, `router.back()` for back. Pass params via route.

## Issues Found

### Issue 1: tRPC Timeout for validate call
The default React Query mutation timeout may be too short for the 30-60s Sonar Pro call. The mobile tRPC client in `lib/trpc.ts` doesn't set a custom timeout on the httpBatchLink.
**Fix:** Set `fetchRequestInit: { signal: AbortSignal.timeout(90000) }` on the httpBatchLink for the validate mutation, or handle timeout client-side with a custom wrapper.
**Resolution:** Handle in Phase 4 (mobile screens) — wrap the validate mutation call with a 90s timeout.

### Issue 2: Chat state management
The chat screen collects 3 answers then passes all messages to validate. If the user navigates away and back, chat state is lost (by design per spec). But the chat screen needs local state management for the 3-turn conversation.
**Fix:** Use React `useState` for chat messages. No persistence needed. On unmount, state is gone.
**Resolution:** Handle in Phase 4 (mobile screens).

### Issue 3: Subscription tier enum update
Adding `MOBILE` to the subscription tier enum requires a Drizzle enum update AND a Postgres enum migration. Drizzle pgEnum changes require explicit SQL: `ALTER TYPE subscription_tier ADD VALUE 'MOBILE'`.
**Fix:** Include the ALTER TYPE in the migration SQL.
**Resolution:** Handle in Phase 1 (schema + migration).

### Issue 4: Stub auto-provision timing
Per spec, after free card is used, system auto-provisions 10 cards on next validate attempt. This means the eligibility check in `sparkCard.validate` must handle: (a) freeCardUsed=false → use free card, (b) freeCardUsed=true, mobileCardCount>0 → use paid card, (c) freeCardUsed=true, mobileCardCount=0, resetAt past due → reset + use card, (d) freeCardUsed=true, mobileCardCount=0, resetAt NOT past due → CARD_LIMIT_REACHED. The auto-provision (stub) sets mobileCardCount=10 when freeCardUsed=true AND mobileCardCount=0 AND mobileCardResetAt IS NULL (never provisioned before).
**Fix:** Explicit in the eligibility logic.
**Resolution:** Handle in Phase 2 (router + eligibility logic).

## Wiring Checklist

### Phase 1: Shared Types + DB Schema
- [ ] Add `CardResult` interface to `packages/shared/src/types/index.ts`
- [ ] Add `CardChatMessage` interface to `packages/shared/src/types/index.ts`
- [ ] Add `MOBILE` to `SubscriptionTier` type in `packages/shared/src/types/index.ts`
- [ ] Add `MOBILE` tier to `SUBSCRIPTION_FEATURES` in `packages/shared/src/constants/subscription.ts`
- [ ] Add Zod schemas for sparkCard endpoints to `packages/shared/src/validators/index.ts`: `validateCardSchema`, `chatCardSchema`, `promoteCardSchema`, `cardResultSchema`
- [ ] Add `freeCardUsed` (boolean, default false), `mobileCardCount` (integer, default 0), `mobileCardResetAt` (timestamp, nullable) columns to users table in `packages/server/src/db/schema.ts`
- [ ] Add `promoted` (boolean, default false), `promotedAt` (timestamp, nullable), `cardResult` (jsonb, nullable) columns to projects table in `packages/server/src/db/schema.ts`
- [ ] Add `MOBILE` to `subscriptionTierEnum` pgEnum in schema.ts
- [ ] Generate Drizzle migration: `npx drizzle-kit generate`
- [ ] Verify migration SQL includes `ALTER TYPE` for enum + `ALTER TABLE` for new columns with correct defaults

### Phase 2: Server — Sonar Pro Provider + Card AI Service + Router
- [ ] Create `packages/server/src/providers/perplexity/sonar-pro.ts` — synchronous Sonar Pro provider: `sonarProResearch(brief: string): Promise<{ text: string, citations: string[] }>`
- [ ] Verify Perplexity SDK supports `sonar-pro` model via `client.chat.completions.create()` (no polling needed)
- [ ] Create `packages/server/src/services/card-ai.ts` with:
  - [ ] `CARD_CHAT_QUESTIONS: string[]` — the 3 fixed questions
  - [ ] `buildResearchBrief(title: string, description: string, chatMessages: CardChatMessage[]): string`
  - [ ] `extractCardResult(sonarResponse: string): Promise<CardResult>` — calls Anthropic Haiku with extraction prompt
- [ ] Create `packages/server/src/routers/sparkCard.ts` with:
  - [ ] `chat` procedure: return next question based on turn number
  - [ ] `validate` procedure: eligibility check → consume card (transaction) → build brief → call Sonar Pro → extract card → save to project → return CardResult. On API failure: refund card.
  - [ ] `promote` procedure: set promoted=true + promotedAt=now, return webUrl
- [ ] Register sparkCard router in `packages/server/src/routers/index.ts`
- [ ] Card eligibility logic handles all 4 states: free card available, paid cards available, monthly reset needed, auto-provision (stub), card limit reached

### Phase 3: Mobile — Chat + Validation + Card Screens
- [ ] Create `packages/mobile/src/app/(tabs)/vault/[id]/validate.tsx` — Chat + validation screen:
  - [ ] 3-turn chat UI with text input
  - [ ] Calls sparkCard.chat for each turn
  - [ ] On completion, calls sparkCard.validate with collected messages
  - [ ] Shows loading/thinking state during validation (~30-60s)
  - [ ] On success: navigate to card screen
  - [ ] On CARD_LIMIT_REACHED: navigate to paywall
  - [ ] On SONAR_TIMEOUT/EXTRACTION_FAILED: show error toast + retry button
  - [ ] 90s timeout on validate mutation
- [ ] Create `packages/mobile/src/app/(tabs)/vault/[id]/card.tsx` — Card result screen:
  - [ ] Renders ValidationCard component with full CardResult data
  - [ ] "Unlock Full Research" CTA button → calls sparkCard.promote → Linking.openURL
  - [ ] "Re-validate" button → navigate back to validate screen
  - [ ] Back button to vault detail
- [ ] Create `packages/mobile/src/components/ui/ValidationCard.tsx` — Card display component:
  - [ ] Verdict badge (proceed=green, watchlist=amber, drop=red)
  - [ ] Summary text
  - [ ] Problem severity meter (1-5)
  - [ ] Market signal indicator (rising/flat/declining with icon)
  - [ ] TAM range display (low-high with basis)
  - [ ] Competitors list (name + one-liner, max 3)
  - [ ] Biggest risk callout
  - [ ] Next experiment callout
  - [ ] Citation links
  - [ ] Fallback layout when only rawResponse is available
- [ ] Create `packages/mobile/src/components/ui/Paywall.tsx` — Paywall component:
  - [ ] "Subscribe for $5.99/mo" button → toast "Coming soon — payments launching soon"
  - [ ] "Upgrade to full IdeaFuel" button → Linking.openURL('https://ideafuel.ai/plans')
  - [ ] Can be used as a screen or BottomSheet modal
- [ ] Register new screens in `packages/mobile/src/app/(tabs)/vault/[id]/_layout.tsx` (or vault/_layout.tsx Stack)
- [ ] Modify `packages/mobile/src/app/(tabs)/vault/[id]/index.tsx`:
  - [ ] Add "Quick Validate" button (prominent, below description)
  - [ ] If project.cardResult exists: show "View Card" button instead, navigate to card screen
  - [ ] Button disabled if title < 3 chars

## Build Order

### Phase 1: Shared Types + DB Schema (Foundation)
**Scope:** C5, C6
**Files:** shared/types, shared/constants, shared/validators, server/db/schema, drizzle migration
**Why first:** Everything else depends on these types and DB columns existing.
**Deliverables:** CardResult type, MOBILE tier, Zod schemas, migration applied.

### Phase 2: Server Backend (API)
**Scope:** C1, C2, C3, C4
**Files:** server/providers/perplexity/sonar-pro.ts, server/services/card-ai.ts, server/routers/sparkCard.ts, server/routers/index.ts
**Why second:** Mobile screens need the API to exist (types inferred from router).
**Deliverables:** Working sparkCard.chat, sparkCard.validate, sparkCard.promote endpoints. Testable via curl/HTTP client.

### Phase 3: Mobile Screens (UI)
**Scope:** C7, C8, C9, C10, C11
**Files:** mobile/app/(tabs)/vault/[id]/validate.tsx, mobile/app/(tabs)/vault/[id]/card.tsx, mobile/components/ui/ValidationCard.tsx, mobile/components/ui/Paywall.tsx, mobile/app/(tabs)/vault/[id]/index.tsx (modified), mobile/app/(tabs)/vault/_layout.tsx (modified)
**Why third:** Depends on Phase 1 (types) and Phase 2 (API contract).
**Deliverables:** Complete mobile flow from vault → chat → loading → card → promote/paywall.
