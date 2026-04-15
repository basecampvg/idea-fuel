'use client';

import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import DOMPurify from 'isomorphic-dompurify';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { slugify } from '@/lib/blog-utils';

const lowlight = createLowlight(common);

function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(/<(h[23])>(.*?)<\/\1>/gs, (_, tag, content) => {
    const text = content.replace(/<[^>]*>/g, '');
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    return `<${tag} id="${id}" class="scroll-mt-24">${content}</${tag}>`;
  });
}

interface TipTapRendererProps {
  content: unknown;
  className?: string;
}

// Configure extensions for HTML generation
const extensions = [
  StarterKit.configure({
    codeBlock: false,
  }),
  Link.configure({
    openOnClick: true,
  }),
  Image,
  CodeBlockLowlight.configure({
    lowlight,
  }),
];

export function TipTapRenderer({ content, className }: TipTapRendererProps) {
  const html = useMemo(() => {
    if (!content || typeof content !== 'object') {
      return '';
    }

    try {
      const raw = generateHTML(content as Parameters<typeof generateHTML>[0], extensions);
      const withIds = addHeadingIds(raw);
      return DOMPurify.sanitize(withIds);
    } catch (error) {
      console.error('Failed to render TipTap content:', error);
      return '<p>Failed to render content</p>';
    }
  }, [content]);

  return (
    <div
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none',
        // Paragraphs
        '[&_p]:text-foreground [&_p]:leading-relaxed [&_p]:mb-4',
        // Headings
        '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-foreground',
        '[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-foreground',
        '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-foreground',
        // Lists
        '[&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:text-foreground',
        '[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:text-foreground',
        '[&_li]:text-foreground [&_li_p]:mb-0 [&_li_p]:inline',
        // Blockquote
        '[&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4',
        // Code
        '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
        '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:text-sm [&_pre]:font-mono [&_pre]:overflow-x-auto [&_pre]:mb-4',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        // Links
        '[&_a]:text-primary [&_a]:hover:underline',
        // Images
        '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4',
        // Horizontal rule
        '[&_hr]:my-8 [&_hr]:border-border',
        // Strong/Em
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_em]:italic',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default TipTapRenderer;
