# Feature Spec: Expo 55 / RN 0.83 Upgrade + iOS 26 Production Fix
**Created:** 2026-03-28
**Status:** Draft
**Project type:** Existing codebase

## Problem Statement

IdeaFuel mobile app crashes on iOS 26 release builds (SIGABRT in `RCTTurboModule.mm`). A source-level patch fixes the crash but the app shows a black screen due to an unguarded JS error in `SpeechListeners`. The app is on Expo SDK 54 / RN 0.81.5 — SDK 54 is aging out and the TurboModule bug (facebook/react-native#54859) isn't fixed in any released RN version. The goal is to upgrade to Expo 55 / RN 0.83, port the patch correctly, fix the black screen, and ship a production-ready iOS build.

## Users and Roles

- Matt (sole developer / technical founder) — builds, tests via TestFlight on physical iOS 26 device
- End users on iOS 26 devices — must not crash or black-screen

## Scope

### In scope (this build)
- Upgrade Expo SDK 54 → 55, React Native 0.81.5 → 0.83.2
- Bump all Expo-managed packages to SDK 55 compatible versions
- Port TurboModule SIGABRT patch (`RCTTurboModule.mm`) to RN 0.83 file paths
- Fix build-from-source mechanism: replace fake `ios.buildReactNativeFromSource` with real `RCT_USE_PREBUILT_RNCORE` env var or correct Podfile approach
- Fix `SpeechListeners` black screen (guard `useSpeechEvent` export)
- Update pnpm patch file for RN 0.83 (or remove if patch approach changes)
- Verify all community packages work with RN 0.83 + New Architecture
- EAS build + TestFlight verification on iOS 26 physical device

### Out of scope (future / not planned)
- Upgrading tRPC from RC to stable (separate concern, working fine)
- Adding new features
- Android testing (iOS 26 crash is iOS-only)
- Removing the TurboModule patch entirely (blocked on upstream merge of PR #55390)

### MVP vs stretch
- **MVP:** App launches, no crash, no black screen on iOS 26 release build. All existing features work.
- **Stretch:** Speech recognition works on iOS 26 (may be degraded due to TurboModule init; acceptable if app doesn't crash)

## Functional Requirements

### Happy Path
1. Run `npx expo install expo@^55.0.0` to get compatible versions
2. Bump remaining community packages to RN 0.83-compatible versions
3. Port the TurboModule patch to RN 0.83 source paths (file may have moved)
4. Fix the build-from-source mechanism in the config plugin
5. Apply `SpeechListeners` guard fix (already done)
6. Run type-check, verify Metro bundling
7. EAS build → TestFlight → launch on iOS 26 device
8. App loads, tabs work, capture/voice/projects all functional

### Edge Cases and Error Handling
- `expo-speech-recognition` native module fails to init on iOS 26: app loads without voice capture, no crash
- RevenueCat offering fetch fails: non-blocking, app continues (already handles this)
- TurboModule async void exception on iOS 26: logged via RCTLogError, no crash (patch)
- Community package incompatible with RN 0.83: identified during type-check/build, must find compatible version or alternative

### Data Validation Rules
N/A — this is a dependency upgrade, no data model changes.

## Data Model (high level)
No changes. Database schema, API contracts, and tRPC types are untouched.

## Non-Functional Requirements
- iOS release build must not crash on iOS 26
- iOS release build must not black-screen on iOS 26
- Build time will increase due to React-from-source compilation (acceptable, required for patch)
- No regressions on iOS 18.x (same binary must work on both)

## Constraints
- Must keep TurboModule patch until facebook/react-native#55390 merges upstream
- Must build React from source (pre-built framework can't be patched)
- `newArchEnabled: true` is required (Reanimated 4.x needs it, SDK 55 is New Arch only)
- EAS builds use Node 20.18.0 / pnpm 9.15.0 (verify compatibility)
- Git branch prefix: `matt/`

## Open Questions
- Has `RCTTurboModule.mm` moved or changed in RN 0.83 vs 0.81? (affects patch)
- Does `expo-speech-recognition@^3.1.1` work with Expo 55, or does it need a bump?
- What is the correct mechanism to force source compilation in RN 0.83 Podfile setup?
