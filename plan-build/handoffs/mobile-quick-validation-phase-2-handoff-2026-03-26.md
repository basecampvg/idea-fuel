# Phase 2 Handoff: Server Backend (API)
**Plan:** mobile-quick-validation-plan-2026-03-26.md
**Phase:** 2 of 3
**Status:** COMPLETE
**Built by:** Builder
**Date:** 2026-03-26

## What Was Built

### 1. Sonar Pro Provider (`packages/server/src/providers/perplexity/sonar-pro.ts`)
- Exported function: `sonarProResearch(brief: string): Promise<{ text: string; citations: string[] }>`
- Uses `@perplexity-ai/perplexity_ai` SDK, same as the existing deep-research provider
- Model: `sonar-pro` (synchronous — no polling needed, unlike `sonar-deep-research`)
- Timeout: 60 seconds
- System prompt instructs Sonar Pro to act as a startup idea validation researcher
- Extracts `text` from `response.choices[0].message.content`
- Extracts `citations` from `response.citations` (SDK returns these directly as `Array<string>`)
- Lazy singleton Perplexity client pattern (same as existing provider)

### 2. Card AI Service (`packages/server/src/services/card-ai.ts`)
- `CARD_CHAT_QUESTIONS: string[]` — the 3 fixed questions:
  1. "What specific problem does this solve, and how painful is it?"
  2. "Who is your ideal customer? Be as specific as you can."
  3. "What would make your solution different from what exists today?"
- `buildResearchBrief(title, description, chatMessages)` — concatenates project data + chat Q&A into a structured Markdown brief for Sonar Pro with 7 specific research requests
- `extractCardResult(sonarResponse, citations)` — calls Anthropic Haiku (`claude-haiku-4-5-20251001`) with an extraction system prompt. Parses JSON, validates against `cardResultSchema`. On failure, returns a fallback `CardResult` with `rawResponse` populated so the mobile app can still display something.
- Uses direct Anthropic SDK (`@anthropic-ai/sdk`) with lazy singleton client (30s timeout)

### 3. sparkCard Router (`packages/server/src/routers/sparkCard.ts`)
Three procedures, all `protectedProcedure` (require auth):

**`chat` mutation:**
- Input: `chatCardSchema` (projectId, turn, message)
- Returns `{ question: string, complete: false }` for turns 0-2
- Returns `{ question: undefined, complete: true }` for turn >= 3

**`validate` mutation:**
- Input: `validateCardSchema` (projectId, chatMessages)
- Step 1: Eligibility check in `ctx.db.transaction()` — handles all 5 states:
  - A: `freeCardUsed=false` → flip to true (free card)
  - B: `freeCardUsed=true`, `mobileCardResetAt=null` → auto-provision: set count=9, resetAt=now+1month
  - C: `freeCardUsed=true`, `mobileCardCount>0` → decrement via SQL expression
  - D: `freeCardUsed=true`, `mobileCardCount=0`, `resetAt` past due → reset count=9, advance resetAt by 1 month
  - E: `freeCardUsed=true`, `mobileCardCount=0`, `resetAt` not past due → throw `CARD_LIMIT_REACHED`
- Step 2: Read project (verifies ownership via `userId`)
- Step 3: Build research brief
- Step 4: Call Sonar Pro (wrapped in try/catch)
- Step 5: Extract CardResult via Haiku
- Step 6: Save `cardResult` as JSONB to project record
- Step 7: Return `{ cardResult }`
- Refund logic: On API failure (steps 4-5) OR project-not-found, `refundCard()` reverses the card consumption based on consumption type

**`promote` mutation:**
- Input: `promoteCardSchema` (projectId)
- Verifies project ownership
- Sets `promoted=true`, `promotedAt=new Date()`
- Returns `{ webUrl: 'https://app.ideafuel.ai/projects/{projectId}' }`

### 4. Router Registration (`packages/server/src/routers/index.ts`)
- Imported `sparkCardRouter` and added `sparkCard: sparkCardRouter` to appRouter

## Verification Results
- `pnpm --filter @forge/server exec tsc --noEmit` — PASS (0 errors)
- `pnpm --filter @forge/shared exec tsc --noEmit` — PASS (0 errors)
- No TODO/FIXME in any new files
- All 4 checklist items from Phase 2 complete

## Deviations from Plan
1. **Haiku model:** Used `claude-haiku-4-5-20251001` as specified in the plan's IC7 section. The Anthropic provider codebase uses Sonnet/Opus but Haiku is used directly via the SDK for cost efficiency on this simple extraction task.
2. **`extractCardResult` takes citations parameter:** The function accepts an optional `citations: string[]` parameter in addition to `sonarResponse`. This allows passing Sonar Pro's native citations to Haiku for inclusion in the structured output, which is better than relying on Haiku to extract URLs from prose.
3. **`db` import for typing:** The sparkCard router imports `db` from `../db/drizzle` to type the `refundCard` helper function parameter (`typeof db`). The actual database calls use `ctx.db` as per convention.
4. **Refund approach:** The refund is best-effort (catches errors, logs, doesn't re-throw). If both the API call and the refund fail, the user sees the API error. The refund failure is logged for manual resolution. This avoids masking the real error.

## What Phase 3 Needs to Know
- **tRPC endpoints ready:** `sparkCard.chat`, `sparkCard.validate`, `sparkCard.promote` are all registered and typed
- **Chat flow:** Call `chat` with turn 0, 1, 2 to get questions. Turn 3 returns `{ complete: true }`. The mobile client should collect all Q&A messages as `CardChatMessage[]` and pass them to `validate`.
- **Validate timeout:** Sonar Pro may take 30-60 seconds. The mobile client should set a 90s timeout on this mutation and show a loading/thinking state.
- **Error handling:** Check `mutation.error.message` for typed error strings:
  - `CARD_LIMIT_REACHED` → navigate to paywall
  - `SONAR_TIMEOUT` → show retry toast
  - `EXTRACTION_FAILED` → show retry toast (card was refunded)
  - `VALIDATION_FAILED` → generic error
- **CardResult shape:** The returned `cardResult` matches the `CardResult` type from `@forge/shared`. It always has all required fields. When extraction partially fails, `rawResponse` will be populated with the full Sonar Pro text.
- **Migration still not applied:** The DB migration from Phase 1 has NOT been applied yet. Run it before testing: `npx drizzle-kit push` or apply `packages/server/drizzle/0010_fair_alex_power.sql` manually.
- **Promote returns webUrl:** `sparkCard.promote` returns `{ webUrl: string }`. The mobile client should call `Linking.openURL(webUrl)` on success.

## Files Created
- `packages/server/src/providers/perplexity/sonar-pro.ts` — Sonar Pro provider
- `packages/server/src/services/card-ai.ts` — Card AI service (questions, brief builder, extraction)
- `packages/server/src/routers/sparkCard.ts` — sparkCard tRPC router (chat, validate, promote)

## Files Modified
- `packages/server/src/routers/index.ts` — registered sparkCard router
