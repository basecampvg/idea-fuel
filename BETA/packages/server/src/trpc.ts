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
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { isAdmin: true },
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
