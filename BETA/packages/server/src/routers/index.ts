import { router } from '../trpc';
import { userRouter } from './user';
import { ideaRouter } from './idea';
import { interviewRouter } from './interview';
import { documentRouter } from './document';

/**
 * Main application router
 * Combines all sub-routers into a single API
 */
export const appRouter = router({
  user: userRouter,
  idea: ideaRouter,
  interview: interviewRouter,
  document: documentRouter,
});

// Export type definition for client usage
export type AppRouter = typeof appRouter;
