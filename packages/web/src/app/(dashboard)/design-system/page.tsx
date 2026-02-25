'use client';

import { useState } from 'react';
import {
  Flame,
  Search,
  Plus,
  Trash2,
  Download,
  ArrowRight,
  Star,
  Zap,
  TrendingUp,
  Globe,
  Shield,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  Check,
  Clock,
  Quote,
  Users,
  DollarSign,
  Target,
  X,
  CircleDot,
} from 'lucide-react';

// Primitives
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

// Data Display
import { SparklineCard } from '../projects/[id]/components/ui/sparkline-card';
import { ThreatBar } from '../projects/[id]/components/ui/threat-bar';
import { ProseBlock } from '../projects/[id]/components/ui/prose-block';
import { SectionHeader } from '../projects/[id]/components/ui/section-header';
import { CollapsibleSection } from '../projects/[id]/components/collapsible-section';

// Token Editor + Pattern Extractor (dev-only)
import { TokenEditor } from './components/token-editor';
import { PatternExtractor } from './components/pattern-extractor';
import { PATTERNS } from './lib/pattern-registry';

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

function CatalogSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-3 h-px bg-border" />
      </div>
      {children}
    </section>
  );
}

function Showcase({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-8 ${className}`}>
      <h3 className="font-mono text-xs font-light uppercase tracking-[1px] text-primary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
      )}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        {children}
      </div>
    </div>
  );
}

function ColorSwatch({
  name,
  variable,
  className,
}: {
  name: string;
  variable: string;
  className: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(variable);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <div
        className={`h-14 w-14 rounded-xl border border-border shadow-sm transition-transform group-hover:scale-110 ${className}`}
      />
      <div>
        <div className="text-xs font-medium text-foreground">{name}</div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {copied ? (
            <span className="text-primary">Copied!</span>
          ) : (
            variable
          )}
        </div>
      </div>
    </button>
  );
}

/** File reference chip used in the Inline Patterns tab */
function FileRef({ path }: { path: string }) {
  return (
    <code className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
      {path}
    </code>
  );
}

/** Occurrence count + priority tag for inline patterns */
function PatternMeta({
  count,
  priority,
  files,
  suggestedName,
}: {
  count: string;
  priority: 'high' | 'medium' | 'low';
  files: string[];
  suggestedName: string;
}) {
  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };
  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${priorityColors[priority]}`}
        >
          {priority} priority
        </span>
        <span className="text-[10px] text-muted-foreground">{count} occurrences</span>
        <span className="text-[10px] text-muted-foreground">|</span>
        <span className="text-[10px] font-mono text-primary">&lt;{suggestedName} /&gt;</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {files.map((f) => (
          <FileRef key={f} path={f} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOC configs per tab
// ---------------------------------------------------------------------------

const COMPONENTS_TOC = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing & Radii' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'badges', label: 'Badges' },
  { id: 'cards', label: 'Cards' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'modals', label: 'Modals' },
  { id: 'spinners', label: 'Spinners' },
  { id: 'empty-states', label: 'Empty States' },
  { id: 'sparkline-cards', label: 'Sparkline Cards' },
  { id: 'threat-bars', label: 'Threat Bars' },
  { id: 'prose-blocks', label: 'Prose Blocks' },
  { id: 'section-headers', label: 'Section Headers' },
  { id: 'glass-cards', label: 'Glass Cards' },
  { id: 'tags', label: 'Tags' },
  { id: 'progress-bars', label: 'Progress Bars' },
  { id: 'icon-circles', label: 'Icon Circles' },
  { id: 'score-cards', label: 'Score Cards' },
  { id: 'dots', label: 'Dots' },
  { id: 'animations', label: 'Animations' },
];

const PATTERNS_TOC = [
  { id: 'p-inline-card', label: 'Inline Cards' },
  { id: 'p-icon-badge', label: 'Icon Badges' },
  { id: 'p-severity-badge', label: 'Severity Badges' },
  { id: 'p-icon-text-row', label: 'Icon + Text Rows' },
  { id: 'p-icon-list', label: 'Icon Bullet Lists' },
  { id: 'p-section-title', label: 'Section Titles' },
  { id: 'p-confidence-bar', label: 'Confidence Bars' },
  { id: 'p-metric-grid', label: 'Metric Grids' },
  { id: 'p-collapsible', label: 'Collapsible Details' },
  { id: 'p-blockquote', label: 'Blockquotes' },
  { id: 'p-alert', label: 'Alert Banners' },
  { id: 'p-pill-badge', label: 'Pill Badges' },
  { id: 'p-dual-column', label: 'Dual Columns' },
  { id: 'p-labeled-field', label: 'Labeled Fields' },
  { id: 'p-divider', label: 'Dividers' },
  { id: 'p-stat-highlight', label: 'Stat Highlights' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<'components' | 'patterns' | 'tokens'>('components');
  const isDev = process.env.NODE_ENV === 'development';
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  const toc =
    activeTab === 'components'
      ? COMPONENTS_TOC
      : activeTab === 'patterns'
        ? PATTERNS_TOC
        : []; // Tokens tab has its own built-in navigation

  return (
    <div className="flex gap-8 max-w-[1400px] mx-auto">
      {/* Sticky TOC */}
      <nav className="hidden xl:block w-48 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">
          On this page
        </div>
        <ul className="space-y-1">
          {toc.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0 pb-24">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-foreground">
            Design System
          </h1>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            The official component catalog for Idea Fuel. Every visual building
            block used across the application, organized by type. Modify
            components here and they reflect everywhere.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-12 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'components'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Components
            {activeTab === 'components' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'patterns'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inline Patterns
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              needs extraction
            </span>
            {activeTab === 'patterns' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          {isDev && (
            <button
              type="button"
              onClick={() => setActiveTab('tokens')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === 'tokens'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tokens
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary border border-primary/20">
                dev
              </span>
              {activeTab === 'tokens' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          )}
        </div>

        {/* ================================================================ */}
        {/* TAB: COMPONENTS                                                  */}
        {/* ================================================================ */}

        {activeTab === 'components' && (
          <div className="space-y-16">
            {/* COLORS */}
            <CatalogSection
              id="colors"
              title="Colors"
              description="HSL-based design tokens defined in globals.css. Click a swatch to copy the CSS variable."
            >
              <Showcase title="Core Palette">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-6">
                  <ColorSwatch name="Background" variable="--background" className="bg-background" />
                  <ColorSwatch name="Foreground" variable="--foreground" className="bg-foreground" />
                  <ColorSwatch name="Card" variable="--card" className="bg-card" />
                  <ColorSwatch name="Muted" variable="--muted" className="bg-muted" />
                  <ColorSwatch name="Muted FG" variable="--muted-foreground" className="bg-muted-foreground" />
                  <ColorSwatch name="Border" variable="--border" className="bg-border" />
                  <ColorSwatch name="Input" variable="--input" className="bg-input" />
                  <ColorSwatch name="Ring" variable="--ring" className="bg-ring" />
                </div>
              </Showcase>
              <Showcase title="Brand & Accent">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-6">
                  <ColorSwatch name="Primary" variable="--primary" className="bg-primary" />
                  <ColorSwatch name="Primary FG" variable="--primary-foreground" className="bg-primary-foreground" />
                  <ColorSwatch name="Secondary" variable="--secondary" className="bg-secondary" />
                  <ColorSwatch name="Accent" variable="--accent" className="bg-accent" />
                </div>
              </Showcase>
              <Showcase title="Status Colors">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-6">
                  <ColorSwatch name="Destructive" variable="--destructive" className="bg-destructive" />
                  <ColorSwatch name="Success" variable="--success" className="bg-success" />
                  <ColorSwatch name="Warning" variable="--warning" className="bg-warning" />
                  <ColorSwatch name="Info" variable="--info" className="bg-info" />
                </div>
              </Showcase>
              <Showcase title="Score Colors">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-6">
                  <ColorSwatch name="Opportunity" variable="--score-opportunity" className="bg-score-opportunity" />
                  <ColorSwatch name="Problem" variable="--score-problem" className="bg-score-problem" />
                  <ColorSwatch name="Feasibility" variable="--score-feasibility" className="bg-score-feasibility" />
                  <ColorSwatch name="Why Now" variable="--score-whynow" className="bg-score-whynow" />
                </div>
              </Showcase>
              <Showcase title="Chart Colors">
                <div className="grid grid-cols-5 gap-6">
                  <ColorSwatch name="Chart 1" variable="--chart-1" className="bg-chart-1" />
                  <ColorSwatch name="Chart 2" variable="--chart-2" className="bg-chart-2" />
                  <ColorSwatch name="Chart 3" variable="--chart-3" className="bg-chart-3" />
                  <ColorSwatch name="Chart 4" variable="--chart-4" className="bg-chart-4" />
                  <ColorSwatch name="Chart 5" variable="--chart-5" className="bg-chart-5" />
                </div>
              </Showcase>
              <Showcase title="Gradient">
                <div className="flex flex-col gap-4">
                  <div className="h-12 rounded-xl" style={{ background: 'var(--gradient-accent)' }} />
                  <div className="flex gap-2 items-center">
                    <code className="text-xs font-mono text-muted-foreground">var(--gradient-accent)</code>
                    <span className="text-xs text-muted-foreground">or</span>
                    <code className="text-xs font-mono text-muted-foreground">.text-gradient</code>
                  </div>
                  <p className="text-gradient font-display text-3xl font-extrabold">Gradient Text Sample</p>
                </div>
              </Showcase>
            </CatalogSection>

            {/* TYPOGRAPHY */}
            <CatalogSection
              id="typography"
              title="Typography"
              description="Three font families loaded via next/font: --font-sans (body), --font-mono (labels/code), --font-display (headings)."
            >
              <Showcase title="Font Families">
                <div className="space-y-6">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-[1px] text-muted-foreground mb-1">font-sans (default)</div>
                    <p className="text-2xl">The quick brown fox jumps over the lazy dog.</p>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-[1px] text-muted-foreground mb-1">font-mono</div>
                    <p className="text-2xl font-mono">The quick brown fox jumps over the lazy dog.</p>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-[1px] text-muted-foreground mb-1">font-display</div>
                    <p className="text-2xl font-display font-extrabold uppercase">The quick brown fox jumps over the lazy dog.</p>
                  </div>
                </div>
              </Showcase>
              <Showcase title="Type Scale">
                <div className="space-y-4">
                  {[
                    { cls: 'text-4xl font-display font-extrabold uppercase', label: 'Display / 4xl' },
                    { cls: 'text-3xl font-bold', label: 'Heading / 3xl' },
                    { cls: 'text-2xl font-semibold', label: 'Heading / 2xl' },
                    { cls: 'text-xl font-semibold', label: 'Heading / xl' },
                    { cls: 'text-lg font-semibold', label: 'Heading / lg' },
                    { cls: 'text-base', label: 'Body / base' },
                    { cls: 'text-sm', label: 'Body / sm' },
                    { cls: 'text-xs', label: 'Caption / xs' },
                    { cls: 'text-[11px]', label: 'Micro / 11px' },
                    { cls: 'text-[10px] uppercase tracking-widest', label: 'Overline / 10px' },
                  ].map((t) => (
                    <div key={t.label} className="flex items-baseline gap-4">
                      <code className="text-[10px] font-mono text-muted-foreground w-36 shrink-0">{t.label}</code>
                      <span className={`text-foreground ${t.cls}`}>Idea Fuel</span>
                    </div>
                  ))}
                </div>
              </Showcase>
              <Showcase title="Common Text Patterns">
                <div className="space-y-6">
                  <div>
                    <div className="font-display text-lg font-extrabold uppercase text-foreground mb-2">Section Title</div>
                    <code className="text-[10px] font-mono text-muted-foreground">font-display text-lg font-extrabold uppercase</code>
                  </div>
                  <div>
                    <div className="font-mono text-xs font-light uppercase tracking-[1px] text-foreground mb-2">Subsection Label</div>
                    <code className="text-[10px] font-mono text-muted-foreground">font-mono text-xs font-light uppercase tracking-[1px]</code>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-normal uppercase tracking-[1px] text-primary mb-2">Prose Block Label</div>
                    <code className="text-[10px] font-mono text-muted-foreground">font-mono text-sm font-normal uppercase tracking-[1px] text-primary</code>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-2">Metric Label</div>
                    <code className="text-[10px] font-mono text-muted-foreground">text-xs font-bold uppercase tracking-widest</code>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* SPACING */}
            <CatalogSection id="spacing" title="Spacing & Radii" description="Border radii tokens based on --radius: 0.625rem (10px).">
              <Showcase title="Border Radius Scale">
                <div className="flex flex-wrap gap-6 items-end">
                  {[
                    { label: 'sm', cls: 'rounded-sm', desc: '6px' },
                    { label: 'md', cls: 'rounded-md', desc: '8px' },
                    { label: 'lg', cls: 'rounded-lg', desc: '10px' },
                    { label: 'xl', cls: 'rounded-xl', desc: '14px' },
                    { label: '2xl', cls: 'rounded-2xl', desc: '18px' },
                    { label: 'full', cls: 'rounded-full', desc: '9999px' },
                  ].map((r) => (
                    <div key={r.label} className="flex flex-col items-center gap-2">
                      <div className={`w-16 h-16 bg-primary/20 border border-primary/40 ${r.cls}`} />
                      <div className="text-xs font-mono text-foreground">{r.label}</div>
                      <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </Showcase>
              <Showcase title="Common Spacing">
                <div className="space-y-4">
                  {[
                    { label: 'Card Padding', value: 'p-4 or p-6 (16px / 24px)' },
                    { label: 'Card Gap', value: 'gap-2 to gap-8 (responsive)' },
                    { label: 'Section Margin', value: 'mb-5 to mb-6 (20-24px between sections)' },
                    { label: 'Label Spacing', value: 'mb-1 to mb-2 (4-8px below labels)' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-foreground w-40 shrink-0">{s.label}</span>
                      <code className="text-xs font-mono text-muted-foreground">{s.value}</code>
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* BUTTONS */}
            <CatalogSection id="buttons" title="Buttons" description="Seven variants and three sizes. Import from @/components/ui/button.">
              <Showcase title="Variants">
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="accent">Accent</Button>
                  <Button variant="accent-outline">Accent Outline</Button>
                </div>
              </Showcase>
              <Showcase title="Sizes">
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </Showcase>
              <Showcase title="With Icons">
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="accent" size="md"><Flame className="w-4 h-4" /> Create Project</Button>
                  <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export PDF</Button>
                  <Button variant="ghost" size="sm"><Plus className="w-4 h-4" /> Add</Button>
                  <Button variant="danger" size="sm"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                </div>
              </Showcase>
              <Showcase title="States">
                <div className="flex flex-wrap gap-3 items-center">
                  <Button isLoading>Loading...</Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="accent" isLoading>Processing</Button>
                  <Button variant="outline" disabled>Unavailable</Button>
                </div>
              </Showcase>
              <Showcase title="CSS Buttons">
                <div className="flex flex-wrap gap-3 items-center">
                  <button className="btn-ideationlab"><Zap className="w-4 h-4 inline-block" /> Forge Report</button>
                  <button className="btn-save">Save Draft</button>
                </div>
              </Showcase>
            </CatalogSection>

            {/* BADGES */}
            <CatalogSection id="badges" title="Badges" description="Small inline labels. Import from @/components/ui/badge.">
              <Showcase title="Variants">
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </Showcase>
              <Showcase title="With Icons">
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge variant="success"><CheckCircle2 className="w-3 h-3 inline mr-1" /> Complete</Badge>
                  <Badge variant="warning"><AlertTriangle className="w-3 h-3 inline mr-1" /> Review</Badge>
                  <Badge variant="error"><XCircle className="w-3 h-3 inline mr-1" /> Failed</Badge>
                  <Badge variant="info"><Info className="w-3 h-3 inline mr-1" /> Pending</Badge>
                </div>
              </Showcase>
            </CatalogSection>

            {/* CARDS */}
            <CatalogSection id="cards" title="Cards" description="Composable card with header, content, and footer slots. Import from @/components/ui/card.">
              <Showcase title="Full Card">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Market Analysis</CardTitle>
                      <CardDescription>Comprehensive market sizing and competitive landscape.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">The total addressable market is estimated at $4.2B with a 14% CAGR through 2028.</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm">View Details <ArrowRight className="w-3.5 h-3.5" /></Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Competitive Landscape</CardTitle>
                      <CardDescription>Key competitors and market positioning.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {['Competitor A', 'Competitor B', 'Competitor C'].map((c) => (
                          <div key={c} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{c}</span>
                            <Badge variant="default">Active</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Showcase>
              <Showcase title="Minimal Card">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">TAM</div>
                    <div className="text-2xl font-bold">$4.2B</div>
                    <div className="text-xs text-muted-foreground mt-1">Total Addressable Market</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">Growth</div>
                    <div className="text-2xl font-bold text-primary">+14%</div>
                    <div className="text-xs text-muted-foreground mt-1">Year over year CAGR</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">Score</div>
                    <div className="text-2xl font-bold">78</div>
                    <div className="text-xs text-muted-foreground mt-1">Overall viability</div>
                  </Card>
                </div>
              </Showcase>
            </CatalogSection>

            {/* INPUTS */}
            <CatalogSection id="inputs" title="Inputs" description="Form elements with label, error, and hint support.">
              <Showcase title="Input States">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Project Name" placeholder="Enter your idea..." />
                  <Input label="Email" placeholder="you@example.com" hint="We'll never share your email." />
                  <Input label="API Key" placeholder="sk-..." error="Invalid API key format." />
                  <Input label="Search" placeholder="Search projects..." disabled />
                </div>
              </Showcase>
              <Showcase title="Textarea">
                <div className="grid md:grid-cols-2 gap-6">
                  <Textarea label="Description" placeholder="Describe your business idea..." rows={4} />
                  <Textarea label="Notes" placeholder="Additional context..." error="Description is required." rows={4} />
                </div>
              </Showcase>
            </CatalogSection>

            {/* MODALS */}
            <CatalogSection id="modals" title="Modals" description="Portal-rendered dialog with backdrop blur.">
              <Showcase title="Modal Sizes">
                <div className="flex flex-wrap gap-3">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <Button key={size} variant="outline" size="sm" onClick={() => { setModalSize(size); setModalOpen(true); }}>
                      Open {size.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </Showcase>
              <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Modal — ${modalSize.toUpperCase()}`} description="Sample modal dialog from the design system." size={modalSize}>
                <p className="text-sm text-muted-foreground mb-4">Modal content goes here. Press Escape or click backdrop to close.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button variant="accent" size="sm" onClick={() => setModalOpen(false)}>Confirm</Button>
                </div>
              </Modal>
            </CatalogSection>

            {/* SPINNERS */}
            <CatalogSection id="spinners" title="Spinners" description="Gradient SVG spinner with pulse glow.">
              <Showcase title="Spinner Sizes">
                <div className="flex items-center gap-8">
                  {(['sm', 'md', 'lg'] as const).map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                      <Spinner size={s} />
                      <span className="text-xs text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </Showcase>
              <Showcase title="Loading Dots Pattern">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                  <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </div>
              </Showcase>
            </CatalogSection>

            {/* EMPTY STATES */}
            <CatalogSection id="empty-states" title="Empty States" description="Placeholder for no-data scenarios.">
              <Showcase title="Variants">
                <div className="grid md:grid-cols-2 gap-4">
                  <EmptyState icon={<Search className="w-6 h-6" />} title="No projects yet" description="Create your first project to get started." action={<Button variant="accent" size="sm"><Plus className="w-4 h-4" /> New Project</Button>} />
                  <EmptyState icon={<Star className="w-6 h-6" />} title="No reports available" description="Complete a research phase to generate your first report." />
                </div>
              </Showcase>
            </CatalogSection>

            {/* SPARKLINE CARDS */}
            <CatalogSection id="sparkline-cards" title="Sparkline Cards" description="Compact metric card with mini chart.">
              <Showcase title="Variants">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SparklineCard label="Market Size" value="$4.2 billion" trend="+14% YoY" trendColor="green" sparkPoints={[24, 22, 18, 16, 14, 10, 8, 6]} />
                  <SparklineCard label="Growth Rate" value="8.2% to 9.3%" trend="Accelerating" trendColor="green" sparkPoints={[20, 19, 18, 16, 12, 10, 8, 5]} />
                  <SparklineCard label="Competition" value="~15 major players" trend="Increasing" trendColor="amber" sparkPoints={[10, 12, 11, 14, 16, 15, 18, 20]} />
                  <SparklineCard label="Risk Index" value="Not specified" trendColor="red" />
                </div>
              </Showcase>
            </CatalogSection>

            {/* THREAT BARS */}
            <CatalogSection id="threat-bars" title="Threat Bars" description="Color-coded 1-10 severity bar.">
              <Showcase title="Score Range">
                <div className="flex flex-wrap gap-8 items-start">
                  <ThreatBar score={2} label="Low Threat" />
                  <ThreatBar score={4} label="Moderate" />
                  <ThreatBar score={6} label="Elevated" />
                  <ThreatBar score={8} label="High Threat" />
                  <ThreatBar score={10} label="Critical" />
                </div>
              </Showcase>
            </CatalogSection>

            {/* PROSE BLOCKS */}
            <CatalogSection id="prose-blocks" title="Prose Blocks" description="Labeled text section with optional badge.">
              <Showcase title="With and Without Badge">
                <div className="space-y-2">
                  <ProseBlock label="Market Overview" badge={<Badge variant="success">Growing</Badge>}>
                    The SaaS market continues to expand rapidly, driven by digital transformation. Current estimates place the TAM at approximately $4.2 billion with a CAGR of 14%.
                  </ProseBlock>
                  <ProseBlock label="Key Insight">
                    Early-stage startups in this vertical have seen a 3x increase in seed funding over the past 18 months.
                  </ProseBlock>
                </div>
              </Showcase>
            </CatalogSection>

            {/* SECTION HEADERS */}
            <CatalogSection id="section-headers" title="Section Headers" description="Two levels: CollapsibleSection (page) and SectionHeader (subsection).">
              <Showcase title="CollapsibleSection">
                <CollapsibleSection title="Market Analysis">
                  <p className="text-sm text-muted-foreground">Content inside a CollapsibleSection.</p>
                </CollapsibleSection>
              </Showcase>
              <Showcase title="SectionHeader">
                <SectionHeader>Key Metrics</SectionHeader>
                <p className="text-sm text-muted-foreground">Content below a SectionHeader divider.</p>
              </Showcase>
            </CatalogSection>

            {/* GLASS CARDS */}
            <CatalogSection id="glass-cards" title="Glass Cards" description="CSS-only card variants defined in globals.css.">
              <Showcase title="Variants">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass-card">
                    <div className="text-sm font-medium text-foreground mb-1">.glass-card</div>
                    <p className="text-xs text-muted-foreground">Default card with hover state.</p>
                  </div>
                  <div className="glass-card-selected">
                    <div className="text-sm font-medium text-foreground mb-1">.glass-card-selected</div>
                    <p className="text-xs text-muted-foreground">Active/selected with primary border glow.</p>
                  </div>
                  <div className="glass-card-interactive">
                    <div className="text-sm font-medium text-foreground mb-1">.glass-card-interactive</div>
                    <p className="text-xs text-muted-foreground">Clickable card with hover background.</p>
                  </div>
                  <div className="section-card">
                    <div className="text-sm font-medium text-foreground mb-1">.section-card</div>
                    <p className="text-xs text-muted-foreground">Compact section wrapper.</p>
                  </div>
                </div>
              </Showcase>
              <Showcase title="Prompt Card & Score Cards">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="prompt-card">
                    <div className="prompt-title">How big is this market?</div>
                    <div className="prompt-description">Estimate market size, growth rate, and key segments.</div>
                  </div>
                  <div className="prompt-card">
                    <div className="prompt-title">Who are the competitors?</div>
                    <div className="prompt-description">Identify major players and positioning.</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="score-card">
                    <div className="score-header"><TrendingUp className="w-3 h-3" /> Opportunity</div>
                    <div className="score-value">82</div>
                    <div className="score-label">Strong market opportunity</div>
                    <div className="score-underline score-underline-green" />
                  </div>
                  <div className="score-card-highlight">
                    <div className="score-header"><Zap className="w-3 h-3" /> Why Now</div>
                    <div className="score-value">91</div>
                    <div className="score-label">Perfect timing</div>
                    <div className="score-underline score-underline-purple" />
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* TAGS */}
            <CatalogSection id="tags" title="Tags" description="CSS tag classes for project status and metadata.">
              <Showcase title="All Tag Types">
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="tag-category"><Globe className="w-3 h-3" /> SaaS</span>
                  <span className="tag-ready"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                  <span className="tag-outdated"><AlertTriangle className="w-3 h-3" /> Outdated</span>
                  <span className="tag-draft"><ChevronDown className="w-3 h-3" /> Draft</span>
                  <span className="tag-forging"><Flame className="w-3 h-3" /> Forging</span>
                  <span className="tag-complete"><CheckCircle2 className="w-3 h-3" /> Complete</span>
                </div>
              </Showcase>
              <Showcase title="Report Pill">
                <div className="flex flex-wrap gap-3">
                  <span className="pill-report"><Star className="w-3 h-3" /> Business Plan</span>
                  <span className="pill-report"><Shield className="w-3 h-3" /> Competitive Analysis</span>
                  <span className="pill-report"><Lightbulb className="w-3 h-3" /> Positioning</span>
                </div>
              </Showcase>
            </CatalogSection>

            {/* PROGRESS BARS */}
            <CatalogSection id="progress-bars" title="Progress Bars" description="CSS progress track with colored fill variants.">
              <Showcase title="Color Variants">
                <div className="space-y-4 max-w-md">
                  {[
                    { label: 'Primary', cls: 'progress-fill-pink', pct: 75 },
                    { label: 'Accent', cls: 'progress-fill-cyan', pct: 60 },
                    { label: 'Success', cls: 'progress-fill-green', pct: 90 },
                    { label: 'Secondary', cls: 'progress-fill-purple', pct: 45 },
                  ].map((p) => (
                    <div key={p.cls}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{p.label}</span>
                        <span className="text-muted-foreground">{p.pct}%</span>
                      </div>
                      <div className="progress-track">
                        <div className={p.cls} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* ICON CIRCLES */}
            <CatalogSection id="icon-circles" title="Icon Circles" description="Colored circular icon containers.">
              <Showcase title="Solid Variants">
                <div className="flex flex-wrap gap-4 items-center">
                  {[
                    { cls: 'icon-circle-pink', label: 'pink', icon: <Flame className="w-5 h-5" /> },
                    { cls: 'icon-circle-purple', label: 'purple', icon: <Shield className="w-5 h-5" /> },
                    { cls: 'icon-circle-yellow', label: 'yellow', icon: <Star className="w-5 h-5" /> },
                    { cls: 'icon-circle-orange', label: 'orange', icon: <Zap className="w-5 h-5" /> },
                  ].map((ic) => (
                    <div key={ic.cls} className="flex flex-col items-center gap-2">
                      <div className={`icon-circle ${ic.cls}`}>{ic.icon}</div>
                      <span className="text-[10px] text-muted-foreground">{ic.label}</span>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-2">
                    <div className="icon-circle-outline"><TrendingUp className="w-5 h-5" /></div>
                    <span className="text-[10px] text-muted-foreground">outline</span>
                  </div>
                </div>
              </Showcase>
              <Showcase title="Number Circles">
                <div className="flex flex-wrap gap-4 items-center">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <div className={`number-circle number-circle-${n}`}>{n}</div>
                      <span className="text-xs text-muted-foreground">.number-circle-{n}</span>
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* SCORE CARDS CSS */}
            <CatalogSection id="score-cards" title="Score Cards" description="Score display variants from globals.css.">
              <Showcase title="Underline Colors">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['green', 'red', 'teal', 'purple'].map((c) => (
                    <div key={c} className="score-card">
                      <div className="score-value">82</div>
                      <div className="score-label">.score-underline-{c}</div>
                      <div className={`score-underline score-underline-${c}`} />
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* DOTS */}
            <CatalogSection id="dots" title="Dots" description="Small colored indicator dots.">
              <Showcase title="Color Variants">
                <div className="flex flex-wrap gap-6 items-center">
                  {[
                    { cls: 'dot-pink', label: 'Pink (primary)' },
                    { cls: 'dot-cyan', label: 'Cyan (accent)' },
                    { cls: 'dot-purple', label: 'Purple (secondary)' },
                    { cls: 'dot-blue', label: 'Blue (info)' },
                  ].map((d) => (
                    <div key={d.cls} className="flex items-center gap-2">
                      <div className={`dot ${d.cls}`} />
                      <span className="text-xs text-muted-foreground">{d.label}</span>
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* ANIMATIONS */}
            <CatalogSection id="animations" title="Animations" description="Reusable animation classes from globals.css.">
              <Showcase title="Fade In Up">
                <div className="flex gap-4 items-start">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`animate-fade-in-up stagger-${n} w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary`}>{n}</div>
                  ))}
                </div>
              </Showcase>
              <Showcase title="Shimmer">
                <div className="shimmer h-12 rounded-xl w-full max-w-sm" />
              </Showcase>
              <Showcase title="Text Gradients">
                <div className="space-y-4">
                  <p className="text-gradient font-display text-3xl font-extrabold">Idea Fuel</p>
                  <p className="text-gradient-brand font-display text-3xl font-extrabold">Idea Fuel</p>
                </div>
              </Showcase>
              <Showcase title="Typewriter & Bounce">
                <div className="space-y-4">
                  <div className="text-lg font-medium text-foreground">Analyzing your market<span className="typewriter-cursor">|</span></div>
                  <ChevronDown className="w-6 h-6 text-primary animate-bounce-arrow" />
                </div>
              </Showcase>
              <Showcase title="Transitions">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex gap-4"><code className="font-mono w-48">--transition-fast</code><span>150ms</span></div>
                  <div className="flex gap-4"><code className="font-mono w-48">--transition-smooth</code><span>200ms</span></div>
                  <div className="flex gap-4"><code className="font-mono w-48">--transition-spring</code><span>300ms (bouncy)</span></div>
                </div>
              </Showcase>
            </CatalogSection>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: INLINE PATTERNS                                             */}
        {/* ================================================================ */}

        {activeTab === 'patterns' && (
          <div className="space-y-16">
            {/* Intro */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">These patterns are NOT components yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each pattern below is repeated inline across multiple files. Extracting them into shared
                    components would reduce duplication and ensure visual consistency. The live examples show
                    exactly what the pattern looks like, with file references showing where each one is used.
                  </p>
                </div>
              </div>
            </div>

            {/* Extract All (dev-only) */}
            {isDev && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">
                  Component Extraction (Dev Mode)
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Click any pattern&apos;s extract button below to generate a component file in <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">components/ui/</code>.
                </p>
                <div className="space-y-2">
                  {PATTERNS.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1">
                      <span className="text-xs text-foreground font-medium">{p.suggestedName}</span>
                      <PatternExtractor
                        patternId={p.id}
                        suggestedName={p.suggestedName}
                        fileName={p.fileName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* INLINE CARDS */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-inline-card"
              title="Inline Cards"
              description="Raw div with p-4 rounded-xl bg-card border border-border — used 35+ times instead of the Card component."
            >
              <PatternMeta
                count="35+"
                priority="high"
                suggestedName="Card"
                files={['business-fit.tsx', 'competitors-section.tsx', 'market-analysis.tsx', 'pain-points-section.tsx', 'proof-signals.tsx', 'spark-results.tsx', 'tech-stack-section.tsx', 'why-now-section.tsx', 'user-story.tsx', 'market-sizing.tsx', 'social-proof-section.tsx', 'dashboard/page.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">Revenue Model</div>
                    <p className="text-sm text-muted-foreground">Subscription-based SaaS with tiered pricing.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">Go-to-Market</div>
                    <p className="text-sm text-muted-foreground">Product-led growth with freemium conversion.</p>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* ICON BADGE */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-icon-badge"
              title="Icon Badges"
              description="Circular icon container with translucent background — 15+ inline occurrences."
            >
              <PatternMeta
                count="15+"
                priority="high"
                suggestedName="IconBadge"
                files={['business-fit.tsx', 'spark-results.tsx', 'business-plan-section.tsx', 'market-sizing.tsx', 'tech-stack-section.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/15">
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">w-8 h-8 variant</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">w-10 h-10 variant</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-500/20">
                      <Globe className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-sm text-foreground">w-6 h-6 (platform icon)</span>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* SEVERITY BADGE */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-severity-badge"
              title="Severity Badges"
              description="Color-coded rating pill for High/Medium/Low — 20+ occurrences with duplicated color maps."
            >
              <PatternMeta
                count="20+"
                priority="high"
                suggestedName="SeverityBadge"
                files={['business-fit.tsx', 'pain-points-section.tsx', 'proof-signals.tsx', 'market-analysis.tsx', 'spark-results.tsx', 'why-now-section.tsx', 'market-sizing.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-red-500/10 text-red-500 border-red-500/20">High</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">Medium</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-500/10 text-blue-500 border-blue-500/20">Low</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-primary/20 text-primary border-primary/30">Proceed</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">Watchlist</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-red-500/10 text-red-500 border-red-500/20">Drop</span>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* ICON + TEXT ROW */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-icon-text-row"
              title="Icon + Text Rows"
              description="Flex row with small icon and text — 30+ occurrences, the most repeated pattern."
            >
              <PatternMeta
                count="30+"
                priority="high"
                suggestedName="IconTextRow"
                files={['competitors-section.tsx', 'market-analysis.tsx', 'proof-signals.tsx', 'spark-results.tsx', 'pain-points-section.tsx', 'why-now-section.tsx', 'market-sizing.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span className="text-xs text-muted-foreground">example.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span className="text-xs text-muted-foreground">500-1000 employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span className="text-xs text-muted-foreground">$10M-$50M revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-xs text-muted-foreground">Updated 2 hours ago</span>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* ICON BULLET LIST */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-icon-list"
              title="Icon Bullet Lists"
              description="List items with icon bullets — 25+ occurrences with 6 different icon variants."
            >
              <PatternMeta
                count="25+"
                priority="high"
                suggestedName="IconList"
                files={['business-fit.tsx', 'market-analysis.tsx', 'pain-points-section.tsx', 'proof-signals.tsx', 'why-now-section.tsx', 'user-story.tsx', 'spark-results.tsx']}
              />
              <Showcase title="Live Example (all icon variants)">
                <div className="grid md:grid-cols-2 gap-6">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>Strength item (check icon)</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                      <span>Weakness item (X icon)</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/60" />
                      <span>Action item (arrow icon)</span>
                    </li>
                  </ul>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CircleDot className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>Neutral bullet item</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                      <span>Warning item</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Star className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                      <span>Feature/highlight item</span>
                    </li>
                  </ul>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* SECTION TITLE WITH ICON */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-section-title"
              title="Section Titles with Icon"
              description="Icon + uppercase label combo used to introduce sub-sections — 15+ occurrences."
            >
              <PatternMeta
                count="15+"
                priority="medium"
                suggestedName="SectionTitle"
                files={['market-analysis.tsx', 'proof-signals.tsx', 'why-now-section.tsx', 'spark-results.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium uppercase text-primary">Opportunities</p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-sm font-medium uppercase text-red-400">Threats</p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium uppercase text-primary">Market Triggers</p>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* CONFIDENCE BAR */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-confidence-bar"
              title="Confidence Bars"
              description="Horizontal progress bar with percentage — 8+ occurrences with duplicated color logic."
            >
              <PatternMeta
                count="8+"
                priority="medium"
                suggestedName="ConfidenceBar"
                files={['business-fit.tsx', 'proof-signals.tsx', 'why-now-section.tsx', 'market-analysis.tsx', 'dashboard/page.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="space-y-4 max-w-sm">
                  {[
                    { label: 'High', pct: 85, color: 'bg-primary' },
                    { label: 'Medium', pct: 60, color: 'bg-amber-400' },
                    { label: 'Low', pct: 30, color: 'bg-red-400' },
                  ].map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{b.label} confidence</span>
                        <span className="text-muted-foreground tabular-nums">{b.pct}%</span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${b.color}`} style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* METRIC GRID */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-metric-grid"
              title="Metric Grids"
              description="3-card metrics layout (TAM/SAM/SOM, Search/Community/Spending) — 5+ occurrences."
            >
              <PatternMeta
                count="5+"
                priority="medium"
                suggestedName="MetricGrid"
                files={['proof-signals.tsx', 'market-sizing.tsx', 'spark-results.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Search Volume', value: 'High', detail: '12K monthly searches' },
                    { label: 'Community', value: 'Active', detail: '3 major subreddits' },
                    { label: 'Spending', value: '$2K-5K', detail: 'Average annual spend' },
                  ].map((m) => (
                    <div key={m.label} className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-1">{m.label}</p>
                      <p className="text-sm font-semibold text-foreground">{m.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.detail}</p>
                    </div>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* COLLAPSIBLE DETAILS */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-collapsible"
              title="Collapsible Details"
              description="HTML <details> element with custom styling — used in pain-points, user-story."
            >
              <PatternMeta
                count="3+"
                priority="medium"
                suggestedName="CollapsibleDetails"
                files={['pain-points-section.tsx', 'user-story.tsx', 'tech-stack-section.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="space-y-2">
                  <details className="rounded-lg bg-card border border-border overflow-hidden group" open>
                    <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex-1 text-sm font-medium text-foreground">User onboarding is slow and frustrating</div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-red-500/10 text-red-500 border-red-500/20">High</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-5 pb-5 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mt-3">Users report spending 30+ minutes on initial setup with no clear progress indicators.</p>
                    </div>
                  </details>
                  <details className="rounded-lg bg-card border border-border overflow-hidden group">
                    <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex-1 text-sm font-medium text-foreground">No integration with existing tools</div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">Medium</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-5 pb-5 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mt-3">Current solutions require manual data entry across platforms.</p>
                    </div>
                  </details>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* BLOCKQUOTE */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-blockquote"
              title="Blockquotes"
              description="Quoted text with left border or icon — 3+ variations."
            >
              <PatternMeta
                count="3+"
                priority="low"
                suggestedName="Blockquote"
                files={['pain-points-section.tsx', 'user-story.tsx', 'social-proof-section.tsx']}
              />
              <Showcase title="Live Example (both variants)">
                <div className="space-y-4">
                  <blockquote className="italic text-sm text-muted-foreground border-l-2 border-amber-500 pl-4 leading-relaxed">
                    &ldquo;I spent hours trying to find a solution that actually works. The existing tools are either too complex or too limited.&rdquo;
                  </blockquote>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-start gap-2">
                      <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground italic leading-relaxed">
                        &ldquo;This completely changed how I approach market validation. I can now do in minutes what used to take weeks.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* ALERT BANNER */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-alert"
              title="Alert Banners"
              description="Icon + title + message in a colored box — 5+ occurrences."
            >
              <PatternMeta
                count="5+"
                priority="medium"
                suggestedName="Alert"
                files={['score-cards.tsx', 'user-story.tsx', 'tech-stack-section.tsx', 'dashboard/page.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-primary font-medium">Score Variance Detected</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Scores showed significant variation between analysis passes.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-blue-400 font-medium">Research in Progress</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Deep analysis is running. Results will appear shortly.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-red-400 font-medium">Pipeline Failed</p>
                      <p className="text-sm text-muted-foreground mt-0.5">The research pipeline encountered an error and was unable to complete.</p>
                    </div>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* PILL BADGE */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-pill-badge"
              title="Pill Badges"
              description="Rounded pill with translucent background — 15+ occurrences for keywords, tags, features."
            >
              <PatternMeta
                count="15+"
                priority="medium"
                suggestedName="PillBadge"
                files={['spark-results.tsx', 'market-sizing.tsx', 'proof-signals.tsx', 'market-analysis.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="flex flex-wrap gap-2">
                  {['SaaS', 'B2B', 'AI/ML', 'Remote Work', 'Automation', 'Analytics'].map((kw) => (
                    <span key={kw} className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                      {kw}
                    </span>
                  ))}
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* DUAL COLUMN */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-dual-column"
              title="Dual Columns"
              description="Two-column grid for Before/After, Strengths/Weaknesses, Solutions/Gaps."
            >
              <PatternMeta
                count="5+"
                priority="low"
                suggestedName="DualColumn"
                files={['user-story.tsx', 'pain-points-section.tsx', 'competitors-section.tsx']}
              />
              <Showcase title="Live Example (Before/After variant)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">Before</p>
                    <p className="text-sm text-muted-foreground">Spending 4+ hours daily on manual market research with spreadsheets and scattered browser tabs.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">After</p>
                    <p className="text-sm text-muted-foreground">Complete market validation in under 10 minutes with AI-powered analysis and structured insights.</p>
                  </div>
                </div>
              </Showcase>
              <Showcase title="Strengths / Weaknesses variant">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Strengths</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                        <span>Strong brand recognition</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                        <span>Large existing user base</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">Weaknesses</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                        <span>Slow feature velocity</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                        <span>Legacy tech stack</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* LABELED FIELD */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-labeled-field"
              title="Labeled Fields"
              description="Vertical label + icon + body text — exists in business-fit.tsx but not shared."
            >
              <PatternMeta
                count="12+"
                priority="medium"
                suggestedName="LabeledField"
                files={['business-fit.tsx', 'proof-signals.tsx', 'competitors-section.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-bold uppercase tracking-widest text-foreground">Pricing Strategy</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">Freemium model with $29/mo pro tier and $99/mo enterprise tier.</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-bold uppercase tracking-widest text-foreground">Time to Value</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">Users see first actionable insights within 5 minutes of signing up.</p>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* DIVIDER */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-divider"
              title="Dividers"
              description="Horizontal rule implemented 3 different ways — 20+ occurrences."
            >
              <PatternMeta
                count="20+"
                priority="low"
                suggestedName="Divider"
                files={['(virtually every component file)']}
              />
              <Showcase title="Live Example (all 3 variants)">
                <div className="space-y-6">
                  <div>
                    <code className="text-[10px] font-mono text-muted-foreground mb-2 block">h-px bg-border</code>
                    <div className="h-px bg-border" />
                  </div>
                  <div>
                    <code className="text-[10px] font-mono text-muted-foreground mb-2 block">h-px bg-border my-4</code>
                    <div className="h-px bg-border my-4" />
                  </div>
                  <div>
                    <code className="text-[10px] font-mono text-muted-foreground mb-2 block">border-t border-border pt-3</code>
                    <div className="border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">Content after border-t variant</span>
                    </div>
                  </div>
                </div>
              </Showcase>
            </CatalogSection>

            {/* ------------------------------------------------------------ */}
            {/* STAT HIGHLIGHT */}
            {/* ------------------------------------------------------------ */}
            <CatalogSection
              id="p-stat-highlight"
              title="Stat Highlights"
              description="Bold inline stat within paragraph text — market-analysis.tsx highlightStats function."
            >
              <PatternMeta
                count="5+"
                priority="low"
                suggestedName="HighlightedStat"
                files={['market-analysis.tsx']}
              />
              <Showcase title="Live Example (as found inline)">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The market is projected to reach{' '}
                  <span className="font-semibold text-foreground">$4.2 billion</span>{' '}
                  by 2028, growing at a compound annual rate of{' '}
                  <span className="font-semibold text-foreground">14.3%</span>{' '}
                  driven by increasing demand for{' '}
                  <span className="font-semibold text-foreground">AI-powered automation</span>{' '}
                  tools.
                </p>
              </Showcase>
            </CatalogSection>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: TOKENS (dev only)                                           */}
        {/* ================================================================ */}

        {activeTab === 'tokens' && isDev && <TokenEditor />}
      </div>
    </div>
  );
}
