import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  Tag,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { TypePicker, type ThoughtType } from './TypePicker';
import { ConfidencePicker, type ConfidenceLevel } from './ConfidencePicker';
import { ClusterPicker } from '../ClusterPicker';
import { LabelPicker } from './LabelPicker';

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
  /**
   * Captured kind. Notes skip the idea-engine pipeline, so the chip bar
   * collapses to just Labels for them. Type/Confidence/Cluster are gated
   * for kind='thought'.
   */
  kind: 'thought' | 'note';
  thoughtType: ThoughtType | null;
  confidenceLevel: ConfidenceLevel | null;
  labels: string[];
  clusterId: string | null;
  clusterName?: string | null;
  clusterColor?: string | null;
  typeSource: string;
  onUpdateType: (type: ThoughtType | null) => void;
  onUpdateConfidence: (level: ConfidenceLevel | null) => void;
  onUpdateLabels: (labels: string[]) => void;
  onAddToCluster: (clusterId: string) => void;
  onRemoveFromCluster: () => void;
}

export function PropertyChipBar({
  kind,
  thoughtType,
  confidenceLevel,
  labels,
  clusterId,
  clusterName,
  clusterColor,
  typeSource,
  onUpdateType,
  onUpdateConfidence,
  onUpdateLabels,
  onAddToCluster,
  onRemoveFromCluster,
}: PropertyChipBarProps) {
  const [showType, setShowType] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showCluster, setShowCluster] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  const type = thoughtType ? TYPE_CONFIG[thoughtType] : null;
  const confidence = confidenceLevel ? CONFIDENCE_CONFIG[confidenceLevel] : null;
  const isThought = kind === 'thought';

  return (
    <>
      <LinearGradient
        colors={[colors.glassBorderStart, colors.glassBorderEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glassBorder}
      >
        <View style={styles.container}>
          {/* Type / Confidence / Cluster — idea-engine concerns, hidden for notes */}
          {isThought && (
            <>
              {/* Type chip */}
              {thoughtType && type ? (
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
              ) : (
                <TouchableOpacity
                  style={[styles.chip, styles.ghostChip]}
                  onPress={() => setShowType(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={colors.mutedDim} />
                  <Text style={[styles.chipLabel, styles.ghostLabel]}>Type</Text>
                </TouchableOpacity>
              )}

              {/* Confidence chip */}
              {confidenceLevel && confidence ? (
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setShowConfidence(true)}
                  activeOpacity={0.7}
                >
                  <confidence.Icon size={14} color={confidence.color} />
                  <Text style={[styles.chipLabel, { color: confidence.color }]}>{confidence.label}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.chip, styles.ghostChip]}
                  onPress={() => setShowConfidence(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={colors.mutedDim} />
                  <Text style={[styles.chipLabel, styles.ghostLabel]}>Confidence</Text>
                </TouchableOpacity>
              )}

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
            </>
          )}

          {/* Labels chip — always shown (notes can still be tagged) */}
          {labels.length > 0 ? (
            <TouchableOpacity
              style={styles.chip}
              onPress={() => setShowLabels(true)}
              onLongPress={() => onUpdateLabels([])}
              activeOpacity={0.7}
            >
              <Tag size={14} color={colors.muted} />
              <Text style={styles.chipLabel} numberOfLines={1}>
                {labels[0]}{labels.length > 1 ? ` +${labels.length - 1}` : ''}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.chip, styles.ghostChip]}
              onPress={() => setShowLabels(true)}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.mutedDim} />
              <Text style={[styles.chipLabel, styles.ghostLabel]}>Labels</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

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

      <LabelPicker
        visible={showLabels}
        onClose={() => setShowLabels(false)}
        currentLabels={labels}
        onUpdateLabels={onUpdateLabels}
      />
    </>
  );
}

const styles = StyleSheet.create({
  glassBorder: {
    borderRadius: 17,
    padding: 1,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 10,
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
