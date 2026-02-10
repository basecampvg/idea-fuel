# Changelog

## 2026-02-10

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
