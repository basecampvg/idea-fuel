import Redis, { type RedisOptions } from 'ioredis';

/**
 * Get Redis URL from environment variables
 * Supports multiple Redis providers (Upstash, Redis Cloud, local)
 */
function getRedisUrl(): string {
  // Standard Redis URL (e.g., Redis Cloud, local)
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // Upstash Redis (converts REST URL to ioredis format)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    return `rediss://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${url.host}`;
  }

  // Default to local Redis
  return 'redis://localhost:6379';
}

/**
 * Redis connection options for BullMQ
 * BullMQ requires specific settings for proper operation
 */
const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false, // Faster startup
  lazyConnect: true, // Don't connect until needed
  retryStrategy(times) {
    if (times > 3) {
      console.warn(`[Redis] Could not connect after ${times} attempts — giving up. Redis-dependent features (queues, budget tracking) will be unavailable.`);
      return null; // Stop retrying
    }
    return Math.min(times * 500, 3000); // 500ms, 1s, 1.5s
  },
};

/**
 * Shared Redis connection for general use
 * Use this for caching, pub/sub, etc.
 */
export const redis = new Redis(getRedisUrl(), redisOptions);

// Suppress repetitive connection error spam — logged once via retryStrategy
redis.on('error', () => {});

/**
 * Create a new Redis connection
 * BullMQ requires separate connections for Queue and Worker
 */
export function createRedisConnection(): Redis {
  const conn = new Redis(getRedisUrl(), redisOptions);
  conn.on('error', () => {}); // Suppress retry error spam
  return conn;
}

/**
 * Check if Redis is connected
 */
export async function isRedisConnected(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully close all Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
  await redis.quit();
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await closeRedisConnections();
  });

  process.on('SIGINT', async () => {
    await closeRedisConnections();
  });
}
