'use client';

import { useState, useEffect } from 'react';
import { Info, AlertTriangle, ChevronDown } from 'lucide-react';

// Tooltip descriptions for each score type
const scoreTooltips: Record<string, string> = {
  opportunity: 'Market opportunity score based on market size, growth potential, and competitive landscape.',
  problem: 'Problem severity score measuring how painful the problem is for your target customers.',
  feasibility: 'Execution feasibility based on technical complexity, resources needed, and time to market.',
  whynow: 'Timing score evaluating market conditions, trends, and urgency factors that make now the right time.',
};

// Border glow colors for expanded state (matching score type)
const expandedBorderColors: Record<string, string> = {
  opportunity: 'border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.2)]',
  problem: 'border-[#e91e8c] shadow-[0_0_20px_rgba(233,30,140,0.2)]',
  feasibility: 'border-[#14b8a6] shadow-[0_0_20px_rgba(20,184,166,0.2)]',
  whynow: 'border-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.2)]',
};

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
  layout?: 'grid' | 'horizontal';
  title?: string;
  subtitle?: string;
}

interface ScoreCardProps {
  label: string;
  score: number | null | undefined;
  colorType: 'opportunity' | 'problem' | 'feasibility' | 'whynow';
  isHighlighted?: boolean;
  justification?: ScoreWithJustification | null;
  isExpanded: boolean;
  onToggle: () => void;
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
      return 'bg-[#22c55e]';
    case 'medium':
      return 'bg-[#f59e0b]';
    case 'low':
      return 'bg-[#ef4444]';
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

function ScoreCard({ label, score, colorType, isHighlighted = false, justification, isExpanded, onToggle }: ScoreCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const displayScore = score ?? '--';
  const description = getSpecialDescription(colorType, score);

  // Animate progress bar on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Gradient colors for progress bars
  const barGradients: Record<string, string> = {
    opportunity: 'from-[#16a34a] to-[#4ade80]',  // Green gradient
    problem: 'from-[#be185d] to-[#f472b6]',      // Pink gradient
    feasibility: 'from-[#0d9488] to-[#5eead4]',  // Teal gradient
    whynow: 'from-[#7c3aed] to-[#a78bfa]',       // Purple gradient
  };

  // Calculate progress width (score out of 100)
  const progressWidth = score !== null && score !== undefined ? Math.min(Math.max(score, 0), 100) : 0;

  const hasJustification = justification?.justification;
  const tooltipText = scoreTooltips[colorType];

  // Card styling - expanded gets colored glow, highlighted (high pain) gets pink
  const getCardClass = () => {
    const baseClass = 'bg-background border rounded-xl p-4 transition-all duration-300';

    if (isExpanded && hasJustification) {
      return `${baseClass} ${expandedBorderColors[colorType]}`;
    }
    if (isHighlighted) {
      return `${baseClass} border-[#e91e8c] shadow-[0_0_20px_rgba(233,30,140,0.2)]`;
    }
    return `${baseClass} border-border`;
  };

  return (
    <div className={getCardClass()}>
      {/* Header: Label + info icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground font-medium">
            {label}
          </span>
          {hasJustification ? (
            <button
              onClick={onToggle}
              className="p-0.5 rounded hover:bg-card transition-colors"
              title="Click to see scoring explanation"
            >
              <ChevronDown
                className={`w-3 h-3 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          ) : (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="p-0.5 rounded hover:bg-card transition-colors"
              >
                <Info className="w-3 h-3 text-muted-foreground" />
              </button>
              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 px-3 py-2 text-xs text-foreground bg-card border border-border rounded-lg shadow-lg pointer-events-none">
                  {tooltipText}
                  {/* Arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-[-1px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-card" />
                </div>
              )}
            </div>
          )}
        </div>
        {/* Confidence indicator */}
        {justification && (
          <div
            className={`w-2 h-2 rounded-full ${getConfidenceColor(justification.confidence)}`}
            title={getConfidenceLabel(justification.confidence)}
          />
        )}
      </div>

      {/* Score - large number */}
      <div className="text-[32px] font-bold text-foreground tabular-nums leading-none">
        {displayScore}
      </div>

      {/* Description below score */}
      <p className="text-xs text-muted-foreground mt-1">
        {description}
      </p>

      {/* Progress bar with mount animation */}
      <div className="h-[3px] rounded-full mt-3 bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradients[colorType]} transition-all duration-700 ease-out`}
          style={{ width: mounted ? `${progressWidth}%` : '0%' }}
        />
      </div>

      {/* Expandable justification using CSS grid trick for smooth auto-height */}
      {hasJustification && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className={`pt-3 mt-3 border-t border-border transition-opacity duration-300 ${
              isExpanded ? 'opacity-100 delay-100' : 'opacity-0'
            }`}>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {justification.justification}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(justification.confidence)}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {getConfidenceLabel(justification.confidence)}
                </span>
              </div>
            </div>
          </div>
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
  layout = 'grid',
  title,
  subtitle,
}: ScoreCardsProps) {
  // Accordion state - only one card expanded at a time
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleToggle = (cardType: string) => {
    setExpandedCard(prev => prev === cardType ? null : cardType);
  };

  // Determine if problem score should be highlighted (High Pain effect)
  const isProblemHighlighted = problemScore !== null && problemScore !== undefined && problemScore >= 70;

  // Grid classes based on layout
  const gridClass = layout === 'horizontal'
    ? 'grid grid-cols-2 md:grid-cols-4 gap-3'
    : 'grid grid-cols-2 gap-3';

  return (
    <div className="space-y-3">
      {/* Optional title/subtitle */}
      {(title || subtitle) && (
        <div className="mb-1">
          {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      {/* Warning banner if scores were flagged for high variance */}
      {scoreMetadata?.flagged && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20">
          <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-[#f59e0b] font-medium">Score Variance Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {scoreMetadata.flagReason || 'Scores showed significant variation between analysis passes. Review justifications for context.'}
            </p>
          </div>
        </div>
      )}

      <div className={gridClass}>
        <ScoreCard
          label="Opportunity"
          score={opportunityScore}
          colorType="opportunity"
          justification={scoreJustifications?.opportunity}
          isExpanded={expandedCard === 'opportunity'}
          onToggle={() => handleToggle('opportunity')}
        />
        <ScoreCard
          label="Problem"
          score={problemScore}
          colorType="problem"
          isHighlighted={isProblemHighlighted}
          justification={scoreJustifications?.problem}
          isExpanded={expandedCard === 'problem'}
          onToggle={() => handleToggle('problem')}
        />
        <ScoreCard
          label="Feasibility"
          score={feasibilityScore}
          colorType="feasibility"
          justification={scoreJustifications?.feasibility}
          isExpanded={expandedCard === 'feasibility'}
          onToggle={() => handleToggle('feasibility')}
        />
        <ScoreCard
          label="Why Now"
          score={whyNowScore}
          colorType="whynow"
          justification={scoreJustifications?.whyNow}
          isExpanded={expandedCard === 'whynow'}
          onToggle={() => handleToggle('whynow')}
        />
      </div>

      {/* Confidence footer */}
      {scoreMetadata && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span>
            Based on {scoreMetadata.passCount} analysis passes
          </span>
          <span>
            {scoreMetadata.averageConfidence}% confidence
          </span>
        </div>
      )}
    </div>
  );
}
