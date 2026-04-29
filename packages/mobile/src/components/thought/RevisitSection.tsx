import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { RotateCcw, MessageSquarePlus, FolderPlus, X } from 'lucide-react-native';
import { triggerHaptic } from '../ui/Button';
import { colors, fonts } from '../../lib/theme';

interface ResurfaceCandidate {
  id: string;
  content: string;
  thoughtType: string;
  maturityLevel: string;
  thoughtNumber: number;
  createdAt: Date | string;
  score: number;
  daysSinceCapture: number;
  connectionCount: number;
}

interface RevisitSectionProps {
  candidates: ResurfaceCandidate[];
  onPress: (thoughtId: string) => void;
  onDismiss: (thoughtId: string) => void;
  onEngage: (thoughtId: string) => void;
  onCluster: (thoughtId: string) => void;
}

const THOUGHT_TYPE_LABELS: Record<string, string> = {
  problem: 'Problem',
  solution: 'Solution',
  what_if: 'What If',
  observation: 'Observation',
  question: 'Question',
};

const MATURITY_CONFIG: Record<string, { color: string; style: 'hollow' | 'half' | 'filled' | 'ring' }> = {
  spark: { color: '#6B7280', style: 'hollow' },
  developing: { color: '#3B82F6', style: 'half' },
  hypothesis: { color: '#F59E0B', style: 'filled' },
  conviction: { color: '#10B981', style: 'ring' },
};

function MaturityDot({ level }: { level: string }) {
  const c = MATURITY_CONFIG[level] || MATURITY_CONFIG.spark;
  if (c.style === 'hollow') {
    return <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: c.color }} />;
  }
  if (c.style === 'half') {
    return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color, opacity: 0.5 }} />;
  }
  if (c.style === 'ring') {
    return (
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
      </View>
    );
  }
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />;
}

function RevisitCard({
  candidate,
  onPress,
  onDismiss,
  onEngage,
  onCluster,
}: {
  candidate: ResurfaceCandidate;
  onPress: () => void;
  onDismiss: () => void;
  onEngage: () => void;
  onCluster: () => void;
}) {
  const preview = candidate.content.length > 80
    ? candidate.content.slice(0, 80) + '...'
    : candidate.content;

  return (
    <Animated.View exiting={FadeOut.duration(200)} style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardMeta}>
        <MaturityDot level={candidate.maturityLevel} />
        <Text style={styles.typeChip}>
          {THOUGHT_TYPE_LABELS[candidate.thoughtType] || candidate.thoughtType}
        </Text>
      </View>

      <Text style={styles.cardContent} numberOfLines={2}>
        {preview}
      </Text>

      <Text style={styles.cardTime}>
        {candidate.daysSinceCapture === 1 ? '1 day ago' : `${candidate.daysSinceCapture} days ago`}
      </Text>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { triggerHaptic('light'); onDismiss(); }}
          activeOpacity={0.7}
        >
          <X size={14} color={colors.muted} />
          <Text style={styles.actionLabel}>Dismiss</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { triggerHaptic('light'); onEngage(); }}
          activeOpacity={0.7}
        >
          <MessageSquarePlus size={14} color={colors.brand} />
          <Text style={[styles.actionLabel, { color: colors.brand }]}>Engage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { triggerHaptic('light'); onCluster(); }}
          activeOpacity={0.7}
        >
          <FolderPlus size={14} color="#14B8A6" />
          <Text style={[styles.actionLabel, { color: '#14B8A6' }]}>Cluster</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function RevisitSection({ candidates, onPress, onDismiss, onEngage, onCluster }: RevisitSectionProps) {
  if (candidates.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <RotateCcw size={14} color={colors.muted} />
        <Text style={styles.sectionTitle}>Revisit</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {candidates.map((candidate) => (
          <RevisitCard
            key={candidate.id}
            candidate={candidate}
            onPress={() => onPress(candidate.id)}
            onDismiss={() => onDismiss(candidate.id)}
            onEngage={() => onEngage(candidate.id)}
            onCluster={() => onCluster(candidate.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    ...fonts.display.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: { gap: 10, paddingRight: 16 },
  card: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  typeChip: {
    color: colors.muted,
    fontSize: 11,
    ...fonts.text.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardContent: {
    color: colors.foreground,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
    ...fonts.text.regular,
  },
  cardTime: { color: colors.mutedDim, fontSize: 11, marginBottom: 10, ...fonts.text.regular },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionLabel: { color: colors.muted, fontSize: 11, ...fonts.text.medium },
});
