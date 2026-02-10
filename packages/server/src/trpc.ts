import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

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

  // Check if user is admin
  const { eq } = await import('drizzle-orm');
  const { users } = await import('./db/schema');
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { isAdmin: true },
  });

  if (!user?.isAdmin) {
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

  const { eq } = await import('drizzle-orm');
  const { users } = await import('./db/schema');
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { role: true },
  });

  if (user?.role !== 'SUPER_ADMIN') {
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
