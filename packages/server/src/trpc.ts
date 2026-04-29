import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';
import { checkAiMutationRateLimit } from './lib/agent-rate-limit';

/**
 * Initialize tRPC with context and transformer
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

// ---------------------------------------------------------------------------
// Role cache: avoids a DB query on every admin/superAdmin request.
// Entries expire after 1 minute or on process restart (serverless deploys).
// ---------------------------------------------------------------------------
const ROLE_CACHE_TTL = 1 * 60 * 1000; // 1 minute (short TTL for security)
const roleCache = new Map<string, { isAdmin: boolean; role: string | null; expiresAt: number }>();

async function getUserRole(db: Context['db'], userId: string) {
  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const { eq } = await import('drizzle-orm');
  const { users } = await import('./db/schema');
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true, role: true },
  });

  const entry = {
    isAdmin: user?.isAdmin ?? false,
    role: user?.role ?? null,
    expiresAt: Date.now() + ROLE_CACHE_TTL,
  };
  roleCache.set(userId, entry);
  return entry;
}

/** Invalidate cached role for a user (call after role changes) */
export function invalidateRoleCache(userId: string) {
  roleCache.delete(userId);
}

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Narrow the type - user is now guaranteed to exist
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * Middleware to check if user is an admin
 */
const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  const { isAdmin: admin } = await getUserRole(ctx.db, ctx.userId);
  if (!admin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

/**
 * Admin procedure - requires authentication + admin role
 */
export const adminProcedure = t.procedure.use(isAdmin);

/**
 * Middleware to check if user is a super admin
 */
const isSuperAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  const { role } = await getUserRole(ctx.db, ctx.userId);
  if (role !== 'SUPER_ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super admin access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

/**
 * Super admin procedure - requires SUPER_ADMIN role
 */
export const superAdminProcedure = t.procedure.use(isSuperAdmin);

/**
 * Middleware: per-user rate limit for tRPC AI mutations.
 * Buckets per-user by subscription tier (Redis sliding window). Queries the
 * user's tier once, cached for the duration of the request. If Redis is
 * unreachable the request is allowed — rate limiting is not a hard dependency.
 */
const aiRateLimited = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  const { eq } = await import('drizzle-orm');
  const { users } = await import('./db/schema');
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { subscription: true },
  });
  const tier = user?.subscription ?? 'FREE';

  const result = await checkAiMutationRateLimit(ctx.userId, tier);
  if (!result.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `AI rate limit reached. Try again in ${retryAfterSec}s.`,
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

/**
 * AI procedure - authenticated + per-user AI rate-limited.
 * Use for any mutation that directly invokes a paid LLM API
 * (sparkCard.chat/validate, interview AI turns, note AI, etc.).
 */
export const aiProcedure = t.procedure.use(isAuthenticated).use(aiRateLimited);
