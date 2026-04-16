import React, { useImperativeHandle, forwardRef, useCallback, useRef, useState, useEffect } from 'react';
import { View, FlatList, Image, StyleSheet, Keyboard, TouchableOpacity, Platform } from 'react-native';
import { Keyboard as KeyboardIcon } from 'lucide-react-native';
import {
  RichText,
  useEditorBridge,
  useEditorContent,
  useBridgeState,
  TenTapStartKit,
  CoreBridge,
  PlaceholderBridge,
  LinkBridge,
  HeadingBridge,
  DEFAULT_TOOLBAR_ITEMS,
  type EditorBridge,
} from '@10play/tentap-editor';
import { marked } from 'marked';
import { editorDarkThemeCSS } from '../../lib/editor-theme';
import { colors } from '../../lib/theme';

/**
 * Idea Fuel — floating pill toolbar
 *
 * Overrides 10tap's default toolbarBody which has flex:1 + minWidth:'100%'
 * that prevent height/margin from working. We explicitly zero those out
 * so the pill shape actually renders.
 */
const ideaFuelEditorTheme = {
  toolbar: {
    toolbarBody: {
      // Override defaults: flex:1 + minWidth:'100%' that stretch the toolbar
      flex: 0,
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto' as any,
      minWidth: 0,
      // Pill shape
      height: 44,
      maxHeight: 44,
      borderRadius: 22,
      // Visually lift above the dark background
      backgroundColor: '#2D2B28',
      borderWidth: 1,
      borderColor: '#383634',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: '#383634',
      borderBottomColor: '#383634',
      // Float inward — clipped icons at edge hint at scrollability
      marginHorizontal: 12,
      marginBottom: 8,
      overflow: 'hidden' as const,
    },
    toolbarButton: {
      backgroundColor: 'transparent',
      paddingHorizontal: 6,
    },
    iconDisabled: {
      tintColor: `${colors.mutedDim}80`,
    },
    iconWrapperActive: {
      backgroundColor: 'rgba(227, 43, 26, 0.15)',
      borderRadius: 6,
    },
    iconWrapper: {
      borderRadius: 6,
      backgroundColor: 'transparent',
    },
    icon: {
      tintColor: colors.foreground,
      height: 32,
      width: 32,
    },
    iconActive: {
      tintColor: colors.foreground,
    },
    linkBarTheme: {
      addLinkContainer: {
        backgroundColor: '#2D2B28',
        borderTopColor: '#383634',
        borderBottomColor: '#383634',
      },
      linkInput: {
        backgroundColor: '#2D2B28',
        color: colors.foreground,
      },
      placeholderTextColor: colors.mutedDim,
      doneButton: {
        backgroundColor: colors.brand,
      },
      doneButtonText: {
        color: '#fff',
      },
      linkToolbarButton: {},
    },
  },
  webview: {
    backgroundColor: colors.background,
  },
  webviewContainer: {},
};

/**
 * Lightweight HTML→Markdown for ProseMirror output.
 * Avoids TurndownService which requires a browser DOM (`document`).
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Task list items (must run before generic <li>)
  md = md.replace(/<li[^>]*data-checked="true"[^>]*><[^>]*>(?:<p>)?([\s\S]*?)(?:<\/p>)?<\/[^>]*><\/li>/gi, '- [x] $1');
  md = md.replace(/<li[^>]*data-checked="false"[^>]*><[^>]*>(?:<p>)?([\s\S]*?)(?:<\/p>)?<\/[^>]*><\/li>/gi, '- [ ] $1');
  md = md.replace(/<li[^>]*data-type="taskItem"[^>]*>(?:<p>)?([\s\S]*?)(?:<\/p>)?<\/li>/gi, '- [ ] $1');

  // Code blocks (before inline code)
  md = md.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n');

  // Bold / italic / strikethrough / underline / inline code
  md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<u>([\s\S]*?)<\/u>/gi, '$1');
  md = md.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');

  // Links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Blockquote
  md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_m, inner) =>
    inner.replace(/<p>([\s\S]*?)<\/p>/gi, '> $1\n')
  );

  // List items → bullets / numbers
  md = md.replace(/<li>([\s\S]*?)<\/li>/gi, (_m, inner) => {
    const text = inner.replace(/<\/?p>/gi, '').trim();
    return `- ${text}\n`;
  });

  // Paragraphs & line breaks
  md = md.replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Strip remaining tags (ul, ol, task list wrappers, etc.)
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

/**
 * Convert Markdown→HTML for TenTap/ProseMirror.
 * `marked` outputs standard HTML checkboxes, but TenTap expects
 * `data-type="taskList"` / `data-type="taskItem"` attributes.
 */
function markdownToHtml(md: string): string {
  let html = marked.parse(md) as string;

  // Convert marked's checkbox list items into TenTap taskItem format
  // marked: <li><input disabled="" type="checkbox"> text</li>
  // tentap: <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>text</p></div></li>
  html = html.replace(
    /<li><input\s+checked=""\s+disabled=""\s+type="checkbox">\s*([\s\S]*?)<\/li>/gi,
    '<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked></label><div><p>$1</p></div></li>'
  );
  html = html.replace(
    /<li><input\s+disabled=""\s+type="checkbox">\s*([\s\S]*?)<\/li>/gi,
    '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>$1</p></div></li>'
  );

  // Wrap the parent <ul> containing taskItems with data-type="taskList"
  html = html.replace(
    /<ul>\s*(<li data-type="taskItem"[\s\S]*?)<\/ul>/gi,
    '<ul data-type="taskList">$1</ul>'
  );

  return html;
}

export interface MarkdownEditorRef {
  getMarkdown: () => Promise<string>;
  setMarkdown: (md: string) => void;
  getEditorBridge: () => EditorBridge;
}

interface MarkdownEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: () => void;
  editable?: boolean;
}

/**
 * Custom toolbar that mirrors TenTap's Toolbar but with
 * showsHorizontalScrollIndicator={false} to hide the scrollbar.
 */
export function EditorToolbar({ editor }: { editor: EditorBridge }) {
  const editorState = useBridgeState(editor);
  const args = { editor, editorState, setToolbarContext: () => {}, toolbarContext: 'main' as any };
  const isVisible = editorState.isFocused;

  return (
    <FlatList
      data={DEFAULT_TOOLBAR_ITEMS}
      style={[editor.theme.toolbar.toolbarBody, !isVisible ? { display: 'none' } : undefined]}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={item.onPress(args)}
          disabled={item.disabled(args)}
          style={editor.theme.toolbar.toolbarButton}
        >
          <View
            style={[
              editor.theme.toolbar.iconWrapper,
              item.active(args) ? editor.theme.toolbar.iconWrapperActive : undefined,
              item.disabled(args) ? editor.theme.toolbar.iconWrapperDisabled : undefined,
            ]}
          >
            <Image
              source={item.image(args)}
              style={[
                editor.theme.toolbar.icon,
                item.active(args) ? editor.theme.toolbar.iconActive : undefined,
                item.disabled(args) ? editor.theme.toolbar.iconDisabled : undefined,
              ]}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      )}
      horizontal
      keyExtractor={(_, i) => String(i)}
    />
  );
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ initialContent = '', placeholder = 'Start writing...', onChange, editable = true }, ref) => {
    const initialHtml = initialContent ? markdownToHtml(initialContent) : '';
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
      const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const editor = useEditorBridge({
      autofocus: false,
      avoidIosKeyboard: false,
      dynamicHeight: true,
      initialContent: initialHtml,
      theme: ideaFuelEditorTheme,
      bridgeExtensions: [
        ...TenTapStartKit,
        CoreBridge.configureCSS(editorDarkThemeCSS),
        PlaceholderBridge.configureExtension({ placeholder }),
        LinkBridge.configureExtension({ openOnClick: false, autolink: true }),
        HeadingBridge.configureExtension({ levels: [1, 2, 3] }),
      ],
      onChange: () => {
        onChange?.();
      },
    });

    useImperativeHandle(ref, () => ({
      getMarkdown: async () => {
        const html = await editor.getHTML();
        return htmlToMarkdown(html);
      },
      setMarkdown: (md: string) => {
        editor.setContent(markdownToHtml(md));
      },
      getEditorBridge: () => editor,
    }), [editor]);

    return (
      <View style={styles.container}>
        <View style={styles.editorWrapper}>
          <RichText editor={editor} scrollEnabled={false} />
        </View>
      </View>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 160,
  },
  editorWrapper: {
    width: '100%',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarWrapper: {
    flex: 1,
  },
  dismissButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D2B28',
    borderWidth: 1,
    borderColor: '#383634',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
});
