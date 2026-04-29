import { clusterRouter } from './cluster';
// Backwards compatibility: sandbox.* routes delegate to cluster.*
export const sandboxRouter = clusterRouter;
