import React from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  Text,
} from 'react-native';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { colors, fonts } from '../lib/theme';

interface AttachmentPopoverProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onPhotos: () => void;
  anchorY: number;
}

export function AttachmentPopover({
  visible,
  onClose,
  onCamera,
  onPhotos,
  anchorY,
}: AttachmentPopoverProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.popover, { bottom: anchorY }]}>
              <TouchableOpacity style={styles.popoverRow} onPress={onCamera} activeOpacity={0.7}>
                <View style={styles.popoverIcon}>
                  <Camera size={20} color={colors.foreground} />
                </View>
                <Text style={styles.popoverLabel}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popoverRow} onPress={onPhotos} activeOpacity={0.7}>
                <View style={styles.popoverIcon}>
                  <ImageIcon size={20} color={colors.foreground} />
                </View>
                <Text style={styles.popoverLabel}>Photos</Text>
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
    left: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    width: 180,
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
  popoverLabel: {
    fontSize: 15,
    color: colors.foreground,
    ...fonts.geist.regular,
  },
});
