# Drizzle Reconciliation Runbook

**Status as of 2026-04-16:** live DB has drifted from migration history because
the team has been using `pnpm db:push` instead of `pnpm db:migrate`. This
doc captures the state and a safe path forward.

## Current state

- **`drizzle.__drizzle_migrations` tracker:** empty (0 rows). Migration
  history exists only in `_journal.json` on disk.
- **Live DB:** 47 public-schema tables. `db:push` has kept it in sync with
  source schema over time except for one gap (below) and some drifted
  columns/tables that weren't in source until 2026-04-16.
- **Schema drift that was just reconciled in source (commit `<this commit>`):**
  - `User.creditBalance` (credit system)
  - `Project.mode` + `businessContext` (Launch vs Expand mode)
  - `Interview.expandTrackProgress`
  - `Research.expand{ResearchData,OpportunityEngine,MoatAudit}`
  - `CreditTransaction` table + `CreditTransactionType` enum
  - `ProjectMode` enum
- **One real gap that still needs a live-DB change:** `ProjectAttachment`
  table does not exist in live DB but is declared in source and referenced
  by server code.

## What was cleaned up in the repo this commit

- Deleted 3 orphan migration files that were never in the journal and
  never applied:
  - `0001_supreme_william_stryker.sql` (would have dropped 56 critical
    indexes — dangerous artifact from a rogue `db:generate` run)
  - `0008_positioning_cover_style.sql` (column already exists in live via
    `db:push`)
  - `0013_card_count_check.sql` (CHECK constraint is already in live;
    keeping the file would cause a "already exists" error if anyone tried
    to apply it)

## Path forward

Two options. Pick one before launch; don't leave this half-done.

### Option 1 (recommended pre-launch): stay on `db:push`, fix the gap

1. From the server workspace root, run:

   ```
   pnpm --filter @forge/server db:push
   ```

2. Drizzle will prompt with a diff. Review it carefully. You should see:
   - `CREATE TABLE "ProjectAttachment"` with its FKs and indexes.
   - Nothing else. (If you see `DROP` anywhere, **abort** — something
     drifted further and the source schema needs more updates.)

3. Accept the push. The gap closes. `ProjectAttachment` exists in live.
   Server code that inserts into it stops crashing at runtime.

4. Verify:

   ```
   psql "$DATABASE_URL" -c '\d "ProjectAttachment"'
   ```

### Option 2 (recommended post-launch, or if you want a proper migration history): adopt `db:migrate`

This is the "real" fix — lands the tracker, enables a proper migration
workflow for future schema changes. Slightly more work:

1. Generate a hash-seeding script (Drizzle computes SHA-256 of each
   migration file's content). Put each existing migration in
   `_journal.json` into `__drizzle_migrations` manually:

   ```sql
   INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
   VALUES
     (<sha256 of 0000_wonderful_legion.sql>, 1234567890),
     (<sha256 of 0001_rare_trish_tilby.sql>, 1234567891),
     -- ... one row per file in _journal.json
     ;
   ```

   You can compute the hashes via `sha256sum packages/server/drizzle/*.sql`
   or a tiny Node script. **Match the `when` timestamps from `_journal.json`
   to the `created_at` column.**

2. After seeding, `pnpm db:migrate` becomes a no-op against current live
   state (all tagged migrations look applied).

3. Generate a new migration for the `ProjectAttachment` gap:

   ```
   pnpm --filter @forge/server db:generate
   ```

   Drizzle should emit a migration file that only creates
   `ProjectAttachment`. Review it.

4. Apply:

   ```
   pnpm --filter @forge/server db:migrate
   ```

5. From here on, schema changes go through `db:generate` → review → `db:migrate`.
   Stop using `db:push` in production.

## Why you should eventually move to Option 2

- **Audit trail.** Every schema change becomes a reviewable file in git.
- **Staging parity.** Same migrations apply everywhere, in the same
  order.
- **Rollback stories.** `db:push` has no rollback; migrations do.
- **RLS-friendly.** When RLS enablement lands (next audit step), it's a
  single named migration you can review and roll back.

## Why Option 1 is acceptable for launch week

- The only real correctness issue blocking launch is `ProjectAttachment`.
- The tracker being empty does no harm as long as nobody runs
  `db:migrate`.
- Reconciling the tracker is a careful operation (hash computation,
  timestamp matching) that's easy to do wrong under time pressure.
- You can do Option 2 calmly the week after launch.

## What about the drifted columns staying in live forever?

The source schema now declares them. They sit there, take up space proportional
to the data written to them (zero for unused, some for `User.creditBalance` once
the credit system ships), and stop showing up as drift in future `db:push`
diffs.

If any of them turn out to be truly dead later (e.g., Expand mode is
cancelled), write an explicit drop migration. Don't backdoor-drop via a
schema-change-then-push.
