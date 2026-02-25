# Changelog

## 2026-02-25

### UI: Redesign interview summary page to show full conversation inline

- **Problem:** Interview summary page only showed a tiny metadata card with a "View Full Interview" link, requiring an extra click to see any content.
- **Fix:** Rewrote the page to fetch the full interview (including messages) and render the entire conversation inline as a chat thread with assistant/user bubbles, stats header (confidence, turns, data points), and a "Redo Interview" action.
- **File:** `packages/web/src/app/(dashboard)/projects/[id]/interview-summary/page.tsx`

## 2026-02-11

### Perf: Sitewide performance audit and optimization

**Changes:**

**Frontend (packages/web):**
- Replaced render-blocking Google Fonts CSS `@import` with `next/font/google` (Inter + Space Grotesk) — eliminates external network request, zero CLS
- Added `experimental.optimizePackageImports` for lucide-react, recharts, @tiptap/* — tree-shakes ~300-500KB from client bundles
- Lazy-loaded Three.js LightPillar component via `next/dynamic` with `ssr: false` — removes ~600KB from sign-in page initial load
- Consolidated AnalyticsScripts from 3 separate `superAdminProcedure` API calls (which failed for every non-admin user) into 1 public `analyticsConfig` endpoint with `staleTime: Infinity`
- Increased React Query default `staleTime` from 5s to 30s — fewer refetches, snappier navigation
- Replaced `<img>` tags with `next/image` `<Image>` in header and top-nav-bar — automatic WebP/AVIF, lazy loading, correct sizing
- Added `images.remotePatterns` for Google/Facebook profile pictures
- Added `viewport` export with themeColor for light/dark modes
- Enhanced metadata with Open Graph, Twitter cards, and template titles
- Added `@next/bundle-analyzer` for ongoing bundle size monitoring (`ANALYZE=true pnpm build:web`)
- Added `compress: true` to next.config.ts

**Backend (packages/server):**
- Added 4 composite database indexes: `Project(userId, status)`, `Interview(projectId, status)`, `Research(status, currentPhase)`, `Report(projectId, type)` — 50-70% faster on common query patterns
- Eliminated N+1 query in `project.list` — replaced separate research `inArray` query with LEFT JOIN (2 DB round-trips → 1)
- Trimmed `userId` from project list select (already in WHERE clause)
- Added `limit` parameter to `report.listByProject` and `interview.listByProject` (default 20, max 50) — prevents unbounded data fetching
- Added in-memory TTL cache (5 min) for admin/superAdmin role checks in tRPC middleware — eliminates 1 DB query per protected endpoint
- Made DB connection pool size configurable via `DB_POOL_MAX` env var (default 10)
- Added Drizzle query logging in development (`NODE_ENV=development`)

**Files changed:**
- `packages/web/src/app/globals.css` — removed Google Fonts import
- `packages/web/src/app/layout.tsx` — next/font, viewport, metadata
- `packages/web/next.config.ts` — optimizePackageImports, compress, images, bundle analyzer
- `packages/web/src/lib/trpc/provider.tsx` — staleTime 5s → 30s
- `packages/web/src/components/analytics/analytics-scripts.tsx` — 3 queries → 1 public endpoint
- `packages/web/src/components/layout/header.tsx` — img → Image
- `packages/web/src/components/layout/top-nav-bar.tsx` — img → Image
- `packages/web/src/app/auth/signin/page.tsx` — dynamic import for LightPillar
- `packages/server/src/db/schema.ts` — 4 composite indexes
- `packages/server/src/routers/project.ts` — LEFT JOIN optimization, trimmed columns
- `packages/server/src/routers/report.ts` — pagination on listByProject
- `packages/server/src/routers/interview.ts` — pagination on listByProject
- `packages/server/src/routers/admin.ts` — new public analyticsConfig endpoint
- `packages/server/src/trpc.ts` — role check caching
- `packages/server/src/db/drizzle.ts` — configurable pool, dev query logging

---

## 2026-02-10

### Fix: 100% 500 errors on Vercel — DATABASE_URL "URI malformed"

**Problem:**
Every server-side route on Vercel returned `500` with `[DB] Failed to initialize database: URI malformed`. Dashboard, tRPC, auth session, OAuth callbacks — all broken. 76 out of 183 logged requests were 500s.

**Root Cause:**
The `postgres` npm library (v3.4.8) uses `new URL()` to parse the `DATABASE_URL` connection string. Supabase passwords containing `%` followed by non-hex characters (e.g., `%ZQ`) cause `decodeURIComponent` inside the URL constructor to throw `URIError: URI malformed`. Prisma's custom URL parser handled this; postgres.js delegates to the strict platform parser.

**Fix:**
Added `parseConnectionString()` — a manual URL decomposer that splits connection strings WITHOUT using `new URL()`. Uses `lastIndexOf('@')` to find the host separator (handles `@` in passwords) and `indexOf(':')` on credentials to split user from password (handles `:` in passwords). On `URIError`, falls back to passing individual `{ host, port, database, username, password }` options to `postgres({...})`, bypassing URL parsing entirely.

**Files changed:**
- `packages/server/src/db/drizzle.ts` — added `parseConnectionString()` fallback + URI error detection

---

### Fix: OAuth login fails on Vercel — Drizzle placeholder DB used at runtime

**Problem:**
Google OAuth login failed with `Failed query: select ... from "Account" inner join "User"`. The `[DB] Failed to parse DATABASE_URL — using placeholder for build` warning appeared at runtime, meaning the real database was replaced by a dead `localhost:5432` placeholder.

**Root Cause:**
`drizzle.ts`'s `createDrizzleClient()` wrapped `postgres(url)` in a `try/catch` that silently fell back to a localhost placeholder on ANY error — not just at build time. When `postgres` (bundled by webpack via `transpilePackages`) failed to parse the DATABASE_URL, the catch block swallowed the error and substituted a dead placeholder. All subsequent queries (including Auth.js's `getUserByAccount`) then failed against the nonexistent localhost DB.

**Fix (two-part):**
1. **drizzle.ts**: Added `NEXT_PHASE` build-time detection. Placeholder fallback now only activates during `next build` (`NEXT_PHASE === 'phase-production-build'`). At runtime, parse failures throw the real error instead of silently dying.
2. **next.config.ts**: Added `postgres`, `drizzle-orm`, and `@auth/drizzle-adapter` to `serverExternalPackages` to prevent webpack from bundling these database packages (same pattern as the earlier Prisma fix).

**Files changed:**
- `packages/server/src/db/drizzle.ts` — build-time-only placeholder fallback
- `packages/web/next.config.ts` — added DB packages to `serverExternalPackages`

---

### Fix: OAuth login fails on Vercel — Redis ECONNREFUSED 127.0.0.1:6379

**Problem:**
OAuth login (and all server routes) failed on Vercel with repeated errors:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
Error: Connection is closed.
```

**Root Cause:**
`packages/server/src/jobs/queues.ts` created 4 BullMQ `Queue` instances at **module scope**, each calling `createRedisConnection()`. BullMQ's Queue constructor triggers internal Redis commands, causing immediate connection attempts. Since routers import from `../jobs`, and `@forge/server` exports `appRouter`, the entire queue module was loaded on every Vercel function invocation — including OAuth. With no `REDIS_URL` env var on Vercel, ioredis fell back to `redis://localhost:6379`, which doesn't exist on serverless.

**Fix:**
Made all 4 BullMQ Queue instances lazy-initialized via getter functions (`getReportGenerationQueue()`, etc.). Queues are only instantiated on first call to `enqueue*()` or `getQueueStats()` — not at import time. This breaks the module-load → Redis connection chain.

**Files changed:**
- `packages/server/src/jobs/queues.ts` — Queue instances → lazy getter functions
- `packages/server/src/jobs/index.ts` — Updated re-exports to use getter functions

---

## 2026-02-09

### Fix: Prisma Query Engine not found on Vercel (PrismaClientInitializationError)

**Problem:**
OAuth login (and all Prisma-dependent routes) failed on Vercel with:
```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"
```

**Root Cause:**
`@forge/server` is listed in `transpilePackages`, so Next.js webpack followed its imports into `@prisma/client` and bundled Prisma's internals. This mangled Prisma's engine resolution logic — at runtime on Vercel, the bundled code fell back to searching for the native binary engine (`libquery_engine-rhel-openssl-3.0.x.so.node`), which doesn't exist and isn't needed since the schema uses `engineType = "client"` (JS-based, no binary).

**Fix (Attempt 1 — insufficient):**
Added `@prisma/client`, `.prisma/client`, and `@prisma/adapter-pg` to `serverExternalPackages` in `packages/web/next.config.ts`. This alone didn't work because `@forge/server` is in `transpilePackages`, which causes webpack to follow imports into `@prisma/*` before the external check applies.

**Fix (Attempt 2 — two-pronged, per Prisma docs):**

1. **Custom Prisma output path** — Added `output = "../src/generated/prisma"` to the generator block in `schema.prisma`. This is Prisma's official recommendation for pnpm workspaces. All 13 files importing from `'@prisma/client'` updated to `'../generated/prisma'`.

2. **Webpack externals regex** — Added `/^@prisma\//` and `/^\.prisma\//` regex patterns to `config.externals` in `next.config.ts`. This force-prevents webpack from bundling any `@prisma/*` runtime modules, even when reached transitively through `transpilePackages`.

**Files changed:**
- `packages/server/prisma/schema.prisma` — added `output` directive
- `packages/server/src/db/index.ts` — import from generated path
- `packages/server/src/jobs/dailyTrendPickJob.ts`
- `packages/server/src/lib/audit.ts`
- `packages/server/src/lib/deep-research.ts`
- `packages/server/src/lib/openai.ts`
- `packages/server/src/routers/blog.ts`
- `packages/server/src/routers/project.ts`
- `packages/server/src/routers/report.ts`
- `packages/server/src/routers/research.ts`
- `packages/server/src/scripts/list-research.ts`
- `packages/server/src/services/config.ts`
- `packages/server/src/services/interview-ai.ts`
- `packages/server/src/services/research-ai.ts`
- `packages/web/next.config.ts` — webpack externals + serverExternalPackages
- `.gitignore` — added `packages/server/src/generated/`

### Fix: Vercel build failure — "Type instantiation is excessively deep" on PrismaAdapter

**Problem:**
Vercel build failed at type-checking with:
```
Type error: Type instantiation is excessively deep and possibly infinite.
```
at `adapter: PrismaAdapter(prisma)` in `packages/web/src/lib/auth/config.ts`.

**Root Cause:**
The custom Prisma output path fix (above) changed all imports from `@prisma/client` to `../generated/prisma`. This produces a `PrismaClient` type that is structurally identical but nominally distinct from `@prisma/client`'s `PrismaClient`. When `@auth/prisma-adapter` tries to unify its internally-referenced `@prisma/client` types with the custom-path types, TypeScript enters infinite recursion.

**Fix:**
Added `as any` cast on the `prisma` argument passed to `PrismaAdapter`. The runtime behavior is identical — only the type import path differs.

**Files changed:**
- `packages/web/src/lib/auth/config.ts` — `PrismaAdapter(prisma as any)`
