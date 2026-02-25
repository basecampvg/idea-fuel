'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';

// ---------- Types ----------

export interface RevenuePotential {
  rating: 'high' | 'medium' | 'low';
  estimate: string;
  confidence: number;
  revenueModel?: string;
  timeToFirstRevenue?: string;
  unitEconomics?: string;
}

export interface ExecutionDifficulty {
  rating: 'easy' | 'moderate' | 'hard';
  factors: string[];
  soloFriendly: boolean;
  mvpTimeEstimate?: string;
  criticalPath?: string[];
  biggestRisk?: string;
}

export interface GTMClarity {
  rating: 'clear' | 'moderate' | 'unclear';
  channels: string[];
  confidence: number;
  primaryChannel?: string;
  estimatedCAC?: string;
  firstMilestone?: string;
}

export interface FounderFit {
  percentage: number;
  strengths: string[];
  gaps: string[];
  criticalSkillNeeded?: string;
  recommendedFirstHire?: string;
}

interface BusinessFitProps {
  revenuePotential?: RevenuePotential | null;
  executionDifficulty?: ExecutionDifficulty | null;
  gtmClarity?: GTMClarity | null;
  founderFit?: FounderFit | null;
  title?: string;
}

// ---------- Helpers ----------

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

function ratingToScore(rating: string): number {
  const map: Record<string, number> = {
    high: 85, medium: 55, low: 25,
    easy: 85, moderate: 55, hard: 25,
    clear: 85, unclear: 25,
  };
  return map[rating] ?? 50;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- AccordionItem ----------

function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between pb-2 border-b border-border cursor-pointer"
      >
        <span className="font-mono text-xs font-light uppercase tracking-[1px] text-primary">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

// ---------- Arc Gauge ----------

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const startRad = (Math.PI / 180) * startAngle;
  const endRad = (Math.PI / 180) * endAngle;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function ArcGauge({ score, label, sublabel }: { score: number; label: string; sublabel: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timer);
  }, [score]);

  const cx = 80;
  const cy = 72;
  const r = 56;
  const startAngle = 180;
  const endAngle = 360;
  const scoreAngle = startAngle + (animatedScore / 100) * (endAngle - startAngle);

  const trackPath = describeArc(cx, cy, r, startAngle, endAngle);
  const fillPath = describeArc(cx, cy, r, startAngle, Math.max(scoreAngle, startAngle + 1));

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={90} viewBox="0 0 160 90" className="overflow-visible">
        <path d={trackPath} fill="none" stroke="hsl(var(--border))" strokeWidth={8} strokeLinecap="round" />
        <path
          d={fillPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={8}
          strokeLinecap="round"
          style={{
            transition: 'd 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))',
          }}
        />
        <text
          x={cx} y={cy - 4}
          textAnchor="middle" dominantBaseline="middle"
          className="fill-primary"
          style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
        >
          {score}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
          {sublabel}
        </text>
      </svg>
      <span className="text-xs font-bold uppercase tracking-widest text-foreground mt-1">
        {label}
      </span>
    </div>
  );
}

// ---------- Main Component ----------

export function BusinessFit({
  revenuePotential: rawRevenuePotential,
  executionDifficulty: rawExecutionDifficulty,
  gtmClarity: rawGtmClarity,
  founderFit: rawFounderFit,
  title = 'Business Fit',
}: BusinessFitProps) {
  const revenuePotential = parseJson<RevenuePotential>(rawRevenuePotential);
  const executionDifficulty = parseJson<ExecutionDifficulty>(rawExecutionDifficulty);
  const gtmClarity = parseJson<GTMClarity>(rawGtmClarity);
  const founderFit = parseJson<FounderFit>(rawFounderFit);

  const hasData = revenuePotential || executionDifficulty || gtmClarity || founderFit;
  if (!hasData) return null;

  // Build gauge entries from available data
  const gauges: { score: number; label: string; sublabel: string }[] = [];
  if (revenuePotential) gauges.push({ score: revenuePotential.confidence, label: 'Revenue', sublabel: capitalise(revenuePotential.rating) });
  if (executionDifficulty) gauges.push({ score: ratingToScore(executionDifficulty.rating), label: 'Execution', sublabel: capitalise(executionDifficulty.rating) });
  if (gtmClarity) gauges.push({ score: gtmClarity.confidence, label: 'GTM', sublabel: capitalise(gtmClarity.rating) });
  if (founderFit) gauges.push({ score: founderFit.percentage, label: 'Founder Fit', sublabel: `${founderFit.percentage}%` });

  const gridCols = gauges.length <= 2 ? 'grid-cols-2' : gauges.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <CollapsibleSection title={title}>
      <div className="space-y-10">
        {/* Scorecard gauges */}
        {gauges.length > 0 && (
          <div className="bg-background border border-border rounded-xl p-4 pb-3">
            <div className={`grid ${gridCols} gap-x-2 gap-y-1`}>
              {gauges.map((g) => (
                <ArcGauge key={g.label} score={g.score} label={g.label} sublabel={g.sublabel} />
              ))}
            </div>
          </div>
        )}

        {/* Revenue Potential */}
        {revenuePotential && (
          <div>
            <h2 className="font-display text-lg font-extrabold uppercase text-foreground mb-4">
              Revenue Potential
            </h2>
            {revenuePotential.estimate && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {revenuePotential.estimate}
              </p>
            )}
            <div className="space-y-6">
              {revenuePotential.revenueModel && (
                <AccordionItem title="Revenue Model" defaultOpen>
                  <p className="text-sm text-foreground">{revenuePotential.revenueModel}</p>
                </AccordionItem>
              )}
              {revenuePotential.timeToFirstRevenue && (
                <AccordionItem title="Time to Revenue">
                  <p className="text-sm text-foreground">{revenuePotential.timeToFirstRevenue}</p>
                </AccordionItem>
              )}
              {revenuePotential.unitEconomics && (
                <AccordionItem title="Unit Economics">
                  <p className="text-sm text-foreground">{revenuePotential.unitEconomics}</p>
                </AccordionItem>
              )}
            </div>
          </div>
        )}

        {/* Execution Difficulty */}
        {executionDifficulty && (
          <div>
            <h2 className="font-display text-lg font-extrabold uppercase text-foreground mb-4">
              Execution Difficulty
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {executionDifficulty.soloFriendly ? 'Solo-friendly build.' : 'Team recommended.'}{' '}
              Rated <span className="text-foreground font-medium">{executionDifficulty.rating}</span>.
            </p>
            <div className="space-y-6">
              {executionDifficulty.factors.length > 0 && (
                <AccordionItem title="Key Factors" defaultOpen>
                  <ul className="space-y-1">
                    {executionDifficulty.factors.map((factor, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">&#8226;</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
              {executionDifficulty.mvpTimeEstimate && (
                <AccordionItem title="MVP Timeline">
                  <p className="text-sm text-foreground">{executionDifficulty.mvpTimeEstimate}</p>
                </AccordionItem>
              )}
              {executionDifficulty.biggestRisk && (
                <AccordionItem title="Biggest Risk">
                  <p className="text-sm text-foreground">{executionDifficulty.biggestRisk}</p>
                </AccordionItem>
              )}
              {executionDifficulty.criticalPath && executionDifficulty.criticalPath.length > 0 && (
                <AccordionItem title="Critical Path">
                  <div className="space-y-1">
                    {executionDifficulty.criticalPath.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-xs text-primary font-medium tabular-nums shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </AccordionItem>
              )}
            </div>
          </div>
        )}

        {/* Go-To-Market */}
        {gtmClarity && (
          <div>
            <h2 className="font-display text-lg font-extrabold uppercase text-foreground mb-4">
              Go-To-Market
            </h2>
            {gtmClarity.primaryChannel && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Primary channel: <span className="text-foreground font-medium">{gtmClarity.primaryChannel}</span>
              </p>
            )}
            <div className="space-y-6">
              {gtmClarity.channels.length > 0 && (
                <AccordionItem title="Channels" defaultOpen>
                  <ul className="space-y-1">
                    {gtmClarity.channels.map((channel, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">&#8226;</span>
                        <span>{channel}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
              {gtmClarity.estimatedCAC && (
                <AccordionItem title="Estimated CAC">
                  <p className="text-sm text-foreground">{gtmClarity.estimatedCAC}</p>
                </AccordionItem>
              )}
              {gtmClarity.firstMilestone && (
                <AccordionItem title="First Milestone">
                  <p className="text-sm text-foreground">{gtmClarity.firstMilestone}</p>
                </AccordionItem>
              )}
            </div>
          </div>
        )}

        {/* Founder Fit */}
        {founderFit && (
          <div>
            <h2 className="font-display text-lg font-extrabold uppercase text-foreground mb-4">
              Founder Fit
            </h2>
            <div className="space-y-6">
              {founderFit.strengths.length > 0 && (
                <AccordionItem title="Strengths" defaultOpen>
                  <ul className="space-y-1">
                    {founderFit.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-primary/80 flex items-start gap-1.5">
                        <span className="mt-0.5">&#10003;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
              {founderFit.gaps.length > 0 && (
                <AccordionItem title="Gaps">
                  <ul className="space-y-1">
                    {founderFit.gaps.map((g, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-0.5">&#8594;</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
              {founderFit.criticalSkillNeeded && (
                <AccordionItem title="Critical Skill Needed">
                  <p className="text-sm text-foreground">{founderFit.criticalSkillNeeded}</p>
                </AccordionItem>
              )}
              {founderFit.recommendedFirstHire && (
                <AccordionItem title="Recommended First Hire">
                  <p className="text-sm text-foreground">{founderFit.recommendedFirstHire}</p>
                </AccordionItem>
              )}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
