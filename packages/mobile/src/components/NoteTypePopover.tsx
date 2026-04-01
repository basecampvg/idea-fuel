import React from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  Text,
} from 'react-native';
import { NotebookPen, Sparkles } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';

interface NoteTypePopoverProps {
  visible: boolean;
  onClose: () => void;
  onQuickNote: () => void;
  onAINote: () => void;
  anchorY: number;
}

export function NoteTypePopover({
  visible,
  onClose,
  onQuickNote,
  onAINote,
  anchorY,
}: NoteTypePopoverProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.popover, { bottom: anchorY }]}>
              <TouchableOpacity style={styles.popoverRow} onPress={onQuickNote} activeOpacity={0.7}>
                <View style={styles.popoverIcon}>
                  <NotebookPen size={20} color={colors.accent} />
                </View>
                <View style={styles.popoverText}>
                  <Text style={styles.popoverLabel}>Quick Note</Text>
                  <Text style={styles.popoverSubtitle}>Plain brain dump</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popoverRow} onPress={onAINote} activeOpacity={0.7}>
                <View style={styles.popoverIcon}>
                  <Sparkles size={20} color={colors.brand} />
                </View>
                <View style={styles.popoverText}>
                  <Text style={styles.popoverLabel}>AI Note</Text>
                  <Text style={styles.popoverSubtitle}>Auto-refines with AI</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  popover: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    width: 220,
  },
  popoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  popoverIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverText: {
    flex: 1,
  },
  popoverLabel: {
    fontSize: 15,
    color: colors.foreground,
    ...fonts.geist.regular,
  },
  popoverSubtitle: {
    fontSize: 12,
    color: colors.mutedDim,
    ...fonts.geist.regular,
    marginTop: 1,
  },
});
