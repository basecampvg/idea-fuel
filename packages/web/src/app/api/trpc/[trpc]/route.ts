import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext, db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DEV MODE: Bypass authentication for testing
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development';
const DEV_USER = {
  id: 'dev-user-id-12345',
  email: 'dev@ideationlab.local',
  name: 'Developer',
  image: null,
};

// Track if dev user has been ensured this session
let devUserEnsured = false;

/**
 * Ensure dev user exists in database (only in dev mode)
 */
async function ensureDevUser() {
  if (!DEV_BYPASS_AUTH || devUserEnsured) return;

  try {
    await db
      .insert(schema.users)
      .values({
        id: DEV_USER.id,
        email: DEV_USER.email,
        name: DEV_USER.name,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {},
      });
    devUserEnsured = true;
  } catch (error) {
    console.error('Failed to ensure dev user:', error);
  }
}

/**
 * tRPC API route handler
 * Handles all tRPC endpoints: /api/trpc/*
 */
const handler = async (req: Request) => {
  // In dev mode, skip auth entirely and use mock user immediately
  // This avoids the Auth.js -> DrizzleAdapter -> DB connection which can hang
  if (DEV_BYPASS_AUTH) {
    await ensureDevUser();

    const devSession = { user: DEV_USER, expires: new Date(Date.now() + 86400000).toISOString() };

    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () =>
        createContext({
          session: {
            user: {
              id: DEV_USER.id,
              email: DEV_USER.email,
              name: DEV_USER.name,
              image: DEV_USER.image,
            },
            expires: devSession.expires,
          },
        }),
      onError: ({ path, error }) => {
        console.error(`tRPC error on ${path ?? '<unknown>'}:`, error);
      },
    });
  }

  // Production: Get the Auth.js session
  const session = await auth();

  // In dev mode, use mock user if no real session
  const usingDevUser = DEV_BYPASS_AUTH && !session;
  if (usingDevUser) {
    await ensureDevUser();
  }

  const effectiveSession = session ?? (usingDevUser ? { user: DEV_USER, expires: new Date(Date.now() + 86400000).toISOString() } : null);

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        session: effectiveSession
          ? {
              user: effectiveSession.user
                ? {
                    id: effectiveSession.user.id!,
                    email: effectiveSession.user.email!,
                    name: effectiveSession.user.name,
                    image: effectiveSession.user.image,
                  }
                : undefined,
              expires: effectiveSession.expires,
            }
          : null,
      }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? '<unknown>'}:`, error);
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
