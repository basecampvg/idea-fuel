// ---------------------------------------------------------------------------
// Design Token Types & Category Definitions
// ---------------------------------------------------------------------------

export type TokenFormat = 'hsl' | 'hsl-alpha' | 'hex' | 'rem' | 'transition' | 'gradient';

export type TokenCategory =
  | 'core'
  | 'primary-accent'
  | 'status'
  | 'score'
  | 'chart'
  | 'chart-element'
  | 'sidebar'
  | 'radius'
  | 'transition'
  | 'brand'
  | 'gradient'
  | 'aurora';

export type SelectorBlock = ':root-shared' | 'html.light' | '.dark,:root';

export interface TokenDefinition {
  name: string;          // e.g. "--primary"
  rawValue: string;      // e.g. "7 80% 57%"
  format: TokenFormat;
  selector: SelectorBlock;
  lineStart: number;     // 0-indexed line number
  lineEnd: number;       // 0-indexed, inclusive (same as lineStart for single-line)
  category: TokenCategory;
}

export interface TokenChange {
  name: string;
  selector: SelectorBlock;
  value: string;
}

export interface ParseResult {
  tokens: TokenDefinition[];
  fileHash: string;
}

export interface SaveRequest {
  changes: TokenChange[];
  fileHash: string;
}

export interface SaveResponse {
  success: boolean;
  newFileHash: string;
}

// ---------------------------------------------------------------------------
// Category Definitions — order determines display order in the editor
// ---------------------------------------------------------------------------

export interface CategoryDefinition {
  key: TokenCategory;
  label: string;
  description: string;
}

export const TOKEN_CATEGORIES: CategoryDefinition[] = [
  { key: 'core', label: 'Core Colors', description: 'Background, foreground, card, popover, muted, border, input, ring' },
  { key: 'primary-accent', label: 'Primary / Secondary / Accent', description: 'Brand action colors with foreground pairs' },
  { key: 'status', label: 'Status Colors', description: 'Destructive, success, warning, info' },
  { key: 'score', label: 'Score Colors', description: 'Opportunity, problem, feasibility, why-now' },
  { key: 'chart', label: 'Chart Colors', description: '5-color chart palette' },
  { key: 'chart-element', label: 'Chart Elements', description: 'Stroke, axis, grid, tooltip' },
  { key: 'sidebar', label: 'Sidebar', description: 'Sidebar background, foreground, accent, border' },
  { key: 'aurora', label: 'Aurora', description: 'Aurora background end color' },
  { key: 'radius', label: 'Border Radius', description: 'Base radius (variants are calc-derived)' },
  { key: 'transition', label: 'Transitions', description: 'Fast, smooth, spring timing' },
  { key: 'brand', label: 'Brand Colors', description: 'Idea Fuel brand hex colors' },
  { key: 'gradient', label: 'Gradient', description: 'Accent gradient (multi-stop)' },
];

// ---------------------------------------------------------------------------
// Token → Category mapping by name prefix
// ---------------------------------------------------------------------------

const CATEGORY_RULES: [string[], TokenCategory][] = [
  [['--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--accent', '--accent-foreground'], 'primary-accent'],
  [['--destructive', '--destructive-foreground', '--success', '--success-foreground', '--warning', '--warning-foreground', '--info', '--info-foreground'], 'status'],
  [['--score-opportunity', '--score-problem', '--score-feasibility', '--score-whynow'], 'score'],
  [['--chart-stroke', '--chart-axis', '--chart-grid', '--chart-tooltip-bg', '--chart-tooltip-border', '--chart-tooltip-text'], 'chart-element'],
  [['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'], 'chart'],
  [['--sidebar', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring'], 'sidebar'],
  [['--aurora-end'], 'aurora'],
  [['--radius'], 'radius'],
  [['--transition-fast', '--transition-smooth', '--transition-spring'], 'transition'],
  [['--brand-red', '--brand-red-end', '--brand-bg'], 'brand'],
  [['--gradient-accent'], 'gradient'],
];

export function categorizeToken(name: string): TokenCategory {
  for (const [names, category] of CATEGORY_RULES) {
    if (names.includes(name)) return category;
  }
  // Fallback: anything starting with known prefixes
  if (name.startsWith('--chart-')) return 'chart';
  if (name.startsWith('--sidebar-')) return 'sidebar';
  if (name.startsWith('--score-')) return 'score';
  // Default to core (background, foreground, card, popover, muted, border, input, ring)
  return 'core';
}

// ---------------------------------------------------------------------------
// Format detection from raw value
// ---------------------------------------------------------------------------

const HSL_ALPHA_RE = /^\d+\s+\d+%\s+\d+%\s*\/\s*[\d.]+$/;
const HSL_RE = /^\d+\s+\d+%?\s+\d+%$/;
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const REM_RE = /^[\d.]+rem$/;
const GRADIENT_RE = /^linear-gradient/;
const TRANSITION_RE = /^\d+ms\s/;

export function detectFormat(value: string): TokenFormat {
  const v = value.trim();
  if (HSL_ALPHA_RE.test(v)) return 'hsl-alpha';
  if (HSL_RE.test(v)) return 'hsl';
  if (HEX_RE.test(v)) return 'hex';
  if (REM_RE.test(v)) return 'rem';
  if (GRADIENT_RE.test(v)) return 'gradient';
  if (TRANSITION_RE.test(v)) return 'transition';
  return 'hsl'; // fallback
}

// ---------------------------------------------------------------------------
// Unique key for a token (handles same name in different selectors)
// ---------------------------------------------------------------------------

export function tokenKey(selector: SelectorBlock, name: string): string {
  return `${selector}::${name}`;
}
