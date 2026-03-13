import type {
  ReportCitation,
  ReportCitationIndex,
  CitationClaimType,
  CitationReliability,
  MarketSizingData,
  MarketSource,
  SparkResult,
  CompetitorData,
  ProofSignalsData,
  MarketAnalysis,
  WhyNowData,
} from '@forge/shared';

/**
 * Citation Extractor Service
 *
 * Scans generated report content and matches factual claims against
 * research data sources to produce inline citation metadata.
 *
 * Focuses on high-value claims: TAM/SAM/SOM, growth rates,
 * competitor data, proof signals, and market statistics.
 */

interface ResearchData {
  marketSizing?: MarketSizingData | string | null;
  marketAnalysis?: MarketAnalysis | string | null;
  sparkResult?: SparkResult | string | null;
  competitors?: CompetitorData[] | string | null;
  proofSignals?: ProofSignalsData | string | null;
  whyNow?: WhyNowData | string | null;
}

interface ExtractCitationsInput {
  content: string; // Report content (JSON string of sections or markdown)
  research: ResearchData;
}

// Parse a JSONB field that might be a string or already parsed
function parseJsonb<T>(value: T | string | null | undefined): T | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

// Regex patterns for detecting numerical claims in text
const DOLLAR_PATTERN = /\$[\d,.]+\s*(?:billion|million|B|M|K|trillion|T)/gi;
const PERCENTAGE_PATTERN = /[\d.]+%/g;
const CAGR_PATTERN = /(?:CAGR|growth rate|growing at|annual growth)\s*(?:of\s*)?[\d.]+%/gi;
const MARKET_SIZE_PATTERN = /(?:market\s+(?:size|valued|worth|estimated)|(?:TAM|SAM|SOM)\s*(?:of|is|:))\s*\$?[\d,.]+\s*(?:billion|million|B|M|K)?/gi;

/**
 * Extract citations from report content matched against research sources.
 * Returns a ReportCitationIndex with all matched citations.
 */
export function extractCitations(input: ExtractCitationsInput): ReportCitationIndex {
  const { content, research } = input;
  const citations: ReportCitation[] = [];
  let citationCounter = 0;

  // Parse research data
  const marketSizing = parseJsonb<MarketSizingData>(research.marketSizing);
  const sparkResult = parseJsonb<SparkResult>(research.sparkResult);
  const competitors = parseJsonb<CompetitorData[]>(research.competitors);
  const proofSignals = parseJsonb<ProofSignalsData>(research.proofSignals);
  const marketAnalysis = parseJsonb<MarketAnalysis>(research.marketAnalysis);

  // Collect all available sources from research
  const sourcePool = buildSourcePool(marketSizing, sparkResult, competitors, proofSignals, marketAnalysis);

  // Parse report content into sections
  let sections: Record<string, string>;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      sections = flattenSections(parsed);
    } else {
      sections = { rawContent: content };
    }
  } catch {
    sections = { rawContent: content };
  }

  // Scan each section for claims and match against sources
  for (const [sectionKey, sectionText] of Object.entries(sections)) {
    if (typeof sectionText !== 'string') continue;

    const sectionCitations = matchClaimsToSources(sectionText, sectionKey, sourcePool, citationCounter);
    citations.push(...sectionCitations);
    citationCounter += sectionCitations.length;
  }

  // Build reliability breakdown
  const reliabilityBreakdown = { primary: 0, secondary: 0, estimate: 0 };
  const seenSources = new Set<string>();
  for (const citation of citations) {
    const sourceKey = citation.source.title + (citation.source.url || '');
    if (!seenSources.has(sourceKey)) {
      seenSources.add(sourceKey);
      reliabilityBreakdown[citation.source.reliability]++;
    }
  }

  return {
    citations,
    generatedAt: new Date().toISOString(),
    totalSources: seenSources.size,
    reliabilityBreakdown,
  };
}

// ─── Source Pool Builder ────────────────────────────────────────────────────

interface PooledSource {
  title: string;
  url: string | null;
  date: string | null;
  reliability: CitationReliability;
  claimType: CitationClaimType;
  claimHints: string[]; // Keywords/values this source can back
  confidence: 'high' | 'medium' | 'low';
}

function buildSourcePool(
  marketSizing: MarketSizingData | null,
  sparkResult: SparkResult | null,
  competitors: CompetitorData[] | null,
  proofSignals: ProofSignalsData | null,
  marketAnalysis: MarketAnalysis | null,
): PooledSource[] {
  const pool: PooledSource[] = [];

  // Market sizing sources
  if (marketSizing?.sources) {
    for (const source of marketSizing.sources) {
      const hints: string[] = [];

      // Add TAM/SAM/SOM values as hints
      if (marketSizing.tam?.formattedValue) hints.push(marketSizing.tam.formattedValue);
      if (marketSizing.sam?.formattedValue) hints.push(marketSizing.sam.formattedValue);
      if (marketSizing.som?.formattedValue) hints.push(marketSizing.som.formattedValue);
      if (marketSizing.tam?.growthRate) hints.push(`${marketSizing.tam.growthRate}%`);
      if (marketSizing.sam?.growthRate) hints.push(`${marketSizing.sam.growthRate}%`);

      pool.push({
        title: source.title,
        url: source.url || null,
        date: source.date || null,
        reliability: source.reliability,
        claimType: 'market_size',
        claimHints: hints,
        confidence: reliabilityToConfidence(source.reliability),
      });
    }
  }

  // Spark TAM citations
  if (sparkResult?.tam?.citations) {
    for (const citation of sparkResult.tam.citations) {
      const hints: string[] = [];
      if (sparkResult.tam.base) hints.push(formatCurrency(sparkResult.tam.base));
      if (sparkResult.tam.low) hints.push(formatCurrency(sparkResult.tam.low));
      if (sparkResult.tam.high) hints.push(formatCurrency(sparkResult.tam.high));

      pool.push({
        title: citation.label,
        url: citation.url || null,
        date: null,
        reliability: 'secondary',
        claimType: 'tam',
        claimHints: hints,
        confidence: 'medium',
      });
    }
  }

  // Spark trend evidence
  if (sparkResult?.trend_signal?.evidence) {
    for (const evidence of sparkResult.trend_signal.evidence) {
      pool.push({
        title: evidence.claim,
        url: evidence.source_url || null,
        date: null,
        reliability: 'secondary',
        claimType: 'trend',
        claimHints: extractNumbersFromText(evidence.claim),
        confidence: 'medium',
      });
    }
  }

  // Competitor data
  if (competitors) {
    for (const competitor of competitors) {
      const hints: string[] = [competitor.name];
      if (competitor.estimatedRevenue) hints.push(competitor.estimatedRevenue);
      if (competitor.marketShare != null) hints.push(`${competitor.marketShare}%`);

      if (competitor.website || competitor.estimatedRevenue || competitor.marketShare) {
        pool.push({
          title: `${competitor.name} competitive data`,
          url: competitor.website || null,
          date: null,
          reliability: 'secondary',
          claimType: 'competitor_data',
          claimHints: hints,
          confidence: competitor.estimatedRevenue ? 'medium' : 'low',
        });
      }
    }
  }

  // Proof signals — social mentions
  if (proofSignals) {
    const mentions = [
      ...(proofSignals.redditMentions || []),
      ...(proofSignals.forumDiscussions || []),
    ];
    for (const mention of mentions.slice(0, 10)) { // Cap at 10 to keep citations manageable
      pool.push({
        title: mention.title,
        url: mention.url || null,
        date: mention.date || null,
        reliability: 'primary',
        claimType: 'proof_signal',
        claimHints: [mention.platform, mention.title],
        confidence: 'high',
      });
    }
  }

  // Market analysis growth data
  if (marketAnalysis) {
    if (marketAnalysis.growthRate) {
      pool.push({
        title: 'Market growth analysis',
        url: null,
        date: null,
        reliability: 'estimate',
        claimType: 'growth_rate',
        claimHints: [`${marketAnalysis.growthRate}%`],
        confidence: 'low',
      });
    }
    if (marketAnalysis.keyMetrics?.cagr) {
      pool.push({
        title: 'Market key metrics',
        url: null,
        date: null,
        reliability: 'estimate',
        claimType: 'growth_rate',
        claimHints: [marketAnalysis.keyMetrics.cagr],
        confidence: 'low',
      });
    }
  }

  return pool;
}

// ─── Claim Matching ─────────────────────────────────────────────────────────

function matchClaimsToSources(
  text: string,
  sectionKey: string,
  sourcePool: PooledSource[],
  startId: number,
): ReportCitation[] {
  const citations: ReportCitation[] = [];
  const usedClaims = new Set<string>(); // Avoid duplicate citations for the same claim

  // Extract all numerical claims from text
  const claims = extractClaims(text);

  for (const claim of claims) {
    if (usedClaims.has(claim.text)) continue;

    // Find the best matching source
    const match = findBestSource(claim, sourcePool);
    if (!match) continue;

    usedClaims.add(claim.text);
    citations.push({
      id: `c${startId + citations.length + 1}`,
      sectionKey,
      claim: claim.text,
      claimType: match.claimType,
      source: {
        title: match.title,
        url: match.url,
        date: match.date,
        reliability: match.reliability,
      },
      confidence: match.confidence,
    });
  }

  return citations;
}

interface ExtractedClaim {
  text: string;
  type: 'dollar' | 'percentage' | 'cagr' | 'market_size';
  normalizedValue: string; // The core numeric value for matching
}

function extractClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();

  // Market size patterns (most specific first)
  for (const match of text.matchAll(MARKET_SIZE_PATTERN)) {
    const claim = match[0].trim();
    if (!seen.has(claim)) {
      seen.add(claim);
      claims.push({ text: claim, type: 'market_size', normalizedValue: extractDollarValue(claim) });
    }
  }

  // CAGR patterns
  for (const match of text.matchAll(CAGR_PATTERN)) {
    const claim = match[0].trim();
    if (!seen.has(claim)) {
      seen.add(claim);
      claims.push({ text: claim, type: 'cagr', normalizedValue: extractPercentage(claim) });
    }
  }

  // Dollar amounts
  for (const match of text.matchAll(DOLLAR_PATTERN)) {
    const claim = match[0].trim();
    if (!seen.has(claim)) {
      seen.add(claim);
      claims.push({ text: claim, type: 'dollar', normalizedValue: claim });
    }
  }

  // Standalone percentages (only if near keywords like growth, rate, share)
  const percentContext = /(?:growth|rate|share|cagr|increase|decline|annual)\s*(?:of\s*)?[\d.]+%|[\d.]+%\s*(?:growth|rate|share|cagr|increase|decline|annual)/gi;
  for (const match of text.matchAll(percentContext)) {
    const claim = match[0].trim();
    if (!seen.has(claim)) {
      seen.add(claim);
      claims.push({ text: claim, type: 'percentage', normalizedValue: extractPercentage(claim) });
    }
  }

  return claims;
}

function findBestSource(claim: ExtractedClaim, sourcePool: PooledSource[]): PooledSource | null {
  let bestMatch: PooledSource | null = null;
  let bestScore = 0;

  for (const source of sourcePool) {
    let score = 0;

    // Check if any hint matches the claim value
    for (const hint of source.claimHints) {
      if (claim.text.includes(hint) || hint.includes(claim.normalizedValue)) {
        score += 3;
      }
      // Fuzzy: check if numbers overlap
      const claimNums = extractNumbersFromText(claim.text);
      const hintNums = extractNumbersFromText(hint);
      for (const cn of claimNums) {
        for (const hn of hintNums) {
          if (cn === hn) score += 2;
        }
      }
    }

    // Type affinity bonus
    if (
      (claim.type === 'dollar' && (source.claimType === 'tam' || source.claimType === 'market_size')) ||
      (claim.type === 'cagr' && source.claimType === 'growth_rate') ||
      (claim.type === 'market_size' && (source.claimType === 'tam' || source.claimType === 'sam' || source.claimType === 'som' || source.claimType === 'market_size')) ||
      (claim.type === 'percentage' && (source.claimType === 'growth_rate' || source.claimType === 'competitor_data'))
    ) {
      score += 1;
    }

    // Prefer higher reliability
    if (source.reliability === 'primary') score += 0.5;
    else if (source.reliability === 'secondary') score += 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = source;
    }
  }

  // Only return a match if the score is above threshold
  return bestScore >= 2 ? bestMatch : null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function reliabilityToConfidence(reliability: CitationReliability): 'high' | 'medium' | 'low' {
  switch (reliability) {
    case 'primary': return 'high';
    case 'secondary': return 'medium';
    case 'estimate': return 'low';
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function extractDollarValue(text: string): string {
  const match = text.match(/\$[\d,.]+/);
  return match ? match[0] : '';
}

function extractPercentage(text: string): string {
  const match = text.match(/[\d.]+%/);
  return match ? match[0] : '';
}

function extractNumbersFromText(text: string): string[] {
  const matches = text.match(/[\d,.]+/g);
  return matches ? matches.map((m) => m.replace(/,/g, '')) : [];
}

function flattenSections(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenSections(value as Record<string, unknown>, fullKey));
    } else if (Array.isArray(value)) {
      // Join array items for scanning
      const textItems = value.filter((v) => typeof v === 'string');
      if (textItems.length > 0) {
        result[fullKey] = textItems.join('\n');
      }
    }
  }
  return result;
}
