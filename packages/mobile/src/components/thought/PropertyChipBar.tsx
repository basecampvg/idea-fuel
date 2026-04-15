import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  Plus,
  Flame,
  Lightbulb,
  Sparkles,
  Eye,
  HelpCircle,
  Brain,
  BookOpen,
  CheckCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { MaturityPicker, type MaturityLevel } from './MaturityPicker';
import { TypePicker, type ThoughtType } from './TypePicker';
import { ConfidencePicker, type ConfidenceLevel } from './ConfidencePicker';
import { ClusterPicker } from '../ClusterPicker';

const MATURITY_CONFIG: Record<MaturityLevel, { label: string; color: string; style: 'hollow' | 'half' | 'filled' | 'ring' }> = {
  spark: { label: 'Spark', color: '#6B7280', style: 'hollow' },
  developing: { label: 'Developing', color: '#3B82F6', style: 'half' },
  hypothesis: { label: 'Hypothesis', color: '#F59E0B', style: 'filled' },
  conviction: { label: 'Conviction', color: '#10B981', style: 'ring' },
};

function MaturityDot({ color, style }: { color: string; style: 'hollow' | 'half' | 'filled' | 'ring' }) {
  if (style === 'hollow') {
    return <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: color }} />;
  }
  if (style === 'half') {
    return <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, opacity: 0.5 }} />;
  }
  if (style === 'ring') {
    return (
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
    );
  }
  // filled
  return <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />;
}

const TYPE_CONFIG: Record<ThoughtType, { label: string; color: string; Icon: LucideIcon }> = {
  problem: { label: 'Problem', color: '#EF4444', Icon: Flame },
  solution: { label: 'Solution', color: '#10B981', Icon: Lightbulb },
  what_if: { label: 'What If', color: '#8B5CF6', Icon: Sparkles },
  observation: { label: 'Observation', color: '#3B82F6', Icon: Eye },
  question: { label: 'Question', color: '#F59E0B', Icon: HelpCircle },
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string; Icon: LucideIcon }> = {
  untested: { label: 'Untested', color: '#6B7280', Icon: Brain },
  researched: { label: 'Researched', color: '#3B82F6', Icon: BookOpen },
  validated: { label: 'Validated', color: '#10B981', Icon: CheckCircle },
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
          <MaturityDot color={maturity.color} style={maturity.style} />
          <Text style={[styles.chipLabel, { color: maturity.color }]}>{maturity.label}</Text>
        </TouchableOpacity>

        {/* Type chip */}
        <TouchableOpacity
          style={[styles.chip, { borderColor: `${type.color}40` }]}
          onPress={() => setShowType(true)}
          activeOpacity={0.7}
        >
          <type.Icon size={14} color={type.color} />
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
          <confidence.Icon size={14} color={confidence.color} />
          <Text style={[styles.chipLabel, { color: confidence.color }]}>{confidence.label}</Text>
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
    flexWrap: 'wrap',
    gap: 8,
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
