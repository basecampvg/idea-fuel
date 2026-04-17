import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, LogOut, ChevronRight, Crown, Info, Eye, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { colors, fonts } from '../../lib/theme';
import { useShowHelpIcons } from '../../hooks/useShowHelpIcons';

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
  const [showHelpIcons, setShowHelpIcons] = useShowHelpIcons();
  const glowAnim = useRef(new Animated.Value(0)).current;

  const animateGlow = (toValue: number) => {
    Animated.timing(glowAnim, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

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
      if (__DEV__) console.error('Profile update failed:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
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
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/signin' as any);
        },
      },
    ]);
  };

  const deleteAccount = trpc.user.delete.useMutation({
    onSuccess: async () => {
      await signOut();
    },
    onError: (err) => {
      Alert.alert(
        'Could not delete account',
        err.message || 'Something went wrong. Please try again or contact support.',
      );
    },
  });

  const handleDeleteAccount = () => {
    const email = user?.email ?? '';

    // Alert.prompt is iOS-only. On Android, route users to the web settings
    // page for the typed-email confirmation step. The server-side mutation
    // is the same.
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Delete Account',
        `To delete your account, open app.ideafuel.ai/settings on the web and use the Delete Account button there. (Typed-email confirmation isn't supported in this Android alert.)`,
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Delete Account?',
      'This permanently removes your projects, ideas, interviews, reports, and billing data. Blog posts you authored stay published anonymously. Any active subscription is canceled. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Type your email to confirm',
              `Enter ${email} exactly to delete your account.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: (input?: string) => {
                    const provided = (input ?? '').trim().toLowerCase();
                    const expected = email.trim().toLowerCase();
                    if (provided !== expected) {
                      Alert.alert('Email did not match. Nothing was deleted.');
                      return;
                    }
                    deleteAccount.mutate({ emailConfirmation: input ?? '' });
                  },
                },
              ],
              'plain-text',
              '',
              'email-address',
            );
          },
        },
      ],
    );
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
        {/* Drag Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
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
                <View style={styles.inputGlowWrapper}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.inputGlowEffect,
                      {
                        opacity: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ]}
                  />
                  <View style={styles.inputWrapper}>
                    <LinearGradient
                      colors={['transparent', colors.brand, 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.inputTopGlow}
                    />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      onFocus={() => { setNameFocused(true); animateGlow(1); }}
                      onBlur={() => { setNameFocused(false); animateGlow(0); }}
                      placeholder="Your name"
                      placeholderTextColor={`${colors.muted}80`}
                      style={[
                        styles.textInput,
                        nameFocused && styles.textInputFocused,
                      ]}
                    />
                  </View>
                </View>
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
          </LinearGradient>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>

          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/settings/plans' as any)}
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
          </LinearGradient>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.card}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(3, 147, 248, 0.15)' }]}>
                  <Eye size={20} color={colors.accent} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Show page guides</Text>
                  <Text style={styles.menuSubtitle}>Info icons on Notes, Sandbox, and Vault</Text>
                </View>
                <Switch
                  value={showHelpIcons}
                  onValueChange={setShowHelpIcons}
                  trackColor={{ false: colors.surface, true: colors.brandMuted }}
                  thumbColor={showHelpIcons ? colors.brand : colors.muted}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <LinearGradient
            colors={[colors.glassBorderStart, colors.glassBorderEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
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

              <View style={{ height: 1, backgroundColor: colors.glassBorderEnd, marginHorizontal: 16 }} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
                disabled={deleteAccount.isPending}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: colors.destructiveMuted }]}>
                  <Trash2 size={20} color={colors.destructive} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: colors.destructive }]}>
                    {deleteAccount.isPending ? 'Deleting…' : 'Delete Account'}
                  </Text>
                  <Text style={styles.menuSubtitle}>Permanently remove your account and data</Text>
                </View>
                <ChevronRight size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>


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
                onPress={() => router.push('/settings/about' as any)}
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
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    ...fonts.outfit.bold,
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
  gradientBorder: {
    borderRadius: 24,
    padding: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 23,
    padding: 16,
    overflow: 'hidden',
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
    ...fonts.outfit.semiBold,
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
  inputGlowWrapper: {
    position: 'relative',
  },
  inputGlowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(227, 43, 26, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  inputWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputTopGlow: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    zIndex: 1,
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
    borderColor: colors.brandGlow,
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
