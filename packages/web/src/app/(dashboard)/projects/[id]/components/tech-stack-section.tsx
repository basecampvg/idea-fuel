'use client';

import { useState } from 'react';
import { Server, ChevronDown, ExternalLink, Info } from 'lucide-react';
import type { TechStackData, TechRecommendation } from '@forge/shared';

interface TechStackSectionProps {
  techStack?: TechStackData | null;
  title?: string;
  subtitle?: string;
}

// Helper to parse JSON if it's a string
function parseJson<T>(data: T | string | null | undefined): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as T;
}

// Color mapping for business types
const BUSINESS_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  saas: { bg: 'bg-accent/20', text: 'text-accent', label: 'SaaS' },
  ecommerce: { bg: 'bg-primary/20', text: 'text-primary/50', label: 'E-commerce' },
  service: { bg: 'bg-primary/20', text: 'text-primary', label: 'Service' },
  content: { bg: 'bg-primary/20', text: 'text-primary', label: 'Content' },
};

// Complexity indicator colors
const COMPLEXITY_COLORS: Record<string, string> = {
  low: 'text-primary',
  medium: 'text-primary/50',
  high: 'text-red-400',
};

// Layer configuration with icons and colors
const LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  frontend: { label: 'Frontend', color: 'hsl(10, 80%, 50%)' },
  backend: { label: 'Backend', color: 'hsl(10, 70%, 55%)' },
  database: { label: 'Database', color: 'hsl(10, 80%, 50%)' },
  hosting: { label: 'Hosting', color: 'hsl(10, 60%, 60%)' },
  devops: { label: 'DevOps', color: 'hsl(10, 50%, 65%)' },
  thirdParty: { label: 'Third-Party', color: 'hsl(10, 40%, 70%)' },
};

function TechItem({ tech }: { tech: TechRecommendation }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="group">
      <div
        className="flex items-center justify-between py-2 cursor-pointer hover:bg-card/50 -mx-2 px-2 rounded-lg transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-foreground truncate">{tech.name}</span>
          {tech.complexity && (
            <span className={`text-xs ${COMPLEXITY_COLORS[tech.complexity] || 'text-muted-foreground'}`}>
              ({tech.complexity})
            </span>
          )}
        </div>
        {tech.monthlyEstimate && (
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{tech.monthlyEstimate}</span>
        )}
      </div>

      {showDetails && (
        <div className="pb-3 pl-2 space-y-2 text-xs">
          <p className="text-muted-foreground">{tech.purpose}</p>
          {tech.alternatives && tech.alternatives.length > 0 && (
            <p className="text-muted-foreground">
              <span className="text-foreground/70">Alternatives:</span> {tech.alternatives.join(', ')}
            </p>
          )}
          {tech.learnMoreUrl && (
            <a
              href={tech.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:opacity-80 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function TechLayer({ layerKey, techs }: { layerKey: string; techs: TechRecommendation[] }) {
  const config = LAYER_CONFIG[layerKey] || { label: layerKey, color: 'hsl(10, 80%, 50%)' };

  if (!techs || techs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-medium text-foreground">{config.label}</span>
      </div>
      <div className="pl-4 border-l border-border space-y-1">
        {techs.map((tech, idx) => (
          <TechItem key={`${tech.name}-${idx}`} tech={tech} />
        ))}
      </div>
    </div>
  );
}

export function TechStackSection({
  techStack: rawTechStack,
  title = 'Tech Stack',
  subtitle,
}: TechStackSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const techStack = parseJson<TechStackData>(rawTechStack);

  if (!techStack) {
    return null;
  }

  const businessTypeConfig = BUSINESS_TYPE_COLORS[techStack.businessType] || {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    label: techStack.businessType,
  };

  const { layers, estimatedMonthlyCost, scalabilityNotes, securityConsiderations, summary } = techStack;

  return (
    <div className="rounded-2xl bg-background border border-border p-6">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'hsla(160, 84%, 44%, 0.2)' }}
          >
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${businessTypeConfig.bg} ${businessTypeConfig.text}`}>
                {businessTypeConfig.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subtitle || `Recommended technology for your ${businessTypeConfig.label.toLowerCase()} business`}
            </p>
          </div>
        </div>
        <button
          className="p-1.5 rounded-lg hover:bg-card transition-colors"
          aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
        >
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-180'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100 mt-5'
        }`}
      >
        {/* Summary */}
        {summary && (
          <p className="text-sm text-muted-foreground mb-5 pb-5 border-b border-border">
            {summary}
          </p>
        )}

        {/* Tech Layers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <TechLayer layerKey="frontend" techs={layers?.frontend || []} />
          <TechLayer layerKey="backend" techs={layers?.backend || []} />
          <TechLayer layerKey="database" techs={layers?.database || []} />
          <TechLayer layerKey="hosting" techs={layers?.hosting || []} />
          <TechLayer layerKey="devops" techs={layers?.devops || []} />
          <TechLayer layerKey="thirdParty" techs={layers?.thirdParty || []} />
        </div>

        {/* Cost Estimate */}
        {estimatedMonthlyCost && (
          <div className="p-4 rounded-xl bg-card border border-border mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💰</span>
              <span className="font-medium text-foreground">
                Estimated Cost: ${estimatedMonthlyCost.min}-${estimatedMonthlyCost.max}/month
              </span>
              <span className="text-xs text-muted-foreground">(at launch scale)</span>
            </div>
            {estimatedMonthlyCost.breakdown && estimatedMonthlyCost.breakdown.length > 0 && (
              <div className="flex flex-wrap gap-3 text-sm">
                {estimatedMonthlyCost.breakdown.map((item, idx) => (
                  <span key={idx} className="text-muted-foreground">
                    <span className="text-foreground/70">{item.category}:</span> {item.estimate}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Additional Info */}
        <div className="space-y-3">
          {scalabilityNotes && (
            <div className="flex gap-2 text-sm">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{scalabilityNotes}</p>
            </div>
          )}

          {securityConsiderations && securityConsiderations.length > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground shrink-0">🔒</span>
              <div className="text-muted-foreground">
                <span className="text-foreground/70">Security:</span>{' '}
                {securityConsiderations.slice(0, 3).join(' • ')}
                {securityConsiderations.length > 3 && ` (+${securityConsiderations.length - 3} more)`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
