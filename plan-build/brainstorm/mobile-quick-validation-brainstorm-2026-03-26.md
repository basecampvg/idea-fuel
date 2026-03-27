# Brainstorm: Mobile Quick Validation Cards
**Created:** 2026-03-26
**Spec:** plan-build/specs/mobile-quick-validation-spec-2026-03-26.md
**Status:** Draft
**Project type:** Existing codebase

## Vision
A lightweight mobile validation feature that turns the IdeaFuel app into a top-of-funnel revenue capture tool. Users speak/type an idea, answer 3 quick questions, and get a structured validation card in ~30-60 seconds via Perplexity Sonar Pro. Free users get 1 card, paid mobile users ($5.99/mo) get 10/mo. Cards have an "Unlock Full Research" upsell to the web app ($39+/mo).

## Existing Context

### Project Structure
- **Monorepo**: `packages/server`, `packages/web`, `packages/mobile`, `packages/shared`
- **Server**: tRPC routers, Drizzle ORM + PostgreSQL (Supabase), BullMQ queues
- **Mobile**: Expo 54, React Native 0.81.5, Expo Router (file-based), NativeWind, tRPC client
- **Shared**: Types (`types/index.ts`), constants (`constants/`), validators (`validators/index.ts`)

### Relevant Existing Patterns
- **Router registration**: Import router → add to `appRouter` object in `routers/index.ts`
- **Subscription enforcement**: Inline per-procedure (no middleware). Query user, check tier, throw `TRPCError` if forbidden.
- **Perplexity provider**: Exists at `providers/perplexity/index.ts`, uses `sonar-deep-research` with async polling. Sonar Pro is a different model (`sonar-pro`) with synchronous responses — needs a new provider or mode.
- **Anthropic provider**: Already exists for Claude calls (extraction, generation). Haiku is available.
- **Mobile auth**: Google OAuth via `expo-auth-session`, token in `expo-secure-store`, passed as Bearer header to tRPC.
- **Mobile navigation**: Expo Router file-based. Tabs layout with Stack inside vault. Detail screens use `useLocalSearchParams`.
- **Mobile data fetching**: tRPC hooks (`useQuery`, `useMutation`) with React Query.
- **UI components**: Button (with variants/haptics), Card (with subcomponents), BottomSheet, Spinner/LoadingScreen/ThinkingIndicator, ProgressMeter, Badge.

### Key Files That Will Be Modified
| File | Change |
|------|--------|
| `packages/server/src/db/schema.ts` | Add fields to users + projects tables |
| `packages/server/src/routers/index.ts` | Register new sparkCard router |
| `packages/shared/src/types/index.ts` | Add CardResult, CardChatMessage types |
| `packages/shared/src/constants/subscription.ts` | Add MOBILE tier |
| `packages/shared/src/validators/index.ts` | Add sparkCard schemas |
| `packages/mobile/src/app/(tabs)/vault/[id]/index.tsx` | Add "Quick Validate" button |
| `packages/mobile/src/app/(tabs)/vault/_layout.tsx` | Register new screens in Stack |

### Key Files That Will Be Created
| File | Purpose |
|------|---------|
| `packages/server/src/providers/perplexity/sonar-pro.ts` | Sonar Pro provider (synchronous) |
| `packages/server/src/routers/sparkCard.ts` | tRPC router: chat, validate, promote |
| `packages/server/src/services/card-ai.ts` | Chat questions + extraction logic |
| `packages/mobile/src/app/(tabs)/vault/[id]/validate.tsx` | Chat + validation screen |
| `packages/mobile/src/app/(tabs)/vault/[id]/card.tsx` | Card result display screen |
| `packages/mobile/src/components/ui/ValidationCard.tsx` | Card result component |
| `packages/mobile/src/components/ui/Paywall.tsx` | Paywall modal/screen |
| `drizzle/XXXX_migration.sql` | DB migration for new columns |

## Components Identified

### C1: Sonar Pro Provider
- **Responsibility**: Synchronous Perplexity Sonar Pro API call for quick research
- **Upstream (receives from)**: sparkCard router passes research brief string
- **Downstream (sends to)**: Returns raw research text + citations to sparkCard router
- **External dependencies**: Perplexity API (`sonar-pro` model), `PERPLEXITY_API_KEY` env var (already exists)
- **Hands test**: PASS — API key exists, Perplexity SDK is installed (`@perplexity-ai/perplexity_ai`), Sonar Pro supports synchronous requests via the same SDK. Just need to call `client.chat.completions.create()` without the polling wrapper.

### C2: Card AI Service (Chat + Extraction)
- **Responsibility**: (a) Format the 3 fixed chat questions, (b) Build enriched research brief from idea + answers, (c) Extract structured CardResult from Sonar Pro response via Claude Haiku
- **Upstream (receives from)**: sparkCard router passes project data + chat messages
- **Downstream (sends to)**: Returns enriched brief to router (for Sonar Pro), returns CardResult to router (for DB save)
- **External dependencies**: Anthropic API (Claude Haiku), `ANTHROPIC_API_KEY` env var (already exists — used by existing extraction/generation)
- **Hands test**: PASS — Anthropic SDK is installed, Haiku model is available, existing provider handles structured JSON extraction. Chat questions are hardcoded (no AI needed for Q generation).

### C3: sparkCard tRPC Router
- **Responsibility**: Three endpoints — `chat` (return next question), `validate` (run full pipeline: eligibility → consume card → Sonar Pro → extract → save), `promote` (set promoted flag, return web URL)
- **Upstream (receives from)**: Mobile app tRPC client
- **Downstream (sends to)**: Calls C1 (Sonar Pro), C2 (Card AI), writes to DB (projects, users tables)
- **External dependencies**: DB connection (ctx.db from tRPC context), auth (ctx.userId from protectedProcedure)
- **Hands test**: PASS — tRPC context provides db + userId. Router registration pattern is straightforward. All downstream services (C1, C2) are within the server package.

### C4: Card Eligibility & Consumption Logic
- **Responsibility**: Check if user can validate (free card available OR mobileCardCount > 0), consume card (decrement count or flip freeCardUsed), refund card on API failure, handle monthly reset
- **Upstream (receives from)**: sparkCard.validate procedure
- **Downstream (sends to)**: Writes to users table (freeCardUsed, mobileCardCount, mobileCardResetAt)
- **External dependencies**: None beyond DB
- **Hands test**: PASS — All fields will be on the users table. Transaction support exists via `ctx.db.transaction()`. Monthly reset is inline logic, not a cron.

### C5: DB Schema Migration
- **Responsibility**: Add new columns to users and projects tables
- **Upstream (receives from)**: N/A (schema change)
- **Downstream (sends to)**: All queries against users/projects
- **External dependencies**: Drizzle Kit for migration generation
- **Hands test**: PASS — Drizzle is configured, migration pattern exists (see `drizzle/` directory with existing migrations). Run `npx drizzle-kit generate` after schema changes.

### C6: Shared Types & Validators
- **Responsibility**: CardResult type, CardChatMessage type, MOBILE subscription tier, Zod schemas for sparkCard endpoints
- **Upstream (receives from)**: N/A (type definitions)
- **Downstream (sends to)**: Server (sparkCard router, card-ai service), Mobile (tRPC client type inference)
- **External dependencies**: None
- **Hands test**: PASS — Types auto-propagate via tRPC's type inference. Mobile gets types without manual sync.

### C7: Mobile Chat Screen
- **Responsibility**: Display 3 fixed clarifying questions one at a time, collect user answers, pass to validate endpoint
- **Upstream (receives from)**: Vault detail screen navigation (projectId param)
- **Downstream (sends to)**: sparkCard.validate mutation with projectId + chatMessages
- **External dependencies**: None beyond tRPC client
- **Hands test**: PASS — tRPC client exists, navigation via Expo Router, text input components exist. No new packages needed.

### C8: Mobile Validation Loading Screen
- **Responsibility**: Show progress/loading state while Sonar Pro + Haiku runs (~30-60s)
- **Upstream (receives from)**: sparkCard.validate mutation pending state
- **Downstream (sends to)**: Navigates to card result screen on success
- **External dependencies**: None
- **Hands test**: PASS — ThinkingIndicator and Spinner components exist. Can show animated state during mutation.

### C9: Mobile Card Result Screen
- **Responsibility**: Display the structured CardResult as a visual card with verdict badge, metrics, competitors, risk, next step, and "Unlock Full Research" CTA
- **Upstream (receives from)**: sparkCard.validate response OR project.get query (if revisiting)
- **Downstream (sends to)**: sparkCard.promote mutation → opens web URL via `Linking.openURL()`
- **External dependencies**: `react-native` Linking API (built-in)
- **Hands test**: PASS — Card, Badge, Button components exist. Linking is built-in RN. Color theme supports verdict-colored badges (success/warning/destructive).

### C10: Mobile Paywall Screen
- **Responsibility**: Shown when user has no cards remaining. Two CTAs: "Subscribe" (stubbed toast) and "Upgrade to IdeaFuel" (opens web pricing URL)
- **Upstream (receives from)**: sparkCard.validate returns CARD_LIMIT_REACHED error, or pre-check on validate button tap
- **Downstream (sends to)**: Toast notification OR Linking.openURL()
- **External dependencies**: None
- **Hands test**: PASS — BottomSheet component exists for modal overlay. Button variants exist. Toast context exists.

### C11: Vault Detail Screen Modifications
- **Responsibility**: Add "Quick Validate" button to existing project detail screen. Show existing card if one exists. Handle navigation to chat/card screens.
- **Upstream (receives from)**: project.get query (check if cardResult exists)
- **Downstream (sends to)**: Navigate to chat screen OR card result screen
- **External dependencies**: None
- **Hands test**: PASS — Screen exists, just adding a button + conditional rendering.

## Rough Dependency Map

```
Shared Types & Validators (C6)
    ↓
DB Schema Migration (C5)
    ↓
Sonar Pro Provider (C1) ←──────────────┐
    ↓                                   │
Card AI Service (C2) ←─────────────┐    │
    ↓                               │    │
Card Eligibility Logic (C4)         │    │
    ↓                               │    │
sparkCard tRPC Router (C3) ────────→┘───→┘
    ↑
    │ (tRPC client calls)
    │
Vault Detail Mods (C11) → Chat Screen (C7) → Loading (C8) → Card Result (C9)
                                                                    ↓
                                                              Paywall (C10)
```

**Build order (dependency-first):**
1. C6: Shared types, validators, MOBILE tier
2. C5: DB migration (depends on C6 for type definitions)
3. C1: Sonar Pro provider
4. C2: Card AI service (depends on C1 for provider pattern reference)
5. C4: Eligibility logic
6. C3: sparkCard router (depends on C1, C2, C4, C5, C6)
7. C7-C11: Mobile screens (depend on C3 for API contract)

## Risk Assessment

### Complexity Hotspots
- **Perplexity provider**: Existing provider is 200+ lines with complex polling. New Sonar Pro provider should be much simpler (~50 lines) since it's synchronous. Risk: low.
- **Card eligibility + refund logic**: Transaction with optimistic consumption + refund on failure. Needs careful transaction handling. Risk: medium.
- **DB migration**: Adding columns to existing tables with defaults. Non-destructive, no data migration needed. Risk: low.

### Integration Risks
- **Sonar Pro model availability**: Need to verify `sonar-pro` is the correct model ID and that the existing Perplexity API key has access. Could be `sonar-pro-latest` or require a different plan.
- **Perplexity SDK compatibility**: Existing SDK (`@perplexity-ai/perplexity_ai`) may or may not support Sonar Pro directly. If not, fall back to raw HTTP fetch. Risk: low — it's just an OpenAI-compatible chat completion API.
- **Mobile tRPC timeout**: Sonar Pro takes ~30s. Default tRPC/React Query timeout may be too short for mobile. Need to set appropriate timeout on the validate mutation.

### Existing Quality Issues
- **No subscription enforcement middleware**: Each router does its own checks inline. This is fine for our use case (single router with ~3 procedures), but means the eligibility check logic lives in the router itself rather than being reusable.
- **Mobile app has no error boundary**: If the card screen crashes, the whole app crashes. Consider wrapping new screens in try/catch at minimum.

## Open Questions
1. Verify `sonar-pro` model ID with Perplexity API docs — may need `sonar-pro-latest` or version-pinned ID
2. tRPC timeout for mobile validate call — what's the current default? May need 90s for safety margin.
3. Should chat questions be stored in DB (for analytics on what users say about their ideas) or just passed through in-memory?

## Risks and Concerns
- **30-60s validation time on mobile**: Users may think the app froze. Mitigation: animated loading screen with status text ("Researching your market...", "Analyzing competitors...", "Building your card...").
- **Sonar Pro quality variance**: Output quality depends heavily on the idea description + chat answers. Short/vague inputs → vague cards. Mitigation: chat questions are designed to elicit specific detail. Haiku extraction normalizes output format.
- **App Store review**: Stubbed payment buttons that say "Coming soon" could cause App Store rejection. Mitigation: for initial TestFlight/internal builds this is fine. Before App Store submission, either wire up RevenueCat or remove the subscribe button entirely (only show "Upgrade to full IdeaFuel" web link).
