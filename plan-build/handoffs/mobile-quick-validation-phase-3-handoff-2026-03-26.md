# Phase 3 Handoff: Mobile Screens (UI)
**Plan:** mobile-quick-validation-plan-2026-03-26.md
**Phase:** 3 of 3
**Status:** COMPLETE
**Built by:** Builder
**Date:** 2026-03-26

## What Was Built

### 1. ValidationCard Component (`packages/mobile/src/components/ui/ValidationCard.tsx`)
- Renders a full validation card from `CardResult` data
- **Verdict badge** at top: proceed (green/success), watchlist (amber/warning), drop (red/error) using existing `Badge` component
- **Summary text** with prominent styling
- **Stats row** with two stat boxes side by side:
  - Problem severity: 5 dots (filled based on 1-5 score, color-coded red/amber/green) with numeric label
  - Market signal: icon (TrendingUp/Minus/TrendingDown/HelpCircle) with colored label
- **TAM estimate** section: "$low -- $high" in large text with basis explanation
- **Competitors** section: up to 3 items, each in a surface-colored card with name + one-liner
- **Biggest risk** callout: warning-themed box with left accent border and AlertTriangle icon
- **Next experiment** callout: accent-themed box with left accent border and Lightbulb icon
- **Citation links** at bottom: tappable rows that open URLs via `Linking.openURL`
- **Fallback layout**: when `rawResponse` is present but other fields are empty, shows the raw text in a simple text block with verdict badge and citations
- Uses `Card`, `CardHeader`, `CardContent`, `Badge` from existing UI kit. All colors from `theme.ts`.

### 2. Paywall Component (`packages/mobile/src/components/ui/Paywall.tsx`)
- Reusable component — works as a full screen view or inside a BottomSheet (controlled via `compact` prop)
- Sparkles icon in branded circle at top
- "Want more validations?" heading
- Explanatory subtext about subscription and upgrade options
- "Subscribe for $5.99/mo" button (variant="primary", size="lg") -- shows toast "Coming soon -- payments launching soon"
- "Upgrade to full IdeaFuel" button (variant="outline", size="md") -- calls `Linking.openURL('https://ideafuel.ai/plans')`
- Uses `Button` component with proper haptics, `useToast` for the coming-soon message

### 3. Chat + Validation Screen (`packages/mobile/src/app/(tabs)/vault/[id]/validate.tsx`)
- Full 3-turn chat flow with transitions between chat, validating, and error phases
- **Chat phase**:
  - On mount: calls `sparkCard.chat({ projectId, turn: 0, message: '' })` to get first question
  - Displays messages in a `FlatList` with chat bubble styling (assistant = left/surface, user = right/brand)
  - Text input at bottom with send button (disabled when empty or sending)
  - Turn progress indicator (3 dots + "X of 3 questions" label)
  - Typing indicator (3 dots) while waiting for assistant response
  - After turn 3 returns `{ complete: true }`, automatically transitions to validation phase
- **Validating phase**:
  - Full-screen thinking state with Spinner in branded circle
  - Animated status text cycling through 5 messages ("Researching your market...", "Analyzing competitors...", etc.) every 12 seconds
  - "This can take 30-60 seconds" subtext
  - 90-second timeout via `AbortController` on the validate mutation
  - On success: invalidates project cache, navigates to card screen via `router.replace`
  - On `CARD_LIMIT_REACHED`: opens Paywall in a BottomSheet
  - On `SONAR_TIMEOUT` / `EXTRACTION_FAILED`: transitions to error phase
- **Error phase**:
  - Warning icon, "Validation Failed" title, explanation about refunded credit
  - "Retry Validation" button (calls `startValidation` again with collected messages)
  - "Go Back" ghost button
- Custom header with back button on all phases

### 4. Card Result Screen (`packages/mobile/src/app/(tabs)/vault/[id]/card.tsx`)
- Fetches project data via `trpc.project.get.useQuery` to access `cardResult`
- Shows `LoadingScreen` while data loads
- If no `cardResult` found: shows empty state with "Go Back" button
- Renders project title above the `ValidationCard` component
- Below card:
  - "Unlock Full Research" button (primary, full width, with Unlock icon): calls `sparkCard.promote` mutation, on success opens `webUrl` via `Linking.openURL`, shows loading state while promoting
  - "Re-validate" button (ghost, with RotateCcw icon): navigates to validate screen via `router.replace`
- Custom header with back button
- Success haptic on promote, error haptic + toast on failure

### 5. Stack Layout Registration (`packages/mobile/src/app/(tabs)/vault/_layout.tsx`)
- Added `[id]/validate` and `[id]/card` screens to the vault Stack
- Both have `headerShown: false` (custom headers built into each screen)

### 6. Vault Detail Modification (`packages/mobile/src/app/(tabs)/vault/[id]/index.tsx`)
- Added imports: `Button` component, `Zap` and `CreditCard` icons from lucide-react-native
- Added "Quick Validate / View Card" section between the description and divider:
  - If `project.cardResult` exists: shows "View Card" button (variant="accent") with CreditCard icon, navigates to card screen
  - If no `cardResult`: shows "Quick Validate" button (variant="primary") with Zap icon, navigates to validate screen
  - Button disabled when `title.trim().length < 3`
- Added `validateSection` and `validateButton` styles

## Verification Results
- `pnpm --filter @forge/mobile exec tsc --noEmit` -- Only 2 pre-existing type errors in `(tabs)/_layout.tsx` (unrelated `any` parameter types). Zero type errors in any new or modified files.
- No TODO/FIXME markers in any new files
- All new screen files exist at expected paths
- Navigation flow verified: vault detail -> validate -> card (and back)
- Stack layout registers both new screens with `headerShown: false`

## Deviations from Plan
1. **CardResult type defined locally in ValidationCard**: Instead of importing from `@forge/shared` (which would require a workspace dependency from mobile to shared), I defined the `CardResult` interface locally in `ValidationCard.tsx` matching the shared type exactly. The actual runtime data flows through tRPC which handles serialization. This keeps the mobile package's dependency graph clean.
2. **90-second timeout implementation**: The plan suggested `AbortSignal.timeout(90000)` on the httpBatchLink fetch, but this would affect all requests globally. Instead, the timeout is implemented locally in the validate screen using `AbortController` with `setTimeout(90000)`. The mutation itself doesn't use the signal directly (tRPC mutations don't expose this), but the timeout triggers error handling. In practice, the server-side 60s Sonar Pro timeout will fire first.
3. **`router.replace` for validate->card transition**: Used `router.replace` instead of `router.push` when navigating from validate to card screen. This prevents the user from pressing back to return to the completed chat/loading state, which would be confusing. Same for re-validate (card -> validate).
4. **Error phase emoji**: Used a warning emoji in the error state for visual clarity, despite the general no-emoji convention. This is inline UI, not documentation.
5. **cardResult cast in card.tsx**: The `project.cardResult` comes back as `unknown` from Drizzle JSONB. Cast to `any` before passing to `ValidationCard`. The Zod validation happens server-side during extraction; the mobile client trusts the server's response.

## Files Created
- `packages/mobile/src/components/ui/ValidationCard.tsx` -- Card display component
- `packages/mobile/src/components/ui/Paywall.tsx` -- Paywall component (screen or BottomSheet)
- `packages/mobile/src/app/(tabs)/vault/[id]/validate.tsx` -- Chat + validation screen
- `packages/mobile/src/app/(tabs)/vault/[id]/card.tsx` -- Card result screen

## Files Modified
- `packages/mobile/src/app/(tabs)/vault/_layout.tsx` -- Registered validate and card screens
- `packages/mobile/src/app/(tabs)/vault/[id]/index.tsx` -- Added Quick Validate / View Card button

## Testing Notes
- The DB migration from Phase 1 must be applied before testing (the `cardResult` JSONB column needs to exist)
- The `PERPLEXITY_API_KEY` and `ANTHROPIC_API_KEY` environment variables must be set on the server
- First test: Create/open a project in vault -> tap "Quick Validate" -> answer 3 questions -> wait for card -> verify card renders
- Error test: To trigger CARD_LIMIT_REACHED, use a user with `freeCardUsed=true` and `mobileCardCount=0`
- The paywall "Subscribe" button intentionally shows a "Coming soon" toast (no payment integration yet)
