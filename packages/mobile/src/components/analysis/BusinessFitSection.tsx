import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
};

interface RevenuePotential {
  rating: 'high' | 'medium' | 'low';
  estimate?: string;
  confidence?: number;
}

interface ExecutionDifficulty {
  rating: 'easy' | 'medium' | 'hard';
  factors?: string[];
  soloFriendly?: boolean;
}

interface GTMClarity {
  rating: 'strong' | 'moderate' | 'weak';
  channels?: string[];
  confidence?: number;
}

interface FounderFit {
  percentage: number;
  strengths?: string[];
  gaps?: string[];
}

interface BusinessFitSectionProps {
  revenuePotential?: RevenuePotential | null;
  executionDifficulty?: ExecutionDifficulty | null;
  gtmClarity?: GTMClarity | null;
  founderFit?: FounderFit | null;
}

function DollarRating({ rating }: { rating: 'high' | 'medium' | 'low' }) {
  const filled = rating === 'high' ? 3 : rating === 'medium' ? 2 : 1;
  return (
    <Text style={styles.dollarRating}>
      {[1, 2, 3].map((i) => (
        <Text key={i} style={{ color: i <= filled ? colors.warning : colors.mutedBg }}>
          $
        </Text>
      ))}
    </Text>
  );
}

function ScoreDisplay({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <Text style={styles.scoreDisplay}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreMax}>/{max}</Text>
    </Text>
  );
}

interface MetricRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  rightContent: React.ReactNode;
}

function MetricRow({ icon, iconColor, iconBg, title, description, rightContent }: MetricRowProps) {
  return (
    <View style={styles.metricRow}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricDescription} numberOfLines={1}>{description}</Text>
      </View>
      <View style={styles.metricRight}>{rightContent}</View>
    </View>
  );
}

export function BusinessFitSection({
  revenuePotential,
  executionDifficulty,
  gtmClarity,
  founderFit,
}: BusinessFitSectionProps) {
  // Calculate scores for execution and GTM
  const getExecutionScore = () => {
    if (!executionDifficulty) return 5;
    switch (executionDifficulty.rating) {
      case 'easy': return 3;
      case 'medium': return 5;
      case 'hard': return 8;
      default: return 5;
    }
  };

  const getGTMScore = () => {
    if (!gtmClarity) return 6;
    switch (gtmClarity.rating) {
      case 'strong': return 9;
      case 'moderate': return 6;
      case 'weak': return 3;
      default: return 6;
    }
  };

  const getRevenueDescription = () => {
    if (!revenuePotential) return 'Analysis pending';
    const estimates = {
      high: 'High revenue potential',
      medium: 'Moderate revenue potential',
      low: 'Limited revenue potential',
    };
    return revenuePotential.estimate || estimates[revenuePotential.rating];
  };

  const getExecutionDescription = () => {
    if (!executionDifficulty) return 'Analysis pending';
    const factors = executionDifficulty.factors?.slice(0, 2).join(', ') || '';
    return factors || (executionDifficulty.soloFriendly ? 'Solo-friendly' : 'Team recommended');
  };

  const getGTMDescription = () => {
    if (!gtmClarity) return 'Analysis pending';
    const channels = gtmClarity.channels?.slice(0, 2).join(', ') || '';
    return channels || `${gtmClarity.rating} market clarity`;
  };

  const getFounderDescription = () => {
    if (!founderFit) return 'Complete your profile to calculate';
    const strengths = founderFit.strengths?.length || 0;
    const gaps = founderFit.gaps?.length || 0;
    return `${strengths} strengths, ${gaps} gaps identified`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.warningMuted }]}>
          <Ionicons name="fitness" size={20} color={colors.warning} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Business Fit</Text>
          <Text style={styles.subtitle}>Viability assessment</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <MetricRow
          icon="cash"
          iconColor={colors.warning}
          iconBg={colors.warningMuted}
          title="Revenue Potential"
          description={getRevenueDescription()}
          rightContent={<DollarRating rating={revenuePotential?.rating || 'medium'} />}
        />

        <View style={styles.divider} />

        <MetricRow
          icon="construct"
          iconColor={colors.secondary}
          iconBg={colors.secondaryMuted}
          title="Execution Difficulty"
          description={getExecutionDescription()}
          rightContent={<ScoreDisplay value={getExecutionScore()} />}
        />

        <View style={styles.divider} />

        <MetricRow
          icon="megaphone"
          iconColor={colors.primary}
          iconBg={colors.primaryMuted}
          title="Go-To-Market"
          description={getGTMDescription()}
          rightContent={<ScoreDisplay value={getGTMScore()} />}
        />

        <View style={styles.divider} />

        <MetricRow
          icon="person"
          iconColor={colors.accent}
          iconBg={colors.accentMuted}
          title="Right for You?"
          description={getFounderDescription()}
          rightContent={
            founderFit ? (
              <Text style={[styles.percentValue, { color: colors.accent }]}>
                {founderFit.percentage}%
              </Text>
            ) : (
              <Ionicons name="help-circle" size={20} color={colors.muted} />
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  metrics: {},
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 12,
    color: colors.muted,
  },
  metricRight: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  dollarRating: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  scoreMax: {
    fontSize: 12,
    color: colors.muted,
  },
  percentValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default BusinessFitSection;
