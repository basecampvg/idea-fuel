/**
 * TipTap JSON helpers for building blog post content programmatically.
 * Uses ProseMirror document structure.
 */

export type Mark = { type: string; attrs?: Record<string, unknown> };
export type TextNode = { type: 'text'; text: string; marks?: Mark[] };
export type ContentNode =
  | TextNode
  | { type: 'heading'; attrs: { level: number }; content: (TextNode | InlineNode)[] }
  | { type: 'paragraph'; content?: (TextNode | InlineNode)[] }
  | { type: 'bulletList'; content: ListItemNode[] }
  | { type: 'orderedList'; content: ListItemNode[] }
  | { type: 'blockquote'; content: ContentNode[] }
  | { type: 'horizontalRule' }
  | { type: 'hardBreak' }
  | ImageNode;

export type ImageNode = { type: 'image'; attrs: { src: string; alt: string; title: string | null } };
export type InlineNode = TextNode;
export type ListItemNode = { type: 'listItem'; content: ContentNode[] };
export type Doc = { type: 'doc'; content: ContentNode[] };

// --- Text helpers ---

export function text(t: string): TextNode {
  return { type: 'text', text: t };
}

export function bold(t: string): TextNode {
  return { type: 'text', text: t, marks: [{ type: 'bold' }] };
}

export function italic(t: string): TextNode {
  return { type: 'text', text: t, marks: [{ type: 'italic' }] };
}

export function link(t: string, href: string): TextNode {
  return {
    type: 'text',
    text: t,
    marks: [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer nofollow', class: null } }],
  };
}

export function boldLink(t: string, href: string): TextNode {
  return {
    type: 'text',
    text: t,
    marks: [
      { type: 'bold' },
      { type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer nofollow', class: null } },
    ],
  };
}

export function internalLink(t: string, href: string): TextNode {
  return {
    type: 'text',
    text: t,
    marks: [{ type: 'link', attrs: { href, target: null, rel: null, class: null } }],
  };
}

// --- Block helpers ---

export function h2(t: string): ContentNode {
  return { type: 'heading', attrs: { level: 2 }, content: [text(t)] };
}

export function h3(t: string): ContentNode {
  return { type: 'heading', attrs: { level: 3 }, content: [text(t)] };
}

export function p(...nodes: (TextNode | string)[]): ContentNode {
  const content = nodes.map((n) => (typeof n === 'string' ? text(n) : n));
  return { type: 'paragraph', content };
}

export function emptyP(): ContentNode {
  return { type: 'paragraph' };
}

export function blockquote(...nodes: ContentNode[]): ContentNode {
  return { type: 'blockquote', content: nodes };
}

export function hr(): ContentNode {
  return { type: 'horizontalRule' };
}

export function image(src: string, alt: string): ImageNode {
  return { type: 'image', attrs: { src, alt, title: null } };
}

// --- List helpers ---

export function bulletList(...items: string[]): ContentNode {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem' as const,
      content: [p(item)],
    })),
  };
}

export function bulletListRich(...items: ContentNode[]): ContentNode {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem' as const,
      content: [item],
    })),
  };
}

export function orderedList(...items: string[]): ContentNode {
  return {
    type: 'orderedList',
    content: items.map((item) => ({
      type: 'listItem' as const,
      content: [p(item)],
    })),
  };
}

// --- Document builder ---

export function doc(...content: ContentNode[]): Doc {
  return { type: 'doc', content };
}

// --- CTA block helper ---

export function ctaBlock(heading: string, bodyText: string, linkText: string, href: string): ContentNode[] {
  return [
    hr(),
    h3(heading),
    p(bodyText),
    p(boldLink(linkText, href)),
    hr(),
  ];
}

// --- FAQ block helper ---

export function faqSection(faqs: { q: string; a: string }[]): ContentNode[] {
  const nodes: ContentNode[] = [h2('Frequently Asked Questions')];
  for (const faq of faqs) {
    nodes.push(h3(faq.q));
    nodes.push(p(faq.a));
  }
  return nodes;
}
