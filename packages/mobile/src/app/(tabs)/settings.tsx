import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../contexts/AuthContext';
import { SUBSCRIPTION_TIER_LABELS, SUBSCRIPTION_TIER_DESCRIPTIONS } from '@forge/shared';

// ideationLab Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  borderFocus: 'rgba(233, 30, 140, 0.3)',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  destructive: '#EF4444',
  destructiveMuted: 'rgba(239, 68, 68, 0.1)',
};

const TIER_COLORS = {
  FREE: { color: colors.muted, bg: colors.mutedBg },
  PRO: { color: colors.info, bg: colors.infoMuted },
  ENTERPRISE: { color: colors.success, bg: colors.successMuted },
};

export default function SettingsScreen() {
  const { signOut, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();
  const { data: subscription, isLoading: subLoading } = trpc.user.subscription.useQuery();

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleUpdateProfile = () => {
    setIsSaving(true);
    updateUser.mutate({ name });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  if (userLoading || subLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tier = subscription?.tier || 'FREE';
  const tierStyle = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.FREE;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.card}>
            {/* Avatar & Info */}
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name || 'No name set'}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Your name"
                placeholderTextColor={`${colors.muted}80`}
                style={[
                  styles.textInput,
                  nameFocused && styles.textInputFocused,
                ]}
              />
            </View>

            {/* Email (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{user?.email || ''}</Text>
                <Ionicons name="lock-closed" size={16} color={colors.muted} />
              </View>
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleUpdateProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>

          <View style={styles.card}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionPlan}>
                  {subscription?.tier ? SUBSCRIPTION_TIER_LABELS[subscription.tier] : 'Free'} Plan
                </Text>
                <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                  <Text style={[styles.tierBadgeText, { color: tierStyle.color }]}>
                    {tier}
                  </Text>
                </View>
              </View>
              <Text style={styles.subscriptionDescription}>
                {subscription?.tier
                  ? SUBSCRIPTION_TIER_DESCRIPTIONS[subscription.tier]
                  : 'Basic features'}
              </Text>
            </View>

            {subscription?.features && (
              <>
                <View style={styles.divider} />
                <View style={styles.featuresGrid}>
                  <View style={styles.featureItem}>
                    <Ionicons name="bulb-outline" size={20} color={colors.muted} />
                    <View style={styles.featureContent}>
                      <Text style={styles.featureLabel}>Ideas Limit</Text>
                      <Text style={styles.featureValue}>
                        {subscription.features.maxIdeas === -1
                          ? 'Unlimited'
                          : subscription.features.maxIdeas}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="document-text-outline" size={20} color={colors.muted} />
                    <View style={styles.featureContent}>
                      <Text style={styles.featureLabel}>Reports per Idea</Text>
                      <Text style={styles.featureValue}>
                        {subscription.features.maxReportsPerIdea}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.upgradeButton}
              disabled
              activeOpacity={0.8}
            >
              <Ionicons name="rocket-outline" size={18} color={colors.muted} />
              <Text style={styles.upgradeButtonText}>Upgrade (Coming Soon)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.destructiveMuted }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Sign Out</Text>
                <Text style={styles.menuSubtitle}>Sign out of your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since{' '}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
              : 'N/A'}
          </Text>
          <Text style={styles.versionText}>ideationLab v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.muted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.mutedBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  textInputFocused: {
    borderColor: colors.borderFocus,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mutedBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: 0.7,
  },
  readOnlyText: {
    fontSize: 16,
    color: colors.muted,
  },
  helperText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  subscriptionHeader: {
    marginBottom: 4,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subscriptionPlan: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    marginRight: 10,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  featuresGrid: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    padding: 14,
  },
  featureContent: {
    marginLeft: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  featureValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.muted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: colors.muted,
  },
  versionText: {
    fontSize: 12,
    color: `${colors.muted}80`,
  },
});
