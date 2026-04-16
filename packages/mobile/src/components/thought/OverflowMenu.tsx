import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Sparkles,
  FolderPlus,
  Copy,
  Archive,
  ClipboardCopy,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { colors, fonts } from '../../lib/theme';

interface OverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  onRefine: () => void;
  onAddToCluster: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onCopyText: () => void;
  onShare: () => void;
  onDelete: () => void;
  isRefined: boolean;
  isArchived: boolean;
}

const ACTIONS = [
  { key: 'refine', Icon: Sparkles, color: colors.accent },
  { key: 'cluster', Icon: FolderPlus, label: 'Add to Cluster', color: colors.foreground },
  { key: 'duplicate', Icon: Copy, label: 'Duplicate', color: colors.foreground },
  { key: 'archive', Icon: Archive, color: colors.muted },
  { key: 'copy', Icon: ClipboardCopy, label: 'Copy Text', color: colors.muted },
  { key: 'share', Icon: Share2, label: 'Share', color: colors.muted },
] as const;

export function OverflowMenu({
  visible,
  onClose,
  onRefine,
  onAddToCluster,
  onDuplicate,
  onArchive,
  onCopyText,
  onShare,
  onDelete,
  isRefined,
  isArchived,
}: OverflowMenuProps) {
  const handlers: Record<string, () => void> = {
    refine: onRefine,
    cluster: onAddToCluster,
    duplicate: onDuplicate,
    archive: onArchive,
    copy: onCopyText,
    share: onShare,
  };

  const getLabel = (key: string, fallback: string) => {
    if (key === 'refine') return isRefined ? 'Re-refine with AI' : 'Refine with AI';
    if (key === 'archive') return isArchived ? 'Unarchive' : 'Archive';
    return fallback;
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {ACTIONS.map(({ key, Icon, label, color }) => (
          <TouchableOpacity
            key={key}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              handlers[key]();
              onClose();
            }}
          >
            <Icon size={20} color={color} />
            <Text style={[styles.label, { color }]}>
              {getLabel(key, label ?? key)}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.separator} />

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => {
            onDelete();
            onClose();
          }}
        >
          <Trash2 size={20} color={colors.destructive} />
          <Text style={[styles.label, { color: colors.destructive }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 16,
    ...fonts.outfit.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});
