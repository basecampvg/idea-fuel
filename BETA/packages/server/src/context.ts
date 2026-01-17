import { prisma } from './db';

/**
 * User session type (matches Auth.js session)
 */
export interface Session {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

/**
 * tRPC context type
 */
export interface Context {
  prisma: typeof prisma;
  session: Session | null;
  userId: string | null;
}

/**
 * Options for creating context
 */
export interface CreateContextOptions {
  session: Session | null;
}

/**
 * Creates context for tRPC requests
 * Session is passed in from the API route handler
 */
export function createContext(opts: CreateContextOptions): Context {
  return {
    prisma,
    session: opts.session,
    userId: opts.session?.user?.id ?? null,
  };
}

/**
 * Creates context for internal use (without session)
 * Useful for background jobs and testing
 */
export function createInternalContext(): Context {
  return {
    prisma,
    session: null,
    userId: null,
  };
}
