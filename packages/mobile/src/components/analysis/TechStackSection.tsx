import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  border: '#1F1E1C',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  success: '#22C55E',
  info: '#3B82F6',
};

const BUSINESS_TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  saas: { color: colors.secondary, bg: colors.secondaryMuted },
  ecommerce: { color: colors.warning, bg: colors.warningMuted },
  service: { color: colors.success, bg: 'rgba(34, 197, 94, 0.15)' },
  content: { color: colors.primary, bg: colors.primaryMuted },
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low: colors.success,
  medium: colors.warning,
  high: '#EF4444',
};

interface TechRecommendation {
  name: string;
  category?: string;
  purpose?: string;
  alternatives?: string[];
  complexity?: 'low' | 'medium' | 'high';
  monthlyEstimate?: string;
  learnMoreUrl?: string;
}

interface TechStackData {
  businessType?: 'saas' | 'ecommerce' | 'service' | 'content';
  businessTypeConfidence?: 'high' | 'medium' | 'low';
  businessTypeReasoning?: string;
  layers?: {
    frontend?: TechRecommendation[];
    backend?: TechRecommendation[];
    database?: TechRecommendation[];
    hosting?: TechRecommendation[];
    devops?: TechRecommendation[];
    thirdParty?: TechRecommendation[];
  };
  estimatedMonthlyCost?: {
    min: number;
    max: number;
    breakdown?: { category: string; item: string; estimate: string }[];
  };
  scalabilityNotes?: string;
  securityConsiderations?: string[];
  summary?: string;
}

interface TechStackSectionProps {
  techStack?: TechStackData | null;
}

const LAYER_CONFIG = [
  { key: 'frontend', label: 'Frontend', color: colors.info },
  { key: 'backend', label: 'Backend', color: colors.secondary },
  { key: 'database', label: 'Database', color: colors.success },
  { key: 'hosting', label: 'Hosting', color: colors.warning },
  { key: 'devops', label: 'DevOps', color: colors.primary },
  { key: 'thirdParty', label: '3rd Party', color: colors.accent },
];

function TechItem({ item }: { item: TechRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const complexityColor = COMPLEXITY_COLORS[item.complexity || 'medium'];

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      style={styles.techItem}
      onPress={toggleExpand}
      activeOpacity={0.7}
    >
      <View style={styles.techItemHeader}>
        <Text style={styles.techItemName}>{item.name}</Text>
        {item.complexity && (
          <View style={[styles.complexityDot, { backgroundColor: complexityColor }]} />
        )}
      </View>

      {expanded && (
        <View style={styles.techItemDetails}>
          {item.purpose && (
            <Text style={styles.techItemPurpose}>{item.purpose}</Text>
          )}
          {item.alternatives && item.alternatives.length > 0 && (
            <Text style={styles.techItemAlts}>
              Alternatives: {item.alternatives.slice(0, 2).join(', ')}
            </Text>
          )}
          {item.learnMoreUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(item.learnMoreUrl!)}
              style={styles.learnMoreLink}
            >
              <Ionicons name="link" size={12} color={colors.info} />
              <Text style={styles.learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function TechLayer({ label, items, color }: { label: string; items: TechRecommendation[]; color: string }) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.layerContainer}>
      <View style={styles.layerHeader}>
        <View style={[styles.layerDot, { backgroundColor: color }]} />
        <Text style={styles.layerLabel}>{label}</Text>
      </View>
      <View style={styles.layerItems}>
        {items.map((item, index) => (
          <TechItem key={index} item={item} />
        ))}
      </View>
    </View>
  );
}

export function TechStackSection({ techStack }: TechStackSectionProps) {
  if (!techStack) return null;

  const businessTypeStyle = BUSINESS_TYPE_COLORS[techStack.businessType || 'saas'];
  const hasLayers = techStack.layers && Object.values(techStack.layers).some((l) => l && l.length > 0);

  if (!hasLayers && !techStack.summary) return null;

  return (
    <CollapsibleSection
      icon="server"
      iconColor={colors.accent}
      iconBgColor={colors.accentMuted}
      title="Tech Stack"
      subtitle="Recommended technologies"
      defaultCollapsed={true}
    >
      {/* Business Type Badge */}
      {techStack.businessType && (
        <View style={[styles.businessTypeBadge, { backgroundColor: businessTypeStyle.bg }]}>
          <Text style={[styles.businessTypeText, { color: businessTypeStyle.color }]}>
            {techStack.businessType.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Summary */}
      {techStack.summary && (
        <Text style={styles.summary}>{techStack.summary}</Text>
      )}

      {/* Tech Layers */}
      {techStack.layers && (
        <View style={styles.layersContainer}>
          {LAYER_CONFIG.map(({ key, label, color }) => {
            const items = techStack.layers?.[key as keyof typeof techStack.layers];
            return items && items.length > 0 ? (
              <TechLayer key={key} label={label} items={items} color={color} />
            ) : null;
          })}
        </View>
      )}

      {/* Cost Estimate */}
      {techStack.estimatedMonthlyCost && (
        <View style={styles.costCard}>
          <Text style={styles.costTitle}>💰 Estimated Monthly Cost</Text>
          <Text style={styles.costRange}>
            ${techStack.estimatedMonthlyCost.min} - ${techStack.estimatedMonthlyCost.max}
          </Text>
        </View>
      )}

      {/* Security */}
      {techStack.securityConsiderations && techStack.securityConsiderations.length > 0 && (
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>Security Considerations</Text>
          {techStack.securityConsiderations.slice(0, 3).map((item, i) => (
            <View key={i} style={styles.securityItem}>
              <Ionicons name="shield-checkmark" size={12} color={colors.success} />
              <Text style={styles.securityText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  businessTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  businessTypeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  layersContainer: {
    gap: 16,
  },
  layerContainer: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: 12,
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  layerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginLeft: -16,
  },
  layerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  layerItems: {
    gap: 6,
  },
  techItem: {
    backgroundColor: colors.mutedBg,
    borderRadius: 8,
    padding: 10,
  },
  techItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
  },
  complexityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  techItemDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  techItemPurpose: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 4,
  },
  techItemAlts: {
    fontSize: 10,
    color: colors.muted,
    fontStyle: 'italic',
  },
  learnMoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  learnMoreText: {
    fontSize: 11,
    color: colors.info,
  },
  costCard: {
    backgroundColor: colors.mutedBg,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  costTitle: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  costRange: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  securitySection: {
    marginTop: 16,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
});

export default TechStackSection;
