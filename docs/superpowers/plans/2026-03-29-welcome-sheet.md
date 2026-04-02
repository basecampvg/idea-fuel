# Welcome Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frosted glass bottom sheet that flies in on first launch to introduce new users to IdeaFuel's four core features.

**Architecture:** Standalone `WelcomeSheet` component using `expo-blur` BlurView + Reanimated spring animation, triggered from the capture screen via an AsyncStorage flag check. No changes to existing components.

**Tech Stack:** expo-blur, react-native-reanimated, @react-native-async-storage/async-storage, expo-linear-gradient, lucide-react-native

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Install | `expo-blur` (new dependency) | Native blur/frosted glass |
| Create | `src/components/ui/WelcomeSheet.tsx` | Self-contained welcome sheet with blur, animation, content |
| Modify | `src/app/(tabs)/capture.tsx` | Mount WelcomeSheet + AsyncStorage flag check |

All paths relative to `packages/mobile/`.

---

### Task 1: Install expo-blur

- [ ] **Step 1: Install the dependency**

Run from `packages/mobile/`:

```bash
npx expo install expo-blur
```

- [ ] **Step 2: Verify installation**

```bash
grep "expo-blur" package.json
```

Expected: `"expo-blur": "~14.x.x"` (version will match Expo 55 SDK)

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(mobile): add expo-blur for frosted glass effects"
```

---

### Task 2: Create WelcomeSheet component

**Files:**
- Create: `packages/mobile/src/components/ui/WelcomeSheet.tsx`

- [ ] **Step 1: Create the WelcomeSheet component**

```tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { X, Mic, FileText, Vault, TrendingUp } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

interface WelcomeSheetProps {
  onDismiss: () => void;
}

const FEATURES = [
  {
    Icon: Mic,
    title: 'Capture Ideas',
    description: 'Speak or type — your ideas are instantly captured and organized',
  },
  {
    Icon: FileText,
    title: 'Notes',
    description: 'Add context, research, and details to flesh out any idea',
  },
  {
    Icon: Vault,
    title: 'Vault',
    description: 'Your best ideas live here — organized, searchable, always ready',
  },
  {
    Icon: TrendingUp,
    title: 'Validate',
    description: 'AI-powered analysis tells you if your idea has real potential',
  },
] as const;

export function WelcomeSheet({ onDismiss }: WelcomeSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 90 });
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const dismiss = () => {
    backdropOpacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 250, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(onDismiss)();
      },
    );
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.6,
  }));

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      {/* Sheet */}
      <Animated.View style={[styles.sheetContainer, sheetStyle]}>
        <BlurView intensity={40} tint="dark" style={styles.blurFill}>
          <View style={styles.darkOverlay}>
            {/* Gradient top border */}
            <LinearGradient
              colors={['transparent', colors.brand, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.topGlow}
            />

            {/* Handle bar */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={dismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Welcome to IdeaFuel</Text>
              <Text style={styles.subtitle}>
                Everything you need to capture and validate ideas
              </Text>

              <View style={styles.featureList}>
                {FEATURES.map(({ Icon, title, description }) => (
                  <View key={title} style={styles.featureCard}>
                    <View style={styles.featureIcon}>
                      <Icon size={24} color={colors.brand} />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>{title}</Text>
                      <Text style={styles.featureDescription}>{description}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.ctaButton} onPress={dismiss}>
                <Text style={styles.ctaText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurFill: {
    flex: 1,
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    opacity: 0.5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    ...fonts.outfit.bold,
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    ...fonts.geist.regular,
    color: colors.muted,
    marginBottom: 32,
  },
  featureList: {
    gap: 12,
    flex: 1,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 22, 0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.muted,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.brand,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaText: {
    fontSize: 18,
    ...fonts.outfit.semiBold,
    color: '#FFFFFF',
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd packages/mobile && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors in WelcomeSheet.tsx

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/WelcomeSheet.tsx
git commit -m "feat(mobile): add WelcomeSheet glass onboarding component"
```

---

### Task 3: Integrate into capture screen

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/capture.tsx`

- [ ] **Step 1: Add imports at the top of capture.tsx**

After the existing imports, add:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeSheet } from '../../components/ui/WelcomeSheet';
```

- [ ] **Step 2: Add welcome state and effect inside CaptureScreen**

After the existing `const MAX_ATTACHMENTS = 5;` line (~line 85), add:

```tsx
// Welcome sheet — first launch only
const [showWelcome, setShowWelcome] = useState(false);

useEffect(() => {
  AsyncStorage.getItem('ideafuel_has_seen_welcome').then((value) => {
    if (value === null) {
      setTimeout(() => setShowWelcome(true), 300);
    }
  });
}, []);

const handleDismissWelcome = useCallback(() => {
  setShowWelcome(false);
  AsyncStorage.setItem('ideafuel_has_seen_welcome', 'true');
}, []);
```

- [ ] **Step 3: Render WelcomeSheet at the end of the component JSX**

Right before the closing `</View>` of the `safeArea` wrapper (after the `<AttachmentPopover>` block, ~line 519), add:

```tsx
{showWelcome && <WelcomeSheet onDismiss={handleDismissWelcome} />}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd packages/mobile && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add src/app/\(tabs\)/capture.tsx
git commit -m "feat(mobile): show welcome sheet on first launch"
```

---

### Task 4: Manual test

- [ ] **Step 1: Clear the flag (if testing on a device that's already launched)**

In the app or via debugger:

```js
AsyncStorage.removeItem('ideafuel_has_seen_welcome')
```

Or uninstall/reinstall the dev build.

- [ ] **Step 2: Launch the app and verify**

Check all of:
- Sheet appears ~300ms after capture screen loads
- Frosted glass blur visible behind the sheet
- Brand red gradient line at top edge
- All 4 feature cards render with correct icons (Mic, FileText, Vault, TrendingUp)
- "Get Started" button dismisses with slide-down animation
- Close X button also dismisses
- Backdrop tap also dismisses
- On next launch, sheet does NOT appear

- [ ] **Step 3: Test on Android (if available)**

BlurView on Android uses a fallback renderer — verify it looks acceptable (may be less crisp than iOS, which is fine).
