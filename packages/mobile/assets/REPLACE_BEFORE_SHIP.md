# 🚫 DO NOT SHIP: Placeholder Icon + Splash

**Status as of 2026-04-16:** every PNG in this directory is a 67-byte,
1×1 transparent placeholder. App Store Review Guideline 4.0 rejects
apps with blank or placeholder icons on first submission.

## Files to replace

| File | Required dimensions | Format notes |
|------|---------------------|--------------|
| `icon.png` | 1024×1024 | PNG. **No alpha channel** (Apple rejects RGBA). No rounded corners — Apple applies the mask itself. |
| `adaptive-icon.png` | 1024×1024 | PNG. Your logo/mark centered in the middle ~66% of the canvas (safe zone for Android's circular/rounded/square masks). Background color is set separately (currently `#0A0A0A` in `app.json` line 33). |
| `splash.png` | 2048×2048 | PNG. Logo centered on transparent background. Expo uses `resizeMode: contain` against `splash` background color (currently `#0A0A0A` in `app.json` line 14). |
| `favicon.png` | 48×48 (min, recommend 96×96) | PNG. Web browser tab icon only. |

## Native assets that also need regeneration

Expo's prebuild copies these PNGs into the native iOS and Android
projects. The prebuilt `ios/` folder currently contains a "real"
1024×1024 icon that was generated during an earlier prebuild pass —
but any `expo prebuild --clean` or EAS build that re-prebuilds natives
will overwrite it with the placeholders. These files are also
placeholders:

- `ios/IdeaFuel/Images.xcassets/SplashScreenLegacy.imageset/image.png`

## How to replace (one-shot)

1. Drop real artwork into `packages/mobile/assets/` with the exact
   filenames above.
2. From the repo root, regenerate native projects so the new assets
   flow through:

   ```
   pnpm --filter @forge/mobile expo prebuild --clean
   ```

3. Commit the regenerated `ios/` and `android/` folders. The diff will
   be large but expected — native projects are regenerated fresh from
   the Expo config each prebuild.
4. Verify locally:

   ```
   # From packages/mobile
   pnpm ios         # opens Simulator with real icon / splash
   pnpm android     # same for Android
   ```

## Source-of-truth suggestion

Keep the original 4096×4096 master file (Figma, Sketch, .ai) somewhere
outside this repo (1Password, cloud drive). The PNGs here are exports.
If the brand ever changes, re-export rather than trying to edit these.

## Acceptance criteria before removing this file

- [ ] `file packages/mobile/assets/icon.png` reports dimensions `>= 1024x1024`
- [ ] `file packages/mobile/assets/adaptive-icon.png` reports `>= 1024x1024`
- [ ] `file packages/mobile/assets/splash.png` reports `>= 2048x2048`
- [ ] `file packages/mobile/assets/favicon.png` reports `>= 48x48`
- [ ] EAS TestFlight build shows real icon on home screen + launch screen
- [ ] Android Studio preview (or a fresh EAS build) shows the adaptive
      icon correctly with logo inside the safe zone on circle, rounded,
      and squared masks
- [ ] Delete this `REPLACE_BEFORE_SHIP.md` file when all four assets
      are real
