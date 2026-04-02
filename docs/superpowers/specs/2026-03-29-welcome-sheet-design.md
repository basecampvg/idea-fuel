# Welcome Sheet — First-Launch Onboarding

## Overview

A tall (~85% screen height) frosted glass bottom sheet that flies in from below on a user's first launch after sign-up. Introduces the four core features of IdeaFuel: idea capture, notes, vault, and validation. Dismissed via "Get Started" button or close X — never shown again.

## Component

**File:** `src/components/ui/WelcomeSheet.tsx`

Standalone component. Does not extend or reuse the existing `BottomSheet.tsx` — that component uses the basic Animated API and lacks blur support. This component is purpose-built with `expo-blur` and Reanimated.

### Visual Design

- **Background:** `BlurView` from `expo-blur` (`tint="dark"`, `intensity={40}`) layered with a semi-transparent overlay (`rgba(10, 10, 10, 0.7)`)
- **Top border:** `LinearGradient` stroke in brand red, matching existing glass patterns (e.g. capture input bar)
- **Border radius:** 24px top-left/top-right, 0 bottom
- **Backdrop:** Full-screen semi-transparent black overlay behind the sheet

### Layout (top to bottom)

1. **Handle bar** — cosmetic drag indicator, centered, matches existing BottomSheet style
2. **Close X button** — top right, Lucide `X` icon, muted color, tappable
3. **Title** — "Welcome to IdeaFuel", Outfit bold, foreground color
4. **Subtitle** — Short one-liner in muted text (e.g. "Everything you need to capture and validate ideas")
5. **Feature cards** — 4 cards stacked vertically with 12px gaps
6. **"Get Started" button** — Full-width pill button, brand red background, Outfit semiBold white text

### Feature Cards

Each card: icon (left) + title + one-line description (right).

Card background: `rgba(22, 22, 22, 0.8)` with subtle `#222222` border, `borderRadius: 12`.

| Icon (Lucide) | Title | Description |
|---|---|---|
| `Mic` | Capture Ideas | Speak or type — your ideas are instantly captured and organized |
| `FileText` | Notes | Add context, research, and details to flesh out any idea |
| `Vault` | Vault | Your best ideas live here — organized, searchable, always ready |
| `TrendingUp` | Validate | AI-powered analysis tells you if your idea has real potential |

Icons: 24px, brand red color. Title: Outfit semiBold, foreground. Description: Outfit regular, muted.

## Animation

**Entrance:**
- Sheet starts positioned off-screen below (translateY = screen height)
- On trigger, springs up to final position with Reanimated `withSpring` (`damping: 15`, `stiffness: 90`)
- Backdrop opacity fades from 0 to 1 with `withTiming` (300ms) simultaneously
- Trigger fires ~300ms after capture screen mounts (lets the capture screen settle first)

**Exit:**
- Sheet slides down with `withTiming` (250ms, easeIn)
- Backdrop fades out simultaneously
- On animation complete: unmount component + persist flag

Uses Reanimated `useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming`.

## State & Persistence

- **Flag:** `AsyncStorage` key `ideafuel_has_seen_welcome`
- **Check:** `useEffect` in `capture.tsx` reads the flag on mount. If `null` (never set), show the sheet after a 300ms delay.
- **Dismiss:** Both "Get Started" and close X trigger the exit animation, then set the flag to `"true"`.
- **No server-side tracking** — purely local, device-level.

## Integration Point

**File:** `src/app/(tabs)/capture.tsx`

- Add `const [showWelcome, setShowWelcome] = useState(false)` state
- `useEffect` on mount: check AsyncStorage flag, if not set → `setTimeout(() => setShowWelcome(true), 300)`
- Render `{showWelcome && <WelcomeSheet onDismiss={handleDismiss} />}` at the end of the JSX
- `handleDismiss`: sets AsyncStorage flag + `setShowWelcome(false)`

## New Dependency

- `expo-blur` — install via `npx expo install expo-blur`

## Testing

- Verify sheet appears on first launch after sign-up
- Verify sheet does NOT appear on subsequent app opens
- Verify both dismiss methods (button + X) persist the flag
- Verify entrance spring animation and exit slide-down
- Verify blur effect renders correctly on iOS and Android (Android blur may be less performant — acceptable)
- Clear AsyncStorage key to re-test: `AsyncStorage.removeItem('ideafuel_has_seen_welcome')`
