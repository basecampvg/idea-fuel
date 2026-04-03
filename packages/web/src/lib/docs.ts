import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type { NavItem } from './docs-nav';
export { NAV_ITEMS } from './docs-nav';

const DOCS_DIR = path.join(process.cwd(), '..', '..', 'docs', 'user-guide');

export interface DocFrontmatter {
  title: string;
  description: string;
  keywords?: string[];
  category?: string;
  'og:title'?: string;
  'og:description'?: string;
  structured_data?:
    | string
    | {
        type: string;
        faq?: Array<{ question: string; answer: string }>;
      };
  canonical?: string;
}

export interface DocPage {
  slug: string[];
  frontmatter: DocFrontmatter;
  content: string;
}

function slugFromPath(filePath: string): string[] | null {
  const relative = path.relative(DOCS_DIR, filePath);
  const parts = relative.replace(/\.md$/, '').split(path.sep);
  if (parts[parts.length - 1] === 'index') {
    parts.pop();
  }
  // Root index.md is handled by /docs/page.tsx, not the catch-all
  if (parts.length === 0) return null;
  return parts;
}

export function getDocBySlug(slug: string[]): DocPage | null {
  const candidates = [
    path.join(DOCS_DIR, ...slug) + '.md',
    path.join(DOCS_DIR, ...slug, 'index.md'),
  ];

  if (slug.length === 0) {
    candidates.unshift(path.join(DOCS_DIR, 'index.md'));
  }

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      return {
        slug,
        frontmatter: data as DocFrontmatter,
        content,
      };
    }
  }

  return null;
}

export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        const slug = slugFromPath(full);
        if (slug) slugs.push(slug);
      }
    }
  }

  walk(DOCS_DIR);
  return slugs;
}
