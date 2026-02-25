'use client';

import { ExternalLink } from 'lucide-react';
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

// ---------- Sub-components (matching demo report style) ----------

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-black leading-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function LayerLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[2px] text-primary first:mt-0">
      {children}
    </h4>
  );
}

// Layer display names
const LAYER_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  hosting: 'Hosting',
  devops: 'DevOps',
  thirdParty: 'Third-Party',
};

function TechItemRow({ tech }: { tech: TechRecommendation }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">{tech.name}</p>
          {tech.learnMoreUrl && (
            <a
              href={tech.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:opacity-80 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{tech.purpose}</p>
        {tech.alternatives && tech.alternatives.length > 0 && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Alt: {tech.alternatives.join(', ')}
          </p>
        )}
      </div>
      {tech.monthlyEstimate && (
        <span className="text-xs text-muted-foreground shrink-0 ml-4">{tech.monthlyEstimate}</span>
      )}
    </div>
  );
}

// ---------- Main component ----------

export function TechStackSection({
  techStack: rawTechStack,
  title = 'Tech Stack',
}: TechStackSectionProps) {
  const techStack = parseJson<TechStackData>(rawTechStack);

  if (!techStack) {
    return null;
  }

  const { layers, estimatedMonthlyCost, scalabilityNotes, securityConsiderations, summary } = techStack;

  // Determine business type label
  const businessTypeLabel =
    techStack.businessType === 'saas' ? 'SaaS' :
    techStack.businessType === 'ecommerce' ? 'E-commerce' :
    techStack.businessType.charAt(0).toUpperCase() + techStack.businessType.slice(1);

  return (
    <div className="space-y-6">
      {/* Title */}
      <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">{title}</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {estimatedMonthlyCost && (
          <StatCard
            label="Monthly Cost"
            value={`$${estimatedMonthlyCost.min}-$${estimatedMonthlyCost.max}`}
            sub={businessTypeLabel}
          />
        )}
        <StatCard label="Stack Type" value="Full-Stack" sub={`${businessTypeLabel}-optimized`} />
        {estimatedMonthlyCost?.breakdown && estimatedMonthlyCost.breakdown.length > 0 && (
          <>
            {estimatedMonthlyCost.breakdown.slice(0, 2).map((item, idx) => (
              <StatCard key={idx} label={item.category} value={item.estimate} sub={item.item} />
            ))}
          </>
        )}
      </div>

      {/* Summary + scalability */}
      {summary && <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>}
      {scalabilityNotes && <p className="text-sm leading-relaxed text-muted-foreground">{scalabilityNotes}</p>}

      {/* Tech layers */}
      {Object.entries(layers || {}).map(([layerKey, techs]) => {
        if (!techs || techs.length === 0) return null;
        return (
          <div key={layerKey}>
            <LayerLabel>{LAYER_LABELS[layerKey] || layerKey}</LayerLabel>
            <div className="space-y-1">
              {techs.map((tech: TechRecommendation, idx: number) => (
                <TechItemRow key={`${tech.name}-${idx}`} tech={tech} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Security considerations */}
      {securityConsiderations && securityConsiderations.length > 0 && (
        <div>
          <LayerLabel>Security Considerations</LayerLabel>
          {securityConsiderations.map((s, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <p className="text-sm text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
