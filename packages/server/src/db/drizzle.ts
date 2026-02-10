import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDrizzle = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

/** True only during `next build` on Vercel — env vars may be absent or malformed. */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

function buildPlaceholder() {
  const client = postgres('postgresql://placeholder:placeholder@localhost:5432/placeholder', {
    max: 1,
    idle_timeout: 0,
  });
  return drizzle(client, { schema });
}

function createDrizzleClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    if (isBuildPhase) {
      console.warn('[DB] DATABASE_URL not set — using placeholder for build');
      return buildPlaceholder();
    }
    throw new Error('[DB] DATABASE_URL environment variable is not set');
  }

  try {
    const client = postgres(url, { max: 10, idle_timeout: 20 });
    return drizzle(client, { schema });
  } catch (err) {
    if (isBuildPhase) {
      console.warn('[DB] Failed to parse DATABASE_URL — using placeholder for build');
      return buildPlaceholder();
    }
    // At runtime, surface the real error instead of silently using a dead placeholder
    throw new Error(
      `[DB] Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// Cached on globalThis to survive Next.js dev hot reloads without exhausting connections.
// Unlike a Proxy, this is a real Drizzle instance so DrizzleAdapter type detection works.
export const db = globalForDrizzle.db ?? (globalForDrizzle.db = createDrizzleClient());
