import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type JourneyState,
  type InterviewMode,
  getAvailableUpgrades,
  willReplaceResearch,
  getReplaceMessage,
  MODE_CONFIG,
} from '@forge/shared';

// Forge Design System Colors
const colors = {
  background: '#11100E',
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
};

// Icon mapping for React Native
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Sparkles: 'sparkles',
  Feather: 'flash-outline',
  Microscope: 'flame',
};

interface NextStepPromotionProps {
  ideaId: string;
  journeyState: JourneyState;
  onStartMode: (mode: InterviewMode) => void;
  isStarting: boolean;
  canAccessInDepth?: boolean;
  onShowUpgradePrompt?: () => void;
}

export function NextStepPromotion({
  ideaId,
  journeyState,
  onStartMode,
  isStarting,
  canAccessInDepth = true,
  onShowUpgradePrompt,
}: NextStepPromotionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const availableUpgrades = getAvailableUpgrades(journeyState);
  const showReplaceWarning = willReplaceResearch(journeyState);
  const replaceMessage = getReplaceMessage(journeyState);

  // Don't render if no upgrades available (journey complete)
  if (availableUpgrades.length === 0) {
    return null;
  }

  const handleModeClick = (mode: InterviewMode) => {
    // Check subscription access for IN_DEPTH
    if (mode === 'IN_DEPTH' && !canAccessInDepth) {
      onShowUpgradePrompt?.();
      return;
    }

    // Confirm if replacing existing research
    if (showReplaceWarning) {
      const message = replaceMessage || 'This will replace your current research. Continue?';
      Alert.alert(
        'Replace Current Research?',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => onStartMode(mode) },
        ]
      );
      return;
    }

    onStartMode(mode);
  };

  // Get header text based on journey state
  const headerText = journeyState === 'LIGHT_COMPLETE'
    ? 'Final Step: Unlock Full Reports'
    : 'Go Deeper';

  const headerDescription = journeyState === 'LIGHT_COMPLETE'
    ? 'Upgrade to complete research with all reports'
    : 'Upgrade for more comprehensive analysis';

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{headerText}</Text>
            <Text style={styles.headerSubtitle}>{headerDescription}</Text>
          </View>
        </View>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={colors.muted}
        />
      </TouchableOpacity>

      {/* Content */}
      {!isCollapsed && (
        <View style={styles.content}>
          {/* Mode Cards */}
          <View style={styles.cardsContainer}>
            {availableUpgrades.map((mode) => {
              const config = MODE_CONFIG[mode];
              const iconName = ICONS[config.iconName];
              const canAccess = mode !== 'IN_DEPTH' || canAccessInDepth;

              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeCard,
                    { borderColor: canAccess ? `${config.color}30` : colors.border },
                  ]}
                  onPress={() => handleModeClick(mode)}
                  disabled={isStarting}
                  activeOpacity={0.7}
                >
                  {/* PRO badge for locked IN_DEPTH */}
                  {mode === 'IN_DEPTH' && !canAccess && (
                    <View style={styles.proBadge}>
                      <Ionicons name="lock-closed" size={10} color={colors.primary} />
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}

                  {/* Header Row */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: config.bgColor }]}>
                      <Ionicons name={iconName} size={18} color={config.color} />
                    </View>
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardTitle}>{config.name}</Text>
                      <Text style={styles.cardTagline}>{config.tagline}</Text>
                    </View>
                  </View>

                  {/* Benefits */}
                  <View style={styles.benefitsList}>
                    {config.benefits.map((benefit, i) => (
                      <View key={i} style={styles.benefitItem}>
                        <View style={[styles.benefitDot, { backgroundColor: config.color }]} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.durationText}>{config.duration}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={canAccess ? config.color : colors.muted}
                    />
                  </View>

                  {/* Lock overlay for FREE users on IN_DEPTH */}
                  {mode === 'IN_DEPTH' && !canAccess && (
                    <View style={styles.lockOverlay}>
                      <View style={styles.lockBadge}>
                        <Ionicons name="lock-closed" size={12} color={colors.primary} />
                        <Text style={styles.lockText}>Upgrade to unlock</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Replace Warning */}
          {showReplaceWarning && replaceMessage && (
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
              <Text style={styles.warningText}>{replaceMessage}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  cardsContainer: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardTagline: {
    fontSize: 12,
    color: colors.muted,
  },
  benefitsList: {
    gap: 6,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  benefitText: {
    fontSize: 12,
    color: colors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationText: {
    fontSize: 10,
    color: colors.muted,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 16, 14, 0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lockText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
});

export default NextStepPromotion;
