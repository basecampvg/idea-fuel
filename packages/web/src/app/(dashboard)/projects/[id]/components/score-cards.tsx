'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

// ---------- Types ----------

interface ScoreWithJustification {
  score: number;
  justification: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ScoreJustifications {
  opportunity: ScoreWithJustification;
  problem: ScoreWithJustification;
  feasibility: ScoreWithJustification;
  whyNow: ScoreWithJustification;
}

interface ScoreMetadata {
  passCount: number;
  maxDeviation: number;
  averageConfidence: number;
  flagged: boolean;
  flagReason?: string;
}

interface ScoreCardsProps {
  opportunityScore?: number | null;
  problemScore?: number | null;
  feasibilityScore?: number | null;
  whyNowScore?: number | null;
  scoreJustifications?: ScoreJustifications | null;
  scoreMetadata?: ScoreMetadata | null;
  title?: string;
  subtitle?: string;
}

// ---------- Helpers ----------

type Dimension = 'opportunity' | 'problem' | 'feasibility' | 'whynow';

const DIMENSIONS: { key: Dimension; label: string; field: keyof ScoreJustifications }[] = [
  { key: 'opportunity', label: 'Opportunity', field: 'opportunity' },
  { key: 'problem', label: 'Problem', field: 'problem' },
  { key: 'feasibility', label: 'Feasibility', field: 'feasibility' },
  { key: 'whynow', label: 'Why Now', field: 'whyNow' },
];

function getScoreLabel(score: number | null | undefined, key: Dimension): string {
  if (score == null) return 'No data';
  if (key === 'problem') {
    if (score >= 80) return 'High Pain';
    if (score >= 60) return 'Moderate Pain';
    if (score >= 40) return 'Some Pain';
    return 'Low Pain';
  }
  if (key === 'whynow' && score >= 70) return 'Perfect Timing';
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Very Strong';
  if (score >= 70) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Needs work';
}

function getConfidenceColor(c: 'high' | 'medium' | 'low') {
  if (c === 'high') return 'bg-primary';
  if (c === 'medium') return 'bg-amber-400';
  return 'bg-red-400';
}

function getConfidenceLabel(c: 'high' | 'medium' | 'low') {
  if (c === 'high') return 'High confidence';
  if (c === 'medium') return 'Medium confidence';
  return 'Low confidence';
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

interface ArcGaugeProps {
  score: number;
  label: string;
  sublabel: string;
  confidence?: 'high' | 'medium' | 'low';
}

function ArcGauge({ score, label, sublabel, confidence }: ArcGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timer);
  }, [score]);

  const cx = 80;
  const cy = 72;
  const r = 56;
  // Arc spans from 180° (left) to 360° (right) — a semicircle
  const startAngle = 180;
  const endAngle = 360;

  const trackPath = describeArc(cx, cy, r, startAngle, endAngle);
  // Total arc length of the semicircle
  const totalLength = Math.PI * r;
  // Dash offset: full length = hidden, 0 = fully visible
  const dashOffset = totalLength * (1 - animatedScore / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={90} viewBox="0 0 160 90" className="overflow-visible">
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Fill — same full-arc path, revealed via strokeDashoffset */}
        <path
          d={trackPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={totalLength}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))',
          }}
        />
        {/* Score text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-primary"
          style={{
            fontSize: 28,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score}
        </text>
        {/* Sublabel */}
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          {sublabel}
        </text>
      </svg>
      {/* Label + confidence */}
      <div className="flex items-center gap-1.5 mt-1">
        {confidence && (
          <div
            className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(confidence)}`}
          />
        )}
        <span className="text-xs font-bold uppercase tracking-widest text-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------- Justification card ----------

interface JustificationCardProps {
  label: string;
  score: number;
  dimensionKey: Dimension;
  justification?: ScoreWithJustification | null;
}

function JustificationCard({ label, score, dimensionKey, justification }: JustificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scoreLabel = getScoreLabel(score, dimensionKey);

  return (
    <button
      type="button"
      onClick={() => justification?.justification && setExpanded(!expanded)}
      className={`w-full text-left bg-background border border-border rounded-xl transition-colors ${
        justification?.justification ? 'cursor-pointer hover:border-primary/30' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-widest text-foreground shrink-0">
          {label}
        </span>
        <span className="font-display text-xl font-extrabold text-primary tabular-nums shrink-0">
          {score}
        </span>
        <span className="text-xs text-muted-foreground flex-1">{scoreLabel}</span>

        {justification && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(justification.confidence)}`} />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {getConfidenceLabel(justification.confidence)}
            </span>
          </div>
        )}

        {justification?.justification && (
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {expanded && justification?.justification && (
        <div className="px-4 pb-3 pt-0 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed pt-3">
            {justification.justification}
          </p>
        </div>
      )}
    </button>
  );
}

// ---------- Main component ----------

export function ScoreCards({
  opportunityScore,
  problemScore,
  feasibilityScore,
  whyNowScore,
  scoreJustifications,
  scoreMetadata,
  title,
  subtitle,
}: ScoreCardsProps) {
  const scores: Record<Dimension, number> = {
    opportunity: opportunityScore ?? 0,
    problem: problemScore ?? 0,
    feasibility: feasibilityScore ?? 0,
    whynow: whyNowScore ?? 0,
  };

  const hasAnyScore =
    opportunityScore != null ||
    problemScore != null ||
    feasibilityScore != null ||
    whyNowScore != null;

  if (!hasAnyScore) return null;

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div className="mb-1">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}

      {scoreMetadata?.flagged && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <AlertTriangle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-primary font-medium">Score Variance Detected</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {scoreMetadata.flagReason ||
                'Scores showed significant variation between analysis passes. Review justifications for context.'}
            </p>
          </div>
        </div>
      )}

      {/* Arc gauges — 2x2 grid */}
      <div className="bg-background border border-border rounded-xl p-4 pb-3">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {DIMENSIONS.map((d) => (
            <ArcGauge
              key={d.key}
              score={scores[d.key]}
              label={d.label}
              sublabel={getScoreLabel(scores[d.key], d.key)}
              confidence={scoreJustifications?.[d.field]?.confidence}
            />
          ))}
        </div>

        {scoreMetadata && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-2 mt-2 border-t border-border">
            <span>Based on {scoreMetadata.passCount} analysis passes</span>
            <span>{scoreMetadata.averageConfidence}% confidence</span>
          </div>
        )}
      </div>

      {/* Expandable justification cards */}
      <div className="flex flex-col gap-2">
        {DIMENSIONS.map((d) => {
          const score = scores[d.key];
          if (!score && score !== 0) return null;
          const justification = scoreJustifications?.[d.field] ?? null;
          return (
            <JustificationCard
              key={d.key}
              label={d.label}
              score={score}
              dimensionKey={d.key}
              justification={justification}
            />
          );
        })}
      </div>
    </div>
  );
}
