# Build Plan: Expo 55 / RN 0.83 Upgrade + iOS 26 Production Fix
**Created:** 2026-03-28
**Spec:** plan-build/specs/expo55-upgrade-spec-2026-03-28.md
**Status:** Draft
**Project type:** Existing codebase

## Overview

Upgrade IdeaFuel mobile from Expo SDK 54 / RN 0.81.5 to Expo SDK 55 / RN 0.83.2. Port the TurboModule SIGABRT patch, fix the build-from-source mechanism, fix the SpeechListeners black screen, and ship a production-ready iOS build that works on iOS 26.

## Component Inventory

| Component | Current | Target | Native Code | Risk |
|-----------|---------|--------|-------------|------|
| expo | ~54.0.31 | ~55.0.0 | YES | LOW — standard upgrade path |
| react-native | 0.81.5 | 0.83.2 | YES | MEDIUM — patch must port |
| react | 19.1.0 | 19.2.0 | NO | LOW |
| react-dom | 19.1.0 | 19.2.0 | NO | LOW |
| expo-router | ~6.0.21 | SDK 55 ver | YES | LOW |
| expo-updates | ~29.0.16 | SDK 55 ver | YES | LOW |
| expo-auth-session | ~7.0.10 | SDK 55 ver | YES | LOW |
| expo-dev-client | ~6.0.20 | SDK 55 ver | YES | LOW |
| expo-constants | ~18.0.13 | SDK 55 ver | NO | LOW |
| expo-crypto | ~15.0.8 | SDK 55 ver | YES | LOW |
| expo-haptics | ~15.0.8 | SDK 55 ver | YES | LOW |
| expo-font | ~14.0.11 | SDK 55 ver | YES | LOW |
| expo-linear-gradient | ~15.0.8 | SDK 55 ver | YES | LOW |
| expo-linking | ~8.0.11 | SDK 55 ver | NO | LOW |
| expo-secure-store | ~15.0.8 | SDK 55 ver | YES | LOW |
| expo-status-bar | ~3.0.9 | SDK 55 ver | NO | LOW |
| expo-web-browser | ~15.0.10 | SDK 55 ver | NO | LOW |
| expo-speech-recognition | ^3.1.1 | ^3.1.2 | YES | MEDIUM — not tested on SDK 55 |
| react-native-reanimated | ~4.1.6 | ~4.2.1 (SDK 55 bundled) | YES | LOW — 4.x→4.x |
| react-native-gesture-handler | ~2.28.0 | SDK 55 ver | YES | LOW |
| react-native-screens | ~4.16.0 | SDK 55 ver | YES | LOW |
| react-native-safe-area-context | ^5.6.2 | ^5.6.2+ | YES | LOW |
| @react-native-async-storage/async-storage | ^2.2.0 | ^2.2.0+ | YES | LOW |
| react-native-svg | ^15.15.3 | ^15.15.3+ | YES | LOW |
| react-native-webview | ^13.12.0 | ^13.12.0+ | YES | LOW |
| react-native-purchases | ^9.15.0 | ^9.15.0+ | YES | MEDIUM — verify RN 0.83 compat |
| react-native-css-interop | ^0.1.12 | ^0.1.12+ | NO | LOW |
| nativewind | ^4.1.23 | ^4.1.23+ | NO | LOW |
| @10play/tentap-editor | ^1.0.0 | ^1.0.0+ | YES | MEDIUM — verify RN 0.83 compat |
| babel-preset-expo | ~12.0.0 | SDK 55 ver | NO | LOW |
| @expo/metro-runtime | ^6.1.2 | SDK 55 ver | NO | LOW |
| expo-build-properties | N/A (NEW) | latest | NO | LOW — needed for source builds |
| react-native-worklets | 0.5.1 | SDK 55 ver | YES | LOW |

## Integration Contracts

### TurboModule Patch → RN 0.83 Source
- **What flows:** Objective-C++ source modification to `RCTTurboModule.mm`
- **How:** pnpm `patchedDependencies` patches source in `node_modules/react-native/`, then `expo-build-properties` `buildReactNativeFromSource: true` forces CocoaPods to compile from source instead of using pre-built xcframeworks
- **Path:** `ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm` (unchanged from 0.81)
- **Error path:** If patch doesn't apply cleanly, pnpm install will fail (build stops early, safe)

### expo-build-properties → Podfile
- **What flows:** `RCT_USE_PREBUILT_RNCORE=0` environment variable
- **How:** Plugin sets env var, CocoaPods reads it, compiles React from source
- **Replaces:** Fake `ios.buildReactNativeFromSource` key in `Podfile.properties.json`

### Config Plugin (patch-turbomodule.js) → Build
- **What flows:** Post-install Ruby script that patches RCTTurboModule.mm source in Pods directory
- **How:** Runs during `pod install` after sources are downloaded
- **Note:** May become redundant if pnpm patch + source build covers it. Keep as belt-and-suspenders for now.

### SpeechListeners Guard → App Startup
- **What flows:** Prevents mounting SpeechListeners if `useSpeechEvent` export is undefined
- **How:** `loadSpeechModule()` validates both `SpeechModule` and `useSpeechEvent` exist before returning true
- **Status:** Already applied to `capture.tsx`

## End-to-End Flows

### App Launch on iOS 26 (Release Build)
1. iOS launches IdeaFuel binary
2. Hermes loads `main.jsbundle`
3. React Native initializes TurboModules on async queue
4. If any void TurboModule method throws NSException → **patch catches it, logs via RCTLogError** (no crash)
5. Expo Router initializes, loads tab navigator
6. `capture.tsx` mounts, defers `expo-speech-recognition` via `InteractionManager`
7. `loadSpeechModule()` checks if both `SpeechModule` and `useSpeechEvent` are defined
8. If defined → `SpeechListeners` mounts, voice capture works
9. If undefined → `speechReady` stays false, voice capture unavailable, **app doesn't crash**
10. User sees home/capture tab, app is functional

## Convention Guide
- File naming: kebab-case
- Git branch: `matt/expo55-upgrade`
- TypeScript strict mode
- Existing Babel config: `babel-preset-expo` + nativewind + reanimated plugin

## Issues Found

1. **`ios.buildReactNativeFromSource` is not a real config key** — must replace with `expo-build-properties` plugin
2. **pnpm patch file targets RN 0.81.5** — must create new patch for RN 0.83.2
3. **Config plugin `patch-turbomodule.js` writes fake Podfile.properties.json key** — must update to use `expo-build-properties` instead
4. **Xcode 26.4 `fmt` library issue** — building from source may fail with `consteval` error; fix: post-install hook setting `FMT_USE_CONSTEVAL=0`
5. **Root `package.json` has `patchedDependencies` for `react-native@0.81.5`** — must update to `react-native@0.83.2`

## Wiring Checklist

### Dependencies & Config
- [ ] Install `expo-build-properties` package
- [ ] Add `expo-build-properties` to `app.json` plugins with `{ "buildReactNativeFromSource": true }`
- [ ] Run `npx expo install expo@^55.0.0` from `packages/mobile/`
- [ ] Verify `react` and `react-native` versions in resulting package.json
- [ ] Bump `expo-speech-recognition` to `^3.1.2`
- [ ] Bump `babel-preset-expo` to SDK 55 compatible version
- [ ] Run `pnpm install` from root to update lockfile
- [ ] Verify no peer dependency conflicts

### Patch Infrastructure
- [ ] Create new `patches/react-native@0.83.2.patch` with the TurboModule fix
- [ ] Remove old `patches/react-native@0.81.5.patch`
- [ ] Update root `package.json` `pnpm.patchedDependencies` to reference `react-native@0.83.2`
- [ ] Update `patch-turbomodule.js` config plugin: remove fake Podfile.properties.json write, keep Ruby post-install hook as backup
- [ ] Verify patch applies cleanly: `pnpm install` should succeed without errors

### Code Fixes
- [ ] `SpeechListeners` guard in `capture.tsx` (DONE)
- [ ] Verify `metro.config.js` works with Expo 55 `getDefaultConfig`
- [ ] Verify `babel.config.js` works with new `babel-preset-expo`
- [ ] Verify `tsconfig.json` `extends: "expo/tsconfig.base"` resolves

### Verification
- [ ] `pnpm type-check` passes (or at least `packages/mobile` types)
- [ ] Metro bundler starts and bundles without errors
- [ ] EAS build succeeds for `testflight` profile
- [ ] App launches on iOS 26 device — no crash, no black screen
- [ ] Tab navigation works (home, capture, projects)
- [ ] Capture screen loads, text input works
- [ ] Voice capture: either works or gracefully unavailable (no crash)
- [ ] RevenueCat: offerings load (or error is non-fatal)
- [ ] Auth: login flow works
- [ ] App works on iOS 18.x (no regression)

## Build Order

### Phase 1: Dependency Upgrade
Branch creation, `npx expo install`, package bumps, lockfile update. No code changes except version numbers.

**Checklist items:** All items under "Dependencies & Config"

### Phase 2: Patch Port & Build Mechanism Fix
Create RN 0.83 patch, update config plugin, install expo-build-properties. This is the most critical phase — if the patch doesn't apply or build-from-source doesn't work, the iOS 26 crash returns.

**Checklist items:** All items under "Patch Infrastructure"

### Phase 3: Code Fixes & Local Verification
Apply SpeechListeners fix (done), verify Metro/Babel/TypeScript compatibility. Run type-check. Test Metro bundling locally.

**Checklist items:** All items under "Code Fixes" + first 2 items under "Verification"

### Phase 4: EAS Build & Device Testing
Submit EAS build, install via TestFlight, test on physical iOS 26 device.

**Checklist items:** Remaining items under "Verification"
