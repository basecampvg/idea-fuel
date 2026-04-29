import React, { useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { View, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import {
  RichText,
  useEditorBridge,
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
export const ideaFuelEditorTheme = {
  toolbar: {
    toolbarBody: {
      // Pill shape, iOS dark-keyboard gray.
      // - marginHorizontal: 12 insets the pill from screen edges.
      // - marginBottom: 6 gives a small gap between the pill and keyboard top.
      // - Explicit 0 borders override tentap's defaults that otherwise render
      //   thin separator strokes above/below the pill.
      // - flex: 0 + minWidth: 0 are CRITICAL: tentap's default theme sets
      //   flex:1 and minWidth:'100%' which forced the FlatList to be the
      //   full parent width, so marginHorizontal:12 then pushed the right
      //   edge 24pt past the screen. Zero them to reclaim the margin.
      // All positioning MUST be on this theme style — not on the KAV wrapper
      // or an extra View, either of which breaks Toolbar's layout entirely.
      flex: 0,
      minWidth: 0,
      height: 44,
      maxHeight: 44,
      borderRadius: 22,
      backgroundColor: '#3A3A3C',
      borderWidth: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      marginHorizontal: 12,
      marginBottom: 6,
      overflow: 'hidden' as const,
      paddingHorizontal: 6,
    },
    toolbarButton: {
      backgroundColor: 'transparent',
      paddingHorizontal: 6,
    },
    iconDisabled: {
      tintColor: `${colors.mutedDim}80`,
    },
    iconWrapperActive: {
      // Solid brand red with a consistent rounded pill behind the active
      // icon. Solid (not translucent) means every icon gets the same visual
      // weight when active — previously the 15%-alpha red let different
      // icon shapes show through inconsistently.
      backgroundColor: colors.brand,
      borderRadius: 8,
    },
    iconWrapper: {
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    icon: {
      tintColor: colors.foreground,
      height: 32,
      width: 32,
    },
    iconActive: {
      // White icon on red background — high contrast, same result for every
      // icon regardless of its internal alpha/shape.
      tintColor: '#fff',
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
 * Recover from older serializer bugs that stored adjacent task items as
 * "- [ ] a- [ ] b" (no newline). Splits each mid-line task marker onto
 * its own line. Loops until stable so triples/quads also recover.
 *
 * Group 2 in the regex must NOT include leading whitespace — matching
 * `\s*-\[...]` would consume the just-inserted `\n` and grow forever.
 *
 * Known limitation: a task-marker-shaped string inside a fenced code block
 * (```) will also be split. Rare in practice; documented rather than coded
 * around to keep the transform a pure regex.
 */
export function healTaskLists(md: string): string {
  let prev;
  do {
    prev = md;
    md = md.replace(/(-\s*\[[ xX]\][^-\n]*?)(-\s*\[[ xX]\])/g, '$1\n$2');
  } while (md !== prev);
  return md;
}

/**
 * Lightweight HTML→Markdown for ProseMirror output.
 * Avoids TurndownService which requires a browser DOM (`document`).
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Task list items (must run before generic <li>).
  // Tentap emits: <li data-type="taskItem" data-checked="..."><label>...</label><div><p>TEXT</p></div></li>
  // Grab the inner <p>TEXT</p> directly and append a newline so adjacent
  // items don't mash together (e.g. "- [ ] a- [ ] b").
  md = md.replace(
    /<li[^>]*data-checked="true"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi,
    '- [x] $1\n'
  );
  md = md.replace(
    /<li[^>]*data-checked="false"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi,
    '- [ ] $1\n'
  );
  // Fallback for taskItem without the data-checked attribute (treat as unchecked).
  md = md.replace(
    /<li[^>]*data-type="taskItem"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi,
    '- [ ] $1\n'
  );

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
export function markdownToHtml(md: string): string {
  md = healTaskLists(md);

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
  autofocus?: boolean;
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
  ({ initialContent = '', placeholder = 'Start writing...', onChange, autofocus = false }, ref) => {
    const initialHtml = initialContent ? markdownToHtml(initialContent) : '';

    const editor = useEditorBridge({
      autofocus,
      // Per tentap docs, the blessed pattern pairs `avoidIosKeyboard: true`
      // with `<Toolbar>` wrapped in `<KeyboardAvoidingView>`. The RichText
      // content shifts to stay above the keyboard; the Toolbar pins to
      // keyboard top via KAV. Do NOT set dynamicHeight — it races with
      // bridge init and renders the editor at 0 height.
      avoidIosKeyboard: true,
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

    // Defensive: TenTap's `initialContent` can race with bridge/extension
    // setup, leaving the editor empty even when content was provided. Once
    // the bridge reports ready, re-set the content if it's still missing.
    const didHydrate = useRef(false);
    const editorState = useBridgeState(editor);
    useEffect(() => {
      if (didHydrate.current || !initialHtml || !editorState.isReady) return;
      didHydrate.current = true;
      (async () => {
        const current = await editor.getHTML();
        const isEmpty = !current || current === '<p></p>' || current.trim() === '';
        if (isEmpty) {
          editor.setContent(initialHtml);
        }
      })();
    }, [editor, editorState.isReady, initialHtml]);

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
        <RichText editor={editor} />
      </View>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
