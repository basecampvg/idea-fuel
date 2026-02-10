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

/**
 * Manually decompose a PostgreSQL connection string WITHOUT using new URL().
 * Handles passwords containing %, @, #, :, ?, / and other special characters
 * that cause URIError with the standard URL constructor.
 */
function parseConnectionString(url: string) {
  const withoutProtocol = url.replace(/^postgres(?:ql)?:\/\//, '');
  if (withoutProtocol === url) {
    throw new Error('[DB] DATABASE_URL must start with postgresql:// or postgres://');
  }

  // Split on LAST @ — password may contain @ but hostname never does
  const lastAt = withoutProtocol.lastIndexOf('@');
  if (lastAt === -1) {
    throw new Error('[DB] DATABASE_URL missing @ separator');
  }

  const credentials = withoutProtocol.slice(0, lastAt);
  const hostAndDb = withoutProtocol.slice(lastAt + 1);

  // Split credentials on FIRST : — password may contain : but username never does
  const firstColon = credentials.indexOf(':');
  if (firstColon === -1) {
    throw new Error('[DB] DATABASE_URL missing password');
  }

  const username = credentials.slice(0, firstColon);
  const password = credentials.slice(firstColon + 1);

  // Parse host:port/database?params
  const [hostPortDb, queryString] = hostAndDb.split('?');
  const [hostPort, ...dbParts] = hostPortDb.split('/');
  const database = dbParts.join('/') || 'postgres';
  const [host, portStr] = hostPort.split(':');
  const port = portStr ? parseInt(portStr, 10) : 5432;

  const options: Record<string, unknown> = {
    username,
    password, // Raw — do NOT decodeURIComponent, it may contain literal %
    host,
    port,
    database,
  };

  if (queryString) {
    const params = new URLSearchParams(queryString);
    const sslmode = params.get('sslmode');
    if (sslmode === 'require' || sslmode === 'verify-ca' || sslmode === 'verify-full') {
      options.ssl = sslmode;
    }
    if (params.get('ssl') === 'true') {
      options.ssl = 'require';
    }
  }

  return options;
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

  // Attempt 1: Standard URL-based connection
  try {
    const client = postgres(url, { max: 10, idle_timeout: 20 });
    return drizzle(client, { schema });
  } catch (err) {
    const isUriError =
      err instanceof URIError ||
      (err instanceof Error && err.message.includes('URI malformed'));

    if (!isUriError) {
      if (isBuildPhase) {
        console.warn('[DB] Failed to parse DATABASE_URL — using placeholder for build');
        return buildPlaceholder();
      }
      throw new Error(
        `[DB] Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Attempt 2: Manual parsing fallback for URLs with special chars in password
    console.warn('[DB] URL parsing failed (likely special chars in password) — trying manual parse');
    try {
      const parsed = parseConnectionString(url);
      console.info(
        `[DB] Fallback parsed: host=${parsed.host}, port=${parsed.port}, db=${parsed.database}, user=${parsed.username}`
      );
      const client = postgres({
        host: parsed.host as string,
        port: parsed.port as number,
        database: parsed.database as string,
        username: parsed.username as string,
        password: parsed.password as string,
        ...(parsed.ssl ? { ssl: parsed.ssl as 'require' | 'verify-full' } : {}),
        max: 10,
        idle_timeout: 20,
      });
      return drizzle(client, { schema });
    } catch (fallbackErr) {
      if (isBuildPhase) {
        console.warn('[DB] Fallback also failed — using placeholder for build');
        return buildPlaceholder();
      }
      throw new Error(
        `[DB] Failed to initialize database (URL and fallback both failed):\n` +
          `  URL error: ${err instanceof Error ? err.message : String(err)}\n` +
          `  Fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
      );
    }
  }
}

// Cached on globalThis to survive Next.js dev hot reloads without exhausting connections.
// Unlike a Proxy, this is a real Drizzle instance so DrizzleAdapter type detection works.
export const db = globalForDrizzle.db ?? (globalForDrizzle.db = createDrizzleClient());
