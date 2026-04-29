import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RichText,
  Toolbar,
  useEditorBridge,
  TenTapStartKit,
  CoreBridge,
  PlaceholderBridge,
  LinkBridge,
  HeadingBridge,
} from '@10play/tentap-editor';
import { X, Check } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';
import { editorDarkThemeCSS } from '../../lib/editor-theme';
import {
  markdownToHtml,
  htmlToMarkdown,
  ideaFuelEditorTheme,
} from './MarkdownEditor';

interface BodyEditorSheetProps {
  visible: boolean;
  initialValue: string;
  title?: string;
  placeholder?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

/**
 * Why NOT presentationStyle="pageSheet":
 *   iOS pageSheet modals auto-resize to avoid the keyboard. That breaks
 *   tentap's Toolbar, which internally uses `useKeyboard()` to decide
 *   whether to render. Under pageSheet, RN fires keyboardWillShow with
 *   endCoordinates.height of ~0 (keyboard doesn't overlay — modal resizes),
 *   so tentap's hook concludes "keyboard is down" and hides the toolbar
 *   via its theme `hidden` style. Even moving the wrapper doesn't help:
 *   the child Toolbar is `display:none`.
 *
 * Fix: use the default fullScreen modal with `animationType="slide"`. The
 *   keyboard overlays content, tentap's useKeyboard fires correctly, and
 *   the documented KeyboardAvoidingView pattern lifts the toolbar.
 *
 * On keyboardVerticalOffset:
 *   The tentap navHeader example sets `insets.top + HEADER_HEIGHT` because
 *   their KAV is a flex child sitting below a navigation header. Ours is
 *   `position: absolute, bottom: 0`, so its bottom edge == screen bottom
 *   and the correct offset is 0. Don't copy that value from the example.
 */
export function BodyEditorSheet({
  visible,
  initialValue,
  title = 'Edit',
  placeholder = 'Write something...',
  onClose,
  onSave,
}: BodyEditorSheetProps) {
  // Snapshot initialValue at open so re-opening with different content
  // re-initializes the editor content cleanly.
  const [snapshot, setSnapshot] = useState(initialValue);
  useEffect(() => {
    if (visible) setSnapshot(initialValue);
  }, [visible, initialValue]);

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: snapshot ? markdownToHtml(snapshot) : '',
    theme: ideaFuelEditorTheme,
    bridgeExtensions: [
      ...TenTapStartKit,
      CoreBridge.configureCSS(editorDarkThemeCSS),
      PlaceholderBridge.configureExtension({ placeholder }),
      LinkBridge.configureExtension({ openOnClick: false, autolink: true }),
      HeadingBridge.configureExtension({ levels: [1, 2, 3] }),
    ],
  });

  // When the sheet re-opens with new initial content, push it into the editor.
  useEffect(() => {
    if (!visible) return;
    const html = snapshot ? markdownToHtml(snapshot) : '';
    editor.setContent(html);
    const t = setTimeout(() => editor.focus(), 300);
    return () => clearTimeout(t);
  }, [visible, snapshot, editor]);

  const handleSave = async () => {
    const html = await editor.getHTML();
    onSave(htmlToMarkdown(html));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Check size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Editor fills the space between header and toolbar */}
        <View style={styles.editorWrap}>
          <RichText editor={editor} />
        </View>

        {/* Toolbar — documented tentap pattern.
            No keyboardVerticalOffset: the KAV is position:absolute bottom:0,
            so its bottom sits at screen bottom and the default 0 offset is
            correct. The tentap theme adds a 6px marginBottom for the gap. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.toolbarKAV}
        >
          <Toolbar editor={editor} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1816',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    ...fonts.outfit.semiBold,
    color: colors.foreground,
  },
  editorWrap: {
    flex: 1,
  },
  toolbarKAV: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
});
