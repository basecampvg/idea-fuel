import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext, db, schema } from '@forge/server';
import type { Session } from '@forge/server';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * Resolve session from Bearer token (mobile app)
 */
async function resolveBearer(req: Request): Promise<Session | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice(7);
  const row = await db.query.sessions.findFirst({
    where: eq(schema.sessions.sessionToken, token),
    with: { user: true },
  });

  if (!row || row.expires < new Date()) return null;

  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      image: row.user.image,
    },
    expires: row.expires.toISOString(),
  };
}

/**
 * tRPC API route handler
 * Handles all tRPC endpoints: /api/trpc/*
 * Supports both NextAuth cookie sessions (web) and Bearer token sessions (mobile)
 */
const handler = async (req: Request) => {
  // Try cookie-based session first (web), fall back to Bearer token (mobile)
  const cookieSession = await auth();

  let session: Session | null = null;

  if (cookieSession?.user) {
    session = {
      user: {
        id: cookieSession.user.id!,
        email: cookieSession.user.email!,
        name: cookieSession.user.name,
        image: cookieSession.user.image,
      },
      expires: cookieSession.expires,
    };
  } else {
    session = await resolveBearer(req);
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ session }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? '<unknown>'}:`, error);
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
