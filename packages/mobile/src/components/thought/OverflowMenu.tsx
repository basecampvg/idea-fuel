import React from 'react';
import {
  Sparkles,
  FolderPlus,
  Copy,
  Archive,
  ClipboardCopy,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { PopoverMenu, type PopoverMenuItem, type AnchorRect } from '../ui/PopoverMenu';
import { colors } from '../../lib/theme';

interface OverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  /** Screen-coords of the "..." trigger, measured by the parent on tap. */
  anchor: AnchorRect | null;
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

export function OverflowMenu({
  visible,
  onClose,
  anchor,
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
  const items: PopoverMenuItem[] = [
    {
      key: 'refine',
      label: isRefined ? 'Re-refine with AI' : 'Refine with AI',
      icon: Sparkles,
      color: colors.accent,
      onPress: onRefine,
    },
    { key: 'cluster', label: 'Add to Cluster', icon: FolderPlus, onPress: onAddToCluster },
    { key: 'duplicate', label: 'Duplicate', icon: Copy, onPress: onDuplicate },
    {
      key: 'archive',
      label: isArchived ? 'Unarchive' : 'Archive',
      icon: Archive,
      color: colors.muted,
      onPress: onArchive,
    },
    { key: 'copy', label: 'Copy Text', icon: ClipboardCopy, color: colors.muted, onPress: onCopyText },
    { key: 'share', label: 'Share', icon: Share2, color: colors.muted, onPress: onShare },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      divider: true,
      onPress: onDelete,
    },
  ];

  return (
    <PopoverMenu
      visible={visible}
      onClose={onClose}
      anchor={anchor}
      items={items}
    />
  );
}
