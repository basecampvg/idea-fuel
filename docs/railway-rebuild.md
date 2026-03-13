# Railway Project Rebuild Guide

Recreate the **shimmering-reprieve** project under a new Railway account.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  @forge/server  │────▶│   Redis-XXZm    │◀────│     worker      │
│   (API server)  │     │  (BullMQ queue) │     │ (job processor) │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         └──────────────┐                ┌───────────────┘
                        ▼                ▼
                 ┌─────────────────────────┐
                 │   Supabase PostgreSQL   │
                 │     (external DB)       │
                 └─────────────────────────┘
```

3 services in a single Railway project, single `production` environment.

---

## Service 1: Redis

| Setting | Value |
|---|---|
| **Type** | Railway plugin (Add Redis from dashboard) |
| **Image** | Railway's built-in Redis |
| **Port** | 6379 |
| **Volume** | Mounted at `/data` (persistent storage) |
| **TCP Proxy** | Enabled (provides public access) |

### Auto-generated variables (Railway creates these)
- `REDIS_URL` — internal connection string
- `REDIS_PUBLIC_URL` — public TCP proxy URL
- `REDIS_PASSWORD`, `REDISHOST`, `REDISPORT`, `REDISUSER`

No custom config needed — just add Redis from the Railway dashboard.

---

## Service 2: @forge/server (API)

| Setting | Value |
|---|---|
| **Type** | GitHub deploy (monorepo) |
| **Root directory** | `/` (project root — uses pnpm workspace) |
| **Builder** | Nixpacks (auto-detected) |
| **Start command** | _(none set — uses default from package.json)_ |
| **Private domain** | `forgeserver.railway.internal` |

### Environment Variables (user-set only)

```env
# Database
DATABASE_URL="<supabase-pooler-url>?pgbouncer=true"
DIRECT_URL="<supabase-direct-url>"

# Auth
AUTH_SECRET="<generate: openssl rand -base64 32>"
AUTH_URL="<your-app-url>"
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"

# Redis (reference the Redis service variable)
REDIS_URL="${{Redis.REDIS_URL}}"

# AI Providers
OPENAI_API_KEY="<your-key>"
OPENAI_USE_GPT52_PARAMS="true"
ANTHROPIC_API_KEY="<your-key>"
PERPLEXITY_API_KEY="<your-key>"

# Research APIs
BRAVE_SEARCH_API_KEY="<your-key>"
SERPAPI_API_KEY="<your-key>"

# App Config
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="<your-app-url>"
TZ="America/Denver"

# Daily Pick Tuning (all optional — have code defaults)
DEFAULT_GEO="US"
DEFAULT_TIMEFRAME="90d"
MAX_CANDIDATES=200
MIN_FILTERED_CANDIDATES=25
FALLBACK_ALLOW_NON_MATCHING="true"
FALLBACK_TOP_N=25
MAX_ENRICH=50
CACHE_TTL_HOURS=24
MIN_QUERY_TOKENS_FOR_BEST=3
MIN_WINNER_SCORE=55
```

---

## Service 3: worker (BullMQ job processor)

| Setting | Value |
|---|---|
| **Type** | GitHub deploy (monorepo, same repo as server) |
| **Root directory** | `/` (project root) |
| **Builder** | Nixpacks (auto-detected) |
| **Start command** | `npx tsx packages/server/src/worker.ts` |
| **Nixpacks start cmd** | `pnpm --filter @forge/server worker:start` |
| **Private domain** | `worker.railway.internal` |

> **Note:** Both `RAILWAY_START_COMMAND` and `NIXPACKS_START_CMD` / `RAILPACK_START_CMD` were set.
> The Railway start command override (`npx tsx packages/server/src/worker.ts`) takes precedence.
> Only one is needed — set the **Start Command** in the Railway dashboard to:
> `npx tsx packages/server/src/worker.ts`

### Environment Variables (user-set only)

```env
# Database
DATABASE_URL="<supabase-pooler-url>?pgbouncer=true"
DIRECT_URL="<supabase-direct-url>"

# Redis (reference the Redis service variable)
REDIS_URL="${{Redis.REDIS_URL}}"

# AI Providers (same keys as server)
OPENAI_API_KEY="<your-key>"
OPENAI_USE_GPT52_PARAMS="true"
ANTHROPIC_API_KEY="<your-key>"
PERPLEXITY_API_KEY="<your-key>"

# Research APIs
BRAVE_SEARCH_API_KEY="<your-key>"
SERPAPI_API_KEY="<your-key>"

# Config
NODE_ENV="production"
TZ="America/Denver"
```

---

## Rebuild Steps

1. **Create new Railway project**
2. **Add Redis** — click "New" → "Database" → "Redis". Enable TCP proxy for external access.
3. **Add @forge/server service** — click "New" → "GitHub Repo" → select the repo. Set the env vars above. Use `${{Redis.REDIS_URL}}` to reference the Redis service's internal URL.
4. **Add worker service** — click "New" → "GitHub Repo" → select the same repo. Set the start command to `npx tsx packages/server/src/worker.ts`. Set the env vars above (same Redis reference).
5. **Deploy** — both services will build from the monorepo root using Nixpacks.

### Shared Variables Tip
`DATABASE_URL`, `DIRECT_URL`, and all API keys are identical between `@forge/server` and `worker`. Use Railway's **shared variables** feature to avoid duplication.
