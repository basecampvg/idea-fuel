import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
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
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  primary: '#E91E8C',
  primaryMuted: 'rgba(233, 30, 140, 0.15)',
  accent: '#14B8A6',
  accentMuted: 'rgba(20, 184, 166, 0.15)',
  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(139, 92, 246, 0.15)',
};

interface ScoreJustification {
  justification: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ScoreCardsEnhancedProps {
  scores: {
    opportunity: number | null;
    problem: number | null;
    feasibility: number | null;
    whyNow: number | null;
  };
  justifications?: {
    opportunity?: ScoreJustification;
    problem?: ScoreJustification;
    feasibility?: ScoreJustification;
    whyNow?: ScoreJustification;
  };
}

const SCORE_CONFIG = [
  { key: 'opportunity', label: 'Opportunity', color: colors.success, bgColor: colors.successMuted },
  { key: 'problem', label: 'Problem', color: colors.primary, bgColor: colors.primaryMuted },
  { key: 'feasibility', label: 'Feasibility', color: colors.accent, bgColor: colors.accentMuted },
  { key: 'whyNow', label: 'Why Now', color: colors.secondary, bgColor: colors.secondaryMuted },
] as const;

function ConfidenceDots({ level }: { level: 'high' | 'medium' | 'low' }) {
  const filledCount = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  const dotColor = level === 'high' ? colors.success : level === 'medium' ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= filledCount ? dotColor : colors.mutedBg },
          ]}
        />
      ))}
    </View>
  );
}

function ScoreCard({
  label,
  score,
  color,
  bgColor,
  justification,
}: {
  label: string;
  score: number | null;
  color: string;
  bgColor: string;
  justification?: ScoreJustification;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreValue = score ?? 0;

  const toggleExpand = () => {
    if (justification) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(!expanded);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.scoreCard, { backgroundColor: bgColor }]}
      onPress={toggleExpand}
      activeOpacity={justification ? 0.7 : 1}
      disabled={!justification}
    >
      <View style={styles.scoreCardRow}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <View style={styles.scoreRight}>
          <Text style={[styles.scoreValue, { color }]}>{scoreValue}</Text>
          {justification && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.muted}
              style={styles.chevron}
            />
          )}
        </View>
      </View>

      {expanded && justification && (
        <View style={styles.justificationContainer}>
          <View style={styles.confidenceRow}>
            <ConfidenceDots level={justification.confidence} />
          </View>
          <Text style={styles.justificationText}>{justification.justification}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ScoreCardsEnhanced({ scores, justifications }: ScoreCardsEnhancedProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="stats-chart" size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Opportunity Scores</Text>
          <Text style={styles.subtitle}>AI-assessed potential metrics</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {SCORE_CONFIG.map(({ key, label, color, bgColor }) => (
          <ScoreCard
            key={key}
            label={label}
            score={scores[key]}
            color={color}
            bgColor={bgColor}
            justification={justifications?.[key]}
          />
        ))}
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
  grid: {
    gap: 12,
  },
  scoreCard: {
    borderRadius: 12,
    padding: 16,
  },
  scoreCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
  },
  justificationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  confidenceRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  justificationText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
});

export default ScoreCardsEnhanced;
