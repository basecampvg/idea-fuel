# About Screen & Open Source Acknowledgements

## Overview

Add an About screen to the Settings stack with open source license attribution as the primary section. This fulfills legal obligations for third-party library licenses and gives users a place to find app info and support links.

## Settings Screen Changes

Add an "About" navigation row to the existing Settings screen, placed below the Account section and above the existing footer. The row follows the same pattern as the "Manage Plan" row: a glass-border card with label text, chevron-right icon, and `onPress` that pushes to the About screen via Expo Router (`router.push('/settings/about')`).

## About Screen (`about.tsx`)

New screen in the settings stack at `packages/mobile/src/app/(tabs)/settings/about.tsx`. Uses a single `FlatList` where the license list is the main data, `ListHeaderComponent` contains App Info + the search input, and `ListFooterComponent` contains the Links section. This avoids nested scrolling issues entirely.

### Section 1: Open Source Libraries (Acknowledgements)

Position: Top of screen, most prominent.

**Search**: A text input at the top with the existing glow-focus style. Filters the license list by package name in real time.

**License List**: The main `FlatList` data — all third-party dependencies. Each row shows:
- Package name (semiBold, foreground color)
- License type badge (e.g., "MIT", "Apache-2.0") using the existing `Badge` component
- Author name (muted text)

**Expand/Collapse**: Tapping a row expands it inline to reveal the full license text in a monospace font (`fonts.mono.regular`). Tapping again collapses it. Only one row expanded at a time to keep the list manageable.

**Data Source**: Static JSON file at `packages/mobile/src/data/licenses.json`, generated at build time.

### Section 2: App Info

- IdeaFuel wordmark (matching the header style — "IDEA" in muted, "FUEL" in brand red)
- Version number from `expo-constants` (`Constants.expoConfig?.version`)
- Build number from `Constants.expoConfig?.ios?.buildNumber` / `Constants.expoConfig?.android?.versionCode`

### Section 3: Links

Rows that open external URLs via `Linking.openURL()`:
- Privacy Policy
- Terms of Service
- Contact Support (mailto: or URL)

Each row styled as a touchable with label + external-link icon from lucide-react-native.

## Navigation Registration

In `packages/mobile/src/app/(tabs)/settings/_layout.tsx`, add a new `Stack.Screen`:

```tsx
<Stack.Screen
  name="about"
  options={{
    title: 'About',
    headerLeft: () => (
      // Same ChevronLeft back button pattern as plans.tsx
    ),
    // Same header styling as plans screen
  }}
/>
```

## License Data Generation

### Script: `scripts/generate-licenses.js`

A Node.js script that:
1. Reads `packages/mobile/package.json` to get the dependency list
2. For each dependency, reads `node_modules/<pkg>/package.json` to extract: `name`, `version`, `license`, `author`
3. Looks for a LICENSE or LICENSE.md file in each package directory and reads its text content
4. Writes the collected data to `packages/mobile/src/data/licenses.json` as an array:

```json
[
  {
    "name": "react-native",
    "version": "0.83.2",
    "license": "MIT",
    "author": "Meta Platforms, Inc.",
    "licenseText": "MIT License\n\nCopyright (c) ..."
  }
]
```

Sorted alphabetically by package name.

### Integration

Add a `generate-licenses` script to `packages/mobile/package.json`:
```json
"generate-licenses": "node ../../scripts/generate-licenses.js"
```

Run manually or as part of the build process. The generated JSON is committed to the repo so the app doesn't need to regenerate at runtime.

## Styling

All styling follows existing Settings screen conventions:
- Dark background (`colors.background`)
- Glass-border gradient cards (`LinearGradient` with `glassBorderStart`/`glassBorderEnd`)
- Outfit font family for text, SF Mono for license text
- 16-20px horizontal padding, 12-16px vertical padding on cards
- `colors.foreground` for primary text, `colors.muted` for secondary
- Platform-specific shadows (iOS shadow properties, Android elevation)

## Scope Boundaries

**In scope:**
- About screen with three sections
- License generation script
- Settings screen "About" row
- Stack navigation registration

**Out of scope:**
- Animated transitions beyond default stack push
- License compliance auditing (script extracts what's declared, doesn't validate)
- Deep linking to About screen
- Analytics/tracking on the About screen
