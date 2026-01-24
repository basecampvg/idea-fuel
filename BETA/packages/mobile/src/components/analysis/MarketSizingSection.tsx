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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
  card: '#1A1918',
  border: '#1F1E1C',
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedBg: '#262422',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

interface MarketMetric {
  value: number;
  formattedValue: string;
  growthRate: number;
  confidence: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface MarketSegment {
  name: string;
  tamContribution: number;
  samContribution: number;
  somContribution: number;
  description: string;
}

interface MarketAssumption {
  level: 'tam' | 'sam' | 'som';
  assumption: string;
  impact: 'high' | 'medium' | 'low';
}

interface MarketSource {
  title: string;
  url: string;
  reliability: 'primary' | 'secondary' | 'estimate';
}

interface MarketSizingData {
  tam: MarketMetric;
  sam: MarketMetric;
  som: MarketMetric;
  segments?: MarketSegment[];
  geographicBreakdown?: { region: string; percentage: number }[];
  assumptions?: MarketAssumption[];
  sources?: MarketSource[];
  methodology?: string;
  lastUpdated?: string;
}

interface MarketSizingSectionProps {
  marketSizing?: MarketSizingData | null;
}

function ConfidenceDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  const dotColor = level === 'high' ? colors.success : level === 'medium' ? colors.warning : colors.destructive;
  return <View style={[styles.confidenceDot, { backgroundColor: dotColor }]} />;
}

function MetricCard({
  label,
  metric,
  color,
  bgColor,
}: {
  label: string;
  metric: MarketMetric;
  color: string;
  bgColor: string;
}) {
  const growthColor = metric.growthRate >= 0 ? colors.success : colors.destructive;

  return (
    <View style={[styles.metricCard, { backgroundColor: bgColor }]}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, { color }]}>{label}</Text>
        <ConfidenceDot level={metric.confidence} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{metric.formattedValue}</Text>
      <View style={styles.growthRow}>
        <Ionicons
          name={metric.growthRate >= 0 ? 'trending-up' : 'trending-down'}
          size={12}
          color={growthColor}
        />
        <Text style={[styles.growthText, { color: growthColor }]}>
          {metric.growthRate >= 0 ? '+' : ''}{metric.growthRate}% CAGR
        </Text>
      </View>
      <Text style={styles.timeframeText}>{metric.timeframe}</Text>
    </View>
  );
}

export function MarketSizingSection({ marketSizing }: MarketSizingSectionProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!marketSizing) return null;

  const toggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails(!showDetails);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.infoMuted }]}>
          <Ionicons name="pie-chart" size={20} color={colors.info} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Market Sizing</Text>
          <Text style={styles.subtitle}>TAM / SAM / SOM Analysis</Text>
        </View>
      </View>

      {/* Metric Cards */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="TAM"
          metric={marketSizing.tam}
          color={colors.info}
          bgColor={colors.infoMuted}
        />
        <MetricCard
          label="SAM"
          metric={marketSizing.sam}
          color={colors.secondary}
          bgColor={colors.secondaryMuted}
        />
        <MetricCard
          label="SOM"
          metric={marketSizing.som}
          color={colors.success}
          bgColor={colors.successMuted}
        />
      </View>

      {/* Segments */}
      {marketSizing.segments && marketSizing.segments.length > 0 && (
        <View style={styles.segmentsContainer}>
          <Text style={styles.sectionLabel}>Market Segments</Text>
          {marketSizing.segments.slice(0, 4).map((segment, index) => (
            <View key={index} style={styles.segmentRow}>
              <Text style={styles.segmentName} numberOfLines={1}>{segment.name}</Text>
              <View style={styles.segmentBar}>
                <View
                  style={[
                    styles.segmentFill,
                    { width: `${segment.tamContribution}%`, backgroundColor: colors.info },
                  ]}
                />
              </View>
              <Text style={styles.segmentPercent}>{segment.tamContribution}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Expand/Collapse Details */}
      {(marketSizing.methodology || marketSizing.assumptions || marketSizing.sources) && (
        <TouchableOpacity style={styles.detailsToggle} onPress={toggleDetails} activeOpacity={0.7}>
          <Text style={styles.detailsToggleText}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.muted}
          />
        </TouchableOpacity>
      )}

      {showDetails && (
        <View style={styles.detailsContainer}>
          {/* Methodology */}
          {marketSizing.methodology && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Methodology</Text>
              <Text style={styles.detailText}>{marketSizing.methodology}</Text>
            </View>
          )}

          {/* Geographic Focus */}
          {marketSizing.geographicBreakdown && marketSizing.geographicBreakdown.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Geographic Focus</Text>
              <View style={styles.pillsRow}>
                {marketSizing.geographicBreakdown.map((geo, i) => (
                  <View key={i} style={styles.pill}>
                    <Text style={styles.pillText}>{geo.region}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Assumptions */}
          {marketSizing.assumptions && marketSizing.assumptions.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Key Assumptions</Text>
              {marketSizing.assumptions.slice(0, 5).map((assumption, i) => (
                <View key={i} style={styles.assumptionRow}>
                  <View style={[styles.levelBadge, { backgroundColor: colors.mutedBg }]}>
                    <Text style={styles.levelBadgeText}>{assumption.level.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.assumptionText} numberOfLines={2}>{assumption.assumption}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Sources */}
          {marketSizing.sources && marketSizing.sources.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Sources</Text>
              {marketSizing.sources.slice(0, 3).map((source, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.sourceRow}
                  onPress={() => source.url && Linking.openURL(source.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link" size={12} color={colors.info} />
                  <Text style={styles.sourceText} numberOfLines={1}>{source.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Last Updated */}
          {marketSizing.lastUpdated && (
            <Text style={styles.lastUpdated}>
              Last updated: {new Date(marketSizing.lastUpdated).toLocaleDateString()}
            </Text>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthText: {
    fontSize: 10,
    fontWeight: '500',
  },
  timeframeText: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  segmentsContainer: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  segmentName: {
    width: 80,
    fontSize: 11,
    color: colors.muted,
  },
  segmentBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.mutedBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  segmentPercent: {
    width: 35,
    fontSize: 11,
    color: colors.foreground,
    textAlign: 'right',
    fontWeight: '500',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  detailsToggleText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.mutedBg,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    color: colors.foreground,
  },
  assumptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
  },
  assumptionText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sourceText: {
    flex: 1,
    fontSize: 12,
    color: colors.info,
  },
  lastUpdated: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MarketSizingSection;
