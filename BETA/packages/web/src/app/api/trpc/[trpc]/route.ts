import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@forge/server';
import { prisma } from '@forge/server';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      // TODO: Get session from Auth.js when implemented
      return {
        prisma,
        session: null,
        userId: null,
      };
    },
  });

export { handler as GET, handler as POST };
