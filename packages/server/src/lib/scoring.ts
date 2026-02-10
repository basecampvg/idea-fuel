/**
 * Scoring Module for Daily Trend Pick
 *
 * Implements:
 * - Growth Score (0-100) from trend data
 * - Purchase Proof Score (0-100) from SERP signals
 */

// Types for trend points
interface TrendPoint {
  ts: string;
  value: number;
}

// Types for SERP snapshot
interface SerpSnapshotData {
  adsCount: number;
  shoppingPresent: boolean;
  topStoriesPresent: boolean;
  topDomains: string[];
  snippetsSample: { title: string; snippet: string; url?: string }[];
}

// Marketplace domains that indicate purchase intent
const MARKETPLACE_DOMAINS = [
  'amazon.com',
  'ebay.com',
  'walmart.com',
  'target.com',
  'bestbuy.com',
  'etsy.com',
  'aliexpress.com',
  'newegg.com',
  'homedepot.com',
  'lowes.com',
  'costco.com',
  'wayfair.com',
  'chewy.com',
  'zappos.com',
  'overstock.com',
];

/**
 * Calculate Growth Score (0-100) from trend points
 *
 * Factors:
 * - Spike ratio: avg(last 24h) vs avg(prev 7d)
 * - Acceleration: avg(last 4h) vs avg(prev 24h)
 * - Persistence: count intervals above baseline
 */
export function calculateGrowthScore(points: TrendPoint[]): number {
  if (!points || points.length < 7) {
    return 0;
  }

  // Sort points by timestamp (oldest first)
  const sorted = [...points].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  // Calculate averages for different time windows
  // Assuming daily or hourly data points
  const totalPoints = sorted.length;

  // Last ~24 points as "recent"
  const recentWindow = Math.min(24, Math.floor(totalPoints * 0.1));
  const recentPoints = sorted.slice(-recentWindow);
  const recentAvg = average(recentPoints.map((p) => p.value));

  // Previous 7-day window (or 25% of data)
  const prevWindowSize = Math.min(168, Math.floor(totalPoints * 0.25));
  const prevStart = Math.max(0, sorted.length - recentWindow - prevWindowSize);
  const prevEnd = sorted.length - recentWindow;
  const prevPoints = sorted.slice(prevStart, prevEnd);
  const prevAvg = average(prevPoints.map((p) => p.value));

  // Spike ratio
  const spikeRatio = prevAvg > 0 ? recentAvg / prevAvg : recentAvg > 0 ? 2 : 0;

  // Acceleration: very recent vs recent
  const veryRecentWindow = Math.max(4, Math.floor(recentWindow / 6));
  const veryRecentPoints = sorted.slice(-veryRecentWindow);
  const veryRecentAvg = average(veryRecentPoints.map((p) => p.value));
  const slightlyOlderPoints = sorted.slice(
    -(recentWindow),
    -(veryRecentWindow)
  );
  const slightlyOlderAvg = average(slightlyOlderPoints.map((p) => p.value));
  const acceleration =
    slightlyOlderAvg > 0 ? veryRecentAvg / slightlyOlderAvg : veryRecentAvg > 0 ? 1.5 : 0;

  // Persistence: count of points above baseline (median)
  const allValues = sorted.map((p) => p.value);
  const baseline = median(allValues);
  const aboveBaseline = allValues.filter((v) => v > baseline).length;
  const persistenceRatio = aboveBaseline / totalPoints;

  // Combine factors into score (0-100)
  let score = 0;

  // Spike ratio contribution (0-40 points)
  if (spikeRatio >= 3) {
    score += 40;
  } else if (spikeRatio >= 2) {
    score += 30;
  } else if (spikeRatio >= 1.5) {
    score += 20;
  } else if (spikeRatio >= 1.2) {
    score += 10;
  }

  // Acceleration contribution (0-30 points)
  if (acceleration >= 2) {
    score += 30;
  } else if (acceleration >= 1.5) {
    score += 20;
  } else if (acceleration >= 1.2) {
    score += 10;
  }

  // Persistence contribution (0-30 points)
  score += Math.round(persistenceRatio * 30);

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate Purchase Proof Score (0-100) from SERP signals
 *
 * Factors:
 * - adsCount scaled (0-5 ads = 0-25 points)
 * - shoppingPresent bonus (+15)
 * - marketplace domains in topDomains bonus (+20 max)
 * - query modifier bonuses (best/vs/review/price/deal/near me)
 * - topStoriesPresent mild penalty unless commercial signals strong
 */
export function calculatePurchaseProofScore(
  serpData: SerpSnapshotData,
  query: string
): number {
  let score = 0;

  // Ads count contribution (0-25 points)
  // More ads = more commercial intent
  const adsPoints = Math.min(25, serpData.adsCount * 5);
  score += adsPoints;

  // Shopping presence bonus (+15)
  if (serpData.shoppingPresent) {
    score += 15;
  }

  // Marketplace domains bonus (0-20 points)
  const marketplaceDomains = serpData.topDomains.filter((domain) =>
    MARKETPLACE_DOMAINS.some((mp) => domain.includes(mp))
  );
  const marketplacePoints = Math.min(20, marketplaceDomains.length * 5);
  score += marketplacePoints;

  // Query modifier bonuses (0-20 points total)
  const queryLower = query.toLowerCase();
  let modifierPoints = 0;

  if (/\bbest\b/.test(queryLower)) modifierPoints += 5;
  if (/\bvs\b|\bversus\b/.test(queryLower)) modifierPoints += 5;
  if (/\breview(s)?\b/.test(queryLower)) modifierPoints += 4;
  if (/\bprice\b|\bcost\b/.test(queryLower)) modifierPoints += 3;
  if (/\bdeal\b|\bdiscount\b|\bcoupon\b/.test(queryLower)) modifierPoints += 3;
  if (/\bnear me\b/.test(queryLower)) modifierPoints += 5;

  score += Math.min(20, modifierPoints);

  // Top stories penalty (news = less commercial unless strong signals)
  if (serpData.topStoriesPresent) {
    // Only penalize if commercial signals are weak
    if (score < 40) {
      score -= 10;
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Map AI triage output to pain point score (0-100)
 */
export function calculatePainPointScore(triage: {
  pain_point: { urgency: number };
  confidence: number;
  intent: string;
}): number {
  // Base score from urgency (1-5 scale -> 0-60 points)
  const urgencyScore = (triage.pain_point.urgency / 5) * 60;

  // Intent modifier
  let intentMultiplier = 1;
  if (triage.intent === 'problem') {
    intentMultiplier = 1.2;
  } else if (triage.intent === 'mixed') {
    intentMultiplier = 1.0;
  } else if (triage.intent === 'purchase') {
    intentMultiplier = 0.8;
  } else {
    intentMultiplier = 0.5;
  }

  // Confidence weighting
  const baseScore = urgencyScore * intentMultiplier;
  const weightedScore = baseScore * (0.5 + 0.5 * triage.confidence);

  // Add bonus for high urgency
  let bonus = 0;
  if (triage.pain_point.urgency >= 4) {
    bonus = 20;
  } else if (triage.pain_point.urgency >= 3) {
    bonus = 10;
  }

  return Math.min(100, Math.max(0, Math.round(weightedScore + bonus)));
}

// Helper functions
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
