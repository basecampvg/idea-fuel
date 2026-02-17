/**
 * Agent Chat Rate Limiting
 *
 * Uses Redis sliding window to limit agent chat messages per hour.
 * Falls back to allowing requests if Redis is unavailable.
 */

import { redis } from './redis';

const RATE_LIMITS: Record<string, { messages: number; windowSeconds: number }> = {
  PRO: { messages: 50, windowSeconds: 3600 },
  ENTERPRISE: { messages: 200, windowSeconds: 3600 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkAgentRateLimit(
  userId: string,
  tier: string
): Promise<RateLimitResult> {
  const limit = RATE_LIMITS[tier] || RATE_LIMITS.PRO;
  const key = `agent:rate:${userId}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, limit.windowSeconds);
    }
    const ttl = await redis.ttl(key);

    return {
      allowed: current <= limit.messages,
      remaining: Math.max(0, limit.messages - current),
      resetAt: new Date(Date.now() + ttl * 1000),
    };
  } catch {
    // Redis unavailable — allow the request
    return { allowed: true, remaining: limit.messages, resetAt: new Date() };
  }
}
