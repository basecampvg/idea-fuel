import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { prisma } from './db';

// User session type (will be populated by Auth.js)
interface Session {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

export interface Context {
  prisma: typeof prisma;
  session: Session | null;
  userId: string | null;
}

/**
 * Creates context for tRPC requests
 * This will be called for each request and provides database access and session info
 */
export async function createContext(_opts?: CreateNextContextOptions): Promise<Context> {
  // TODO: Get session from Auth.js when implemented
  // const session = await getServerSession(opts?.req, opts?.res, authOptions);
  const session: Session | null = null;

  return {
    prisma,
    session,
    userId: (session as Session | null)?.user?.id ?? null,
  };
}

export type { Session };
