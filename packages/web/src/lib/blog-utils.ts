export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

interface TipTapNode {
  type?: string;
  attrs?: { level?: number };
  content?: TipTapNode[];
  text?: string;
}

function extractText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join('');
  return '';
}

export function extractHeadingsFromTipTap(content: unknown): TocHeading[] {
  if (!content || typeof content !== 'object') return [];

  const doc = content as TipTapNode;
  const nodes = doc.content ?? [];
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();

  for (const node of nodes) {
    if (node.type === 'heading' && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
      const text = extractText(node);
      if (!text) continue;

      let id = slugify(text);
      const count = seen.get(id) ?? 0;
      seen.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;

      headings.push({ id, text, level: node.attrs.level });
    }
  }

  return headings;
}
