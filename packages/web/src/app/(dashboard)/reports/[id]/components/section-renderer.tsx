'use client';

import ReactMarkdown from 'react-markdown';
import { Lock } from 'lucide-react';

// Map camelCase keys to human-readable labels
const SECTION_LABELS: Record<string, string> = {
  // Business Plan
  executiveSummary: 'Executive Summary',
  problemStatement: 'Problem Statement',
  problem: 'Problem',
  solution: 'Solution',
  uniqueValueProposition: 'Unique Value Proposition',
  uvp: 'Unique Value Proposition',
  targetMarket: 'Target Market',
  marketSize: 'Market Size',
  marketTrends: 'Market Trends',
  trends: 'Trends',
  competitors: 'Competitors',
  competitiveAdvantage: 'Competitive Advantage',
  revenueStreams: 'Revenue Streams',
  pricingStrategy: 'Pricing Strategy',
  costStructure: 'Cost Structure',
  marketingStrategy: 'Marketing Strategy',
  salesChannels: 'Sales Channels',
  customerAcquisition: 'Customer Acquisition',
  financialProjections: 'Financial Projections',
  teamRequirements: 'Team Requirements',
  milestones: 'Milestones',
  // Positioning
  positioningStatement: 'Positioning Statement',
  tagline: 'Tagline',
  brandVoice: 'Brand Voice',
  brandPersonality: 'Brand Personality',
  targetAudience: 'Target Audience',
  customerPersona: 'Customer Persona',
  keyMessages: 'Key Messages',
  valuePillars: 'Value Pillars',
  uniqueSellingPoints: 'Unique Selling Points',
  competitivePositioning: 'Competitive Positioning',
  // Competitive Analysis
  marketOverview: 'Market Overview',
  industryTrends: 'Industry Trends',
  swot: 'SWOT Analysis',
  competitiveAdvantages: 'Competitive Advantages',
  differentiators: 'Differentiators',
  marketGaps: 'Market Gaps',
  underservedSegments: 'Underserved Segments',
  strategicRecommendations: 'Strategic Recommendations',
  competitiveStrategy: 'Competitive Strategy',
  // General
  rawContent: 'Report Content',
};

// Get display label for a section key
function getSectionLabel(key: string): string {
  return (
    SECTION_LABELS[key] ||
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  );
}

interface SectionRendererProps {
  sectionKey: string;
  value: unknown;
  isLocked?: boolean;
}

export function SectionRenderer({ sectionKey, value, isLocked = false }: SectionRendererProps) {
  const label = getSectionLabel(sectionKey);

  if (isLocked) {
    return (
      <div className="section-card relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h3 className="section-title mb-0 text-muted-foreground">{label}</h3>
        </div>
        <div className="relative">
          {/* Blurred preview */}
          <div className="blur-sm select-none pointer-events-none">
            <p className="text-sm text-muted-foreground">
              This section contains detailed analysis and insights that are available with a higher tier subscription.
              Upgrade to unlock premium content including in-depth research, actionable recommendations, and comprehensive data.
            </p>
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-lg">
            <div className="text-center">
              <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Locked Section</p>
              <p className="text-xs text-muted-foreground">Upgrade to unlock</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render based on value type
  return (
    <div className="section-card">
      <h3 className="section-title">{label}</h3>
      <div className="text-sm text-foreground/80">
        <ValueRenderer value={value} />
      </div>
    </div>
  );
}

interface ValueRendererProps {
  value: unknown;
  depth?: number;
}

function ValueRenderer({ value, depth = 0 }: ValueRendererProps) {
  // Null or undefined
  if (value === null || value === undefined) {
    return <p className="text-muted-foreground italic">No data available</p>;
  }

  // String - render with markdown support
  if (typeof value === 'string') {
    return (
      <div className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
        <ReactMarkdown>{value}</ReactMarkdown>
      </div>
    );
  }

  // Number
  if (typeof value === 'number') {
    return <p className="text-foreground font-medium">{value.toLocaleString()}</p>;
  }

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${value ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-muted-foreground italic">No items</p>;
    }

    // Check if array contains objects with specific structure
    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      // Render as card list for complex objects
      return (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border">
              <ObjectRenderer obj={item as Record<string, unknown>} />
            </div>
          ))}
        </div>
      );
    }

    // Render as bullet list for simple arrays
    return (
      <ul className="space-y-1.5">
        {value.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <span className="text-foreground/80">{String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Object
  if (typeof value === 'object') {
    return <ObjectRenderer obj={value as Record<string, unknown>} />;
  }

  // Fallback
  return <p className="text-foreground/80">{String(value)}</p>;
}

interface ObjectRendererProps {
  obj: Record<string, unknown>;
}

function ObjectRenderer({ obj }: ObjectRendererProps) {
  const entries = Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined);

  if (entries.length === 0) {
    return <p className="text-muted-foreground italic">No data</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {getSectionLabel(key)}
          </span>
          <div className="mt-0.5">
            <ValueRenderer value={value} depth={1} />
          </div>
        </div>
      ))}
    </div>
  );
}

export { getSectionLabel };
