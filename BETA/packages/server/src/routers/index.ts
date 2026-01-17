import { router } from '../trpc';
import { userRouter } from './user';
import { ideaRouter } from './idea';
import { interviewRouter } from './interview';
import { reportRouter } from './report';
import { researchRouter } from './research';

/**
 * Main application router
 * Combines all sub-routers into a single API
 */
export const appRouter = router({
  user: userRouter,
  idea: ideaRouter,
  interview: interviewRouter,
  report: reportRouter,
  research: researchRouter,
});

// Export type definition for client usage
export type AppRouter = typeof appRouter;
