import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@forge/server';

export const trpc = createTRPCReact<AppRouter>();
