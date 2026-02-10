import { router } from '../trpc';
import { userRouter } from './user';
import { projectRouter } from './project';
import { interviewRouter } from './interview';
import { reportRouter } from './report';
import { researchRouter } from './research';
import { adminRouter } from './admin';
import { dailyPickRouter } from './dailyPick';
import { blogRouter } from './blog';

/**
 * Main application router
 * Combines all sub-routers into a single API
 */
export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  interview: interviewRouter,
  report: reportRouter,
  research: researchRouter,
  admin: adminRouter,
  dailyPick: dailyPickRouter,
  blog: blogRouter,
});

// Export type definition for client usage
export type AppRouter = typeof appRouter;
