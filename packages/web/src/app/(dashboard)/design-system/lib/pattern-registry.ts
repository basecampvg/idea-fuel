// ---------------------------------------------------------------------------
// Pattern Registry — definitions for all inline patterns to extract
// ---------------------------------------------------------------------------

export interface PropDefinition {
  name: string;
  type: 'string' | 'number' | 'enum' | 'boolean' | 'ReactNode' | 'icon';
  default?: string;
  options?: string[];
  description: string;
}

export interface PatternDefinition {
  id: string;
  suggestedName: string;
  fileName: string;        // output file name (e.g., 'icon-badge.tsx')
  description: string;
  props: PropDefinition[];
  usageFiles: string[];
  occurrences: string;
  priority: 'high' | 'medium' | 'low';
  generateSource: () => string;
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

function fileHeader(name: string): string {
  return `import type { ReactNode } from 'react';`;
}

// ---------------------------------------------------------------------------
// Pattern Definitions
// ---------------------------------------------------------------------------

export const PATTERNS: PatternDefinition[] = [
  // 1. Content Card
  {
    id: 'content-card',
    suggestedName: 'ContentCard',
    fileName: 'content-card.tsx',
    description: 'Raw div with p-4 rounded-xl bg-card border border-border',
    props: [
      { name: 'title', type: 'string', description: 'Card title (uppercase label)' },
      { name: 'children', type: 'ReactNode', description: 'Card body content' },
      { name: 'className', type: 'string', default: "''", description: 'Additional CSS classes' },
    ],
    usageFiles: ['business-fit.tsx', 'competitors-section.tsx', 'market-analysis.tsx', 'pain-points-section.tsx', 'proof-signals.tsx', 'spark-results.tsx', 'tech-stack-section.tsx', 'why-now-section.tsx', 'user-story.tsx', 'market-sizing.tsx', 'social-proof-section.tsx'],
    occurrences: '35+',
    priority: 'high',
    generateSource: () => `import type { ReactNode } from 'react';

interface ContentCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function ContentCard({ title, children, className = '' }: ContentCardProps) {
  return (
    <div className={\`p-4 rounded-xl bg-card border border-border \${className}\`}>
      {title && (
        <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
`,
  },

  // 2. Icon Badge
  {
    id: 'icon-badge',
    suggestedName: 'IconBadge',
    fileName: 'icon-badge.tsx',
    description: 'Circular icon container with translucent background',
    props: [
      { name: 'icon', type: 'icon', description: 'Lucide icon component' },
      { name: 'size', type: 'enum', options: ['sm', 'md', 'lg'], default: "'md'", description: 'Badge size' },
      { name: 'color', type: 'string', default: "'primary'", description: 'Color token name' },
    ],
    usageFiles: ['business-fit.tsx', 'spark-results.tsx', 'business-plan-section.tsx', 'market-sizing.tsx', 'tech-stack-section.tsx'],
    occurrences: '15+',
    priority: 'high',
    generateSource: () => `import type { LucideIcon } from 'lucide-react';

type IconBadgeSize = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  icon: LucideIcon;
  size?: IconBadgeSize;
  color?: string;
  className?: string;
}

const sizeStyles: Record<IconBadgeSize, { container: string; icon: string }> = {
  sm: { container: 'w-6 h-6', icon: 'w-3 h-3' },
  md: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  lg: { container: 'w-10 h-10', icon: 'w-5 h-5' },
};

export function IconBadge({ icon: Icon, size = 'md', color = 'primary', className = '' }: IconBadgeProps) {
  const s = sizeStyles[size];
  return (
    <div
      className={\`\${s.container} rounded-full flex items-center justify-center bg-\${color}/15 \${className}\`}
    >
      <Icon className={\`\${s.icon} text-\${color}\`} />
    </div>
  );
}
`,
  },

  // 3. Severity Badge
  {
    id: 'severity-badge',
    suggestedName: 'SeverityBadge',
    fileName: 'severity-badge.tsx',
    description: 'Color-coded rating pill for High/Medium/Low',
    props: [
      { name: 'level', type: 'enum', options: ['high', 'medium', 'low', 'proceed', 'watchlist', 'drop'], default: "'medium'", description: 'Severity level' },
      { name: 'label', type: 'string', description: 'Override label text' },
    ],
    usageFiles: ['business-fit.tsx', 'pain-points-section.tsx', 'proof-signals.tsx', 'market-analysis.tsx', 'spark-results.tsx', 'why-now-section.tsx', 'market-sizing.tsx'],
    occurrences: '20+',
    priority: 'high',
    generateSource: () => `type SeverityLevel = 'high' | 'medium' | 'low' | 'proceed' | 'watchlist' | 'drop';

interface SeverityBadgeProps {
  level: SeverityLevel;
  label?: string;
  className?: string;
}

const levelStyles: Record<SeverityLevel, { bg: string; text: string; border: string; label: string }> = {
  high:      { bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20',    label: 'High' },
  medium:    { bg: 'bg-amber-500/10',  text: 'text-amber-500',  border: 'border-amber-500/20',  label: 'Medium' },
  low:       { bg: 'bg-blue-500/10',   text: 'text-blue-500',   border: 'border-blue-500/20',   label: 'Low' },
  proceed:   { bg: 'bg-primary/20',    text: 'text-primary',    border: 'border-primary/30',    label: 'Proceed' },
  watchlist:  { bg: 'bg-amber-500/10',  text: 'text-amber-500',  border: 'border-amber-500/20',  label: 'Watchlist' },
  drop:      { bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20',    label: 'Drop' },
};

export function SeverityBadge({ level, label, className = '' }: SeverityBadgeProps) {
  const s = levelStyles[level];
  return (
    <span
      className={\`px-2 py-0.5 text-xs font-medium rounded-full border \${s.bg} \${s.text} \${s.border} \${className}\`}
    >
      {label ?? s.label}
    </span>
  );
}
`,
  },

  // 4. Icon Text
  {
    id: 'icon-text',
    suggestedName: 'IconText',
    fileName: 'icon-text.tsx',
    description: 'Flex row with small icon and text',
    props: [
      { name: 'icon', type: 'icon', description: 'Lucide icon component' },
      { name: 'children', type: 'ReactNode', description: 'Text content' },
      { name: 'color', type: 'string', default: "'primary/60'", description: 'Icon color class' },
    ],
    usageFiles: ['competitors-section.tsx', 'market-analysis.tsx', 'proof-signals.tsx', 'spark-results.tsx', 'pain-points-section.tsx', 'why-now-section.tsx', 'market-sizing.tsx'],
    occurrences: '30+',
    priority: 'high',
    generateSource: () => `import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface IconTextProps {
  icon: LucideIcon;
  children: ReactNode;
  color?: string;
  className?: string;
}

export function IconText({ icon: Icon, children, color = 'primary/60', className = '' }: IconTextProps) {
  return (
    <div className={\`flex items-center gap-2 \${className}\`}>
      <Icon className={\`w-3.5 h-3.5 text-\${color} shrink-0\`} />
      <span className="text-xs text-muted-foreground">{children}</span>
    </div>
  );
}
`,
  },

  // 5. Icon List
  {
    id: 'icon-list',
    suggestedName: 'IconList',
    fileName: 'icon-list.tsx',
    description: 'List items with icon bullets',
    props: [
      { name: 'items', type: 'string', description: 'Array of { text, variant? } items' },
      { name: 'variant', type: 'enum', options: ['check', 'x', 'arrow', 'dot', 'warning', 'star'], default: "'check'", description: 'Default icon variant for all items' },
    ],
    usageFiles: ['business-fit.tsx', 'market-analysis.tsx', 'pain-points-section.tsx', 'proof-signals.tsx', 'why-now-section.tsx', 'user-story.tsx', 'spark-results.tsx'],
    occurrences: '25+',
    priority: 'high',
    generateSource: () => `import {
  Check,
  X,
  ArrowRight,
  CircleDot,
  AlertTriangle,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type IconVariant = 'check' | 'x' | 'arrow' | 'dot' | 'warning' | 'star';

interface IconListItem {
  text: string;
  variant?: IconVariant;
}

interface IconListProps {
  items: IconListItem[];
  variant?: IconVariant;
  className?: string;
}

const variantConfig: Record<IconVariant, { icon: LucideIcon; color: string }> = {
  check:   { icon: Check,         color: 'text-primary' },
  x:       { icon: X,             color: 'text-red-400' },
  arrow:   { icon: ArrowRight,    color: 'text-primary/60' },
  dot:     { icon: CircleDot,     color: 'text-muted-foreground' },
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
  star:    { icon: Star,          color: 'text-amber-400' },
};

export function IconList({ items, variant = 'check', className = '' }: IconListProps) {
  return (
    <ul className={\`space-y-2 \${className}\`}>
      {items.map((item, i) => {
        const v = variantConfig[item.variant ?? variant];
        const Icon = v.icon;
        return (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icon className={\`w-3.5 h-3.5 mt-0.5 shrink-0 \${v.color}\`} />
            <span>{item.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
`,
  },

  // 6. Section Title
  {
    id: 'section-title',
    suggestedName: 'SectionTitle',
    fileName: 'section-title.tsx',
    description: 'Icon + uppercase label combo used to introduce sub-sections',
    props: [
      { name: 'icon', type: 'icon', description: 'Lucide icon component' },
      { name: 'label', type: 'string', description: 'Section label text' },
      { name: 'color', type: 'string', default: "'primary'", description: 'Color token for icon and text' },
    ],
    usageFiles: ['market-analysis.tsx', 'proof-signals.tsx', 'why-now-section.tsx', 'spark-results.tsx'],
    occurrences: '15+',
    priority: 'medium',
    generateSource: () => `import type { LucideIcon } from 'lucide-react';

interface SectionTitleProps {
  icon: LucideIcon;
  label: string;
  color?: string;
  className?: string;
}

export function SectionTitle({ icon: Icon, label, color = 'primary', className = '' }: SectionTitleProps) {
  return (
    <div className={\`flex items-center gap-2 mb-3 \${className}\`}>
      <Icon className={\`w-4 h-4 text-\${color}\`} />
      <p className={\`text-sm font-medium uppercase text-\${color}\`}>{label}</p>
    </div>
  );
}
`,
  },

  // 7. Confidence Bar
  {
    id: 'confidence-bar',
    suggestedName: 'ConfidenceBar',
    fileName: 'confidence-bar.tsx',
    description: 'Horizontal progress bar with percentage',
    props: [
      { name: 'label', type: 'string', description: 'Bar label text' },
      { name: 'value', type: 'number', default: '0', description: 'Percentage value (0-100)' },
      { name: 'color', type: 'enum', options: ['primary', 'amber', 'red', 'green'], default: "'primary'", description: 'Bar fill color' },
    ],
    usageFiles: ['business-fit.tsx', 'proof-signals.tsx', 'why-now-section.tsx', 'market-analysis.tsx', 'dashboard/page.tsx'],
    occurrences: '8+',
    priority: 'medium',
    generateSource: () => `type BarColor = 'primary' | 'amber' | 'red' | 'green';

interface ConfidenceBarProps {
  label: string;
  value: number;
  color?: BarColor;
  className?: string;
}

const colorClasses: Record<BarColor, string> = {
  primary: 'bg-primary',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
  green: 'bg-green-400',
};

export function ConfidenceBar({ label, value, color = 'primary', className = '' }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{clamped}%</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={\`h-full rounded-full transition-all duration-500 \${colorClasses[color]}\`}
          style={{ width: \`\${clamped}%\` }}
        />
      </div>
    </div>
  );
}
`,
  },

  // 8. Metric Grid
  {
    id: 'metric-grid',
    suggestedName: 'MetricGrid',
    fileName: 'metric-grid.tsx',
    description: '3-card metrics layout (TAM/SAM/SOM, Search/Community/Spending)',
    props: [
      { name: 'items', type: 'string', description: 'Array of { label, value, detail } metric items' },
      { name: 'columns', type: 'number', default: '3', description: 'Number of grid columns' },
    ],
    usageFiles: ['proof-signals.tsx', 'market-sizing.tsx', 'spark-results.tsx'],
    occurrences: '5+',
    priority: 'medium',
    generateSource: () => `interface MetricItem {
  label: string;
  value: string;
  detail?: string;
}

interface MetricGridProps {
  items: MetricItem[];
  columns?: number;
  className?: string;
}

export function MetricGrid({ items, columns = 3, className = '' }: MetricGridProps) {
  return (
    <div
      className={\`grid gap-3 \${className}\`}
      style={{ gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\` }}
    >
      {items.map((m) => (
        <div key={m.label} className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">{m.label}</p>
          <p className="text-sm font-semibold text-foreground">{m.value}</p>
          {m.detail && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{m.detail}</p>
          )}
        </div>
      ))}
    </div>
  );
}
`,
  },

  // 9. Collapsible Detail
  {
    id: 'collapsible-detail',
    suggestedName: 'CollapsibleDetail',
    fileName: 'collapsible-detail.tsx',
    description: 'HTML <details> element with custom styling',
    props: [
      { name: 'title', type: 'string', description: 'Summary title text' },
      { name: 'badge', type: 'string', description: 'Optional severity badge text' },
      { name: 'badgeLevel', type: 'enum', options: ['high', 'medium', 'low'], description: 'Badge severity level' },
      { name: 'children', type: 'ReactNode', description: 'Expandable content' },
      { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Whether to start expanded' },
    ],
    usageFiles: ['pain-points-section.tsx', 'user-story.tsx', 'tech-stack-section.tsx'],
    occurrences: '3+',
    priority: 'medium',
    generateSource: () => `import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type BadgeLevel = 'high' | 'medium' | 'low';

interface CollapsibleDetailProps {
  title: string;
  badge?: string;
  badgeLevel?: BadgeLevel;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const badgeStyles: Record<BadgeLevel, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export function CollapsibleDetail({
  title,
  badge,
  badgeLevel = 'medium',
  children,
  defaultOpen = false,
  className = '',
}: CollapsibleDetailProps) {
  return (
    <details
      className={\`rounded-lg bg-card border border-border overflow-hidden group \${className}\`}
      open={defaultOpen || undefined}
    >
      <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="flex-1 text-sm font-medium text-foreground">{title}</div>
        {badge && (
          <span
            className={\`px-2 py-0.5 text-xs font-medium rounded-full border \${badgeStyles[badgeLevel]}\`}
          >
            {badge}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 border-t border-border/50">
        <div className="mt-3">{children}</div>
      </div>
    </details>
  );
}
`,
  },

  // 10. Blockquote
  {
    id: 'blockquote',
    suggestedName: 'Blockquote',
    fileName: 'blockquote.tsx',
    description: 'Quoted text with left border or icon',
    props: [
      { name: 'children', type: 'ReactNode', description: 'Quote text content' },
      { name: 'variant', type: 'enum', options: ['border', 'icon'], default: "'border'", description: 'Visual style variant' },
    ],
    usageFiles: ['pain-points-section.tsx', 'user-story.tsx', 'social-proof-section.tsx'],
    occurrences: '3+',
    priority: 'low',
    generateSource: () => `import type { ReactNode } from 'react';
import { Quote } from 'lucide-react';

type BlockquoteVariant = 'border' | 'icon';

interface BlockquoteProps {
  children: ReactNode;
  variant?: BlockquoteVariant;
  className?: string;
}

export function Blockquote({ children, variant = 'border', className = '' }: BlockquoteProps) {
  if (variant === 'icon') {
    return (
      <div className={\`p-4 rounded-xl bg-primary/5 border border-primary/10 \${className}\`}>
        <div className="flex items-start gap-2">
          <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground italic leading-relaxed">{children}</p>
        </div>
      </div>
    );
  }

  return (
    <blockquote
      className={\`italic text-sm text-muted-foreground border-l-2 border-amber-500 pl-4 leading-relaxed \${className}\`}
    >
      {children}
    </blockquote>
  );
}
`,
  },

  // 11. Alert
  {
    id: 'alert',
    suggestedName: 'Alert',
    fileName: 'alert.tsx',
    description: 'Icon + title + message in a colored box',
    props: [
      { name: 'title', type: 'string', description: 'Alert title' },
      { name: 'message', type: 'string', description: 'Alert message body' },
      { name: 'variant', type: 'enum', options: ['primary', 'info', 'error', 'warning'], default: "'primary'", description: 'Color variant' },
      { name: 'icon', type: 'icon', description: 'Override icon' },
    ],
    usageFiles: ['score-cards.tsx', 'user-story.tsx', 'tech-stack-section.tsx', 'dashboard/page.tsx'],
    occurrences: '5+',
    priority: 'medium',
    generateSource: () => `import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

type AlertVariant = 'primary' | 'info' | 'error' | 'warning';

interface AlertProps {
  title: string;
  message: string;
  variant?: AlertVariant;
  icon?: LucideIcon;
  className?: string;
}

const variantConfig: Record<AlertVariant, { bg: string; border: string; titleColor: string; defaultIcon: LucideIcon }> = {
  primary: { bg: 'bg-primary/10',    border: 'border-primary/20',    titleColor: 'text-primary',    defaultIcon: AlertTriangle },
  info:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   titleColor: 'text-blue-400',   defaultIcon: Info },
  error:   { bg: 'bg-red-500/10',    border: 'border-red-500/20',    titleColor: 'text-red-400',    defaultIcon: XCircle },
  warning: { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  titleColor: 'text-amber-400',  defaultIcon: AlertTriangle },
};

export function Alert({ title, message, variant = 'primary', icon, className = '' }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = icon ?? config.defaultIcon;
  return (
    <div className={\`flex items-start gap-2 p-4 rounded-xl \${config.bg} border \${config.border} \${className}\`}>
      <Icon className={\`w-4 h-4 \${config.titleColor} mt-0.5 shrink-0\`} />
      <div>
        <p className={\`text-xs \${config.titleColor} font-medium\`}>{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
      </div>
    </div>
  );
}
`,
  },

  // 12. Pill Badge
  {
    id: 'pill-badge',
    suggestedName: 'PillBadge',
    fileName: 'pill-badge.tsx',
    description: 'Rounded pill with translucent background for keywords/tags',
    props: [
      { name: 'label', type: 'string', description: 'Badge label text' },
      { name: 'color', type: 'string', default: "'primary'", description: 'Color token name' },
    ],
    usageFiles: ['spark-results.tsx', 'market-sizing.tsx', 'proof-signals.tsx', 'market-analysis.tsx'],
    occurrences: '15+',
    priority: 'medium',
    generateSource: () => `interface PillBadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export function PillBadge({ label, color = 'primary', className = '' }: PillBadgeProps) {
  return (
    <span
      className={\`px-3 py-1.5 text-xs rounded-full bg-\${color}/10 text-\${color} border border-\${color}/20 \${className}\`}
    >
      {label}
    </span>
  );
}
`,
  },

  // 13. Dual Column
  {
    id: 'dual-column',
    suggestedName: 'DualColumn',
    fileName: 'dual-column.tsx',
    description: 'Two-column grid for Before/After, Strengths/Weaknesses',
    props: [
      { name: 'left', type: 'ReactNode', description: 'Left column content' },
      { name: 'right', type: 'ReactNode', description: 'Right column content' },
      { name: 'leftLabel', type: 'string', description: 'Left column header label' },
      { name: 'rightLabel', type: 'string', description: 'Right column header label' },
      { name: 'leftColor', type: 'string', default: "'red-400'", description: 'Left label color' },
      { name: 'rightColor', type: 'string', default: "'primary'", description: 'Right label color' },
    ],
    usageFiles: ['user-story.tsx', 'pain-points-section.tsx', 'competitors-section.tsx'],
    occurrences: '5+',
    priority: 'low',
    generateSource: () => `import type { ReactNode } from 'react';

interface DualColumnProps {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  className?: string;
}

export function DualColumn({
  left,
  right,
  leftLabel,
  rightLabel,
  leftColor = 'red-400',
  rightColor = 'primary',
  className = '',
}: DualColumnProps) {
  return (
    <div className={\`grid grid-cols-1 sm:grid-cols-2 gap-4 \${className}\`}>
      <div>
        {leftLabel && (
          <p className={\`text-xs font-bold uppercase tracking-widest text-\${leftColor} mb-2\`}>
            {leftLabel}
          </p>
        )}
        {left}
      </div>
      <div>
        {rightLabel && (
          <p className={\`text-xs font-bold uppercase tracking-widest text-\${rightColor} mb-2\`}>
            {rightLabel}
          </p>
        )}
        {right}
      </div>
    </div>
  );
}
`,
  },

  // 14. Labeled Field
  {
    id: 'labeled-field',
    suggestedName: 'LabeledField',
    fileName: 'labeled-field.tsx',
    description: 'Vertical label + icon + body text',
    props: [
      { name: 'icon', type: 'icon', description: 'Lucide icon component' },
      { name: 'label', type: 'string', description: 'Field label text' },
      { name: 'children', type: 'ReactNode', description: 'Field content' },
    ],
    usageFiles: ['business-fit.tsx', 'proof-signals.tsx', 'competitors-section.tsx'],
    occurrences: '12+',
    priority: 'medium',
    generateSource: () => `import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface LabeledFieldProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}

export function LabeledField({ icon: Icon, label, children, className = '' }: LabeledFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-foreground">{label}</p>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
`,
  },

  // 15. Divider
  {
    id: 'divider',
    suggestedName: 'Divider',
    fileName: 'divider.tsx',
    description: 'Horizontal rule implemented 3 different ways',
    props: [
      { name: 'variant', type: 'enum', options: ['line', 'spaced', 'border-t'], default: "'line'", description: 'Visual variant' },
    ],
    usageFiles: ['(virtually every component file)'],
    occurrences: '20+',
    priority: 'low',
    generateSource: () => `type DividerVariant = 'line' | 'spaced' | 'border-t';

interface DividerProps {
  variant?: DividerVariant;
  className?: string;
}

export function Divider({ variant = 'line', className = '' }: DividerProps) {
  if (variant === 'spaced') {
    return <div className={\`h-px bg-border my-4 \${className}\`} />;
  }
  if (variant === 'border-t') {
    return <div className={\`border-t border-border pt-3 \${className}\`} />;
  }
  return <div className={\`h-px bg-border \${className}\`} />;
}
`,
  },

  // 16. Highlighted Stat
  {
    id: 'highlighted-stat',
    suggestedName: 'HighlightedStat',
    fileName: 'highlighted-stat.tsx',
    description: 'Bold inline stat within paragraph text',
    props: [
      { name: 'children', type: 'ReactNode', description: 'Stat text content' },
    ],
    usageFiles: ['market-analysis.tsx'],
    occurrences: '5+',
    priority: 'low',
    generateSource: () => `import type { ReactNode } from 'react';

interface HighlightedStatProps {
  children: ReactNode;
  className?: string;
}

export function HighlightedStat({ children, className = '' }: HighlightedStatProps) {
  return (
    <span className={\`font-semibold text-foreground \${className}\`}>
      {children}
    </span>
  );
}
`,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getPatternById(id: string): PatternDefinition | undefined {
  return PATTERNS.find((p) => p.id === id);
}

export function getPatternIds(): string[] {
  return PATTERNS.map((p) => p.id);
}
