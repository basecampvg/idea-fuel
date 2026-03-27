import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Users,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { colors, fonts } from '../../lib/theme';

// CardResult type matches @forge/shared CardResult interface
interface CardResult {
  verdict: 'proceed' | 'watchlist' | 'drop';
  summary: string;
  problemSeverity: number;
  marketSignal: 'rising' | 'flat' | 'declining' | 'unknown';
  tamEstimate: {
    low: string;
    high: string;
    basis: string;
  };
  competitors: Array<{
    name: string;
    oneLiner: string;
  }>;
  biggestRisk: string;
  nextExperiment: string;
  citations: string[];
  rawResponse?: string;
}

interface ValidationCardProps {
  cardResult: CardResult;
}

const verdictConfig = {
  proceed: {
    label: 'Proceed',
    variant: 'success' as const,
    color: colors.success,
  },
  watchlist: {
    label: 'Watchlist',
    variant: 'warning' as const,
    color: colors.warning,
  },
  drop: {
    label: 'Drop',
    variant: 'error' as const,
    color: colors.destructive,
  },
};

const signalConfig = {
  rising: { label: 'Rising', Icon: TrendingUp, color: colors.success },
  flat: { label: 'Flat', Icon: Minus, color: colors.warning },
  declining: { label: 'Declining', Icon: TrendingDown, color: colors.destructive },
  unknown: { label: 'Unknown', Icon: HelpCircle, color: colors.muted },
};

// Animated severity dot that pops in with stagger
function AnimatedSeverityDot({ index, filled, color }: { index: number; filled: boolean; color: string }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      400 + index * 100,
      withTiming(1, { duration: 300 }),
    );
  }, [index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.severityDot,
        { backgroundColor: filled ? color : colors.border },
        animatedStyle,
      ]}
    />
  );
}

function SeverityDots({ value }: { value: number }) {
  const clamped = Math.min(5, Math.max(1, Math.round(value)));
  const getColor = (i: number) => {
    if (i > clamped) return colors.border;
    if (clamped <= 2) return colors.destructive;
    if (clamped <= 3) return colors.warning;
    return colors.success;
  };

  return (
    <View style={styles.severityRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <AnimatedSeverityDot
          key={i}
          index={i - 1}
          filled={i <= clamped}
          color={getColor(i)}
        />
      ))}
      <Text style={[styles.severityLabel, { color: getColor(clamped) }]}>
        {clamped}/5
      </Text>
    </View>
  );
}

function isFallbackCard(card: CardResult): boolean {
  return (
    !!card.rawResponse &&
    !card.summary &&
    card.competitors.length === 0 &&
    !card.biggestRisk
  );
}

export function ValidationCard({ cardResult }: ValidationCardProps) {
  // Fallback: if extraction mostly failed, show rawResponse
  if (isFallbackCard(cardResult)) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Validation Result</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={verdictConfig[cardResult.verdict].variant}>
            {verdictConfig[cardResult.verdict].label}
          </Badge>
          <Text style={styles.rawResponseText}>
            {cardResult.rawResponse}
          </Text>
          {cardResult.citations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sources</Text>
              {cardResult.citations.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => Linking.openURL(url)}
                  style={styles.citationRow}
                >
                  <ExternalLink size={12} color={colors.accent} />
                  <Text style={styles.citationText} numberOfLines={1}>
                    {url}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    );
  }

  const verdict = verdictConfig[cardResult.verdict];
  const signal = signalConfig[cardResult.marketSignal];
  const SignalIcon = signal.Icon;

  return (
    <Card variant="elevated">
      {/* Verdict Header — badge pop animation */}
      <CardHeader style={styles.headerRow}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Badge variant={verdict.variant}>{verdict.label}</Badge>
        </Animated.View>
      </CardHeader>

      <CardContent style={styles.contentPadding}>
        {/* Summary — fade in at 200ms */}
        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <Text style={styles.summaryText}>{cardResult.summary}</Text>
        </Animated.View>

        {/* Stats Row — fade in at 400ms */}
        <Animated.View entering={FadeIn.delay(400).duration(400)}>
          <View style={styles.statsRow}>
            {/* Problem Severity */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Problem Severity</Text>
              <SeverityDots value={cardResult.problemSeverity} />
            </View>

            {/* Market Signal */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Market Signal</Text>
              <View style={styles.signalRow}>
                <SignalIcon size={16} color={signal.color} />
                <Text style={[styles.signalText, { color: signal.color }]}>
                  {signal.label}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* TAM Range — fade in at 600ms */}
        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TAM Estimate</Text>
            <Text style={styles.tamRange}>
              {cardResult.tamEstimate.low} — {cardResult.tamEstimate.high}
            </Text>
            <Text style={styles.tamBasis}>{cardResult.tamEstimate.basis}</Text>
          </View>
        </Animated.View>

        {/* Competitors — fade in at 800ms */}
        {cardResult.competitors.length > 0 && (
          <Animated.View entering={FadeIn.delay(800).duration(400)}>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Users size={14} color={colors.muted} />
                <Text style={styles.sectionTitle}>Competitors</Text>
              </View>
              {cardResult.competitors.slice(0, 3).map((comp, idx) => (
                <View key={idx} style={styles.competitorRow}>
                  <Text style={styles.competitorName}>{comp.name}</Text>
                  <Text style={styles.competitorOneLiner}>{comp.oneLiner}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Biggest Risk — fade in at 1000ms */}
        {cardResult.biggestRisk && (
          <Animated.View entering={FadeIn.delay(1000).duration(400)}>
            <View style={styles.riskBox}>
              <View style={styles.calloutHeader}>
                <AlertTriangle size={16} color={colors.warning} />
                <Text style={styles.calloutTitle}>Biggest Risk</Text>
              </View>
              <Text style={styles.calloutBody}>{cardResult.biggestRisk}</Text>
            </View>
          </Animated.View>
        )}

        {/* Next Experiment — fade in at 1200ms */}
        {cardResult.nextExperiment && (
          <Animated.View entering={FadeIn.delay(1200).duration(400)}>
            <View style={styles.experimentBox}>
              <View style={styles.calloutHeader}>
                <Lightbulb size={16} color={colors.accent} />
                <Text style={styles.calloutTitle}>Next Experiment</Text>
              </View>
              <Text style={styles.calloutBody}>{cardResult.nextExperiment}</Text>
            </View>
          </Animated.View>
        )}

        {/* Citations */}
        {cardResult.citations.length > 0 && (
          <Animated.View entering={FadeIn.delay(1400).duration(400)}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sources</Text>
              {cardResult.citations.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => Linking.openURL(url)}
                  style={styles.citationRow}
                >
                  <ExternalLink size={12} color={colors.accent} />
                  <Text style={styles.citationText} numberOfLines={1}>
                    {url}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentPadding: {
    gap: 20,
  },
  summaryText: {
    fontSize: 16,
    fontFamily: fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.outfit.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  severityLabel: {
    fontSize: 13,
    fontFamily: fonts.mono.medium,
    marginLeft: 4,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalText: {
    fontSize: 14,
    fontFamily: fonts.mono.medium,
  },
  section: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.outfit.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tamRange: {
    fontSize: 20,
    fontFamily: fonts.mono.medium,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  tamBasis: {
    fontSize: 13,
    fontFamily: fonts.geist.regular,
    color: colors.mutedDim,
    lineHeight: 18,
  },
  competitorRow: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  competitorName: {
    fontSize: 14,
    fontFamily: fonts.outfit.semiBold,
    color: colors.foreground,
  },
  competitorOneLiner: {
    fontSize: 13,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
    lineHeight: 18,
  },
  riskBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    gap: 6,
  },
  experimentBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    gap: 6,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calloutTitle: {
    fontSize: 13,
    fontFamily: fonts.outfit.semiBold,
    color: colors.foreground,
  },
  calloutBody: {
    fontSize: 14,
    fontFamily: fonts.geist.regular,
    color: colors.muted,
    lineHeight: 20,
  },
  citationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  citationText: {
    fontSize: 12,
    fontFamily: fonts.mono.regular,
    color: colors.accent,
    flex: 1,
  },
  rawResponseText: {
    fontSize: 14,
    fontFamily: fonts.geist.regular,
    color: colors.foreground,
    lineHeight: 22,
    marginTop: 12,
  },
});
