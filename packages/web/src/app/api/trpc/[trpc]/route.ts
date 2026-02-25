import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@forge/server';
import { auth } from '@/lib/auth';

/**
 * tRPC API route handler
 * Handles all tRPC endpoints: /api/trpc/*
 */
const handler = async (req: Request) => {
  const session = await auth();

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        session: session
          ? {
              user: session.user
                ? {
                    id: session.user.id!,
                    email: session.user.email!,
                    name: session.user.name,
                    image: session.user.image,
                  }
                : undefined,
              expires: session.expires,
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
