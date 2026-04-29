import { thoughtRouter } from './thought';
// Backwards compatibility: note.* routes delegate to thought.*
export const noteRouter = thoughtRouter;
