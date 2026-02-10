import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDrizzle = globalThis as unknown as {
  db: ReturnType<typeof createDrizzleClient> | undefined;
};

function createDrizzleClient() {
  const client = postgres(process.env.DATABASE_URL!, {
    // Connection pool settings
    max: 10,
    idle_timeout: 20,
  });
  return drizzle(client, { schema });
}

// Lazy-initialized Drizzle client — avoids crash at build time when DATABASE_URL is not set
export const db = new Proxy({} as ReturnType<typeof createDrizzleClient>, {
  get(_target, prop) {
    if (!globalForDrizzle.db) {
      globalForDrizzle.db = createDrizzleClient();
    }
    return (globalForDrizzle.db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
