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
import { Lock, LogOut, ChevronRight, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { trpc } from '../../../lib/trpc';
import { useAuth } from '../../../contexts/AuthContext';
import { Badge } from '../../../components/ui/Badge';
import { colors, fonts } from '../../../lib/theme';

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  MOBILE: 'Mobile',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
  SCALE: 'Scale',
  TESTER: 'Tester',
};

const TIER_BADGE_VARIANT: Record<string, 'default' | 'success' | 'primary' | 'accent' | 'info' | 'warning'> = {
  FREE: 'default',
  MOBILE: 'primary',
  PRO: 'accent',
  ENTERPRISE: 'info',
  SCALE: 'warning',
  TESTER: 'success',
};

export default function SettingsScreen() {
  const { signOut, refreshUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const { data: user, isLoading: userLoading } = trpc.user.me.useQuery();

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

  if (userLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.card}>
            {/* Avatar & Info */}
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.brandMuted }]}>
                <Text style={[styles.avatarText, { color: colors.brand }]}>
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
                <Lock size={16} color={colors.muted} />
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/plans' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: colors.brandMuted }]}>
                <Crown size={20} color={colors.brand} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Manage Plan</Text>
                <View style={styles.planBadgeRow}>
                  <Badge variant={TIER_BADGE_VARIANT[user?.subscription ?? 'FREE'] || 'default'}>
                    {TIER_LABELS[user?.subscription ?? 'FREE'] || 'Free'}
                  </Badge>
                </View>
              </View>
              <ChevronRight size={20} color={colors.muted} />
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
                <LogOut size={20} color={colors.destructive} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Sign Out</Text>
                <Text style={styles.menuSubtitle}>Sign out of your account</Text>
              </View>
              <ChevronRight size={20} color={colors.muted} />
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
          <Text style={styles.versionText}>Idea Fuel v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.outfit.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
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
    fontFamily: fonts.outfit.semiBold,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  textInputFocused: {
    borderColor: `${colors.brand}50`,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.brand,
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
  planBadgeRow: {
    flexDirection: 'row',
    marginTop: 2,
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
