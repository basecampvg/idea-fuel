import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext, prisma } from '@forge/server';
import { auth } from '@/lib/auth';

// DEV MODE: Bypass authentication for testing
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development';
const DEV_USER = {
  id: 'dev-user-id-12345',
  email: 'dev@forge.local',
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
    await prisma.user.upsert({
      where: { id: DEV_USER.id },
      update: {},
      create: {
        id: DEV_USER.id,
        email: DEV_USER.email,
        name: DEV_USER.name,
      },
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
  // Get the Auth.js session
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
