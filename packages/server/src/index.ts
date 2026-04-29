// ideationLab Server Package
// Re-export all server modules for use in Next.js API routes

export { appRouter, type AppRouter } from './routers';
export { createContext, createInternalContext, type Context, type Session, type CreateContextOptions } from './context';
export { db } from './db/drizzle';
export * as schema from './db/schema';

// External API clients
export {
  getTrendData,
  compareTrends,
  batchGetTrendData,
  getTrendingNow,
  isSerpApiConfigured,
  type TrendData,
  type TrendComparison,
} from './lib/serpapi';

// Config service for runtime configuration
export { configService, DEFAULT_CONFIGS, type ConfigDefinition } from './services/config';

// Agent tools and utilities
export { createAgentTools } from './services/agent-tools';
export { checkAgentRateLimit } from './lib/agent-rate-limit';
export type { AgentMessageRow } from './db/schema';

// Session token hashing (defense-in-depth against DB dumps)
export { hashSessionToken } from './lib/session-token';

// Google ID token verification for mobile sign-in
export { verifyGoogleIdToken, type VerifiedGoogleIdToken } from './lib/google-auth';
