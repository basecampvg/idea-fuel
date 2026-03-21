/**
 * API Key Pool with Round-Robin Rotation & Rate-Limit Failover
 *
 * Reads comma-separated keys from a single env var (e.g., OPENAI_API_KEY=sk-abc,sk-def)
 * and distributes requests across them using round-robin selection.
 *
 * - Backward compatible: single key (no comma) works identically to today
 * - Rate-limited keys are temporarily excluded
 * - In-memory state per worker process (no Redis coordination needed)
 */

export interface KeyPoolOptions {
  /** Environment variable name to read keys from */
  envVar: string;
  /** Default rate-limit cooldown in milliseconds (default: 60000 = 1 minute) */
  defaultCooldownMs?: number;
}

interface KeyState {
  key: string;
  rateLimitedUntil: number; // timestamp, 0 = not rate limited
  totalRequests: number;
  totalRateLimits: number;
}

export class KeyPool {
  private keys: KeyState[];
  private roundRobinIndex: number = 0;
  private readonly envVar: string;
  private readonly defaultCooldownMs: number;

  constructor(options: KeyPoolOptions) {
    this.envVar = options.envVar;
    this.defaultCooldownMs = options.defaultCooldownMs ?? 60000;

    const raw = process.env[options.envVar];
    if (!raw || raw.trim().length === 0) {
      // Allow construction with no keys — provider will fail at call time with a clear error
      this.keys = [];
      return;
    }

    // Split on comma, trim whitespace, filter empty strings
    const parsed = raw
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (parsed.length === 0) {
      this.keys = [];
      return;
    }

    this.keys = parsed.map((key) => ({
      key,
      rateLimitedUntil: 0,
      totalRequests: 0,
      totalRateLimits: 0,
    }));

    if (this.keys.length > 1) {
      console.log(`[KeyPool] ${options.envVar}: ${this.keys.length} keys loaded (rotation enabled)`);
    }
  }

  /** Number of keys in the pool */
  get size(): number {
    return this.keys.length;
  }

  /** Whether this pool has multiple keys (rotation is meaningful) */
  get hasRotation(): boolean {
    return this.keys.length > 1;
  }

  /**
   * Get the next available API key using round-robin selection.
   * Skips keys that are currently rate-limited.
   *
   * @throws Error if no keys are available (all rate-limited or pool is empty)
   */
  getKey(): string {
    if (this.keys.length === 0) {
      throw new Error(`[KeyPool] No API keys configured for ${this.envVar}`);
    }

    const now = Date.now();

    // Single key — fast path, no rotation logic needed
    if (this.keys.length === 1) {
      const state = this.keys[0];
      if (state.rateLimitedUntil > now) {
        const waitSec = Math.ceil((state.rateLimitedUntil - now) / 1000);
        throw new Error(
          `[KeyPool] ${this.envVar}: only key is rate-limited for ${waitSec}s more`
        );
      }
      state.totalRequests++;
      return state.key;
    }

    // Multi-key — round-robin with rate-limit skip
    const startIndex = this.roundRobinIndex;
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (startIndex + i) % this.keys.length;
      const state = this.keys[idx];

      if (state.rateLimitedUntil <= now) {
        // This key is available
        state.totalRequests++;
        this.roundRobinIndex = (idx + 1) % this.keys.length;
        return state.key;
      }
    }

    // All keys are rate-limited — find earliest recovery
    const earliest = this.keys.reduce((min, k) =>
      k.rateLimitedUntil < min.rateLimitedUntil ? k : min
    );
    const waitSec = Math.ceil((earliest.rateLimitedUntil - now) / 1000);
    throw new Error(
      `[KeyPool] ${this.envVar}: all ${this.keys.length} keys are rate-limited. Earliest recovery in ${waitSec}s`
    );
  }

  /**
   * Mark a specific key as rate-limited for a duration.
   * Call this when you receive a 429 response.
   *
   * @param key - The API key that was rate-limited
   * @param durationMs - How long to exclude this key (defaults to defaultCooldownMs)
   */
  markRateLimited(key: string, durationMs?: number): void {
    const cooldown = durationMs ?? this.defaultCooldownMs;
    const state = this.keys.find((k) => k.key === key);

    if (!state) {
      console.warn(`[KeyPool] ${this.envVar}: attempted to rate-limit unknown key`);
      return;
    }

    state.rateLimitedUntil = Date.now() + cooldown;
    state.totalRateLimits++;

    const suffix = this.keys.length > 1
      ? ` (${this.keys.length - this.getAvailableCount()} of ${this.keys.length} keys now rate-limited)`
      : '';

    console.warn(
      `[KeyPool] ${this.envVar}: key ...${key.slice(-6)} rate-limited for ${Math.round(cooldown / 1000)}s${suffix}`
    );
  }

  /**
   * Mark a key as rate-limited by index (useful when you don't want to pass the key around).
   */
  markCurrentRateLimited(durationMs?: number): void {
    const prevIdx = (this.roundRobinIndex - 1 + this.keys.length) % this.keys.length;
    const state = this.keys[prevIdx];
    if (state) {
      this.markRateLimited(state.key, durationMs);
    }
  }

  /** Get the number of currently available (non-rate-limited) keys */
  private getAvailableCount(): number {
    const now = Date.now();
    return this.keys.filter((k) => k.rateLimitedUntil <= now).length;
  }

  /** Get pool statistics for monitoring/logging */
  getStats(): {
    envVar: string;
    totalKeys: number;
    availableKeys: number;
    rateLimitedKeys: number;
    keyStats: Array<{
      keySuffix: string;
      isRateLimited: boolean;
      rateLimitedForMs: number;
      totalRequests: number;
      totalRateLimits: number;
    }>;
  } {
    const now = Date.now();
    return {
      envVar: this.envVar,
      totalKeys: this.keys.length,
      availableKeys: this.getAvailableCount(),
      rateLimitedKeys: this.keys.length - this.getAvailableCount(),
      keyStats: this.keys.map((k) => ({
        keySuffix: `...${k.key.slice(-6)}`,
        isRateLimited: k.rateLimitedUntil > now,
        rateLimitedForMs: Math.max(0, k.rateLimitedUntil - now),
        totalRequests: k.totalRequests,
        totalRateLimits: k.totalRateLimits,
      })),
    };
  }
}

// =============================================================================
// SINGLETON POOLS — one per provider, lazy-initialized
// =============================================================================

let _openaiPool: KeyPool | null = null;
let _anthropicPool: KeyPool | null = null;
let _perplexityPool: KeyPool | null = null;
let _bravePool: KeyPool | null = null;

export function getOpenAIKeyPool(): KeyPool {
  if (!_openaiPool) {
    _openaiPool = new KeyPool({ envVar: 'OPENAI_API_KEY' });
  }
  return _openaiPool;
}

export function getAnthropicKeyPool(): KeyPool {
  if (!_anthropicPool) {
    _anthropicPool = new KeyPool({
      envVar: 'ANTHROPIC_API_KEY',
      defaultCooldownMs: 60000,
    });
  }
  return _anthropicPool;
}

export function getPerplexityKeyPool(): KeyPool {
  if (!_perplexityPool) {
    _perplexityPool = new KeyPool({
      envVar: 'PERPLEXITY_API_KEY',
      defaultCooldownMs: 120000, // 2 min — Perplexity Tier 0 = 5 RPM
    });
  }
  return _perplexityPool;
}

export function getBraveKeyPool(): KeyPool {
  if (!_bravePool) {
    _bravePool = new KeyPool({ envVar: 'BRAVE_SEARCH_API_KEY' });
  }
  return _bravePool;
}

/** Get stats for all provider pools (for monitoring dashboard) */
export function getAllKeyPoolStats() {
  return {
    openai: getOpenAIKeyPool().getStats(),
    anthropic: getAnthropicKeyPool().getStats(),
    perplexity: getPerplexityKeyPool().getStats(),
    brave: getBraveKeyPool().getStats(),
  };
}
