// packages/web/src/lib/glossary.ts
import fs from 'fs';
import path from 'path';

export interface GlossaryTermContent {
  definition: string;
  whyItMatters: string;
  howToApply: string;
  commonMistakes: string[];
  ideafuelConnection?: string;
}

export interface GlossaryTerm {
  slug: string;
  title: string;
  category: string;
  shortDefinition: string;
  content: GlossaryTermContent;
  relatedTerms: string[];
  synonyms: string[];
  seoTitle: string;
  seoDescription: string;
}

export type GlossaryCategory =
  | 'strategy'
  | 'marketing'
  | 'finance'
  | 'growth'
  | 'product'
  | 'analytics'
  | 'fundraising';

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  strategy: 'Strategy',
  marketing: 'Marketing',
  finance: 'Finance',
  growth: 'Growth',
  product: 'Product',
  analytics: 'Analytics',
  fundraising: 'Fundraising',
};

const TERMS_DIR = path.join(process.cwd(), 'src', 'data', 'glossary', 'terms');

export function getAllTerms(): GlossaryTerm[] {
  if (!fs.existsSync(TERMS_DIR)) return [];
  const files = fs.readdirSync(TERMS_DIR).filter((f) => f.endsWith('.json'));
  const terms: GlossaryTerm[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(TERMS_DIR, file), 'utf-8');
    return JSON.parse(raw) as GlossaryTerm;
  });
  return terms.sort((a, b) => a.title.localeCompare(b.title));
}

export function getTermBySlug(slug: string): GlossaryTerm | null {
  const filePath = path.join(TERMS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as GlossaryTerm;
}

export interface AlphabetGroup {
  letter: string;
  terms: GlossaryTerm[];
}

export function getAlphabetGroups(terms: GlossaryTerm[]): AlphabetGroup[] {
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of terms) {
    const letter = term.title[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(term);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, terms]) => ({ letter, terms }));
}
