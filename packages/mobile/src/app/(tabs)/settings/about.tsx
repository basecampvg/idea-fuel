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
