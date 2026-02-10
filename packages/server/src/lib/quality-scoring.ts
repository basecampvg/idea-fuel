/**
 * Quality Scoring Module
 *
 * Computes per-section data quality scores and overall confidence levels
 * for Spark pipeline results. Detects thin results using defined thresholds.
 */

import type {
  ConfidenceLevel,
  SectionQuality,
  DataQualityReport,
} from '@forge/shared';
import type { SparkDemandResult } from '../services/spark-demand';
import type { SparkTamResult } from '../services/spark-tam';
import type { SparkCompetitorResult } from '../services/spark-competitors';

// =============================================================================
// THIN-RESULT THRESHOLDS
// =============================================================================

const THRESHOLDS = {
  demand: {
    reddit: { low: 1, medium: 3 },     // 0-1 = low, 2-3 = medium, 4+ = high
    facebook: { low: 0, medium: 1 },    // 0 = low, 1 = medium, 2+ = high
    wtpClues: { low: 0, medium: 2 },    // 0 = low, 1-2 = medium, 3+ = high
  },
  tam: {
    citations: { low: 0, medium: 2 },   // 0 = low, 1-2 = medium, 3+ = high
    baseValue: 0,                         // base = 0 means no real data
  },
  competitors: {
    count: { low: 1, medium: 3 },        // 0-1 = low, 2-3 = medium, 4+ = high
  },
  trends: {
    unknownIsLow: true,                  // "unknown" direction = low confidence
  },
};

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

function scoreConfidence(value: number, thresholds: { low: number; medium: number }): ConfidenceLevel {
  if (value <= thresholds.low) return 'low';
  if (value <= thresholds.medium) return 'medium';
  return 'high';
}

/**
 * Score demand research quality (Reddit + Facebook + WTP)
 */
function scoreDemand(result: SparkDemandResult | null, queriesRun: number): SectionQuality {
  if (!result) {
    return {
      section: 'demand',
      confidence: 'low',
      queriesRun,
      resultsFound: 0,
      details: 'Demand research unavailable',
    };
  }

  const redditCount = result.reddit.top_threads.length;
  const fbCount = result.facebook_groups.length;
  const wtpCount = result.reddit.willingness_to_pay_clues.length;

  const redditConf = scoreConfidence(redditCount, THRESHOLDS.demand.reddit);
  const fbConf = scoreConfidence(fbCount, THRESHOLDS.demand.facebook);
  const wtpConf = scoreConfidence(wtpCount, THRESHOLDS.demand.wtpClues);

  // Overall demand confidence: weighted average
  const confMap: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
  const avgScore = (confMap[redditConf] * 2 + confMap[fbConf] + confMap[wtpConf]) / 4;
  const confidence: ConfidenceLevel = avgScore >= 2.5 ? 'high' : avgScore >= 1.5 ? 'medium' : 'low';

  const totalFound = redditCount + fbCount;
  const parts: string[] = [];
  if (redditCount > 0) parts.push(`${redditCount} Reddit thread${redditCount !== 1 ? 's' : ''}`);
  if (fbCount > 0) parts.push(`${fbCount} Facebook group${fbCount !== 1 ? 's' : ''}`);
  if (wtpCount > 0) parts.push(`${wtpCount} WTP clue${wtpCount !== 1 ? 's' : ''}`);

  return {
    section: 'demand',
    confidence,
    queriesRun,
    resultsFound: totalFound,
    details: parts.length > 0 ? parts.join(', ') : 'No demand signals found',
  };
}

/**
 * Score TAM research quality
 */
function scoreTam(result: SparkTamResult | null, queriesRun: number): SectionQuality {
  if (!result) {
    return {
      section: 'tam',
      confidence: 'low',
      queriesRun,
      resultsFound: 0,
      details: 'Market sizing unavailable',
    };
  }

  const citationCount = result.tam.citations.length;
  const hasRealData = result.tam.base > 0;
  const citationConf = scoreConfidence(citationCount, THRESHOLDS.tam.citations);

  // If base is 0, override to low regardless of citations
  const confidence: ConfidenceLevel = !hasRealData ? 'low' : citationConf;

  const parts: string[] = [];
  if (hasRealData) parts.push(`TAM $${formatNumber(result.tam.base)}`);
  if (citationCount > 0) parts.push(`${citationCount} citation${citationCount !== 1 ? 's' : ''}`);
  const direction = result.trend_signal?.direction;
  if (direction && direction !== 'unknown') parts.push(`trend: ${direction}`);

  return {
    section: 'tam',
    confidence,
    queriesRun,
    resultsFound: citationCount,
    details: parts.length > 0 ? parts.join(', ') : 'No market data found',
  };
}

/**
 * Score competitor research quality
 */
function scoreCompetitors(result: SparkCompetitorResult | null, queriesRun: number): SectionQuality {
  if (!result) {
    return {
      section: 'competitors',
      confidence: 'low',
      queriesRun,
      resultsFound: 0,
      details: 'Competitor analysis unavailable',
    };
  }

  const count = result.competitors.length;
  const confidence = scoreConfidence(count, THRESHOLDS.competitors.count);
  const gapCount = result.market_gaps.length;

  const parts: string[] = [];
  if (count > 0) parts.push(`${count} competitor${count !== 1 ? 's' : ''}`);
  if (gapCount > 0) parts.push(`${gapCount} market gap${gapCount !== 1 ? 's' : ''}`);

  return {
    section: 'competitors',
    confidence,
    queriesRun,
    resultsFound: count,
    details: parts.length > 0 ? parts.join(', ') : 'No competitors found',
  };
}

// =============================================================================
// OVERALL QUALITY COMPUTATION
// =============================================================================

/**
 * Compute the overall data quality report from Spark pipeline results.
 *
 * @param demandResult - Result from demand research (Call 2)
 * @param tamResult - Result from TAM research (Call 3)
 * @param competitorResult - Result from competitor research (Call 4)
 * @param queriedTopics - List of expanded queries used
 * @param queriesPerSection - Approximate queries run per section
 */
export function computeSparkQualityScores(
  demandResult: SparkDemandResult | null,
  tamResult: SparkTamResult | null,
  competitorResult: SparkCompetitorResult | null,
  queriedTopics: string[] = [],
  queriesPerSection: number = 0
): DataQualityReport {
  const sections: SectionQuality[] = [
    scoreDemand(demandResult, queriesPerSection),
    scoreTam(tamResult, queriesPerSection),
    scoreCompetitors(competitorResult, queriesPerSection),
  ];

  // Overall confidence rules:
  // ALL high → high
  // ANY low → medium (unless 2+ low → low)
  // Override: demand + TAM both low → low
  const lowCount = sections.filter((s) => s.confidence === 'low').length;
  const highCount = sections.filter((s) => s.confidence === 'high').length;
  const demandConf = sections.find((s) => s.section === 'demand')?.confidence;
  const tamConf = sections.find((s) => s.section === 'tam')?.confidence;

  let overall: ConfidenceLevel;
  if (demandConf === 'low' && tamConf === 'low') {
    overall = 'low';
  } else if (lowCount >= 2) {
    overall = 'low';
  } else if (highCount === sections.length) {
    overall = 'high';
  } else if (lowCount >= 1) {
    overall = 'medium';
  } else {
    overall = 'medium';
  }

  // Build human-readable summary
  const summaryParts: string[] = [];
  for (const section of sections) {
    const prefix = section.confidence === 'high' ? 'Strong' : section.confidence === 'medium' ? 'Moderate' : 'Weak';
    summaryParts.push(`${prefix} ${section.section} signals`);
  }

  return {
    overall,
    sections,
    summary: summaryParts.join(', '),
    queriedTopics,
  };
}

/**
 * Convert a DataQualityReport to a string for the synthesis prompt
 * (replaces the old string-based dataQualityContext)
 */
export function qualityReportToPromptContext(report: DataQualityReport): string {
  const lines: string[] = [
    `Overall data quality: ${report.overall.toUpperCase()}`,
    '',
  ];

  for (const section of report.sections) {
    lines.push(`- ${section.section}: ${section.confidence.toUpperCase()} — ${section.details}`);
  }

  if (report.queriedTopics.length > 0) {
    lines.push('');
    lines.push(`Searched ${report.queriedTopics.length} query variations across all sections.`);
  }

  return lines.join('\n');
}

// =============================================================================
// HELPERS
// =============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
