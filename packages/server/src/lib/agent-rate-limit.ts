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
  TESTER: { messages: 200, windowSeconds: 3600 },
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

// Limits for tRPC AI mutations (sparkCard.chat/validate, interview AI, etc.).
// Separate bucket from agent chat so users can both chat AND run one-off
// AI actions without one blowing the other's budget.
const AI_MUTATION_LIMITS: Record<string, { messages: number; windowSeconds: number }> = {
  FREE: { messages: 30, windowSeconds: 3600 },
  PRO: { messages: 200, windowSeconds: 3600 },
  ENTERPRISE: { messages: 1000, windowSeconds: 3600 },
  TESTER: { messages: 1000, windowSeconds: 3600 },
  MOBILE: { messages: 100, windowSeconds: 3600 },
  SCALE: { messages: 500, windowSeconds: 3600 },
};

export async function checkAiMutationRateLimit(
  userId: string,
  tier: string,
): Promise<RateLimitResult> {
  const limit = AI_MUTATION_LIMITS[tier] || AI_MUTATION_LIMITS.FREE;
  const key = `ai:mut:${userId}`;

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
    return { allowed: true, remaining: limit.messages, resetAt: new Date() };
  }
}
