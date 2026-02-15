'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Types matching the backend ResearchScores interface
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

interface ScoreCardProps {
  label: string;
  score: number | null | undefined;
  colorType: 'opportunity' | 'problem' | 'feasibility' | 'whynow';
  justification?: ScoreWithJustification | null;
}

function getScoreDescription(score: number | null | undefined, colorType: string): string {
  if (score === null || score === undefined) return 'No data';

  // Special descriptions for problem score
  if (colorType === 'problem') {
    if (score >= 80) return 'High Pain';
    if (score >= 60) return 'Moderate Pain';
    if (score >= 40) return 'Some Pain';
    return 'Low Pain';
  }

  // Standard descriptions
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Very Strong';
  if (score >= 70) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Needs work';
}

// Map to special label for Why Now
function getSpecialDescription(colorType: string, score: number | null | undefined): string {
  if (score === null || score === undefined) return '';

  if (colorType === 'whynow' && score >= 70) return 'Perfect Timing';
  if (colorType === 'feasibility' && score >= 70) return 'Very Easy';
  if (colorType === 'opportunity' && score >= 70) return 'Exceptional';

  return getScoreDescription(score, colorType);
}

// Confidence indicator colors
function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-primary';
    case 'medium':
      return 'bg-primary/50';
    case 'low':
      return 'bg-primary/25';
  }
}

function getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
  }
}

function ScoreCard({ label, score, colorType, justification }: ScoreCardProps) {
  const [mounted, setMounted] = useState(false);
  const displayScore = score ?? '--';
  const description = getSpecialDescription(colorType, score);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const barGradients: Record<string, string> = {
    opportunity: 'from-primary to-primary/60',
    problem: 'from-primary/80 to-primary/40',
    feasibility: 'from-primary/70 to-primary/50',
    whynow: 'from-primary/60 to-primary/30',
  };

  const progressWidth = score !== null && score !== undefined ? Math.min(Math.max(score, 0), 100) : 0;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      {/* Header row: label, score, description, progress bar */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground font-medium w-20 shrink-0">
          {label}
        </span>
        <div className="text-2xl font-semibold text-foreground tabular-nums leading-none w-12 shrink-0">
          {displayScore}
        </div>
        <p className="text-xs text-muted-foreground w-24 shrink-0">
          {description}
        </p>
        <div className="h-[3px] rounded-full bg-muted/30 overflow-hidden flex-1">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradients[colorType]} transition-all duration-700 ease-out`}
            style={{ width: mounted ? `${progressWidth}%` : '0%' }}
          />
        </div>
        {justification && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(justification.confidence)}`}
            />
            <span className="text-xs text-muted-foreground">
              {getConfidenceLabel(justification.confidence)}
            </span>
          </div>
        )}
      </div>

      {/* Justification text - always visible */}
      {justification?.justification && (
        <div className="pt-3 mt-3 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {justification.justification}
          </p>
        </div>
      )}
    </div>
  );
}

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
  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div className="mb-1">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}

      {scoreMetadata?.flagged && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <AlertTriangle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-primary font-medium">Score Variance Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {scoreMetadata.flagReason || 'Scores showed significant variation between analysis passes. Review justifications for context.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <ScoreCard
          label="Opportunity"
          score={opportunityScore}
          colorType="opportunity"
          justification={scoreJustifications?.opportunity}
        />
        <ScoreCard
          label="Problem"
          score={problemScore}
          colorType="problem"
          justification={scoreJustifications?.problem}
        />
        <ScoreCard
          label="Feasibility"
          score={feasibilityScore}
          colorType="feasibility"
          justification={scoreJustifications?.feasibility}
        />
        <ScoreCard
          label="Why Now"
          score={whyNowScore}
          colorType="whynow"
          justification={scoreJustifications?.whyNow}
        />
      </div>

      {scoreMetadata && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Based on {scoreMetadata.passCount} analysis passes</span>
          <span>{scoreMetadata.averageConfidence}% confidence</span>
        </div>
      )}
    </div>
  );
}
