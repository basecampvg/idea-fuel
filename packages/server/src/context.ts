import { db } from './db/drizzle';

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
  db: typeof db;
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
    db,
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
    db,
    session: null,
    userId: null,
  };
}
