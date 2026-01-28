/**
 * Winner Selection for Daily Trend Pick
 *
 * Implements the combined scoring algorithm and winner selection logic.
 */

export interface ClusterScores {
  growth: number; // 0-100
  purchaseProof: number; // 0-100
  painPoint: number; // 0-100
  confidence: number; // 0-1
  newsSpikeRisk: number; // 0-1
  size: number; // Number of queries in cluster
  intent: 'problem' | 'purchase' | 'mixed' | 'unclear';
}

/**
 * Calculate combined score for a cluster
 *
 * Formula:
 *   0.40 * GrowthScore +
 *   0.35 * PurchaseProofScore +
 *   0.25 * (PainPointScore * triageConfidence)
 *
 * Penalties:
 *   - if newsSpikeRisk > 0.7 and purchaseProofScore < 50 => -20 (severe)
 *   - if newsSpikeRisk > 0.5 and purchaseProofScore < 40 => -10 (moderate)
 *   - if size < 3 => -10
 *   - if size > 10 => -5
 *   - if intent == "unclear" => -20
 */
export function combinedScore(s: ClusterScores): number {
  let score =
    0.4 * s.growth + 0.35 * s.purchaseProof + 0.25 * (s.painPoint * s.confidence);

  // News spike penalties (strengthened)
  // Severe: high risk + very weak purchase signals
  if (s.newsSpikeRisk > 0.7 && s.purchaseProof < 50) {
    score -= 20;
  }
  // Moderate: medium risk + weak purchase signals
  else if (s.newsSpikeRisk > 0.5 && s.purchaseProof < 40) {
    score -= 10;
  }

  // Size penalties
  if (s.size < 3) {
    score -= 10;
  } else if (s.size > 10) {
    score -= 5;
  }

  // Unclear intent penalty
  if (s.intent === 'unclear') {
    score -= 20;
  }

  return score;
}

/**
 * Generate winner reason strings based on scores
 */
export function generateWinnerReasons(s: ClusterScores): string[] {
  const reasons: string[] = [];

  // Growth reasons
  if (s.growth >= 80) {
    reasons.push('Exceptional growth trend (score: ' + s.growth + ')');
  } else if (s.growth >= 60) {
    reasons.push('Strong growth momentum (score: ' + s.growth + ')');
  }

  // Purchase proof reasons
  if (s.purchaseProof >= 80) {
    reasons.push('Strong purchase intent signals (score: ' + s.purchaseProof + ')');
  } else if (s.purchaseProof >= 60) {
    reasons.push('Moderate commercial signals (score: ' + s.purchaseProof + ')');
  }

  // Pain point reasons
  if (s.painPoint * s.confidence >= 60) {
    reasons.push(
      'Clear pain point identified (score: ' +
        Math.round(s.painPoint) +
        ', confidence: ' +
        Math.round(s.confidence * 100) +
        '%)'
    );
  }

  // Intent reasons
  if (s.intent === 'problem') {
    reasons.push('Problem-focused intent indicates real user need');
  } else if (s.intent === 'purchase') {
    reasons.push('Purchase intent indicates buying readiness');
  } else if (s.intent === 'mixed') {
    reasons.push('Mixed intent shows both problem awareness and purchase consideration');
  }

  // Cluster size
  if (s.size >= 3 && s.size <= 10) {
    reasons.push('Optimal cluster size (' + s.size + ' related queries)');
  }

  // Risk factors
  if (s.newsSpikeRisk > 0.7) {
    reasons.push('⚠️ High news spike risk detected (may be event-driven)');
  } else if (s.newsSpikeRisk > 0.5) {
    reasons.push('Note: Moderate news spike risk');
  }

  return reasons;
}

export interface ScoredCluster {
  id: string;
  scores: ClusterScores;
  combinedScore: number;
  winnerReason: string[];
}

/**
 * Select the winning cluster from a list of scored clusters
 * Returns the cluster with the highest combined score
 */
export function selectWinner(
  clusters: ScoredCluster[],
  minWinnerScore: number = 55
): {
  winner: ScoredCluster | null;
  isLowConfidence: boolean;
} {
  if (clusters.length === 0) {
    return { winner: null, isLowConfidence: true };
  }

  // Sort by combined score descending
  const sorted = [...clusters].sort((a, b) => b.combinedScore - a.combinedScore);

  const winner = sorted[0];
  const isLowConfidence = winner.combinedScore < minWinnerScore;

  return { winner, isLowConfidence };
}

/**
 * Rank all clusters by combined score
 */
export function rankClusters(clusters: ScoredCluster[]): ScoredCluster[] {
  return [...clusters].sort((a, b) => b.combinedScore - a.combinedScore);
}
