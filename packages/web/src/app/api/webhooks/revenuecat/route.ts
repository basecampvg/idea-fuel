import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import { REVENUECAT_PRODUCT_MAP } from '@forge/shared';
import type { SubscriptionTier } from '@forge/shared';

// ---------------------------------------------------------------------------
// RevenueCat webhook handler
// Receives events from RevenueCat and updates the database accordingly.
// Uses Authorization header verification for security.
// ---------------------------------------------------------------------------

/**
 * Map a RevenueCat product ID to our internal subscription tier.
 * Returns null if the product ID doesn't match any known tier.
 */
function productIdToTier(productId: string): SubscriptionTier | null {
  return REVENUECAT_PRODUCT_MAP[productId] ?? null;
}

/**
 * Fire-and-forget audit log entry.
 * Mirrors the pattern in the Stripe webhook handler.
 */
async function logAudit(params: {
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    console.error('[RevenueCat Webhook AuditLog] Failed to create audit log:', error);
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  expiration_at_ms: number | null;
  [key: string]: unknown;
}

async function handleInitialPurchase(event: RevenueCatEvent) {
  const { app_user_id: userId, product_id: productId, expiration_at_ms: expirationAtMs } = event;

  const tier = productIdToTier(productId);
  if (!tier) {
    console.error('[RevenueCat Webhook] INITIAL_PURCHASE: unknown product_id', productId);
    return;
  }

  // Look up user
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, subscription: true },
  });

  if (!existingUser) {
    console.warn('[RevenueCat Webhook] INITIAL_PURCHASE: user not found', userId);
    return;
  }

  const previousTier = existingUser.subscription;

  // Always set a non-null expiration so the subscription auto-expires if not renewed.
  // If RevenueCat doesn't provide one, default to 30 days from now.
  const expirationDate = expirationAtMs
    ? new Date(expirationAtMs)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(schema.users)
    .set({
      subscription: tier,
      stripeCurrentPeriodEnd: expirationDate,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${userId}`,
    metadata: {
      source: 'revenuecat_webhook',
      event: 'INITIAL_PURCHASE',
      previousTier,
      newTier: tier,
      productId,
    },
  });
}

async function handleRenewal(event: RevenueCatEvent) {
  const { app_user_id: userId, product_id: productId, expiration_at_ms: expirationAtMs } = event;

  // Look up user
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, subscription: true },
  });

  if (!existingUser) {
    console.warn('[RevenueCat Webhook] RENEWAL: user not found', userId);
    return;
  }

  const expirationDate = expirationAtMs ? new Date(expirationAtMs) : null;

  await db
    .update(schema.users)
    .set({
      stripeCurrentPeriodEnd: expirationDate,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_RENEWAL',
    resource: `user:${userId}`,
    metadata: {
      source: 'revenuecat_webhook',
      event: 'RENEWAL',
      tier: existingUser.subscription,
      productId,
    },
  });
}

async function handleProductChange(event: RevenueCatEvent) {
  const { app_user_id: userId, product_id: productId, expiration_at_ms: expirationAtMs } = event;

  const newTier = productIdToTier(productId);
  if (!newTier) {
    console.error('[RevenueCat Webhook] PRODUCT_CHANGE: unknown product_id', productId);
    return;
  }

  // Look up user
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, subscription: true },
  });

  if (!existingUser) {
    console.warn('[RevenueCat Webhook] PRODUCT_CHANGE: user not found', userId);
    return;
  }

  const previousTier = existingUser.subscription;
  const expirationDate = expirationAtMs ? new Date(expirationAtMs) : null;

  await db
    .update(schema.users)
    .set({
      subscription: newTier,
      stripeCurrentPeriodEnd: expirationDate,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${userId}`,
    metadata: {
      source: 'revenuecat_webhook',
      event: 'PRODUCT_CHANGE',
      previousTier,
      newTier,
      productId,
    },
  });
}

async function handleCancellation(event: RevenueCatEvent) {
  const { app_user_id: userId, product_id: productId } = event;

  // Look up user for audit log
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, subscription: true },
  });

  if (!existingUser) {
    console.warn('[RevenueCat Webhook] CANCELLATION: user not found', userId);
    return;
  }

  // No tier change — user keeps access until period end
  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CANCELLATION',
    resource: `user:${userId}`,
    metadata: {
      source: 'revenuecat_webhook',
      event: 'CANCELLATION',
      tier: existingUser.subscription,
      productId,
    },
  });
}

async function handleExpiration(event: RevenueCatEvent) {
  const { app_user_id: userId, product_id: productId } = event;

  // Look up user
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, subscription: true },
  });

  if (!existingUser) {
    console.warn('[RevenueCat Webhook] EXPIRATION: user not found', userId);
    return;
  }

  const previousTier = existingUser.subscription;

  await db
    .update(schema.users)
    .set({
      subscription: 'FREE',
      stripeCurrentPeriodEnd: null,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${userId}`,
    metadata: {
      source: 'revenuecat_webhook',
      event: 'EXPIRATION',
      previousTier,
      newTier: 'FREE',
      productId,
    },
  });
}

async function handleBillingIssueDetected(event: RevenueCatEvent) {
  const { app_user_id: userId, product_id: productId } = event;

  // Look up user for audit log
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, subscription: true },
  });

  if (!existingUser) {
    console.warn('[RevenueCat Webhook] BILLING_ISSUE_DETECTED: user not found', userId);
    return;
  }

  // No tier change — just log the billing issue
  await logAudit({
    userId,
    action: 'SUBSCRIPTION_BILLING_ISSUE',
    resource: `user:${userId}`,
    metadata: {
      source: 'revenuecat_webhook',
      event: 'BILLING_ISSUE_DETECTED',
      tier: existingUser.subscription,
      productId,
    },
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Verify authorization header
  const authKey = process.env.REVENUECAT_WEBHOOK_AUTH_KEY;
  if (!authKey) {
    console.error('[RevenueCat Webhook] REVENUECAT_WEBHOOK_AUTH_KEY is not set');
    return NextResponse.json({ error: 'Webhook auth key not configured' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization');
  const expected = `Bearer ${authKey}`;
  if (
    !authorization ||
    authorization.length !== expected.length ||
    !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
  ) {
    console.error('[RevenueCat Webhook] Authorization failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { event?: RevenueCatEvent };
  try {
    body = await request.json();
  } catch {
    console.error('[RevenueCat Webhook] Failed to parse request body');
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const event = body.event;
  if (!event) {
    console.error('[RevenueCat Webhook] No event object in body');
    return NextResponse.json({ error: 'Missing event object' }, { status: 400 });
  }

  const { type: eventType, app_user_id: appUserId } = event;

  console.log(`[RevenueCat Webhook] Received event: ${eventType} for user: ${appUserId?.slice(0, 8)}...`);

  // Check if user exists for events that need a user
  if (!appUserId) {
    console.warn('[RevenueCat Webhook] No app_user_id in event');
    return NextResponse.json({ received: true });
  }

  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(event);
        break;
      case 'RENEWAL':
        await handleRenewal(event);
        break;
      case 'PRODUCT_CHANGE':
        await handleProductChange(event);
        break;
      case 'CANCELLATION':
        await handleCancellation(event);
        break;
      case 'EXPIRATION':
        await handleExpiration(event);
        break;
      case 'BILLING_ISSUE_DETECTED':
        await handleBillingIssueDetected(event);
        break;
      default:
        console.log(`[RevenueCat Webhook] Unhandled event type: ${eventType}`);
        break;
    }
  } catch (error) {
    console.error(`[RevenueCat Webhook] Error handling ${eventType}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
