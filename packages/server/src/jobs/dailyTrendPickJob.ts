/**
 * Daily Trend Pick Job
 *
 * Main orchestration for the Daily Trend Pick feature.
 * Runs the complete pipeline from ingestion to winner selection.
 */

import { prisma } from '../db';
import { formatInTimeZone } from 'date-fns-tz';
import type { Prisma } from '../generated/prisma';
import {
  getTrendingNow,
  getTrendingExpanded,
  getTrendData,
  fetchSerpSnapshot,
  fetchRelatedRisingQueries,
  fetchSeedRelatedQueries,
  type SerpSnapshotParsed,
  type GrowthQuery,
} from '../lib/serpapi';
import { normalizeQuery, normalizeAndDedupeQueries } from '../lib/normalizeQuery';
import { filterQueriesBatch } from '../lib/intentFormFilter';
import { clusterQueries } from '../lib/clustering';
import {
  calculateGrowthScore,
  calculatePurchaseProofScore,
  calculatePainPointScore,
} from '../lib/scoring';
import {
  combinedScore,
  generateWinnerReasons,
  selectWinner,
  type ClusterScores,
  type ScoredCluster,
} from '../lib/winner';
import { runStructured } from '../lib/openai';
import type { DailyRunStatus } from '../generated/prisma';

// Default seed keywords for commercial trend discovery
// These are evergreen queries in commercially-viable categories
const DEFAULT_SEED_KEYWORDS = [
  // Software/SaaS
  'best crm software',
  'project management tools',
  'email marketing platform',
  'accounting software small business',
  'inventory management software',
  // E-commerce/Product Business
  'dropshipping products',
  'wholesale suppliers',
  'print on demand',
  'private label products',
  'amazon fba products',
  // Services/Consulting
  'how to start consulting business',
  'online course platform',
  'coaching business',
  'freelance services',
  // AI/Tech
  'ai tools for business',
  'no code app builder',
  'automation software',
  'chatbot platform',
  // Content/Creator
  'newsletter monetization',
  'youtube channel ideas',
  'podcast equipment',
  'membership site platform',
];

// Configuration from environment
// NOTE: Defaults tuned for testing (low API usage). Increase for production.
const CONFIG = {
  DEFAULT_GEO: process.env.DEFAULT_GEO || 'US',
  DEFAULT_TIMEFRAME: process.env.DEFAULT_TIMEFRAME || '90d',
  TZ: process.env.TZ || 'America/Denver',
  MAX_CANDIDATES: parseInt(process.env.MAX_CANDIDATES || '100', 10), // Reduced from 200
  MIN_FILTERED_CANDIDATES: parseInt(process.env.MIN_FILTERED_CANDIDATES || '10', 10), // Reduced from 25
  FALLBACK_ALLOW_NON_MATCHING: process.env.FALLBACK_ALLOW_NON_MATCHING !== 'false',
  FALLBACK_TOP_N: parseInt(process.env.FALLBACK_TOP_N || '5', 10), // Reduced from 10
  MAX_ENRICH: parseInt(process.env.MAX_ENRICH || '15', 10), // Reduced from 50 (saves ~70 API calls)
  CACHE_TTL_HOURS: parseInt(process.env.CACHE_TTL_HOURS || '24', 10),
  MIN_WINNER_SCORE: parseInt(process.env.MIN_WINNER_SCORE || '55', 10),
  // Stage 1.75: Post-filter expansion
  EXPAND_TOP_N: parseInt(process.env.EXPAND_TOP_N || '5', 10), // Reduced from 20 (saves ~15 API calls)
  EXPAND_TIME_RANGE: process.env.EXPAND_TIME_RANGE || 'today 3-m',
  // Ingestion settings
  RELATED_QUERIES_FOR_TOP_N: parseInt(process.env.RELATED_QUERIES_FOR_TOP_N || '3', 10), // Reduced from 10
  // Hour windows for trending: 4, 24, 48, or 168 (default: just 24h for testing)
  TREND_HOURS: (process.env.TREND_HOURS || '24').split(',').map(Number).filter(Boolean) as (4 | 24 | 48 | 168)[],
  // Category filtering: empty array = no filter (single call), or specify IDs
  // Set TREND_CATEGORIES="" to disable category filtering entirely
  TREND_CATEGORIES: process.env.TREND_CATEGORIES
    ? process.env.TREND_CATEGORIES.split(',').map(Number).filter(Boolean)
    : [], // Default: no category filter for testing (1 call vs 8×N calls)

  // ==========================================================================
  // NEW: Seed-based ingestion (replaces Trending Now for better signal quality)
  // ==========================================================================
  // Enable seed-based approach (default: true). Set to false to use legacy Trending Now.
  SEED_KEYWORDS_ENABLED: process.env.SEED_KEYWORDS_ENABLED !== 'false',

  // Minimum growth % to pass early filter (default: 150 = 1.5x growth)
  // SerpAPI returns values like 250 (250% growth) or 4950 ("Breakout")
  GROWTH_FILTER_MIN_SPIKE: parseInt(process.env.GROWTH_FILTER_MIN_SPIKE || '150', 10),

  // Optional: Add Trending Now queries as fallback (default: false)
  TRENDING_NOW_FALLBACK_ENABLED: process.env.TRENDING_NOW_FALLBACK_ENABLED === 'true',
  TRENDING_NOW_FALLBACK_LIMIT: parseInt(process.env.TRENDING_NOW_FALLBACK_LIMIT || '10', 10),
};

export interface DailyPickJobResult {
  runId: string;
  status: DailyRunStatus;
  dateLocal: string;
  winnerClusterId: string | null;
  dailyPickId: string | null;
  metrics: {
    seedKeywordsUsed: number; // NEW: number of seed keywords used
    candidatesFromSeeds: number; // NEW: queries found from seeds
    candidatesFromFallback: number; // NEW: queries from trending fallback
    candidatesAfterGrowthFilter: number; // NEW: after growth threshold filter
    candidatesFound: number;
    candidatesFiltered: number;
    candidatesExpanded: number; // Stage 1.75: additional queries from expansion
    candidatesEnriched: number;
    clustersCreated: number;
    winnerScore: number | null;
    isLowConfidence: boolean;
    durationMs: number;
  };
  error?: string;
}

/**
 * Get today's date in the configured timezone
 */
function getTodayLocal(): string {
  return formatInTimeZone(new Date(), CONFIG.TZ, 'yyyy-MM-dd');
}

/**
 * Check cache freshness for TrendSeries
 */
async function getCachedTrendSeries(
  query: string,
  geo: string,
  timeframe: string
): Promise<{ id: string; points: unknown[] } | null> {
  const cutoff = new Date(Date.now() - CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000);

  const cached = await prisma.trendSeries.findFirst({
    where: {
      query: normalizeQuery(query),
      geo,
      timeframe,
      fetchedAt: { gte: cutoff },
    },
    orderBy: { fetchedAt: 'desc' },
  });

  if (cached) {
    return { id: cached.id, points: cached.points as unknown[] };
  }
  return null;
}

/**
 * Check cache freshness for SerpSnapshot
 */
async function getCachedSerpSnapshot(
  query: string,
  geo: string
): Promise<SerpSnapshotParsed | null> {
  const cutoff = new Date(Date.now() - CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000);

  const cached = await prisma.serpSnapshot.findFirst({
    where: {
      query: normalizeQuery(query),
      geo,
      fetchedAt: { gte: cutoff },
    },
    orderBy: { fetchedAt: 'desc' },
  });

  if (cached) {
    return {
      adsCount: cached.adsCount,
      shoppingPresent: cached.shoppingPresent,
      topStoriesPresent: cached.topStoriesPresent,
      topDomains: cached.topDomains as string[],
      snippetsSample: cached.snippetsSample as SerpSnapshotParsed['snippetsSample'],
      rawFeatures: cached.rawFeatures as Record<string, unknown> | undefined,
    };
  }
  return null;
}

/**
 * Main job function - runs the complete Daily Trend Pick pipeline
 */
export async function runDailyTrendPick(
  dateLocal?: string
): Promise<DailyPickJobResult> {
  const startTime = Date.now();
  const targetDate = dateLocal || getTodayLocal();

  console.log(`[DailyTrendPick] Starting job for ${targetDate}...`);

  // Create run record
  const run = await prisma.dailyRun.create({
    data: {
      dateLocal: targetDate,
      startedAt: new Date(),
      status: 'FAILED', // Will update on success
    },
  });

  const metrics = {
    seedKeywordsUsed: 0,
    candidatesFromSeeds: 0,
    candidatesFromFallback: 0,
    candidatesAfterGrowthFilter: 0,
    candidatesFound: 0,
    candidatesFiltered: 0,
    candidatesExpanded: 0,
    candidatesEnriched: 0,
    clustersCreated: 0,
    winnerScore: null as number | null,
    isLowConfidence: false,
    durationMs: 0,
  };

  try {
    // =========================================================================
    // Stage 1: Ingest queries (seed-based or legacy trending)
    // =========================================================================
    let allGrowthQueries: GrowthQuery[] = [];

    if (CONFIG.SEED_KEYWORDS_ENABLED) {
      // NEW: Seed-based approach - fetch related queries for commercial seeds
      console.log('[DailyTrendPick] Stage 1: Fetching seed-based queries...');
      console.log(`[DailyTrendPick] Config: ${DEFAULT_SEED_KEYWORDS.length} seeds, growthThreshold=${CONFIG.GROWTH_FILTER_MIN_SPIKE}%, fallback=${CONFIG.TRENDING_NOW_FALLBACK_ENABLED}`);

      const seedResult = await fetchSeedRelatedQueries(DEFAULT_SEED_KEYWORDS, {
        geo: CONFIG.DEFAULT_GEO,
        timeRange: 'today 3-m',
      });

      metrics.seedKeywordsUsed = DEFAULT_SEED_KEYWORDS.length;
      metrics.candidatesFromSeeds = seedResult.queries.length;
      allGrowthQueries = seedResult.queries;

      console.log(`[DailyTrendPick] Found ${seedResult.queries.length} queries from ${seedResult.sources.size} seeds`);

      // Optional: Add trending fallback for unexpected breakouts
      if (CONFIG.TRENDING_NOW_FALLBACK_ENABLED) {
        console.log('[DailyTrendPick] Fetching trending fallback...');
        const trendingFallback = await getTrendingNow(CONFIG.DEFAULT_GEO, { hours: 24 });

        // Convert to GrowthQuery format with default growth value
        const fallbackQueries: GrowthQuery[] = trendingFallback.trending
          .slice(0, CONFIG.TRENDING_NOW_FALLBACK_LIMIT)
          .map((t) => ({
            query: t.title.toLowerCase(),
            growth: 100, // Default - will be filtered unless very popular
            source: 'trending_fallback',
          }));

        metrics.candidatesFromFallback = fallbackQueries.length;
        allGrowthQueries = [...allGrowthQueries, ...fallbackQueries];

        console.log(`[DailyTrendPick] Added ${fallbackQueries.length} trending fallback queries`);
      }
    } else {
      // LEGACY: Use getTrendingExpanded (for backwards compatibility)
      console.log('[DailyTrendPick] Stage 1: Fetching expanded trending queries (legacy mode)...');
      console.log(`[DailyTrendPick] Config: hours=${CONFIG.TREND_HOURS.join(',')}, relatedTop=${CONFIG.RELATED_QUERIES_FOR_TOP_N}, categories=${CONFIG.TREND_CATEGORIES.length > 0 ? CONFIG.TREND_CATEGORIES.join(',') : 'none'}`);

      const expandedResult = await getTrendingExpanded(CONFIG.DEFAULT_GEO, {
        hours: CONFIG.TREND_HOURS,
        relatedQueriesForTopN: CONFIG.RELATED_QUERIES_FOR_TOP_N,
        timeRange: 'today 3-m',
        categories: CONFIG.TREND_CATEGORIES,
      });

      // Convert to GrowthQuery format (growth data not available in legacy mode)
      allGrowthQueries = expandedResult.queries.map((q) => ({
        query: q.toLowerCase(),
        growth: 100, // Default - no growth data in legacy mode
        source: 'trending_now',
      }));

      console.log(`[DailyTrendPick] Found ${allGrowthQueries.length} raw trending queries from sources:`, expandedResult.sources);
    }

    // =========================================================================
    // Stage 1.25: Growth Filter (NEW - seed-based only)
    // =========================================================================
    let growthFiltered = allGrowthQueries;

    if (CONFIG.SEED_KEYWORDS_ENABLED && CONFIG.GROWTH_FILTER_MIN_SPIKE > 0) {
      console.log(`[DailyTrendPick] Stage 1.25: Applying growth filter (>= ${CONFIG.GROWTH_FILTER_MIN_SPIKE}%)...`);

      growthFiltered = allGrowthQueries.filter((q) => q.growth >= CONFIG.GROWTH_FILTER_MIN_SPIKE);
      metrics.candidatesAfterGrowthFilter = growthFiltered.length;

      console.log(`[DailyTrendPick] Growth filter: ${allGrowthQueries.length} → ${growthFiltered.length} queries`);

      // Log top growth queries for debugging
      const topByGrowth = [...growthFiltered].sort((a, b) => b.growth - a.growth).slice(0, 5);
      console.log('[DailyTrendPick] Top 5 by growth:', topByGrowth.map((q) => `${q.query} (${q.growth}%)`));
    } else {
      metrics.candidatesAfterGrowthFilter = growthFiltered.length;
    }

    // Normalize and dedupe
    const rawQueries = growthFiltered.map((q) => q.query);
    const deduped = normalizeAndDedupeQueries(rawQueries);
    const candidates = deduped.slice(0, CONFIG.MAX_CANDIDATES);
    metrics.candidatesFound = candidates.length;

    console.log(`[DailyTrendPick] After dedup/cap: ${candidates.length} candidates`);

    // Build a map of query -> growth for later use
    const growthMap = new Map<string, number>();
    for (const gq of growthFiltered) {
      growthMap.set(gq.query.toLowerCase(), gq.growth);
    }

    // Persist QueryCandidate rows
    await prisma.queryCandidate.createMany({
      data: candidates.map((c) => ({
        runId: run.id,
        query: c.original,
        normalizedQuery: c.normalized,
        source: CONFIG.SEED_KEYWORDS_ENABLED ? 'seed_related' : 'google_trends',
        discoveredAt: new Date(),
      })),
    });

    // =========================================================================
    // Stage 1.5: Intent-Form Filter
    // =========================================================================
    console.log('[DailyTrendPick] Stage 1.5: Applying intent-form filter...');

    const filterResult = filterQueriesBatch(
      candidates.map((c) => c.normalized),
      {
        minFilteredCandidates: CONFIG.MIN_FILTERED_CANDIDATES,
        fallbackAllowNonMatching: CONFIG.FALLBACK_ALLOW_NON_MATCHING,
        fallbackTopN: CONFIG.FALLBACK_TOP_N,
      }
    );

    const passedQueries = filterResult.passed;
    metrics.candidatesFiltered = passedQueries.length;

    console.log(`[DailyTrendPick] ${passedQueries.length} queries passed filter`);

    // Update QueryCandidate records with filter results
    for (const item of filterResult.passed) {
      await prisma.queryCandidate.updateMany({
        where: { runId: run.id, normalizedQuery: item.query },
        data: {
          filterPassed: true,
          filterPassReason: item.result.reason,
          matchedPatterns: item.result.matched,
        },
      });
    }

    // =========================================================================
    // Stage 1.75: Post-Filter Expansion via Related Rising Queries
    // =========================================================================
    console.log('[DailyTrendPick] Stage 1.75: Expanding top filtered candidates...');

    let finalFilteredQueries = passedQueries;

    if (CONFIG.EXPAND_TOP_N > 0 && passedQueries.length > 0) {
      // Take top N filtered candidates as seeds for expansion
      const seedQueries = passedQueries
        .slice(0, CONFIG.EXPAND_TOP_N)
        .map((item) => item.query);

      // Fetch related rising queries for each seed
      const expansionResult = await fetchRelatedRisingQueries(seedQueries, {
        geo: CONFIG.DEFAULT_GEO,
        timeRange: CONFIG.EXPAND_TIME_RANGE,
      });

      if (expansionResult.queries.length > 0) {
        console.log(`[DailyTrendPick] Expansion found ${expansionResult.queries.length} additional queries`);

        // Normalize and dedupe expansion results
        const expandedDeduped = normalizeAndDedupeQueries(expansionResult.queries);

        // Filter out queries we already have
        const existingQueries = new Set(passedQueries.map((p) => p.query));
        const newQueries = expandedDeduped.filter(
          (q) => !existingQueries.has(q.normalized)
        );

        if (newQueries.length > 0) {
          // Re-apply intent filter to new queries
          const expansionFilterResult = filterQueriesBatch(
            newQueries.map((q) => q.normalized),
            {
              minFilteredCandidates: 0, // Don't use fallback for expansion
              fallbackAllowNonMatching: false,
              fallbackTopN: 0,
            }
          );

          // Add newly filtered queries to the pool
          const newlyPassed = expansionFilterResult.passed;
          metrics.candidatesExpanded = newlyPassed.length;

          console.log(`[DailyTrendPick] ${newlyPassed.length} expanded queries passed re-filter`);

          // Persist new QueryCandidate rows
          if (newlyPassed.length > 0) {
            await prisma.queryCandidate.createMany({
              data: newlyPassed.map((item) => ({
                runId: run.id,
                query: item.query,
                normalizedQuery: item.query,
                source: 'expansion_rising',
                discoveredAt: new Date(),
                filterPassed: true,
                filterPassReason: item.result.reason,
                matchedPatterns: item.result.matched,
              })),
            });

            // Merge expanded queries with original filtered
            finalFilteredQueries = [
              ...passedQueries,
              ...newlyPassed,
            ];
          }
        }
      }
    }

    console.log(`[DailyTrendPick] Total filtered candidates after expansion: ${finalFilteredQueries.length}`);

    // =========================================================================
    // Stage 2: Enrichment (bounded + cached)
    // =========================================================================
    console.log('[DailyTrendPick] Stage 2: Enriching candidates...');

    const toEnrich = finalFilteredQueries.slice(0, CONFIG.MAX_ENRICH);
    const enrichedData: Map<
      string,
      {
        trendPoints: { ts: string; value: number }[];
        serpData: SerpSnapshotParsed;
      }
    > = new Map();

    for (const item of toEnrich) {
      const query = item.query;

      try {
        // Check TrendSeries cache
        let trendPoints: { ts: string; value: number }[] = [];
        const cachedTrend = await getCachedTrendSeries(
          query,
          CONFIG.DEFAULT_GEO,
          CONFIG.DEFAULT_TIMEFRAME
        );

        if (cachedTrend) {
          trendPoints = cachedTrend.points as { ts: string; value: number }[];
        } else {
          // Fetch from SerpAPI
          const trendData = await getTrendData(query, {
            geo: CONFIG.DEFAULT_GEO,
            timeRange: 'today 3-m', // 90 days
          });
          trendPoints = trendData.interestOverTime.map((p) => ({
            ts: p.date,
            value: p.value,
          }));

          // Cache
          await prisma.trendSeries.create({
            data: {
              query: normalizeQuery(query),
              geo: CONFIG.DEFAULT_GEO,
              timeframe: CONFIG.DEFAULT_TIMEFRAME,
              points: trendPoints,
              fetchedAt: new Date(),
            },
          });
        }

        // Check SerpSnapshot cache
        let serpData: SerpSnapshotParsed;
        const cachedSerp = await getCachedSerpSnapshot(query, CONFIG.DEFAULT_GEO);

        if (cachedSerp) {
          serpData = cachedSerp;
        } else {
          // Fetch from SerpAPI
          serpData = await fetchSerpSnapshot(query, { geo: CONFIG.DEFAULT_GEO });

          // Cache
          await prisma.serpSnapshot.create({
            data: {
              query: normalizeQuery(query),
              geo: CONFIG.DEFAULT_GEO,
              adsCount: serpData.adsCount,
              shoppingPresent: serpData.shoppingPresent,
              topStoriesPresent: serpData.topStoriesPresent,
              topDomains: serpData.topDomains,
              snippetsSample: serpData.snippetsSample,
              rawFeatures: serpData.rawFeatures as Prisma.InputJsonValue,
              fetchedAt: new Date(),
            },
          });
        }

        enrichedData.set(query, { trendPoints, serpData });
        metrics.candidatesEnriched++;
      } catch (error) {
        console.warn(`[DailyTrendPick] Failed to enrich "${query}":`, error);
      }
    }

    console.log(`[DailyTrendPick] Enriched ${metrics.candidatesEnriched} candidates`);

    // =========================================================================
    // Stage 3: Clustering
    // =========================================================================
    console.log('[DailyTrendPick] Stage 3: Clustering queries...');

    const enrichedQueries = Array.from(enrichedData.keys());
    const clusters = await clusterQueries(enrichedQueries);
    metrics.clustersCreated = clusters.length;

    console.log(`[DailyTrendPick] Created ${clusters.length} clusters`);

    // =========================================================================
    // Stage 4: Scoring + Triage
    // =========================================================================
    console.log('[DailyTrendPick] Stage 4: Scoring clusters...');

    const scoredClusters: ScoredCluster[] = [];

    for (const cluster of clusters) {
      // Get enrichment data for canonical query
      const canonicalData = enrichedData.get(cluster.canonicalQuery);

      if (!canonicalData) {
        console.warn(
          `[DailyTrendPick] No enrichment data for canonical: ${cluster.canonicalQuery}`
        );
        continue;
      }

      // Calculate growth score
      const growthScore = calculateGrowthScore(canonicalData.trendPoints);

      // Calculate purchase proof score
      const purchaseProofScore = calculatePurchaseProofScore(
        canonicalData.serpData,
        cluster.canonicalQuery
      );

      // Run AI triage
      const triagePayload = {
        title: cluster.title,
        canonicalQuery: cluster.canonicalQuery,
        members: cluster.memberQueries.slice(0, 10),
        growthScore,
        purchaseProofScore,
        serpFeatures: {
          adsCount: canonicalData.serpData.adsCount,
          shoppingPresent: canonicalData.serpData.shoppingPresent,
          topStoriesPresent: canonicalData.serpData.topStoriesPresent,
        },
      };

      let triageResult: {
        intent: 'problem' | 'purchase' | 'mixed' | 'unclear';
        confidence: number;
        pain_point: { who: string; problem_statement: string; urgency: number };
        purchase_proof: {
          is_buying_intent: boolean;
          buy_stage: 'researching' | 'comparing' | 'ready_to_buy' | 'unknown';
          evidence: string[];
        };
        news_spike_risk: number;
        category: string;
        recommended_action: 'ignore' | 'spark' | 'light' | 'forge';
        evidence: string[];
      };

      try {
        const triageResponse = await runStructured<typeof triageResult>({
          model: 'gpt-4o-mini',
          schemaPath: 'triage.schema.json',
          systemPrompt: `You are analyzing a cluster of trending search queries to determine user intent and commercial viability.

Analyze the following cluster and provide a structured assessment:
- Determine the primary intent (problem, purchase, mixed, or unclear)
- Identify the target audience (who)
- Describe the core problem or need
- Rate urgency (1-5)
- Assess news spike risk (0-1) - HIGH (>0.8) if driven by:
  * Sports events/games (e.g., "team vs team", game schedules)
  * Celebrity news, deaths, scandals
  * Political events, elections
  * Natural disasters, breaking news
  * One-time events that won't recur
- Determine purchase_proof: is there genuine buying intent or just information seeking?
- Set recommended_action:
  * "ignore" - No commercial value (sports scores, celebrity gossip, pure news, entertainment schedules)
  * "spark" - Low potential, maybe worth quick analysis
  * "light" - Moderate potential, worth deeper look
  * "forge" - High commercial potential, clear business opportunity

CRITICAL: Sports matchups like "team vs team", game times, scores, schedules have ZERO commercial value - always set recommended_action to "ignore" and is_buying_intent to false.`,
          userPayload: triagePayload,
        });

        triageResult = triageResponse.output;

        // Store AI classification
        await prisma.aIClassification.create({
          data: {
            targetType: 'CLUSTER',
            targetId: cluster.canonicalQuery, // Temporary ID until cluster is persisted
            model: 'gpt-4o-mini',
            schemaVersion: triageResponse.schemaVersion,
            payloadHash: triageResponse.payloadHash,
            outputJson: triageResult as object,
          },
        });
      } catch (error) {
        console.warn(`[DailyTrendPick] Triage failed for cluster:`, error);
        triageResult = {
          intent: 'unclear',
          confidence: 0.3,
          pain_point: { who: 'unknown', problem_statement: 'unknown', urgency: 2 },
          purchase_proof: { is_buying_intent: false, buy_stage: 'unknown', evidence: [] },
          news_spike_risk: 0.5,
          category: 'unknown',
          recommended_action: 'spark', // Default to spark (not ignore) on failure
          evidence: [],
        };
      }

      // Skip clusters that the AI recommends ignoring (no commercial value)
      if (triageResult.recommended_action === 'ignore') {
        console.log(
          `[DailyTrendPick] Skipping cluster "${cluster.title}" - AI recommends ignore (category: ${triageResult.category}, news_spike_risk: ${triageResult.news_spike_risk})`
        );
        continue;
      }

      // Calculate pain point score
      const painPointScore = calculatePainPointScore(triageResult);

      // Build cluster scores
      const clusterScores: ClusterScores = {
        growth: growthScore,
        purchaseProof: purchaseProofScore,
        painPoint: painPointScore,
        confidence: triageResult.confidence,
        newsSpikeRisk: triageResult.news_spike_risk,
        size: cluster.memberQueries.length,
        intent: triageResult.intent,
      };

      const combined = combinedScore(clusterScores);
      const winnerReason = generateWinnerReasons(clusterScores);

      // Persist cluster
      const persistedCluster = await prisma.cluster.create({
        data: {
          runId: run.id,
          title: cluster.title,
          canonicalQuery: cluster.canonicalQuery,
          memberQueries: cluster.memberQueries,
          growthScore,
          purchaseProofScore,
          painPointScore,
          newsSpikeRisk: triageResult.news_spike_risk,
          combinedScore: combined,
          winnerReason,
          triageIntent: triageResult.intent,
          triageConfidence: triageResult.confidence,
          triageCategory: triageResult.category,
        },
      });

      scoredClusters.push({
        id: persistedCluster.id,
        scores: clusterScores,
        combinedScore: combined,
        winnerReason,
      });
    }

    console.log(`[DailyTrendPick] Scored ${scoredClusters.length} clusters`);

    // =========================================================================
    // Stage 5: Pick Winner
    // =========================================================================
    console.log('[DailyTrendPick] Stage 5: Selecting winner...');

    const { winner, isLowConfidence } = selectWinner(
      scoredClusters,
      CONFIG.MIN_WINNER_SCORE
    );

    metrics.isLowConfidence = isLowConfidence;

    if (!winner) {
      throw new Error('No clusters available to select winner');
    }

    metrics.winnerScore = winner.combinedScore;

    console.log(
      `[DailyTrendPick] Winner: ${winner.id} (score: ${winner.combinedScore}${
        isLowConfidence ? ', LOW CONFIDENCE' : ''
      })`
    );

    // Create DailyPick with transaction (archive existing, insert new)
    const dailyPick = await prisma.$transaction(async (tx) => {
      // Archive any existing ACTIVE picks for this date
      await tx.dailyPick.updateMany({
        where: { dateLocal: targetDate, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });

      // Get max revision for this date
      const maxRevision = await tx.dailyPick.aggregate({
        where: { dateLocal: targetDate },
        _max: { revision: true },
      });

      const newRevision = (maxRevision._max.revision || 0) + 1;

      // Create new ACTIVE pick
      return tx.dailyPick.create({
        data: {
          dateLocal: targetDate,
          winnerClusterId: winner.id,
          revision: newRevision,
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
      });
    });

    // =========================================================================
    // Stage 6: Generate Winner Report
    // =========================================================================
    console.log('[DailyTrendPick] Stage 6: Generating winner report...');

    const winnerCluster = await prisma.cluster.findUnique({
      where: { id: winner.id },
    });

    if (winnerCluster) {
      const reportPayload = {
        title: winnerCluster.title,
        canonicalQuery: winnerCluster.canonicalQuery,
        members: winnerCluster.memberQueries,
        scores: {
          growth: winnerCluster.growthScore,
          purchaseProof: winnerCluster.purchaseProofScore,
          painPoint: winnerCluster.painPointScore,
          combined: winnerCluster.combinedScore,
        },
        winnerReason: winnerCluster.winnerReason,
        isLowConfidence,
      };

      try {
        const reportResponse = await runStructured({
          model: 'gpt-5.2',
          schemaPath: 'winner_report.schema.json',
          systemPrompt: `You are a business opportunity analyst. Generate a comprehensive Daily Pick report for the winning trend cluster.

The report should:
- Provide a compelling one-line thesis about why this is an opportunity
- Explain the demand signals and what they indicate
- Describe the pain point in user-centric terms
- Show purchase proof evidence
- Suggest 2-3 specific angles to explore
- Recommend next steps (spark, light, or forge mode)
- Be transparent about why this cluster won and the evidence behind it

${isLowConfidence ? 'NOTE: This is a low-confidence pick. Be clear about the uncertainty in your analysis.' : ''}`,
          userPayload: reportPayload,
          maxOutputTokens: 8192,
        });

        // Store winner report classification
        await prisma.aIClassification.create({
          data: {
            targetType: 'WINNER_REPORT',
            targetId: winner.id,
            model: 'gpt-5.2',
            schemaVersion: reportResponse.schemaVersion,
            payloadHash: reportResponse.payloadHash,
            outputJson: reportResponse.output as object,
          },
        });

        console.log('[DailyTrendPick] Winner report generated successfully');
      } catch (error) {
        console.error('[DailyTrendPick] Failed to generate winner report:', error);
        // Continue without report - pick is still valid
      }
    }

    // =========================================================================
    // Finalize
    // =========================================================================
    metrics.durationMs = Date.now() - startTime;

    // Update run status
    await prisma.dailyRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        finishedAt: new Date(),
        metrics: metrics as object,
      },
    });

    console.log(
      `[DailyTrendPick] Job completed successfully in ${metrics.durationMs}ms`
    );

    return {
      runId: run.id,
      status: 'SUCCESS',
      dateLocal: targetDate,
      winnerClusterId: winner.id,
      dailyPickId: dailyPick.id,
      metrics,
    };
  } catch (error) {
    metrics.durationMs = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DailyTrendPick] Job failed:`, error);

    // Update run with failure
    await prisma.dailyRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        metrics: metrics as object,
        logsRef: errorMessage,
      },
    });

    return {
      runId: run.id,
      status: 'FAILED',
      dateLocal: targetDate,
      winnerClusterId: null,
      dailyPickId: null,
      metrics,
      error: errorMessage,
    };
  }
}

/**
 * Get the status of a run by ID
 */
export async function getRunStatus(runId: string) {
  return prisma.dailyRun.findUnique({
    where: { id: runId },
    include: {
      _count: {
        select: {
          candidates: true,
          clusters: true,
        },
      },
    },
  });
}
