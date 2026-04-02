# About Screen & Open Source Acknowledgements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an About screen to the Settings stack with open source license attribution, app info, and support links.

**Architecture:** New `about.tsx` screen in the settings Expo Router stack, navigated from a new row on the Settings index. License data generated at build time by a Node script that crawls `node_modules` and outputs a static JSON file. The About screen renders a `FlatList` with the license list as data, header/footer components for app info and links.

**Tech Stack:** React Native, Expo Router, expo-constants, expo-linear-gradient, lucide-react-native, Node.js (license script)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `scripts/generate-licenses.js` | Crawl node_modules, extract license info, write JSON |
| Create | `packages/mobile/src/data/licenses.json` | Static license data (generated, committed) |
| Create | `packages/mobile/src/app/(tabs)/settings/about.tsx` | About screen with licenses, app info, links |
| Modify | `packages/mobile/src/app/(tabs)/settings/_layout.tsx` | Register About screen in stack |
| Modify | `packages/mobile/src/app/(tabs)/settings/index.tsx` | Add About navigation row |
| Modify | `packages/mobile/package.json` | Add `generate-licenses` script |

---

### Task 1: License Generation Script

**Files:**
- Create: `scripts/generate-licenses.js`
- Create: `packages/mobile/src/data/licenses.json`
- Modify: `packages/mobile/package.json`

- [ ] **Step 1: Create the license generation script**

Create `scripts/generate-licenses.js`:

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MOBILE_PKG_PATH = path.resolve(__dirname, '../packages/mobile/package.json');
const OUTPUT_PATH = path.resolve(__dirname, '../packages/mobile/src/data/licenses.json');

const mobilePkg = JSON.parse(fs.readFileSync(MOBILE_PKG_PATH, 'utf8'));
const allDeps = Object.keys({
  ...mobilePkg.dependencies,
  ...mobilePkg.devDependencies,
});

const LICENSE_FILE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'license.txt', 'License.md'];

function findLicenseText(pkgDir) {
  for (const name of LICENSE_FILE_NAMES) {
    const filePath = path.join(pkgDir, name);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  }
  return null;
}

const licenses = [];

for (const depName of allDeps) {
  // Try resolving from mobile package's node_modules first, then root
  const candidates = [
    path.resolve(__dirname, '../packages/mobile/node_modules', depName),
    path.resolve(__dirname, '../node_modules', depName),
  ];

  let pkgDir = null;
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      pkgDir = candidate;
      break;
    }
  }

  if (!pkgDir) {
    console.warn(`  Skipping ${depName} — not found in node_modules`);
    continue;
  }

  const depPkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

  let author = '';
  if (typeof depPkg.author === 'string') {
    author = depPkg.author;
  } else if (depPkg.author?.name) {
    author = depPkg.author.name;
  }

  const licenseText = findLicenseText(pkgDir);

  licenses.push({
    name: depPkg.name || depName,
    version: depPkg.version || '',
    license: depPkg.license || 'Unknown',
    author,
    licenseText: licenseText || '',
  });
}

licenses.sort((a, b) => a.name.localeCompare(b.name));

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(licenses, null, 2));
console.log(`Generated ${licenses.length} license entries → ${OUTPUT_PATH}`);
```

- [ ] **Step 2: Add the generate-licenses npm script**

In `packages/mobile/package.json`, add to the `"scripts"` block:

```json
"generate-licenses": "node ../../scripts/generate-licenses.js"
```

- [ ] **Step 3: Run the script to generate initial license data**

Run: `cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && node scripts/generate-licenses.js`

Expected: Console output showing "Generated N license entries → ..." and a new file at `packages/mobile/src/data/licenses.json` containing a JSON array of license objects.

- [ ] **Step 4: Verify the generated output**

Run: `head -30 packages/mobile/src/data/licenses.json`

Expected: Valid JSON array with entries containing `name`, `version`, `license`, `author`, `licenseText` fields, sorted alphabetically.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-licenses.js packages/mobile/src/data/licenses.json packages/mobile/package.json
git commit -m "feat: add license generation script and initial license data"
```

---

### Task 2: Register About Screen in Settings Stack

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/settings/_layout.tsx:38-52`

- [ ] **Step 1: Add About Stack.Screen to the settings layout**

In `packages/mobile/src/app/(tabs)/settings/_layout.tsx`, add a new `Stack.Screen` after the `plans` screen (after line 50):

```tsx
      <Stack.Screen
        name="about"
        options={{
          title: 'About',
        }}
      />
```

The full `<Stack>` block becomes:

```tsx
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: colors.foreground,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
          ) : null,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="plans"
        options={{
          title: 'Manage Plan',
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About',
        }}
      />
    </Stack>
```

- [ ] **Step 2: Verify the layout compiles**

Run: `cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile type-check`

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/settings/_layout.tsx
git commit -m "feat: register About screen in settings stack"
```

---

### Task 3: Add About Row to Settings Screen

**Files:**
- Modify: `packages/mobile/src/app/(tabs)/settings/index.tsx:1-20` (imports)
- Modify: `packages/mobile/src/app/(tabs)/settings/index.tsx:244-272` (before footer)

- [ ] **Step 1: Add the Info import**

In `packages/mobile/src/app/(tabs)/settings/index.tsx`, update the lucide-react-native import on line 15 to include `Info`:

Change:
```tsx
import { Lock, LogOut, ChevronRight, Crown } from 'lucide-react-native';
```

To:
```tsx
import { Lock, LogOut, ChevronRight, Crown, Info } from 'lucide-react-native';
```

- [ ] **Step 2: Add the About section between Account and Footer**

In `packages/mobile/src/app/(tabs)/settings/index.tsx`, insert the following block after the `{/* Account Section */}` closing `</View>` (after line 272) and before `{/* Footer */}`:

```tsx
        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>

          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/(tabs)/settings/about' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(3, 147, 248, 0.15)' }]}>
                  <Info size={20} color={colors.accent} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>About</Text>
                  <Text style={styles.menuSubtitle}>Licenses, app info & links</Text>
                </View>
                <ChevronRight size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile type-check`

Expected: No TypeScript errors (the `about.tsx` file doesn't exist yet, but Expo Router won't error at type-check time — it resolves at runtime).

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/settings/index.tsx
git commit -m "feat: add About navigation row to Settings screen"
```

---

### Task 4: Create the About Screen

**Files:**
- Create: `packages/mobile/src/app/(tabs)/settings/about.tsx`

- [ ] **Step 1: Create the About screen**

Create `packages/mobile/src/app/(tabs)/settings/about.tsx`:

```tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Linking,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ExternalLink, X } from 'lucide-react-native';
import Constants from 'expo-constants';
import { colors, fonts } from '../../../lib/theme';
import licensesData from '../../../data/licenses.json';

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  author: string;
  licenseText: string;
}

const licenses: LicenseEntry[] = licensesData as LicenseEntry[];

export default function AboutScreen() {
  const [search, setSearch] = useState('');
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const filteredLicenses = useMemo(() => {
    if (!search.trim()) return licenses;
    const q = search.toLowerCase();
    return licenses.filter((l) => l.name.toLowerCase().includes(q));
  }, [search]);

  const toggleExpand = useCallback((name: string) => {
    setExpandedPkg((prev) => (prev === name ? null : name));
  }, []);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();

  const renderLicenseItem = useCallback(
    ({ item }: { item: LicenseEntry }) => {
      const isExpanded = expandedPkg === item.name;

      return (
        <TouchableOpacity
          style={styles.licenseRow}
          onPress={() => toggleExpand(item.name)}
          activeOpacity={0.7}
        >
          <View style={styles.licenseHeader}>
            <View style={styles.licenseNameRow}>
              <Text style={styles.licenseName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.license !== 'Unknown' && (
                <View style={styles.licenseBadge}>
                  <Text style={styles.licenseBadgeText}>{item.license}</Text>
                </View>
              )}
            </View>
            {item.author ? (
              <Text style={styles.licenseAuthor} numberOfLines={1}>
                {item.author}
              </Text>
            ) : null}
          </View>
          {isExpanded && item.licenseText ? (
            <View style={styles.licenseTextContainer}>
              <Text style={styles.licenseText}>{item.licenseText}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [expandedPkg, toggleExpand],
  );

  const keyExtractor = useCallback((item: LicenseEntry) => item.name, []);

  const ListHeader = useMemo(
    () => (
      <View>
        {/* App Info Section */}
        <View style={styles.appInfoSection}>
          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.appInfoCard}>
              <View style={styles.wordmark}>
                <Text style={styles.wordmarkIdea}>IDEA</Text>
                <Text style={styles.wordmarkFuel}>FUEL</Text>
              </View>
              <Text style={styles.versionText}>
                Version {version}
                {buildNumber ? ` (${buildNumber})` : ''}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Links Section */}
        <View style={styles.linksSection}>
          <Text style={styles.sectionTitle}>Links</Text>
          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.linksCard}>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL('https://ideafuel.ai/privacy')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
                <ExternalLink size={16} color={colors.muted} />
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL('https://ideafuel.ai/terms')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Terms of Service</Text>
                <ExternalLink size={16} color={colors.muted} />
              </TouchableOpacity>
              <View style={styles.linkDivider} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL('mailto:support@ideafuel.ai')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Contact Support</Text>
                <ExternalLink size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Licenses Section Header */}
        <View style={styles.licensesSectionHeader}>
          <Text style={styles.sectionTitle}>Open Source Libraries</Text>
          <Text style={styles.licenseCount}>
            {filteredLicenses.length} {filteredLicenses.length === 1 ? 'library' : 'libraries'}
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search libraries..."
            placeholderTextColor={`${colors.muted}80`}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    [version, buildNumber, search, filteredLicenses.length],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredLicenses}
        renderItem={renderLicenseItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // App Info
  appInfoSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  gradientBorder: {
    borderRadius: 16,
    padding: 1,
  },
  appInfoCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    flexDirection: 'row',
    gap: 6,
  },
  wordmarkIdea: {
    fontSize: 24,
    ...fonts.outfit.bold,
    color: colors.muted,
    letterSpacing: 2,
  },
  wordmarkFuel: {
    fontSize: 24,
    ...fonts.outfit.bold,
    color: colors.brand,
    letterSpacing: 2,
  },
  versionText: {
    fontSize: 14,
    ...fonts.geist.regular,
    color: colors.muted,
  },

  // Links
  linksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  linksCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkText: {
    fontSize: 15,
    ...fonts.outfit.medium,
    color: colors.foreground,
  },
  linkDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },

  // Licenses header
  licensesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 0,
  },
  licenseCount: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
    marginRight: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },

  // License rows
  licenseRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 14,
  },
  licenseHeader: {
    gap: 2,
  },
  licenseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  licenseName: {
    fontSize: 15,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
    flexShrink: 1,
  },
  licenseBadge: {
    backgroundColor: 'rgba(3, 147, 248, 0.15)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  licenseBadgeText: {
    fontSize: 11,
    ...fonts.geist.medium,
    color: colors.accent,
  },
  licenseAuthor: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
  licenseTextContainer: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  licenseText: {
    fontSize: 11,
    ...fonts.mono.regular,
    color: colors.muted,
    lineHeight: 16,
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile type-check`

Expected: No TypeScript errors. The JSON import may need a `resolveJsonModule: true` in tsconfig — verify this is already set; if not, enable it.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/app/\(tabs\)/settings/about.tsx
git commit -m "feat: add About screen with license attribution, app info, and links"
```

---

### Task 5: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full type check**

Run: `cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile type-check`

Expected: Clean pass, no errors.

- [ ] **Step 2: Start the dev server and verify navigation**

Run: `cd /Users/mattjones/Documents/IdeaFuel/idea-fuel && pnpm --filter @forge/mobile dev`

Verify manually:
1. Settings screen shows the new "About" row below the Account section
2. Tapping "About" navigates to the About screen with back button
3. App info card shows IDEA FUEL wordmark and version
4. Links section has three tappable rows
5. License list renders with search working
6. Tapping a license row expands to show license text
7. Back button returns to Settings

- [ ] **Step 3: Final commit (if any adjustments were needed)**

```bash
git add -A
git commit -m "fix: address About screen issues from manual testing"
```
