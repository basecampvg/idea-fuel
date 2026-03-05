/**
 * SerpAPI Budget Tracker
 *
 * Redis-based daily usage counter to prevent exceeding SerpAPI rate limits.
 * Tracks usage across all consumers (Daily Pick, Spark, Research pipelines).
 *
 * Budget allocation:
 * - 60% reserved for Daily Pick (automated, runs first)
 * - 40% for user-triggered pipelines (Spark + Research)
 */

import { redis } from './redis';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DAILY_LIMIT = parseInt(process.env.SERPAPI_DAILY_LIMIT || '100', 10);
const PER_PIPELINE_CAP = parseInt(process.env.SERPAPI_PER_PIPELINE_CAP || '8', 10);
const REDIS_KEY_PREFIX = 'serpapi:usage';

/** Budget pools with percentage allocation */
export const BUDGET_POOL = {
  DAILY_PICK: 'daily_pick',
  USER_PIPELINE: 'user_pipeline',
} as const;

type BudgetPool = (typeof BUDGET_POOL)[keyof typeof BUDGET_POOL];

const POOL_ALLOCATION: Record<BudgetPool, number> = {
  [BUDGET_POOL.DAILY_PICK]: 0.6,    // 60% = ~60 calls
  [BUDGET_POOL.USER_PIPELINE]: 0.4, // 40% = ~40 calls
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Get the Redis key for today's usage counter
 */
function getDailyKey(pool?: BudgetPool): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return pool
    ? `${REDIS_KEY_PREFIX}:${pool}:${date}`
    : `${REDIS_KEY_PREFIX}:total:${date}`;
}

/**
 * Increment the usage counter for a SerpAPI call.
 * Call this every time a SerpAPI request is made.
 */
export async function trackSerpApiCall(pool: BudgetPool = BUDGET_POOL.USER_PIPELINE): Promise<number> {
  try {
    const totalKey = getDailyKey();
    const poolKey = getDailyKey(pool);

    // Increment both total and pool-specific counters
    const [totalCount] = await Promise.all([
      redis.incr(totalKey),
      redis.incr(poolKey),
      // Set 48h TTL (covers timezone edge cases)
      redis.expire(totalKey, 172800),
      redis.expire(poolKey, 172800),
    ]);

    return totalCount;
  } catch (error) {
    // Don't block on tracking failures
    console.warn('[SerpAPI Budget] Failed to track usage:', error);
    return -1;
  }
}

/**
 * Get remaining budget for a specific pool.
 * Returns 0 if budget is exhausted.
 */
export async function getRemainingBudget(pool: BudgetPool): Promise<number> {
  try {
    const poolKey = getDailyKey(pool);
    const used = parseInt((await redis.get(poolKey)) || '0', 10);
    const poolLimit = Math.floor(DAILY_LIMIT * POOL_ALLOCATION[pool]);
    return Math.max(0, poolLimit - used);
  } catch (error) {
    console.warn('[SerpAPI Budget] Failed to check budget:', error);
    // On error, assume budget is available (fail-open)
    return 10;
  }
}

/**
 * Get total usage across all pools for today.
 */
export async function getTotalUsage(): Promise<{
  total: number;
  limit: number;
  pools: Record<BudgetPool, { used: number; limit: number; remaining: number }>;
}> {
  try {
    const totalKey = getDailyKey();
    const dailyPickKey = getDailyKey(BUDGET_POOL.DAILY_PICK);
    const userPipelineKey = getDailyKey(BUDGET_POOL.USER_PIPELINE);

    const [total, dailyPick, userPipeline] = await Promise.all([
      redis.get(totalKey),
      redis.get(dailyPickKey),
      redis.get(userPipelineKey),
    ]);

    const dailyPickUsed = parseInt(dailyPick || '0', 10);
    const userPipelineUsed = parseInt(userPipeline || '0', 10);
    const dailyPickLimit = Math.floor(DAILY_LIMIT * POOL_ALLOCATION[BUDGET_POOL.DAILY_PICK]);
    const userPipelineLimit = Math.floor(DAILY_LIMIT * POOL_ALLOCATION[BUDGET_POOL.USER_PIPELINE]);

    return {
      total: parseInt(total || '0', 10),
      limit: DAILY_LIMIT,
      pools: {
        [BUDGET_POOL.DAILY_PICK]: {
          used: dailyPickUsed,
          limit: dailyPickLimit,
          remaining: Math.max(0, dailyPickLimit - dailyPickUsed),
        },
        [BUDGET_POOL.USER_PIPELINE]: {
          used: userPipelineUsed,
          limit: userPipelineLimit,
          remaining: Math.max(0, userPipelineLimit - userPipelineUsed),
        },
      },
    };
  } catch (error) {
    console.warn('[SerpAPI Budget] Failed to get usage:', error);
    return {
      total: 0,
      limit: DAILY_LIMIT,
      pools: {
        [BUDGET_POOL.DAILY_PICK]: { used: 0, limit: Math.floor(DAILY_LIMIT * 0.6), remaining: Math.floor(DAILY_LIMIT * 0.6) },
        [BUDGET_POOL.USER_PIPELINE]: { used: 0, limit: Math.floor(DAILY_LIMIT * 0.4), remaining: Math.floor(DAILY_LIMIT * 0.4) },
      },
    };
  }
}

/**
 * Check if SerpAPI expansion should be enabled for user pipelines.
 * Quick check — use before deciding whether to run SerpAPI expansion.
 */
export async function isSerpApiBudgetAvailable(pool: BudgetPool = BUDGET_POOL.USER_PIPELINE): Promise<boolean> {
  const remaining = await getRemainingBudget(pool);
  return remaining > 0;
}

// =============================================================================
// PER-PIPELINE BUDGET CAP
// Prevents a single pipeline from consuming the entire daily pool budget.
// =============================================================================

function getPipelineKey(pipelineId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${REDIS_KEY_PREFIX}:pipeline:${pipelineId}:${date}`;
}

/**
 * Track a SerpAPI call for a specific pipeline AND the pool.
 * Returns the pipeline's usage count after increment.
 */
export async function trackPipelineSerpApiCall(
  pipelineId: string,
  pool: BudgetPool = BUDGET_POOL.USER_PIPELINE
): Promise<number> {
  try {
    const pipelineKey = getPipelineKey(pipelineId);
    const [pipelineCount] = await Promise.all([
      redis.incr(pipelineKey),
      redis.expire(pipelineKey, 172800), // 48h TTL
      trackSerpApiCall(pool), // Also increment pool + total counters
    ]);
    return pipelineCount;
  } catch (error) {
    console.warn('[SerpAPI Budget] Failed to track pipeline usage:', error);
    return -1;
  }
}

/**
 * Check if a specific pipeline can still make SerpAPI calls.
 * Checks both per-pipeline cap AND pool budget.
 */
export async function canPipelineUseSerpApi(
  pipelineId: string,
  pool: BudgetPool = BUDGET_POOL.USER_PIPELINE
): Promise<boolean> {
  try {
    const pipelineKey = getPipelineKey(pipelineId);
    const [pipelineUsed, poolRemaining] = await Promise.all([
      redis.get(pipelineKey).then((v) => parseInt(v || '0', 10)),
      getRemainingBudget(pool),
    ]);
    return pipelineUsed < PER_PIPELINE_CAP && poolRemaining > 0;
  } catch (error) {
    console.warn('[SerpAPI Budget] Failed to check pipeline budget:', error);
    return true; // Fail-open
  }
}
