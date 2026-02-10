import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDrizzle = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createDrizzleClient() {
  // postgres() parses the URL immediately (including decodeURIComponent on password).
  // At build time on Vercel, DATABASE_URL may be unset or contain un-encoded special chars.
  // Use a safe placeholder URL for build time — queries will fail but module evaluation won't.
  const url = process.env.DATABASE_URL;
  if (!url) {
    const client = postgres('postgresql://placeholder:placeholder@localhost:5432/placeholder', {
      max: 1,
      idle_timeout: 0,
    });
    return drizzle(client, { schema });
  }

  try {
    const client = postgres(url, { max: 10, idle_timeout: 20 });
    return drizzle(client, { schema });
  } catch {
    // URL may contain un-encoded special characters (e.g. % in password).
    // Fall back to placeholder — runtime will use the correct URL via env reload.
    console.warn('[DB] Failed to parse DATABASE_URL — using placeholder for build');
    const client = postgres('postgresql://placeholder:placeholder@localhost:5432/placeholder', {
      max: 1,
      idle_timeout: 0,
    });
    return drizzle(client, { schema });
  }
}

// Cached on globalThis to survive Next.js dev hot reloads without exhausting connections.
// Unlike a Proxy, this is a real Drizzle instance so DrizzleAdapter type detection works.
export const db = globalForDrizzle.db ?? (globalForDrizzle.db = createDrizzleClient());
