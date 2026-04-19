# RLS Enablement Runbook

**Migration file:** `0022_enable_rls.sql`
**Effect:** Enables Row Level Security on all 47 public-schema tables with
**no policies** attached.
**Reversibility:** `ALTER TABLE <name> DISABLE ROW LEVEL SECURITY;` per
table if anything breaks.

## Why this is safe for IdeaFuel specifically

Live verification on 2026-04-16:

- IdeaFuel uses `next-auth` with users stored in `public."User"`, **not**
  Supabase Auth. `auth.users` is empty.
- `DATABASE_URL` connects as the `postgres` role (`rolbypassrls = t`).
- `supabase-js` is only used server-side with the service-role key
  (`packages/server/src/lib/supabase.ts` line 11), which also has
  BYPASSRLS.
- No client code in `packages/web` or `packages/mobile` uses the anon key
  to read the DB directly. All reads go through the server's
  `db.query.*` helpers (Drizzle) which run as `postgres`.

Enabling RLS with no policies means:

- **Postgres role** (Drizzle-mediated app traffic): unchanged — BYPASSRLS.
- **Service role** (server-side Supabase client): unchanged — BYPASSRLS.
- **Anon role** (if ever used from a client, or via PostgREST): every
  query returns zero rows or is denied.
- **Authenticated role** (Supabase JWT-mediated): same as anon here since
  no policies grant access.

This is defense in depth. The app keeps working; the blast radius of an
accidentally-leaked anon key or a misconfigured Supabase Studio drops to
zero.

## What it does NOT protect against

- **A leaked `SUPABASE_SERVICE_ROLE_KEY`** — service role bypasses RLS.
- **A leaked `DATABASE_URL`** — `postgres` role bypasses RLS.
- **Server-side bugs that skip the `ctx.userId` ownership check** — the
  server still has the power to read/write anything.

Keep the ownership checks in the tRPC routers. Keep the service role
key out of anything that ships to clients. Rotate both if either leaks.

## How to apply

**Option A — db:push workflow (current team default):**

```
pnpm --filter @forge/server db:push
```

Drizzle will compare the source schema with live and may try to apply
the diff including the new RLS migration. However, `db:push` does NOT
read migration `.sql` files — it computes a diff from schema.ts. Since
schema.ts doesn't declare RLS directly, `db:push` won't enable RLS.

For RLS specifically, **bypass `db:push` and run the SQL directly:**

```
DB_URL="$(grep -oE '^DATABASE_URL=.*' /Users/mattjones/Documents/IdeaFuel/idea-fuel/.env | sed 's/^DATABASE_URL=//; s/^"//; s/"$//' | tr -d '\n' | sed 's/?pgbouncer=true//')"
psql "$DB_URL" -f packages/server/drizzle/0022_enable_rls.sql
```

Then verify:

```
psql "$DB_URL" -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
```

Every row should now show `rowsecurity = t`.

**Option B — db:migrate workflow (post-RECONCILIATION.md):**

After the tracker has been seeded per `RECONCILIATION.md`, run:

```
pnpm --filter @forge/server db:migrate
```

Drizzle will apply `0022_enable_rls.sql` and record it in
`__drizzle_migrations`.

## Post-apply smoke test

Run through the golden paths on the app before declaring success:

1. **Anonymous landing:** visit `/` in incognito — should load (no DB
   access from public layout).
2. **Blog:** visit `/blog` — should list published posts (reads via
   server).
3. **Sign in:** sign in on mobile and web.
4. **Create project:** create a new idea, start an interview.
5. **Thought capture:** capture a thought on mobile.
6. **Admin:** visit admin subdomain if you have admin role.

Any 500 on a DB read means a non-server code path was relying on RLS
not being on. Most likely a Supabase Storage bucket or an edge function
we missed. Disable RLS on the specific table, investigate, re-enable
with a scoped policy.

## If you want policies later (Supabase Auth migration)

When/if IdeaFuel migrates to Supabase Auth, replace the no-policy
deny-all with owner-scoped policies:

```sql
DROP POLICY IF EXISTS "Project_owner_all" ON "Project";
CREATE POLICY "Project_owner_all" ON "Project"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);
```

Repeat for every user-owned table. Public-read tables (BlogPost's
published rows, IndustryTemplate) need explicit `FOR SELECT USING (...)`
policies.

**Do not add policies pre-auth migration** — they'd be based on
`auth.uid()` which returns null today, so they'd deny all, breaking any
hypothetical future direct-to-Supabase access anyway.

## Rollback

If something breaks after apply:

```sql
-- Disable RLS on the offending table:
ALTER TABLE "<TableName>" DISABLE ROW LEVEL SECURITY;
```

Or roll back everything:

```sql
-- From inside psql:
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
```
