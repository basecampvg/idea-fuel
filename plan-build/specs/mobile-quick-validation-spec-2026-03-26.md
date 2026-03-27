# Feature Spec: Mobile Quick Validation Cards
**Created:** 2026-03-26
**Status:** Draft
**Project type:** Existing codebase

## Problem Statement
IdeaFuel's web app is powerful ($39-199/mo) but has no low-friction entry point. There's no way for someone to get quick value without committing to a full subscription. Mobile users want to capture ideas on the go, get instant feedback, and only upgrade when they're convinced. A $5.99/mo impulse purchase with a free first taste solves this.

## Users and Roles
- **Free mobile user**: Downloads app, captures unlimited ideas (drafts), gets 1 free validation card
- **Paid mobile user ($5.99/mo)**: Gets 10 validation cards per month, unlimited idea capture
- **Web subscriber ($39+/mo)**: Existing tier, no changes — mobile cards appear as projects in their dashboard if they use the same account

No new admin roles. Existing auth (Google OAuth) applies across mobile and web.

## Scope

### In scope (this build)
- New Perplexity Sonar Pro provider (fast, synchronous ~30s responses)
- AI chat step (3 fixed clarifying questions via Claude Haiku) before validation
- Structured validation card generation (Sonar Pro research + Haiku extraction)
- Card result UI on mobile
- Free card tracking (1 freebie per Google account)
- Monthly card limit tracking (10/mo for paid mobile tier)
- Paywall screen UI (payment integration stubbed — see Constraints)
- "Unlock Full Research" button (opens web URL in browser)
- DB schema additions: cardResult, promoted, promotedAt on projects; freeCardUsed, mobileCardCount, mobileCardResetAt on users
- MOBILE subscription tier in shared constants
- New tRPC endpoints: sparkCard.chat, sparkCard.validate, sparkCard.promote

### Out of scope (future / not planned)
- Web app changes (none — promoted projects just appear as CAPTURED drafts)
- RevenueCat / StoreKit / Google Billing integration (stubbed for now)
- Offline validation (requires network)
- Card sharing / export / screenshots
- Push notifications
- Analytics / funnel tracking (future)

### MVP vs stretch
- **MVP**: Capture idea → chat refinement → Sonar Pro card → display card → promote to web
- **Stretch**: Card history view in vault, card comparison, re-validate with updated idea

## Functional Requirements

### Happy Path
1. User opens mobile app, captures idea via voice or text (existing flow)
2. Idea saves as CAPTURED draft in database (existing flow)
3. User navigates to the idea in vault and taps "Quick Validate"
4. System checks card eligibility: free card available OR paid mobile subscriber with cards remaining
5. If not eligible → paywall screen shown, flow stops
6. If eligible → chat screen opens. AI asks 3 fixed clarifying questions, one per turn:
   - Q1: "What specific problem does this solve, and how painful is it?"
   - Q2: "Who is your ideal customer? Be as specific as you can."
   - Q3: "What would make your solution different from what exists today?"
7. User answers each question via text input (3 turns total, max 500 chars per answer)
8. **Card consumed**: freeCardUsed flipped to true (if first card) OR mobileCardCount decremented. This happens BEFORE the API call. If the API call fails, the card is refunded (count restored).
9. System enriches the original idea title + description with the 3 chat answers into a single research brief
10. System calls Perplexity Sonar Pro (`sonar-pro`) with the research brief using the prompt template below
11. System passes Sonar Pro response through Claude Haiku (`claude-haiku-4-5-20251001`) to extract structured CardResult using the extraction prompt template below
12. CardResult saved to project record (`cardResult` field)
13. Card renders on mobile: verdict badge, summary, problem severity, market signal, TAM range, top 3 competitors, biggest risk, next experiment, citation links
14. Below card: "Unlock Full Research" CTA button
15. Tapping CTA sets `promoted=true`, `promotedAt=now` on the project, opens `https://app.ideafuel.ai/projects/{id}` in device browser

### Edge Cases and Error Handling
- **Sonar Pro API timeout/failure**: Refund the consumed card (restore count or reset freeCardUsed). Show error toast "Validation failed — tap to retry". User can retry.
- **Haiku extraction failure**: Card stays consumed (research was done). Fallback card displays: verdict shown as "Review", summary shows first 500 chars of raw Sonar Pro response, all other fields hidden. `rawResponse` field is populated on the CardResult.
- **User exits chat midway**: Idea remains as CAPTURED draft. No card consumed (consumption happens after chat completes). Chat state discarded — no resume.
- **User has no cards left (free used, not subscribed)**: Paywall screen shown with two buttons: "Subscribe for $5.99/mo" (shows toast "Coming soon — payments launching soon") and "Upgrade to full IdeaFuel" (opens `https://ideafuel.ai/plans` in device browser).
- **User already has a card for this project**: Show existing card. Do not re-run validation. Show "Re-validate" button that consumes another card and replaces the existing cardResult.
- **Network loss during validation**: Error state with retry button. Card refunded.
- **Promoted project opened on web by free web user**: Project exists as CAPTURED draft. Normal web paywall applies if they try to run research.
- **Monthly card reset**: The eligibility check in `sparkCard.validate` compares `now` against `mobileCardResetAt`. If past due, it resets `mobileCardCount` to 10 and advances `mobileCardResetAt` by 1 calendar month, atomically within the same transaction as the card decrement.

### Data Validation Rules
- Title must be min 3 chars to tap "Quick Validate"
- Description has NO minimum to start — the chat step is designed to elicit detail. The enriched research brief (description + chat answers combined) is what gets validated before sending to Sonar Pro (must be non-empty).
- Chat messages: max 500 chars per user message, exactly 3 turns
- CardResult must pass Zod schema validation before saving
- Sonar Pro response must be non-empty string

## Prompt Templates

### Sonar Pro Research Prompt
```
You are a business idea analyst. Research and evaluate this business idea:

IDEA: {title}
DESCRIPTION: {description}

ADDITIONAL CONTEXT:
- Problem & pain: {chat_answer_1}
- Target customer: {chat_answer_2}
- Differentiation: {chat_answer_3}

Provide a thorough analysis covering:
1. Is this a real, painful problem? How severe (1-5)?
2. What is the market trend — rising, flat, or declining? Cite evidence.
3. Rough TAM estimate with a low and high range. State your assumptions.
4. Name the top 3 existing competitors or alternatives and what they do.
5. What is the single biggest risk for this idea?
6. What is one concrete experiment the founder should run first to validate demand?
7. Overall verdict: should this founder PROCEED (strong signal), WATCHLIST (promising but unclear), or DROP (weak signal)?

Be specific. Use real data, real company names, real numbers where possible.
```

### Haiku Extraction Prompt
```
Extract a structured validation card from this research analysis.

RESEARCH:
{sonar_pro_response}

Return valid JSON matching this exact schema:
{
  "verdict": "proceed" | "watchlist" | "drop",
  "summary": "1-2 sentence summary of the overall finding",
  "problemSeverity": 1-5,
  "marketSignal": "rising" | "flat" | "declining" | "unknown",
  "tamEstimate": {
    "low": "$X format",
    "high": "$X format",
    "basis": "1-sentence explanation of how this was estimated"
  },
  "competitors": [
    { "name": "Company Name", "oneLiner": "What they do in one line" }
  ],
  "biggestRisk": "1 sentence describing the biggest risk",
  "nextExperiment": "1 concrete, actionable next step",
  "citations": ["url1", "url2"]
}

Rules:
- competitors array: exactly 3 entries (or fewer if research found fewer)
- All string fields must be concise (under 150 chars except summary which can be 250)
- citations: extract any URLs mentioned in the research
- If the research is unclear on a field, use your best judgment from the text
- Return ONLY the JSON object, no markdown wrapping
```

## tRPC Endpoint Signatures

### sparkCard.chat
```typescript
input: { projectId: string; turn: number; message: string }
// turn 0: system returns Q1 (no user message needed, message can be empty)
// turn 1: user answers Q1, system returns Q2
// turn 2: user answers Q2, system returns Q3
// turn 3: user answers Q3, system returns { complete: true }
output: { question?: string; complete: boolean }
```

### sparkCard.validate
```typescript
input: { projectId: string; chatMessages: CardChatMessage[] }
output: { cardResult: CardResult } | { error: 'CARD_LIMIT_REACHED' | 'SONAR_TIMEOUT' | 'EXTRACTION_FAILED' | 'VALIDATION_FAILED' }
```

### sparkCard.promote
```typescript
input: { projectId: string }
output: { webUrl: string }
// Sets promoted=true, promotedAt=now, returns the web URL
```

## Data Model (high level)

### Modified: User table
- `freeCardUsed: boolean` (default false) — tracks whether the single free card has been used
- `mobileCardCount: integer` (default 0) — remaining cards this billing period. Set to 10 when user subscribes to MOBILE tier (or when stub auto-provisions on first validate after free card is used).
- `mobileCardResetAt: timestamp` (nullable) — when the card count resets next. Set to `now + 1 month` when mobileCardCount is first provisioned.

### Modified: Project table
- `promoted: boolean` (default false) — whether user tapped "Unlock Full Research"
- `promotedAt: timestamp` (nullable) — when they promoted
- `cardResult: jsonb` (nullable) — the structured validation card data

### New type: CardResult
```typescript
interface CardResult {
  verdict: 'proceed' | 'watchlist' | 'drop';
  summary: string;              // 1-2 sentence summary
  problemSeverity: number;      // 1-5 scale
  marketSignal: 'rising' | 'flat' | 'declining' | 'unknown';
  tamEstimate: {
    low: string;                // e.g. "$500M"
    high: string;               // e.g. "$2B"
    basis: string;              // 1-sentence explanation
  };
  competitors: Array<{
    name: string;
    oneLiner: string;           // what they do
  }>;                           // max 3
  biggestRisk: string;          // 1 sentence
  nextExperiment: string;       // 1 actionable step
  citations: string[];          // URLs from Sonar Pro
  rawResponse?: string;         // original Sonar Pro text (for fallback display)
}
```

### New type: CardChatMessage (for clarifying questions)
```typescript
interface CardChatMessage {
  role: 'assistant' | 'user';
  content: string;
}
```

### Modified: Subscription constants
- New tier: `MOBILE` with cardLimit: 10, no report access, no interview modes, no financial models

## Non-Functional Requirements
- **Latency**: Card generation should complete in <60 seconds (Sonar Pro ~30s + Haiku ~5s + network overhead)
- **Cost ceiling**: ~$0.05-0.10 per card (Sonar Pro ~$0.03-0.08, Haiku ~$0.01)
- **No queuing**: Cards are synchronous — no BullMQ, no job polling. Direct request-response.
- **Mobile performance**: Card UI should render in <100ms after data arrives. No heavy animations on the card itself.

## Constraints
- **No web app changes**: All work is backend (new endpoints, schema) + mobile (new screens)
- **Payment stub behavior**: Free card logic (freeCardUsed) is real and enforced. After the free card is used, the system auto-provisions the user as if they subscribed: sets `mobileCardCount=10` and `mobileCardResetAt=now+1month` on the next validate attempt. The paywall screen is NOT shown during the stub phase. When RevenueCat is wired later, the auto-provision is replaced with real subscription verification.
- **Branch**: All work on `matt/mobile-quick-validation`
- **Existing auth**: Google OAuth, same account across mobile and web. No new auth flows.
- **Perplexity API key**: Already exists in server config (used for deep-research). Same key works for Sonar Pro.

## Open Questions
1. Should the chat step use the same Claude Haiku call as extraction, or a separate call? (Likely separate — chat is conversational, extraction is structured JSON)
2. Should card count reset on calendar month or rolling 30 days from subscription start? (Spec assumes rolling 30 days from provision date)
