import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDrizzle = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createDrizzleClient() {
  // postgres() creates a lazy connection pool — no actual DB connection until a query runs.
  // Using fallback empty string so module evaluation doesn't crash at build time.
  const client = postgres(process.env.DATABASE_URL || '', {
    max: 10,
    idle_timeout: 20,
  });
  return drizzle(client, { schema });
}

// Cached on globalThis to survive Next.js dev hot reloads without exhausting connections.
// Unlike a Proxy, this is a real Drizzle instance so DrizzleAdapter type detection works.
export const db = globalForDrizzle.db ?? (globalForDrizzle.db = createDrizzleClient());
