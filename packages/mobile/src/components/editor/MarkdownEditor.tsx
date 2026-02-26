import React, { useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  RichText,
  Toolbar,
  useEditorBridge,
  useEditorContent,
  TenTapStartKit,
  CoreBridge,
  PlaceholderBridge,
  LinkBridge,
  HeadingBridge,
  DEFAULT_TOOLBAR_ITEMS,
} from '@10play/tentap-editor';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { editorDarkThemeCSS } from '../../lib/editor-theme';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Configure turndown for task lists
turndown.addRule('taskListItem', {
  filter: (node: HTMLElement) => {
    return (
      node.nodeName === 'LI' &&
      node.parentNode?.nodeName === 'UL' &&
      (node.getAttribute('data-type') === 'taskItem' ||
       node.getAttribute('data-checked') !== null)
    );
  },
  replacement: (content: string, node: HTMLElement) => {
    const isChecked = node.getAttribute('data-checked') === 'true';
    const checkbox = isChecked ? '[x]' : '[ ]';
    return `- ${checkbox} ${content.trim()}\n`;
  },
});

export interface MarkdownEditorRef {
  getMarkdown: () => Promise<string>;
  setMarkdown: (md: string) => void;
}

interface MarkdownEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: () => void;
  editable?: boolean;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ initialContent = '', placeholder = 'Start writing...', onChange, editable = true }, ref) => {
    const initialHtml = initialContent ? marked.parse(initialContent) as string : '';

    const editor = useEditorBridge({
      autofocus: false,
      avoidIosKeyboard: true,
      initialContent: initialHtml,
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
        return turndown.turndown(html);
      },
      setMarkdown: (md: string) => {
        const html = marked.parse(md) as string;
        editor.setContent(html);
      },
    }), [editor]);

    return (
      <View style={styles.container}>
        <View style={styles.editorWrapper}>
          <RichText editor={editor} />
        </View>
        <Toolbar editor={editor} items={DEFAULT_TOOLBAR_ITEMS} />
      </View>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorWrapper: {
    flex: 1,
  },
});
