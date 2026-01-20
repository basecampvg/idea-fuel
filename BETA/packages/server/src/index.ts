// Forge Automation Server Package
// Re-export all server modules for use in Next.js API routes

export { appRouter, type AppRouter } from './routers';
export { createContext, createInternalContext, type Context, type Session, type CreateContextOptions } from './context';
export { prisma } from './db';

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
