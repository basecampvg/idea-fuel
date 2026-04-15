import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { MaturityPicker, type MaturityLevel } from './MaturityPicker';
import { TypePicker, type ThoughtType } from './TypePicker';
import { ConfidencePicker, type ConfidenceLevel } from './ConfidencePicker';
import { ClusterPicker } from '../ClusterPicker';

const MATURITY_CONFIG: Record<MaturityLevel, { label: string; color: string; icon: string }> = {
  spark: { label: 'Spark', color: '#6B7280', icon: '○' },
  developing: { label: 'Developing', color: '#3B82F6', icon: '◐' },
  hypothesis: { label: 'Hypothesis', color: '#F59E0B', icon: '●' },
  conviction: { label: 'Conviction', color: '#10B981', icon: '◉' },
};

const TYPE_CONFIG: Record<ThoughtType, { label: string; color: string; icon: string }> = {
  problem: { label: 'Problem', color: '#EF4444', icon: '🔥' },
  solution: { label: 'Solution', color: '#10B981', icon: '💡' },
  what_if: { label: 'What If', color: '#8B5CF6', icon: '🤔' },
  observation: { label: 'Observation', color: '#3B82F6', icon: '🔍' },
  question: { label: 'Question', color: '#F59E0B', icon: '❓' },
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; icon: string }> = {
  untested: { label: 'Untested', icon: '🧠' },
  researched: { label: 'Researched', icon: '📚' },
  validated: { label: 'Validated', icon: '✅' },
};

interface PropertyChipBarProps {
  maturityLevel: MaturityLevel;
  thoughtType: ThoughtType;
  confidenceLevel: ConfidenceLevel;
  clusterId: string | null;
  clusterName?: string | null;
  clusterColor?: string | null;
  typeSource: string;
  onUpdateMaturity: (level: MaturityLevel) => void;
  onUpdateType: (type: ThoughtType) => void;
  onUpdateConfidence: (level: ConfidenceLevel) => void;
  onAddToCluster: (clusterId: string) => void;
  onRemoveFromCluster: () => void;
}

export function PropertyChipBar({
  maturityLevel,
  thoughtType,
  confidenceLevel,
  clusterId,
  clusterName,
  clusterColor,
  typeSource,
  onUpdateMaturity,
  onUpdateType,
  onUpdateConfidence,
  onAddToCluster,
  onRemoveFromCluster,
}: PropertyChipBarProps) {
  const [showMaturity, setShowMaturity] = useState(false);
  const [showType, setShowType] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showCluster, setShowCluster] = useState(false);

  const maturity = MATURITY_CONFIG[maturityLevel];
  const type = TYPE_CONFIG[thoughtType];
  const confidence = CONFIDENCE_CONFIG[confidenceLevel];

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Maturity chip */}
        <TouchableOpacity
          style={[styles.chip, { borderColor: `${maturity.color}40` }]}
          onPress={() => setShowMaturity(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipIcon, { color: maturity.color }]}>{maturity.icon}</Text>
          <Text style={[styles.chipLabel, { color: maturity.color }]}>{maturity.label}</Text>
        </TouchableOpacity>

        {/* Type chip */}
        <TouchableOpacity
          style={[styles.chip, { borderColor: `${type.color}40` }]}
          onPress={() => setShowType(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipEmoji}>{type.icon}</Text>
          <Text style={[styles.chipLabel, { color: type.color }]}>{type.label}</Text>
          {typeSource === 'ai_auto' && (
            <View style={styles.aiLabel}>
              <Text style={styles.aiLabelText}>AI</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Confidence chip */}
        <TouchableOpacity
          style={styles.chip}
          onPress={() => setShowConfidence(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipEmoji}>{confidence.icon}</Text>
          <Text style={styles.chipLabel}>{confidence.label}</Text>
        </TouchableOpacity>

        {/* Cluster chip */}
        {clusterId ? (
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setShowCluster(true)}
            onLongPress={onRemoveFromCluster}
            activeOpacity={0.7}
          >
            <View style={[styles.clusterDot, { backgroundColor: clusterColor || '#6C5CE7' }]} />
            <Text style={styles.chipLabel} numberOfLines={1}>
              {clusterName || 'Cluster'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.chip, styles.ghostChip]}
            onPress={() => setShowCluster(true)}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.mutedDim} />
            <Text style={[styles.chipLabel, styles.ghostLabel]}>Cluster</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <MaturityPicker
        visible={showMaturity}
        onClose={() => setShowMaturity(false)}
        current={maturityLevel}
        onSelect={onUpdateMaturity}
      />

      <TypePicker
        visible={showType}
        onClose={() => setShowType(false)}
        current={thoughtType}
        onSelect={onUpdateType}
      />

      <ConfidencePicker
        visible={showConfidence}
        onClose={() => setShowConfidence(false)}
        current={confidenceLevel}
        onSelect={onUpdateConfidence}
      />

      <ClusterPicker
        visible={showCluster}
        onClose={() => setShowCluster(false)}
        onSelect={(id) => {
          onAddToCluster(id);
          setShowCluster(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ghostChip: {
    borderStyle: 'dashed' as any,
    borderColor: colors.mutedDim,
    backgroundColor: 'transparent',
  },
  chipIcon: {
    fontSize: 14,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipLabel: {
    fontSize: 13,
    ...fonts.geist.regular,
    color: colors.muted,
  },
  ghostLabel: {
    color: colors.mutedDim,
  },
  aiLabel: {
    backgroundColor: `${colors.accent}30`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  aiLabelText: {
    fontSize: 9,
    ...fonts.outfit.semiBold,
    color: colors.accent,
  },
  clusterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
