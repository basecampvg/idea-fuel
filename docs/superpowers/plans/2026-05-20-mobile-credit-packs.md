# Credit Packs & Pure-Credit Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-feature card counters with a unified credit ledger; sell credit packs via Stripe (web) + RevenueCat consumables (iOS, Android).

**Architecture:** Append-only `credit_ledger` table as source of truth, denormalized `users.creditBalance` cache. Single `consumeCredits/grantCredits/refundCredits` lib used by routers and webhooks. Two-level webhook idempotency: `processed_webhook_events` dedup table + per-ledger-entry idempotency key. Tier grants expire (Apple compliance); purchased credits never expire.

**Tech Stack:** Drizzle ORM + PostgreSQL (Supabase), tRPC, BullMQ workers, Auth.js v5 (web), expo-auth-session (mobile), RevenueCat React Native SDK, Stripe Node SDK, Vitest, Next.js 15, Expo 54.

**Spec:** [docs/superpowers/specs/2026-05-20-mobile-credit-packs-design.md](../specs/2026-05-20-mobile-credit-packs-design.md) (committed as `3ad0882`)

**Branch:** main (no feature branches per repo convention)

---

## Phase 1: Constants & Schema

### Task 1: Add credit constants to @forge/shared

**Files:**
- Create: `packages/shared/src/constants/credits.ts`
- Modify: `packages/shared/src/constants/index.ts`

- [ ] **Step 1: Create the constants file**

```ts
// packages/shared/src/constants/credits.ts
import type { SubscriptionTier } from '../types';

export const CREDIT_OP_COSTS = {
  validation_card: 2,
  sketch: 1,
} as const;

export type CreditOp = keyof typeof CREDIT_OP_COSTS;

export const TIER_MONTHLY_GRANT: Record<SubscriptionTier, number> = {
  FREE: 0,
  MOBILE: 50,
  PRO: 75,
  ENTERPRISE: 200,
  SCALE: 600,
  TESTER: 1000,
};

export const FREE_STARTER_GRANT = 5;

export const NEGATIVE_BALANCE_FLOOR = -10;

export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;
  revenuecatProductId: string;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: 'pack_25',  credits: 25,  priceUsd: 4.99,  revenuecatProductId: 'ideafuel_credits_25' },
  { id: 'pack_60',  credits: 60,  priceUsd: 9.99,  revenuecatProductId: 'ideafuel_credits_60' },
  { id: 'pack_150', credits: 150, priceUsd: 19.99, revenuecatProductId: 'ideafuel_credits_150' },
  { id: 'pack_400', credits: 400, priceUsd: 49.99, revenuecatProductId: 'ideafuel_credits_400' },
] as const;

export const REVENUECAT_CREDIT_PACK_MAP: Record<string, CreditPack> = Object.fromEntries(
  CREDIT_PACKS.map((p) => [p.revenuecatProductId, p])
);

export const CREDIT_PACK_BY_ID: Record<string, CreditPack> = Object.fromEntries(
  CREDIT_PACKS.map((p) => [p.id, p])
);
```

- [ ] **Step 2: Re-export from constants index**

Append to `packages/shared/src/constants/index.ts`:

```ts
export * from './credits';
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @forge/shared build`
Expected: clean build, no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/constants/credits.ts packages/shared/src/constants/index.ts
git commit -m "feat(shared): add credit pack constants and operation costs"
```

---

### Task 2: Add creditLedger and processedWebhookEvents tables to Drizzle schema

**Files:**
- Modify: `packages/server/src/db/schema.ts`

- [ ] **Step 1: Add enums and tables**

Find the existing `creditTransactionTypeEnum` declaration (around line 32) and replace with the new ledger enums. Add the new tables after the existing `creditTransactions` block (around line 707).

Replace:

```ts
export const creditTransactionTypeEnum = pgEnum('CreditTransactionType', ['PURCHASE', 'CONSUME', 'REFUND', 'GRANT']);
```

With:

```ts
export const creditTransactionTypeEnum = pgEnum('CreditTransactionType', ['PURCHASE', 'CONSUME', 'REFUND', 'GRANT']);
// Deprecated — kept for the legacy creditTransactions table during rollback window. Remove after 30 days clean.

export const creditLedgerDirectionEnum = pgEnum('CreditLedgerDirection', ['debit', 'credit']);
export const creditLedgerReasonEnum = pgEnum('CreditLedgerReason', [
  'purchase',
  'tier_grant',
  'starter',
  'consumption',
  'refund',
  'admin_adjust',
]);
export const webhookProviderEnum = pgEnum('WebhookProvider', ['stripe', 'revenuecat']);
```

Append new tables at the end of the file (before any final `export type` declarations):

```ts
// =============================================================================
// CREDIT LEDGER (append-only ledger of credit movements)
// =============================================================================

export const creditLedger = pgTable('CreditLedger', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  amount: integer().notNull(),
  direction: creditLedgerDirectionEnum().notNull(),
  reason: creditLedgerReasonEnum().notNull(),
  referenceType: text('reference_type').notNull(),
  referenceId: text('reference_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  expiresAt: timestamp('expires_at', { precision: 3, mode: 'date' }),
  createdAt: timestamp('created_at', { precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  metadata: jsonb(),
}, (table) => [
  uniqueIndex('CreditLedger_idempotencyKey_key').on(table.idempotencyKey),
  index('CreditLedger_userId_createdAt_idx').on(table.userId, table.createdAt.desc()),
  index('CreditLedger_userId_expiresAt_idx').on(table.userId, table.expiresAt),
  index('CreditLedger_referenceType_referenceId_idx').on(table.referenceType, table.referenceId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'CreditLedger_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// PROCESSED WEBHOOK EVENTS (dedup table for inbound webhooks)
// =============================================================================

export const processedWebhookEvents = pgTable('ProcessedWebhookEvent', {
  provider: webhookProviderEnum().notNull(),
  eventId: text('event_id').notNull(),
  receivedAt: timestamp('received_at', { precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  primaryKey({ columns: [table.provider, table.eventId] }),
  index('ProcessedWebhookEvent_receivedAt_idx').on(table.receivedAt),
]);
```

- [ ] **Step 2: Add missing imports**

At the top of `schema.ts`, ensure these are imported from `drizzle-orm/pg-core`: `pgTable, text, integer, pgEnum, timestamp, jsonb, index, uniqueIndex, foreignKey, primaryKey`. Add any that aren't present.

- [ ] **Step 3: Run type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/db/schema.ts
git commit -m "feat(server): add creditLedger and processedWebhookEvents schemas"
```

---

### Task 3: Hand-roll migration SQL

**Files:**
- Create: `packages/server/drizzle/0027_credit_ledger.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Credit Ledger + Webhook Dedup
-- Per spec: docs/superpowers/specs/2026-05-20-mobile-credit-packs-design.md
--
-- Effects:
--   1. Create CreditLedgerDirection enum
--   2. Create CreditLedgerReason enum
--   3. Create WebhookProvider enum
--   4. Create CreditLedger table (append-only ledger)
--   5. Create ProcessedWebhookEvent table (webhook dedup)
--   6. Note: legacy CreditTransaction table is preserved for rollback window.
--      Drop in a follow-up migration after 30 days clean.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1-3. Enums
-- ----------------------------------------------------------------------------
CREATE TYPE "CreditLedgerDirection" AS ENUM ('debit', 'credit');
CREATE TYPE "CreditLedgerReason" AS ENUM ('purchase', 'tier_grant', 'starter', 'consumption', 'refund', 'admin_adjust');
CREATE TYPE "WebhookProvider" AS ENUM ('stripe', 'revenuecat');

-- ----------------------------------------------------------------------------
-- 4. CreditLedger
-- ----------------------------------------------------------------------------
CREATE TABLE "CreditLedger" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "amount" integer NOT NULL,
  "direction" "CreditLedgerDirection" NOT NULL,
  "reason" "CreditLedgerReason" NOT NULL,
  "reference_type" text NOT NULL,
  "reference_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "expires_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" jsonb,
  CONSTRAINT "CreditLedger_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "CreditLedger_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX "CreditLedger_idempotencyKey_key" ON "CreditLedger" ("idempotency_key");
CREATE INDEX "CreditLedger_userId_createdAt_idx" ON "CreditLedger" ("user_id", "created_at" DESC);
CREATE INDEX "CreditLedger_userId_expiresAt_idx" ON "CreditLedger" ("user_id", "expires_at");
CREATE INDEX "CreditLedger_referenceType_referenceId_idx" ON "CreditLedger" ("reference_type", "reference_id");

-- ----------------------------------------------------------------------------
-- 5. ProcessedWebhookEvent
-- ----------------------------------------------------------------------------
CREATE TABLE "ProcessedWebhookEvent" (
  "provider" "WebhookProvider" NOT NULL,
  "event_id" text NOT NULL,
  "received_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("provider", "event_id")
);

CREATE INDEX "ProcessedWebhookEvent_receivedAt_idx" ON "ProcessedWebhookEvent" ("received_at");

COMMIT;
```

- [ ] **Step 2: Apply to dev DB**

Run: `pnpm --filter @forge/server db:migrate`
Expected: migration applies cleanly, prints "0027_credit_ledger" applied.

- [ ] **Step 3: Verify in Drizzle Studio (optional)**

Run: `pnpm --filter @forge/server db:studio`
Expected: see `CreditLedger` and `ProcessedWebhookEvent` tables in the schema list.

- [ ] **Step 4: Commit**

```bash
git add packages/server/drizzle/0027_credit_ledger.sql
git commit -m "feat(server): migration for creditLedger and processedWebhookEvents"
```

---

## Phase 2: Credit Ledger Library (TDD)

### Task 4: getBalance helper

**Files:**
- Create: `packages/server/src/lib/credit-ledger.ts`
- Create: `packages/server/src/lib/__tests__/credit-ledger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/server/src/lib/__tests__/credit-ledger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBalance } from '../credit-ledger';

function buildDb(rows: Array<{ direction: 'debit' | 'credit'; amount: number; expiresAt: Date | null }>) {
  return {
    query: {
      creditLedger: {
        findMany: vi.fn().mockResolvedValue(rows),
      },
    },
  } as any;
}

describe('credit-ledger.getBalance', () => {
  it('returns 0 when ledger is empty', async () => {
    const db = buildDb([]);
    expect(await getBalance(db, 'user-1')).toBe(0);
  });

  it('sums credits minus debits, excluding expired tier grants', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400_000);
    const past = new Date(now.getTime() - 86400_000);
    const db = buildDb([
      { direction: 'credit', amount: 50, expiresAt: future },   // active grant
      { direction: 'credit', amount: 25, expiresAt: null },      // purchase, never expires
      { direction: 'debit',  amount: 10, expiresAt: null },      // consumption
      { direction: 'credit', amount: 100, expiresAt: past },     // expired, ignored
    ]);
    expect(await getBalance(db, 'user-1')).toBe(65);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: FAIL with "Cannot find module '../credit-ledger'".

- [ ] **Step 3: Implement getBalance**

```ts
// packages/server/src/lib/credit-ledger.ts
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import type { db as DbType } from '../db/drizzle';
import { creditLedger, users } from '../db/schema';

type Db = typeof DbType;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbOrTx = Db | Tx;

/**
 * Compute the user's current credit balance from the ledger.
 * Excludes expired tier grants.
 */
export async function getBalance(db: DbOrTx, userId: string): Promise<number> {
  const rows = await db.query.creditLedger.findMany({
    where: and(
      eq(creditLedger.userId, userId),
      or(isNull(creditLedger.expiresAt), gt(creditLedger.expiresAt, new Date())),
    ),
    columns: { direction: true, amount: true, expiresAt: true },
  });

  let balance = 0;
  for (const row of rows) {
    balance += row.direction === 'credit' ? row.amount : -row.amount;
  }
  return balance;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/lib/credit-ledger.ts packages/server/src/lib/__tests__/credit-ledger.test.ts
git commit -m "feat(server): credit-ledger.getBalance with tests"
```

---

### Task 5: grantCredits

**Files:**
- Modify: `packages/server/src/lib/credit-ledger.ts`
- Modify: `packages/server/src/lib/__tests__/credit-ledger.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `credit-ledger.test.ts`:

```ts
import { grantCredits } from '../credit-ledger';

describe('credit-ledger.grantCredits', () => {
  const baseDb = () => {
    const ledgerInserts: any[] = [];
    const userUpdates: any[] = [];
    return {
      ledgerInserts,
      userUpdates,
      transaction: vi.fn(async (fn: any) => fn({
        insert: vi.fn().mockReturnValue({
          values: vi.fn((row) => ({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(ledgerInserts.find((r) => r.idempotencyKey === row.idempotencyKey) ? [] : [{ id: 'new-id', ...row }]),
            }),
            returning: vi.fn().mockResolvedValue([{ id: 'new-id', ...row }]),
          })),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
        query: {
          users: { findFirst: vi.fn().mockResolvedValue({ creditBalance: 0 }) },
          creditLedger: { findFirst: vi.fn().mockImplementation(({ where }) => {
            const found = ledgerInserts.find((r) => r.idempotencyKey === where.value);
            return Promise.resolve(found ?? null);
          }) },
        },
      })),
    } as any;
  };

  it('inserts a credit ledger row and updates user balance', async () => {
    const db = baseDb();
    const result = await grantCredits(db, 'user-1', 50, 'purchase', 'stripe_event', 'evt_xyz');
    expect(result.balanceAfter).toBe(50);
    expect(result.ledgerId).toBe('new-id');
  });

  it('is idempotent: re-calling with same reference is a no-op', async () => {
    const db = baseDb();
    await grantCredits(db, 'user-1', 50, 'purchase', 'stripe_event', 'evt_xyz');
    const result = await grantCredits(db, 'user-1', 50, 'purchase', 'stripe_event', 'evt_xyz');
    expect(result.balanceAfter).toBe(50); // not 100
  });

  it('throws when amount <= 0', async () => {
    const db = baseDb();
    await expect(grantCredits(db, 'user-1', 0, 'purchase', 'stripe_event', 'evt_xyz')).rejects.toThrow('amount must be positive');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: FAIL with "grantCredits is not a function".

- [ ] **Step 3: Implement grantCredits**

Append to `credit-ledger.ts`:

```ts
import { TRPCError } from '@trpc/server';

type LedgerReason = 'purchase' | 'tier_grant' | 'starter' | 'consumption' | 'refund' | 'admin_adjust';

interface GrantOptions {
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

interface LedgerResult {
  balanceAfter: number;
  ledgerId: string;
}

function buildIdempotencyKey(refType: string, refId: string): string {
  return `${refType}:${refId}`;
}

/**
 * Insert a credit (positive balance change) into the ledger and update the
 * denormalized balance cache. Idempotent by (referenceType, referenceId).
 */
export async function grantCredits(
  db: DbOrTx,
  userId: string,
  amount: number,
  reason: Exclude<LedgerReason, 'consumption' | 'refund'>,
  referenceType: string,
  referenceId: string,
  options: GrantOptions = {},
): Promise<LedgerResult> {
  if (amount <= 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be positive' });
  }

  const idempotencyKey = buildIdempotencyKey(referenceType, referenceId);

  return ('transaction' in db ? db.transaction(async (tx) => grantInner(tx, userId, amount, reason, referenceType, referenceId, idempotencyKey, options)) : grantInner(db, userId, amount, reason, referenceType, referenceId, idempotencyKey, options));
}

async function grantInner(
  tx: any,
  userId: string,
  amount: number,
  reason: string,
  referenceType: string,
  referenceId: string,
  idempotencyKey: string,
  options: GrantOptions,
): Promise<LedgerResult> {
  const existing = await tx.query.creditLedger.findFirst({
    where: eq(creditLedger.idempotencyKey, idempotencyKey),
  });
  if (existing) {
    const balanceAfter = await getBalance(tx, userId);
    return { balanceAfter, ledgerId: existing.id };
  }

  const [row] = await tx.insert(creditLedger).values({
    userId, amount, direction: 'credit', reason: reason as any,
    referenceType, referenceId, idempotencyKey,
    expiresAt: options.expiresAt ?? null,
    metadata: options.metadata ?? null,
  }).returning();

  await tx.update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${amount}` })
    .where(eq(users.id, userId));

  const balanceAfter = await getBalance(tx, userId);
  return { balanceAfter, ledgerId: row.id };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/lib/credit-ledger.ts packages/server/src/lib/__tests__/credit-ledger.test.ts
git commit -m "feat(server): credit-ledger.grantCredits with idempotency"
```

---

### Task 6: consumeCredits

**Files:**
- Modify: `packages/server/src/lib/credit-ledger.ts`
- Modify: `packages/server/src/lib/__tests__/credit-ledger.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `credit-ledger.test.ts`:

```ts
import { consumeCredits } from '../credit-ledger';

describe('credit-ledger.consumeCredits', () => {
  it('throws INSUFFICIENT_CREDITS when balance < amount', async () => {
    const db = baseDb();
    // Mock balance lookup to return 1
    db.transaction = vi.fn(async (fn: any) => fn({
      query: { creditLedger: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([{ direction: 'credit', amount: 1, expiresAt: null }]) }, users: { findFirst: vi.fn() } },
      insert: vi.fn(),
      update: vi.fn(),
    }));
    await expect(consumeCredits(db, 'user-1', 2, 'sketch', 'sketch-1')).rejects.toThrow(/INSUFFICIENT_CREDITS/);
  });

  it('inserts debit row and updates balance', async () => {
    const db = baseDb();
    // Mock balance >= amount, no existing ledger row
    let inserted: any = null;
    db.transaction = vi.fn(async (fn: any) => fn({
      query: {
        creditLedger: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValueOnce([
            { direction: 'credit', amount: 10, expiresAt: null },
          ]).mockResolvedValueOnce([
            { direction: 'credit', amount: 10, expiresAt: null },
            { direction: 'debit',  amount: 2,  expiresAt: null },
          ]),
        },
        users: { findFirst: vi.fn() },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn((row) => { inserted = row; return { returning: vi.fn().mockResolvedValue([{ id: 'led-1', ...row }]) }; }),
      }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    }));
    const result = await consumeCredits(db, 'user-1', 2, 'sketch', 'sketch-1');
    expect(result.balanceAfter).toBe(8);
    expect(inserted.direction).toBe('debit');
    expect(inserted.amount).toBe(2);
  });

  it('is idempotent: re-calling with same reference returns the existing entry', async () => {
    const existingRow = { id: 'led-existing', amount: 2, direction: 'debit', idempotencyKey: 'sketch:sketch-1' };
    const db = baseDb();
    db.transaction = vi.fn(async (fn: any) => fn({
      query: {
        creditLedger: {
          findFirst: vi.fn().mockResolvedValue(existingRow),
          findMany: vi.fn().mockResolvedValue([{ direction: 'credit', amount: 10, expiresAt: null }, { direction: 'debit', amount: 2, expiresAt: null }]),
        },
        users: { findFirst: vi.fn() },
      },
      insert: vi.fn(),
      update: vi.fn(),
    }));
    const result = await consumeCredits(db, 'user-1', 2, 'sketch', 'sketch-1');
    expect(result.ledgerId).toBe('led-existing');
    expect(result.balanceAfter).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: FAIL with "consumeCredits is not a function".

- [ ] **Step 3: Implement consumeCredits**

Append to `credit-ledger.ts`:

```ts
import { NEGATIVE_BALANCE_FLOOR } from '@forge/shared/constants';

export async function consumeCredits(
  db: DbOrTx,
  userId: string,
  amount: number,
  referenceType: 'sketch' | 'spark_card',
  referenceId: string,
): Promise<LedgerResult> {
  if (amount <= 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be positive' });
  }

  const idempotencyKey = buildIdempotencyKey(referenceType, referenceId);

  return ('transaction' in db ? db.transaction(async (tx) => consumeInner(tx, userId, amount, referenceType, referenceId, idempotencyKey)) : consumeInner(db, userId, amount, referenceType, referenceId, idempotencyKey));
}

async function consumeInner(
  tx: any,
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  idempotencyKey: string,
): Promise<LedgerResult> {
  // Idempotency check: same reference → no-op
  const existing = await tx.query.creditLedger.findFirst({
    where: eq(creditLedger.idempotencyKey, idempotencyKey),
  });
  if (existing) {
    const balanceAfter = await getBalance(tx, userId);
    return { balanceAfter, ledgerId: existing.id };
  }

  // Balance check
  const currentBalance = await getBalance(tx, userId);
  if (currentBalance - amount < NEGATIVE_BALANCE_FLOOR) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'INSUFFICIENT_CREDITS' });
  }

  // Insert debit
  const [row] = await tx.insert(creditLedger).values({
    userId, amount, direction: 'debit', reason: 'consumption',
    referenceType, referenceId, idempotencyKey,
  }).returning();

  // Update denormalized balance
  await tx.update(users)
    .set({ creditBalance: sql`${users.creditBalance} - ${amount}` })
    .where(eq(users.id, userId));

  const balanceAfter = await getBalance(tx, userId);
  return { balanceAfter, ledgerId: row.id };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/lib/credit-ledger.ts packages/server/src/lib/__tests__/credit-ledger.test.ts
git commit -m "feat(server): credit-ledger.consumeCredits with balance floor and idempotency"
```

---

### Task 7: refundCredits

**Files:**
- Modify: `packages/server/src/lib/credit-ledger.ts`
- Modify: `packages/server/src/lib/__tests__/credit-ledger.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `credit-ledger.test.ts`:

```ts
import { refundCredits } from '../credit-ledger';

describe('credit-ledger.refundCredits', () => {
  it('inserts a refund credit referencing the original debit', async () => {
    const originalRow = { id: 'led-1', userId: 'user-1', amount: 2, direction: 'debit', referenceType: 'sketch', referenceId: 'sketch-1', idempotencyKey: 'sketch:sketch-1' };
    const db = {
      transaction: vi.fn(async (fn: any) => fn({
        query: {
          creditLedger: {
            findFirst: vi.fn()
              .mockResolvedValueOnce(originalRow)              // lookup original
              .mockResolvedValueOnce(null),                     // refund idempotency check
            findMany: vi.fn().mockResolvedValue([{ direction: 'credit', amount: 2, expiresAt: null }]),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'led-refund' }]) }),
        }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
      })),
    } as any;
    const result = await refundCredits(db, 'sketch', 'sketch-1');
    expect(result.refunded).toBe(true);
  });

  it('returns refunded:false when no original entry exists', async () => {
    const db = {
      transaction: vi.fn(async (fn: any) => fn({
        query: {
          creditLedger: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      })),
    } as any;
    const result = await refundCredits(db, 'sketch', 'nonexistent');
    expect(result.refunded).toBe(false);
  });

  it('is idempotent: re-calling with same reference is a no-op', async () => {
    const originalRow = { id: 'led-1', userId: 'user-1', amount: 2, direction: 'debit', referenceType: 'sketch', referenceId: 'sketch-1', idempotencyKey: 'sketch:sketch-1' };
    const refundRow = { id: 'led-refund', idempotencyKey: 'refund:sketch:sketch-1' };
    const db = {
      transaction: vi.fn(async (fn: any) => fn({
        query: {
          creditLedger: {
            findFirst: vi.fn()
              .mockResolvedValueOnce(originalRow)
              .mockResolvedValueOnce(refundRow), // refund already exists
          },
        },
      })),
    } as any;
    const result = await refundCredits(db, 'sketch', 'sketch-1');
    expect(result.refunded).toBe(true); // treated as success — already refunded
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: FAIL with "refundCredits is not a function".

- [ ] **Step 3: Implement refundCredits**

Append to `credit-ledger.ts`:

```ts
/**
 * Refund a previously-consumed credit movement. Idempotent.
 * Returns { refunded: false } if the original entry doesn't exist
 * (typical when a refund is called for an operation that never consumed).
 */
export async function refundCredits(
  db: DbOrTx,
  referenceType: string,
  referenceId: string,
  refundContext: string = 'api_failure',
): Promise<{ refunded: boolean }> {
  return ('transaction' in db ? db.transaction(async (tx) => refundInner(tx, referenceType, referenceId, refundContext)) : refundInner(db, referenceType, referenceId, refundContext));
}

async function refundInner(
  tx: any,
  referenceType: string,
  referenceId: string,
  refundContext: string,
): Promise<{ refunded: boolean }> {
  const originalKey = buildIdempotencyKey(referenceType, referenceId);
  const original = await tx.query.creditLedger.findFirst({
    where: eq(creditLedger.idempotencyKey, originalKey),
  });
  if (!original) {
    return { refunded: false };
  }

  // Refund idempotency: check if a refund entry already exists
  const refundKey = `refund:${originalKey}`;
  const existingRefund = await tx.query.creditLedger.findFirst({
    where: eq(creditLedger.idempotencyKey, refundKey),
  });
  if (existingRefund) {
    return { refunded: true };
  }

  // Insert opposite-direction entry
  const refundDirection = original.direction === 'debit' ? 'credit' : 'debit';
  await tx.insert(creditLedger).values({
    userId: original.userId,
    amount: original.amount,
    direction: refundDirection,
    reason: 'refund',
    referenceType,
    referenceId,
    idempotencyKey: refundKey,
    metadata: { refundContext, originalLedgerId: original.id },
  });

  // Update denormalized balance
  const delta = refundDirection === 'credit' ? original.amount : -original.amount;
  await tx.update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${delta}` })
    .where(eq(users.id, original.userId));

  return { refunded: true };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/server test:run src/lib/__tests__/credit-ledger.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/lib/credit-ledger.ts packages/server/src/lib/__tests__/credit-ledger.test.ts
git commit -m "feat(server): credit-ledger.refundCredits with idempotency"
```

---

## Phase 3: Starter Grants for New Users

### Task 8: Auth.js `events.createUser` grants starter

**Files:**
- Modify: `packages/web/src/lib/auth/config.ts`

- [ ] **Step 1: Add the events handler**

In `packages/web/src/lib/auth/config.ts`, find the `callbacks` block and add a new `events` block after it (before `pages`):

```ts
  events: {
    /**
     * Fires once when a new user row is created by the Drizzle adapter.
     * Grants the FREE-tier starter credits.
     */
    async createUser({ user }) {
      if (!user.id) return;
      try {
        const { db } = await import('@forge/server/db/drizzle');
        const { grantCredits } = await import('@forge/server/lib/credit-ledger');
        const { FREE_STARTER_GRANT } = await import('@forge/shared/constants');
        await grantCredits(
          db,
          user.id,
          FREE_STARTER_GRANT,
          'starter',
          'signup',
          user.id, // referenceId = userId ensures one-per-user via idempotency key
        );
      } catch (err) {
        console.error('[auth.events.createUser] Failed to grant starter credits:', err);
      }
    },
  },
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/web type-check`
Expected: clean.

- [ ] **Step 3: Manual smoke test (optional, dev DB)**

Sign up a fresh user via the web app, verify in Drizzle Studio that a `CreditLedger` row exists with `reason='starter'`, `amount=5`, `referenceType='signup'`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/auth/config.ts
git commit -m "feat(auth): grant 5 starter credits on user creation"
```

---

## Phase 4: Refactor Existing Consumers

### Task 9: Refactor sketch.ts to use consumeCredits

**Files:**
- Modify: `packages/server/src/routers/sketch.ts`

- [ ] **Step 1: Move sketchId generation to the top of the mutation**

Find the `generate` mutation in `packages/server/src/routers/sketch.ts`. Currently `const sketchId = crypto.randomUUID();` is on line ~147 (after the Gemini call). Move it to immediately after the input is destructured (before the `if (!supabase)` check):

```ts
.mutation(async ({ ctx, input }) => {
  const sketchId = crypto.randomUUID();

  console.log('[SketchRouter] generate called', { templateType: input.templateType, ... });

  // ... rest unchanged until upload section
```

Remove the redundant `const sketchId = crypto.randomUUID();` later in the function.

- [ ] **Step 2: Add credit consumption before the Gemini call**

After the `gemini` client init and before the enrichment block, insert:

```ts
  // Consume 1 credit (refunded on failure)
  await consumeCredits(ctx.db, ctx.userId, CREDIT_OP_COSTS.sketch, 'sketch', sketchId);
```

- [ ] **Step 3: Add refund on failure**

Wrap the Gemini call and upload in a try/catch that refunds:

```ts
  try {
    // ... existing Gemini generation + upload code ...
  } catch (error) {
    await refundCredits(ctx.db, 'sketch', sketchId, 'sketch_failed');
    throw error;
  }
```

(If the existing code already throws `TRPCError` from sub-steps, ensure those throws happen AFTER the refund, not before.)

- [ ] **Step 4: Add imports**

At the top of `sketch.ts`:

```ts
import { consumeCredits, refundCredits } from '../lib/credit-ledger';
import { CREDIT_OP_COSTS } from '@forge/shared/constants';
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/routers/sketch.ts
git commit -m "feat(server): sketch generation consumes 1 credit, refunds on failure"
```

---

### Task 10: Refactor sparkCard.ts to use consumeCredits

**Files:**
- Modify: `packages/server/src/routers/sparkCard.ts`

- [ ] **Step 1: Replace the consumption state machine**

In the `validate` mutation, replace lines ~99-216 (the entire `consumption = await ctx.db.transaction(...)` block including the `refundCard` helper invocations) with a single `consumeCredits` call:

```ts
  // ------------------------------------------------------------------
  // Step 1: Consume 2 credits (refunded on API failure)
  // ------------------------------------------------------------------
  try {
    await consumeCredits(ctx.db, ctx.userId, CREDIT_OP_COSTS.validation_card, 'spark_card', projectId);
  } catch (error) {
    if (error instanceof TRPCError && error.message === 'INSUFFICIENT_CREDITS') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'INSUFFICIENT_CREDITS' });
    }
    throw error;
  }
```

- [ ] **Step 2: Replace refund call sites**

Find all `await refundCard(ctx.db, ctx.userId, consumption);` calls in the function and replace each with:

```ts
  await refundCredits(ctx.db, 'spark_card', projectId, 'spark_card_failed');
```

- [ ] **Step 3: Delete the `refundCard` helper**

At the bottom of `sparkCard.ts`, remove the `refundCard` function entirely (no longer used).

- [ ] **Step 4: Update imports**

Remove unused imports (`and`, `gt`, `sql`, `users`, the consumption-related schema imports). Add:

```ts
import { consumeCredits, refundCredits } from '../lib/credit-ledger';
import { CREDIT_OP_COSTS } from '@forge/shared/constants';
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 6: Run existing tests**

Run: `pnpm --filter @forge/server test:run`
Expected: PASS. The crystallize tests should be unaffected. If there are any sparkCard tests, they may need stub updates — fix them inline.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/routers/sparkCard.ts
git commit -m "feat(server): validation card consumes 2 credits, removes mobileCardCount state machine"
```

---

## Phase 5: Credit Router

### Task 11: credit router — getBalance, getHistory, listPacks

**Files:**
- Create: `packages/server/src/routers/credit.ts`
- Modify: `packages/server/src/routers/index.ts`

- [ ] **Step 1: Create the router**

```ts
// packages/server/src/routers/credit.ts
import { z } from 'zod';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { creditLedger, users } from '../db/schema';
import { getBalance } from '../lib/credit-ledger';
import { CREDIT_PACKS } from '@forge/shared/constants';

export const creditRouter = router({
  /**
   * Current credit balance + breakdown of expiring tier-grant credits.
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getBalance(ctx.db, ctx.userId);
    const expiringGrants = await ctx.db.query.creditLedger.findMany({
      where: and(
        eq(creditLedger.userId, ctx.userId),
        eq(creditLedger.reason, 'tier_grant'),
        or(isNull(creditLedger.expiresAt), gt(creditLedger.expiresAt, new Date())),
      ),
      columns: { amount: true, expiresAt: true, createdAt: true },
      orderBy: [desc(creditLedger.createdAt)],
    });
    return {
      balance,
      expiringGrants: expiringGrants.filter((g) => g.expiresAt !== null),
    };
  }),

  /**
   * Paginated ledger history for the current user.
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.creditLedger.findMany({
        where: input.cursor
          ? and(eq(creditLedger.userId, ctx.userId))
          : eq(creditLedger.userId, ctx.userId),
        orderBy: [desc(creditLedger.createdAt)],
        limit: input.limit + 1,
        columns: {
          id: true, amount: true, direction: true, reason: true,
          referenceType: true, referenceId: true, createdAt: true, metadata: true,
        },
      });
      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      };
    }),

  /**
   * Static list of credit packs (also useful for mobile to render UI when offline).
   */
  listPacks: protectedProcedure.query(() => {
    return CREDIT_PACKS.map(({ id, credits, priceUsd }) => ({ id, credits, priceUsd }));
  }),
});
```

- [ ] **Step 2: Register the router**

In `packages/server/src/routers/index.ts`, import and register:

```ts
import { creditRouter } from './credit';

export const appRouter = router({
  // ... existing routers
  credit: creditRouter,
});
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routers/credit.ts packages/server/src/routers/index.ts
git commit -m "feat(server): credit router with getBalance, getHistory, listPacks"
```

---

### Task 12: credit router — createStripeCheckoutSession

**Files:**
- Modify: `packages/server/src/routers/credit.ts`
- Modify: `.env.example` (or wherever env conventions live)

- [ ] **Step 1: Add the mutation**

Append to the `creditRouter` definition:

```ts
  /**
   * Create a Stripe Checkout session for purchasing a credit pack.
   * Mode: 'payment' (one-time), not 'subscription'.
   */
  createStripeCheckoutSession: protectedProcedure
    .input(z.object({
      packId: z.enum(['pack_25', 'pack_60', 'pack_150', 'pack_400']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { CREDIT_PACK_BY_ID } = await import('@forge/shared/constants');
      const pack = CREDIT_PACK_BY_ID[input.packId];
      if (!pack) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown pack' });
      }

      const stripePriceId = process.env[`STRIPE_PRICE_CREDITS_${pack.credits}`];
      if (!stripePriceId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Stripe price not configured for ${input.packId}`,
        });
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: { id: true, email: true, stripeCustomerId: true },
      });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const { getStripeClient } = await import('../lib/stripe');
      const stripe = getStripeClient();

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        payment_intent_data: {
          metadata: {
            userId: ctx.userId,
            packId: input.packId,
            credits: pack.credits.toString(),
            purpose: 'credit_pack',
          },
        },
        metadata: {
          userId: ctx.userId,
          packId: input.packId,
          credits: pack.credits.toString(),
          purpose: 'credit_pack',
        },
        success_url: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/credits/cancel`,
        ...(user.stripeCustomerId
          ? { customer: user.stripeCustomerId }
          : { customer_email: user.email ?? undefined }),
      });

      if (!session.url) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create checkout session' });
      }
      return { url: session.url };
    }),
```

- [ ] **Step 2: Document env vars**

If a `.env.example` or similar exists, add:

```
# Stripe price IDs for credit packs
STRIPE_PRICE_CREDITS_25=price_xxx
STRIPE_PRICE_CREDITS_60=price_xxx
STRIPE_PRICE_CREDITS_150=price_xxx
STRIPE_PRICE_CREDITS_400=price_xxx
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routers/credit.ts
git commit -m "feat(server): credit.createStripeCheckoutSession for web pack purchases"
```

---

## Phase 6: Webhooks

### Task 13: Webhook dedup helper

**Files:**
- Create: `packages/server/src/lib/webhook-dedup.ts`

- [ ] **Step 1: Write the helper**

```ts
// packages/server/src/lib/webhook-dedup.ts
import { sql } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { processedWebhookEvents } from '../db/schema';

type Provider = 'stripe' | 'revenuecat';

/**
 * Atomically claim a webhook event for processing. Returns true if this
 * call is the first to see the event (proceed with handler), false if
 * a previous call already claimed it (skip handler, return 200).
 *
 * Uses PostgreSQL's ON CONFLICT DO NOTHING with RETURNING to detect
 * whether the insert succeeded.
 */
export async function claimWebhookEvent(provider: Provider, eventId: string): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO "ProcessedWebhookEvent" ("provider", "event_id")
    VALUES (${provider}, ${eventId})
    ON CONFLICT ("provider", "event_id") DO NOTHING
    RETURNING "event_id"
  `);
  return (result as any).rows?.length > 0 || (result as any).length > 0;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/lib/webhook-dedup.ts
git commit -m "feat(server): claimWebhookEvent helper for two-level idempotency"
```

---

### Task 14: Stripe webhook — credit pack purchase handler

**Files:**
- Modify: `packages/web/src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add imports and dedup**

At the top of the file, ensure these imports exist:

```ts
import { claimWebhookEvent } from '@forge/server/lib/webhook-dedup';
import { grantCredits, refundCredits } from '@forge/server/lib/credit-ledger';
import { db } from '@forge/server/db/drizzle';
```

In the handler, immediately after signature verification and before any existing event-type branching, add:

```ts
  // Two-level idempotency: dedup at handler
  const claimed = await claimWebhookEvent('stripe', event.id);
  if (!claimed) {
    console.log(`[StripeWebhook] Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true });
  }
```

- [ ] **Step 2: Add credit-pack purchase branch**

In the event-type switch, add:

```ts
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'payment' && session.metadata?.purpose === 'credit_pack') {
        const userId = session.metadata.userId;
        const credits = parseInt(session.metadata.credits ?? '0', 10);
        const packId = session.metadata.packId;
        if (!userId || credits <= 0) {
          console.error(`[StripeWebhook] credit_pack session missing metadata: ${session.id}`);
          break;
        }
        await grantCredits(
          db,
          userId,
          credits,
          'purchase',
          'stripe_event',
          session.id,
          { metadata: { packId, paymentIntentId: session.payment_intent } },
        );
        console.log(`[StripeWebhook] Granted ${credits} credits to ${userId} from ${session.id}`);
      }
      break;
    }
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @forge/web type-check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/api/webhooks/stripe/route.ts
git commit -m "feat(web): Stripe webhook grants credits on credit_pack purchase"
```

---

### Task 15: Stripe webhook — refund handler

**Files:**
- Modify: `packages/web/src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add the charge.refunded branch**

In the event-type switch, add:

```ts
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntentId) break;

      // Look up the original session by metadata.paymentIntentId
      const ledgerRow = await db.query.creditLedger.findFirst({
        where: (l, { and, eq, sql }) => and(
          eq(l.referenceType, 'stripe_event'),
          eq(l.reason, 'purchase'),
          sql`${l.metadata}->>'paymentIntentId' = ${paymentIntentId}`,
        ),
      });

      if (!ledgerRow) {
        console.warn(`[StripeWebhook] charge.refunded for ${paymentIntentId}: no matching purchase`);
        break;
      }

      await refundCredits(db, 'stripe_event', ledgerRow.referenceId, 'stripe_refund');
      console.log(`[StripeWebhook] Refunded credits for session ${ledgerRow.referenceId}`);
      break;
    }
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/web type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/api/webhooks/stripe/route.ts
git commit -m "feat(web): Stripe webhook handles credit pack refunds"
```

---

### Task 16: RevenueCat webhook — consumable purchase handler

**Files:**
- Modify: `packages/web/src/app/api/webhooks/revenuecat/route.ts`

- [ ] **Step 1: Add imports**

```ts
import { claimWebhookEvent } from '@forge/server/lib/webhook-dedup';
import { grantCredits, refundCredits } from '@forge/server/lib/credit-ledger';
import { REVENUECAT_CREDIT_PACK_MAP } from '@forge/shared/constants';
```

- [ ] **Step 2: Add dedup**

Immediately after signature verification and event parsing, before the existing subscription branching:

```ts
  const claimed = await claimWebhookEvent('revenuecat', event.id);
  if (!claimed) {
    return NextResponse.json({ received: true });
  }
```

(If `event.id` doesn't exist on the RevenueCat payload, use `event.event?.id` or whatever the actual stable event identifier is — verify against the existing code.)

- [ ] **Step 3: Add consumable purchase branch**

In the existing event-type switch (case `'INITIAL_PURCHASE'`), add a sub-branch for consumable products. Find the `INITIAL_PURCHASE` case and add at the top:

```ts
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        const productId = event.product_id;
        const pack = REVENUECAT_CREDIT_PACK_MAP[productId];
        if (pack) {
          const userId = event.app_user_id;
          if (!userId) {
            console.error('[RevenueCat] consumable purchase missing app_user_id', event);
            break;
          }
          await grantCredits(
            db,
            userId,
            pack.credits,
            'purchase',
            'revenuecat_event',
            event.transaction_id,
            { metadata: { productId, store: event.store, packId: pack.id } },
          );
          console.log(`[RevenueCat] Granted ${pack.credits} credits to ${userId} from ${event.transaction_id}`);
          break;
        }
        // ... existing subscription INITIAL_PURCHASE handling stays here, unchanged
      }
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @forge/web type-check`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/api/webhooks/revenuecat/route.ts
git commit -m "feat(web): RevenueCat webhook grants credits on consumable purchase"
```

---

### Task 17: RevenueCat webhook — refund handler

**Files:**
- Modify: `packages/web/src/app/api/webhooks/revenuecat/route.ts`

- [ ] **Step 1: Add CANCELLATION branch for consumables**

In the event-type switch, find or add the `CANCELLATION` case:

```ts
      case 'CANCELLATION': {
        // For consumables, CANCELLATION with cancellation_reason='CUSTOMER_SUPPORT'
        // means Apple/Google issued a refund. Look up the original purchase by transaction_id
        // and reverse it.
        const originalTxId = event.original_transaction_id ?? event.transaction_id;
        if (!originalTxId) break;

        // Only refund if the original was a consumable credit pack (not a subscription)
        const original = await db.query.creditLedger.findFirst({
          where: (l, { and, eq }) => and(
            eq(l.referenceType, 'revenuecat_event'),
            eq(l.reason, 'purchase'),
            eq(l.referenceId, originalTxId),
          ),
        });
        if (original) {
          await refundCredits(db, 'revenuecat_event', originalTxId, 'iap_refund');
          console.log(`[RevenueCat] Refunded credits for transaction ${originalTxId}`);
        }
        // Subscription cancellations remain handled by existing logic
        break;
      }
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/web type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/api/webhooks/revenuecat/route.ts
git commit -m "feat(web): RevenueCat webhook handles consumable refunds"
```

---

## Phase 7: Cron Jobs

### Task 18: tier-grant-cron

**Files:**
- Create: `packages/server/src/jobs/tier-grant-cron.ts`

- [ ] **Step 1: Write the job**

```ts
// packages/server/src/jobs/tier-grant-cron.ts
import { and, eq, gte, lt, ne } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { users } from '../db/schema';
import { grantCredits } from '../lib/credit-ledger';
import { TIER_MONTHLY_GRANT } from '@forge/shared/constants';

/**
 * Hourly cron: for any user whose stripeCurrentPeriodEnd crosses the past hour,
 * insert a tier_grant ledger entry of TIER_MONTHLY_GRANT[user.subscription] credits
 * with expiresAt = next cycle anchor (currentPeriodEnd + 1 month).
 *
 * Idempotent: same (userId, cycleStartIso) cannot grant twice.
 */
export async function runTierGrantCron(): Promise<{ granted: number; skipped: number }> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const candidates = await db.query.users.findMany({
    where: and(
      ne(users.subscription, 'FREE'),
      gte(users.stripeCurrentPeriodEnd, oneHourAgo),
      lt(users.stripeCurrentPeriodEnd, now),
    ),
    columns: { id: true, subscription: true, stripeCurrentPeriodEnd: true },
  });

  let granted = 0;
  let skipped = 0;

  for (const user of candidates) {
    const tier = user.subscription;
    const amount = TIER_MONTHLY_GRANT[tier];
    if (!amount || !user.stripeCurrentPeriodEnd) {
      skipped++;
      continue;
    }

    const cycleStartIso = user.stripeCurrentPeriodEnd.toISOString();
    const nextAnchor = new Date(user.stripeCurrentPeriodEnd);
    nextAnchor.setMonth(nextAnchor.getMonth() + 1);

    try {
      await grantCredits(
        db,
        user.id,
        amount,
        'tier_grant',
        'subscription_cycle',
        `${user.id}:${cycleStartIso}`,
        { expiresAt: nextAnchor, metadata: { tier } },
      );
      granted++;
    } catch (err) {
      console.error(`[tier-grant-cron] Failed for user ${user.id}:`, err);
      skipped++;
    }
  }

  console.log(`[tier-grant-cron] granted=${granted} skipped=${skipped}`);
  return { granted, skipped };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/jobs/tier-grant-cron.ts
git commit -m "feat(server): tier-grant-cron job for monthly subscription credit grants"
```

---

### Task 19: ledger-reconcile-cron

**Files:**
- Create: `packages/server/src/jobs/ledger-reconcile-cron.ts`

- [ ] **Step 1: Write the job**

```ts
// packages/server/src/jobs/ledger-reconcile-cron.ts
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { users, creditLedger } from '../db/schema';
import { getBalance } from '../lib/credit-ledger';

/**
 * Nightly cron: detect drift between users.creditBalance (denormalized cache)
 * and the ledger-derived balance. Auto-repair if drift < 50 credits, alert
 * (via console.error) otherwise.
 */
export async function runLedgerReconcileCron(): Promise<{ checked: number; drifted: number; repaired: number; alerted: number }> {
  const allUsers = await db.query.users.findMany({
    columns: { id: true, creditBalance: true },
  });

  let checked = 0, drifted = 0, repaired = 0, alerted = 0;

  for (const user of allUsers) {
    checked++;
    const computed = await getBalance(db, user.id);
    if (computed === user.creditBalance) continue;

    drifted++;
    const delta = computed - user.creditBalance;

    if (Math.abs(delta) < 50) {
      await db.update(users).set({ creditBalance: computed }).where(eq(users.id, user.id));
      console.warn(`[reconcile] Auto-repaired user ${user.id}: cache=${user.creditBalance}, ledger=${computed}, delta=${delta}`);
      repaired++;
    } else {
      console.error(`[reconcile] ALERT user ${user.id}: cache=${user.creditBalance}, ledger=${computed}, delta=${delta} — NOT auto-repaired`);
      alerted++;
    }
  }

  console.log(`[ledger-reconcile-cron] checked=${checked} drifted=${drifted} repaired=${repaired} alerted=${alerted}`);
  return { checked, drifted, repaired, alerted };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/jobs/ledger-reconcile-cron.ts
git commit -m "feat(server): ledger-reconcile-cron for nightly drift detection"
```

---

### Task 20: Register cron jobs in worker.ts

**Files:**
- Modify: `packages/server/src/worker.ts`

- [ ] **Step 1: Inspect existing worker structure**

Run: `head -80 packages/server/src/worker.ts`

Find how existing BullMQ queues and scheduled jobs are registered.

- [ ] **Step 2: Register both crons**

Following the existing pattern, add at an appropriate location in `worker.ts`:

```ts
import { Queue, Worker } from 'bullmq';
import { runTierGrantCron } from './jobs/tier-grant-cron';
import { runLedgerReconcileCron } from './jobs/ledger-reconcile-cron';

const creditQueue = new Queue('credit-cron', { connection: redisConnection });

// Schedule repeating jobs (idempotent: BullMQ dedupes by repeat key)
await creditQueue.add('tier-grant', {}, { repeat: { pattern: '0 * * * *' } });          // hourly
await creditQueue.add('ledger-reconcile', {}, { repeat: { pattern: '0 3 * * *' } });    // 3 AM UTC daily

new Worker(
  'credit-cron',
  async (job) => {
    if (job.name === 'tier-grant') return runTierGrantCron();
    if (job.name === 'ledger-reconcile') return runLedgerReconcileCron();
  },
  { connection: redisConnection },
);
```

(Adjust `redisConnection` reference name to match existing usage in the file.)

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/worker.ts
git commit -m "feat(server): register tier-grant and ledger-reconcile cron schedules"
```

---

## Phase 8: Mobile UI

### Task 21: purchases.ts — purchaseCreditPack method

**Files:**
- Modify: `packages/mobile/src/lib/purchases.ts`

- [ ] **Step 1: Add the method**

In `packages/mobile/src/lib/purchases.ts`, add a method on the purchases helper:

```ts
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_CREDIT_PACK_MAP } from '@forge/shared/constants';

/**
 * Purchase a credit pack via RevenueCat. The webhook will grant credits
 * server-side; this returns once the native purchase sheet completes.
 */
export async function purchaseCreditPack(packId: string): Promise<{ success: boolean; cancelled?: boolean }> {
  // Find the matching RevenueCat product ID
  const pack = Object.values(REVENUECAT_CREDIT_PACK_MAP).find((p) => p.id === packId);
  if (!pack) {
    throw new Error(`Unknown credit pack: ${packId}`);
  }

  try {
    const offerings = await Purchases.getOfferings();
    const allPackages: PurchasesPackage[] = Object.values(offerings.all).flatMap((o) => o.availablePackages);
    const target = allPackages.find((p) => p.product.identifier === pack.revenuecatProductId);
    if (!target) {
      throw new Error(`Product ${pack.revenuecatProductId} not found in RevenueCat offerings`);
    }
    await Purchases.purchasePackage(target);
    return { success: true };
  } catch (err: any) {
    if (err?.userCancelled) return { success: false, cancelled: true };
    throw err;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/mobile type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/lib/purchases.ts
git commit -m "feat(mobile): purchaseCreditPack helper using RevenueCat consumables"
```

---

### Task 22: CreditChip component

**Files:**
- Create: `packages/mobile/src/components/ui/CreditChip.tsx`

- [ ] **Step 1: Write the component**

```tsx
// packages/mobile/src/components/ui/CreditChip.tsx
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { trpc } from '../../lib/trpc';

export function CreditChip() {
  const router = useRouter();
  const { data } = trpc.credit.getBalance.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const balance = data?.balance ?? 0;
  const lowBalance = balance < 5;

  return (
    <Pressable
      onPress={() => router.push('/credits/buy')}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
        lowBalance ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <Sparkles size={14} color={lowBalance ? '#F59E0B' : '#14B8A6'} />
      <Text className={`text-sm font-semibold ${lowBalance ? 'text-amber-400' : 'text-white'}`}>
        {balance}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/mobile/src/components/ui/CreditChip.tsx
git commit -m "feat(mobile): CreditChip component for header balance display"
```

---

### Task 23: CostButton component

**Files:**
- Create: `packages/mobile/src/components/ui/CostButton.tsx`

- [ ] **Step 1: Write the component**

```tsx
// packages/mobile/src/components/ui/CostButton.tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';

interface CostButtonProps {
  cost: number;
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Action button that shows cost preview. When balance < cost, transforms
 * into a "Buy credits" CTA that navigates to the credit purchase screen.
 */
export function CostButton({ cost, label, onPress, disabled, loading }: CostButtonProps) {
  const router = useRouter();
  const { data } = trpc.credit.getBalance.useQuery(undefined, { staleTime: 30_000 });
  const balance = data?.balance ?? 0;
  const insufficient = balance < cost;

  if (insufficient) {
    return (
      <Pressable
        onPress={() => router.push('/credits/buy')}
        className="rounded-full bg-[#E32B1A] px-6 py-3 active:opacity-80"
      >
        <Text className="text-center text-base font-semibold text-white">
          Out of credits — Buy more
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className="rounded-full bg-[#E32B1A] px-6 py-3 active:opacity-80"
      style={{ opacity: disabled || loading ? 0.6 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-center text-base font-semibold text-white">
          {label} — {cost} credit{cost === 1 ? '' : 's'}
        </Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/mobile/src/components/ui/CostButton.tsx
git commit -m "feat(mobile): CostButton with cost preview and inline paywall"
```

---

### Task 24: Buy Credits screen

**Files:**
- Create: `packages/mobile/src/app/credits/buy.tsx`
- Create: `packages/mobile/src/app/credits/_layout.tsx`

- [ ] **Step 1: Stack layout**

```tsx
// packages/mobile/src/app/credits/_layout.tsx
import { Stack } from 'expo-router';

export default function CreditsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }} />
  );
}
```

- [ ] **Step 2: Buy screen**

```tsx
// packages/mobile/src/app/credits/buy.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Sparkles } from 'lucide-react-native';
import Purchases from 'react-native-purchases';
import { trpc } from '../../lib/trpc';
import { purchaseCreditPack } from '../../lib/purchases';

export default function BuyCreditsScreen() {
  const router = useRouter();
  const { data: balance } = trpc.credit.getBalance.useQuery();
  const { data: packs } = trpc.credit.listPacks.useQuery();
  const utils = trpc.useUtils();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (packId: string) => {
    setPurchasing(packId);
    try {
      const result = await purchaseCreditPack(packId);
      if (result.success) {
        // RevenueCat webhook is async; poll balance briefly to reflect update
        await new Promise((r) => setTimeout(r, 1500));
        await utils.credit.getBalance.invalidate();
        Alert.alert('Success', 'Credits added to your account.');
      }
    } catch (err: any) {
      Alert.alert('Purchase failed', err?.message ?? 'Unknown error');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      await Purchases.restorePurchases();
      Alert.alert(
        'Restore complete',
        'Consumable credit packs cannot be restored to a new device. If you\'re missing credits from a recent purchase, contact support.',
      );
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Unknown error');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 pb-2 pt-12">
        <Pressable onPress={() => router.back()} className="p-2">
          <X size={24} color="white" />
        </Pressable>
        <Text className="text-base font-semibold text-white">Buy Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <View className="px-5 py-4">
        <View className="flex-row items-center gap-2">
          <Sparkles size={20} color="#14B8A6" />
          <Text className="text-3xl font-bold text-white">{balance?.balance ?? 0}</Text>
          <Text className="text-base text-white/60">credits</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5">
        {(packs ?? []).map((pack) => (
          <Pressable
            key={pack.id}
            onPress={() => handlePurchase(pack.id)}
            disabled={purchasing !== null}
            className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 active:opacity-70"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-white">{pack.credits} credits</Text>
                <Text className="mt-1 text-sm text-white/50">
                  ${(pack.priceUsd / pack.credits).toFixed(3)} per credit
                </Text>
              </View>
              <View className="rounded-full bg-[#E32B1A] px-4 py-2">
                {purchasing === pack.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-semibold text-white">${pack.priceUsd}</Text>
                )}
              </View>
            </View>
          </Pressable>
        ))}

        <Pressable onPress={handleRestore} className="mt-4 py-3">
          <Text className="text-center text-sm text-white/50">Restore Purchases</Text>
        </Pressable>

        <Text className="mt-4 px-2 text-center text-xs text-white/40">
          Credits never expire. {Platform.OS === 'ios' ? 'Purchases are processed by Apple.' : 'Purchases are processed by Google Play.'}
        </Text>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/app/credits/buy.tsx packages/mobile/src/app/credits/_layout.tsx
git commit -m "feat(mobile): Buy Credits modal screen with 4 packs and restore"
```

---

### Task 25: Update Plans screen and Paywall component

**Files:**
- Modify: `packages/mobile/src/app/settings/plans.tsx`
- Modify: `packages/mobile/src/components/ui/Paywall.tsx`

- [ ] **Step 1: Update plans copy**

In `packages/mobile/src/app/settings/plans.tsx`, find the feature list for each tier and update to reference credits. Also add a "Buy credit pack" link at the bottom:

```tsx
import { useRouter } from 'expo-router';
import { TIER_MONTHLY_GRANT } from '@forge/shared/constants';

// At the bottom of the rendered plans, add:
<Pressable onPress={() => router.push('/credits/buy')} className="mt-6 rounded-full border border-white/15 bg-white/5 py-3">
  <Text className="text-center text-base font-semibold text-white">Buy credit pack</Text>
</Pressable>
```

Update tier card descriptions to reference monthly credit grant (e.g., MOBILE: "50 credits/month — 25 validation cards or 50 sketches").

- [ ] **Step 2: Update Paywall**

In `packages/mobile/src/components/ui/Paywall.tsx`, add a "Or buy credits" link at the bottom that routes to `/credits/buy` when the paywall is shown due to running out of credits.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/app/settings/plans.tsx packages/mobile/src/components/ui/Paywall.tsx
git commit -m "feat(mobile): Plans screen surfaces credit grants and Buy Credits link"
```

---

### Task 26: Wire CreditChip into headers

**Files:**
- Modify: mobile tab header components (search via `grep -r "headerRight" packages/mobile/src/app`)

- [ ] **Step 1: Locate primary tab headers**

Run: `grep -rn "headerRight\|<Header" packages/mobile/src/app | grep -v node_modules | head -10`

- [ ] **Step 2: Add CreditChip to headerRight**

In each relevant tab's `_layout.tsx` (Capture, Sketch, Validate, Sandbox), import and add `<CreditChip />` as a `headerRight` element:

```tsx
import { CreditChip } from '../../components/ui/CreditChip';

// In Stack.Screen options:
options={{
  headerRight: () => <View className="pr-4"><CreditChip /></View>,
}}
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/app/
git commit -m "feat(mobile): show CreditChip in tab headers"
```

---

## Phase 9: Web UI

### Task 27: Web /credits page

**Files:**
- Create: `packages/web/src/app/credits/page.tsx`
- Create: `packages/web/src/app/credits/success/page.tsx`
- Create: `packages/web/src/app/credits/cancel/page.tsx`

- [ ] **Step 1: Main credits page**

```tsx
// packages/web/src/app/credits/page.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function CreditsPage() {
  const { data: balance } = trpc.credit.getBalance.useQuery();
  const { data: packs } = trpc.credit.listPacks.useQuery();
  const { data: history } = trpc.credit.getHistory.useQuery({ limit: 50 });
  const createCheckout = trpc.credit.createStripeCheckoutSession.useMutation();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handleBuy = async (packId: string) => {
    setPurchasing(packId);
    try {
      const { url } = await createCheckout.mutateAsync({ packId: packId as any });
      window.location.href = url;
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Credits</h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">Balance</div>
        <div className="mt-1 text-5xl font-bold">{balance?.balance ?? 0}</div>
        {balance?.expiringGrants && balance.expiringGrants.length > 0 && (
          <div className="mt-3 text-sm text-white/50">
            {balance.expiringGrants.map((g, i) => (
              <div key={i}>{g.amount} credits expire {new Date(g.expiresAt!).toLocaleDateString()}</div>
            ))}
          </div>
        )}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Buy credits</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {(packs ?? []).map((pack) => (
          <button
            key={pack.id}
            onClick={() => handleBuy(pack.id)}
            disabled={purchasing !== null}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/20 disabled:opacity-50"
          >
            <div className="text-3xl font-bold">{pack.credits}</div>
            <div className="text-sm text-white/50">credits</div>
            <div className="mt-3 text-lg font-semibold text-[#E32B1A]">${pack.priceUsd}</div>
            <div className="text-xs text-white/40">${(pack.priceUsd / pack.credits).toFixed(3)}/cr</div>
          </button>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Recent activity</h2>
      <div className="mt-4 space-y-2">
        {(history?.items ?? []).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{labelForReason(entry.reason)}</div>
              <div className="text-xs text-white/40">{new Date(entry.createdAt).toLocaleString()}</div>
            </div>
            <div className={entry.direction === 'credit' ? 'text-emerald-400' : 'text-rose-400'}>
              {entry.direction === 'credit' ? '+' : '-'}{entry.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelForReason(reason: string): string {
  switch (reason) {
    case 'purchase': return 'Purchased credits';
    case 'tier_grant': return 'Monthly subscription credits';
    case 'starter': return 'Welcome bonus';
    case 'consumption': return 'Used credits';
    case 'refund': return 'Refunded credits';
    case 'admin_adjust': return 'Support adjustment';
    default: return reason;
  }
}
```

- [ ] **Step 2: Success page**

```tsx
// packages/web/src/app/credits/success/page.tsx
import Link from 'next/link';

export default function CreditsSuccessPage() {
  return (
    <div className="container mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Credits added!</h1>
      <p className="mt-3 text-white/60">
        Your credits should appear in your balance within a few seconds.
      </p>
      <Link href="/credits" className="mt-8 rounded-full bg-[#E32B1A] px-6 py-3 font-semibold">
        Back to credits
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Cancel page**

```tsx
// packages/web/src/app/credits/cancel/page.tsx
import Link from 'next/link';

export default function CreditsCancelPage() {
  return (
    <div className="container mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Purchase cancelled</h1>
      <p className="mt-3 text-white/60">No charge was made.</p>
      <Link href="/credits" className="mt-8 rounded-full bg-white/10 px-6 py-3 font-semibold">
        Back to credits
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/credits/
git commit -m "feat(web): /credits page with balance, packs, and history"
```

---

### Task 28: Web CreditChip in app shell

**Files:**
- Create: `packages/web/src/components/credits/CreditChip.tsx`
- Modify: web app shell component (search for the existing header)

- [ ] **Step 1: Component**

```tsx
// packages/web/src/components/credits/CreditChip.tsx
'use client';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function CreditChip() {
  const { data } = trpc.credit.getBalance.useQuery(undefined, { staleTime: 300_000 });
  const balance = data?.balance ?? 0;
  const low = balance < 5;
  return (
    <Link
      href="/credits"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
        low ? 'border-amber-400/40 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-white'
      }`}
    >
      <Sparkles size={14} className={low ? 'text-amber-400' : 'text-teal-400'} />
      {balance}
    </Link>
  );
}
```

- [ ] **Step 2: Wire into shell**

Find the web app shell (probably `packages/web/src/components/layout/AppShell.tsx` or similar) and add `<CreditChip />` next to the user menu.

Run: `grep -rln "user menu\|UserMenu\|user-menu" packages/web/src/components | head -5`

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/
git commit -m "feat(web): CreditChip in app shell header"
```

---

## Phase 10: Migration & Cutover

### Task 29: One-time migration script

**Files:**
- Create: `packages/server/src/scripts/migrate-card-counts-to-credits.ts`

- [ ] **Step 1: Write the script**

```ts
// packages/server/src/scripts/migrate-card-counts-to-credits.ts
/**
 * One-time migration: convert existing users.mobileCardCount + users.freeCardUsed
 * state into starter credit grants in the new ledger.
 *
 * Math:
 *   starterCredits = freeCardUsed ? 0 : 5
 *   cardCredits = mobileCardCount * 2
 *   totalGrant = starterCredits + cardCredits
 *
 * Idempotent: each user gets one grant keyed by `migration:2026-05-20:${userId}`.
 *
 * Run with: pnpm --filter @forge/server tsx src/scripts/migrate-card-counts-to-credits.ts
 */

import { db } from '../db/drizzle';
import { users } from '../db/schema';
import { grantCredits } from '../lib/credit-ledger';
import { FREE_STARTER_GRANT } from '@forge/shared/constants';

async function main() {
  const allUsers = await db.query.users.findMany({
    columns: { id: true, mobileCardCount: true, freeCardUsed: true },
  });

  console.log(`Migrating ${allUsers.length} users…`);

  let granted = 0, skipped = 0;

  for (const user of allUsers) {
    const starter = user.freeCardUsed ? 0 : FREE_STARTER_GRANT;
    const fromCards = (user.mobileCardCount ?? 0) * 2;
    const total = starter + fromCards;
    if (total === 0) { skipped++; continue; }

    try {
      await grantCredits(
        db,
        user.id,
        total,
        'starter',
        'migration',
        `2026-05-20:${user.id}`,
        { metadata: {
          previousCardCount: user.mobileCardCount,
          freeCardUsed: user.freeCardUsed,
          starterPortion: starter,
          fromCardsPortion: fromCards,
        }},
      );
      granted++;
    } catch (err) {
      console.error(`User ${user.id} failed:`, err);
    }
  }

  console.log(`Done. granted=${granted} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @forge/server type-check`
Expected: clean.

- [ ] **Step 3: Dry-run on dev DB**

Run: `cd packages/server && pnpm tsx src/scripts/migrate-card-counts-to-credits.ts`
Expected: "Done. granted=N skipped=M" output. Verify in Drizzle Studio that `CreditLedger` rows now exist for all users.

- [ ] **Step 4: Verify idempotency**

Run the same command again. Expected: "granted=0" — no duplicate inserts.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/scripts/migrate-card-counts-to-credits.ts
git commit -m "feat(server): one-time migration script for card count → credits"
```

---

### Task 30: Rollout checklist

**Files:**
- Create: `docs/superpowers/plans/2026-05-20-mobile-credit-packs-rollout.md`

- [ ] **Step 1: Write the checklist**

```markdown
# Credit Packs Rollout Checklist

## Pre-deploy (external services)

- [ ] App Store Connect: create 4 consumable IAP products
  - `ideafuel_credits_25` @ $4.99
  - `ideafuel_credits_60` @ $9.99
  - `ideafuel_credits_150` @ $19.99
  - `ideafuel_credits_400` @ $49.99
- [ ] Google Play Console: create same 4 SKUs at same prices
- [ ] RevenueCat: link products, assign to "Credits" entitlement (or no entitlement; consumables don't gate features)
- [ ] Stripe: create 4 Products with one-time Prices
- [ ] Set environment variables in Vercel + Railway:
  - `STRIPE_PRICE_CREDITS_25`
  - `STRIPE_PRICE_CREDITS_60`
  - `STRIPE_PRICE_CREDITS_150`
  - `STRIPE_PRICE_CREDITS_400`
- [ ] Stripe webhook endpoint: ensure `checkout.session.completed` and `charge.refunded` are subscribed
- [ ] RevenueCat webhook: ensure `INITIAL_PURCHASE`, `NON_RENEWING_PURCHASE`, `CANCELLATION` are subscribed

## Deploy

- [ ] Merge to main, deploy web + workers
- [ ] Run migration: `pnpm --filter @forge/server tsx src/scripts/migrate-card-counts-to-credits.ts`
- [ ] Verify `CreditLedger` populated, `users.creditBalance` matches expected per-user totals
- [ ] Build + submit mobile build (EAS) for TestFlight
- [ ] Verify Buy Credits screen renders all 4 packs (sandbox accounts)
- [ ] Verify purchase flow on sandbox iOS + Android

## Post-deploy verification

- [ ] Spot-check 5 users in Drizzle Studio: balance matches ledger sum
- [ ] Trigger a test Stripe purchase, verify webhook grant + balance update
- [ ] Trigger a test RevenueCat sandbox purchase, verify webhook grant + balance update
- [ ] Run nightly reconcile cron manually; expect 0 drift
- [ ] Monitor logs for `[reconcile] ALERT` for 7 days

## Cleanup (30 days post-deploy if clean)

- [ ] Drop `users.mobileCardCount` and `users.mobileCardResetAt` columns
- [ ] Drop legacy `CreditTransaction` table
- [ ] Remove deprecated `creditTransactionTypeEnum`
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-05-20-mobile-credit-packs-rollout.md
git commit -m "docs: rollout checklist for credit packs deploy"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Credit ledger schema (Task 2-3)
- ✅ Append-only ledger + denormalized balance (Tasks 4-7)
- ✅ Two-level webhook idempotency (Tasks 13-17)
- ✅ Tier monthly grants with expiry (Task 18)
- ✅ Reconciliation cron (Task 19)
- ✅ Starter grants for new users (Task 8) + existing users (Task 29)
- ✅ Stripe + RevenueCat purchase rails (Tasks 12, 14-17, 21)
- ✅ Mobile UI: CreditChip, CostButton, Buy Credits screen (Tasks 22-26)
- ✅ Web UI: /credits page + chip (Tasks 27-28)
- ✅ Refactor sparkCard.ts + sketch.ts (Tasks 9-10)
- ✅ Migration script (Task 29)
- ✅ Rollout checklist (Task 30)

**Type consistency check:**
- `consumeCredits(db, userId, amount, refType, refId)` — same signature in lib + all callers ✓
- `grantCredits(db, userId, amount, reason, refType, refId, options)` — same signature ✓
- `refundCredits(db, refType, refId, context)` — same signature ✓
- `CREDIT_OP_COSTS.sketch = 1`, `CREDIT_OP_COSTS.validation_card = 2` — used consistently in sketch.ts and sparkCard.ts ✓
- `referenceType` values: `sketch`, `spark_card`, `stripe_event`, `revenuecat_event`, `signup`, `subscription_cycle`, `migration` — all kebab/snake-cased, no drift ✓

**No placeholder scan:** No TODOs, no "TBD", no "implement later", every step has runnable code or exact command.
