import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Stripe webhook handler
// Receives events from Stripe and updates the database accordingly.
// Uses raw body + signature verification for security.
// ---------------------------------------------------------------------------

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, {
    apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
    typescript: true,
  });
}

/**
 * Map a Stripe Price ID back to our subscription tier.
 * Returns 'FREE' if the price ID doesn't match any known tier.
 */
function priceIdToTier(priceId: string): 'PRO' | 'ENTERPRISE' | 'SCALE' | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'PRO';
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'ENTERPRISE';
  if (priceId === process.env.STRIPE_SCALE_PRICE_ID) return 'SCALE';
  return null;
}

/**
 * Fire-and-forget audit log entry.
 * Mirrors the pattern in packages/server/src/lib/audit.ts but uses direct db import.
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
    console.error('[Webhook AuditLog] Failed to create audit log:', error);
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Extract metadata from subscription_data
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[Webhook] checkout.session.completed: no subscription ID');
    return;
  }

  // Retrieve the subscription to get metadata and current_period_end
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = subscription.metadata?.userId;
  const rawTier = subscription.metadata?.tier;
  const tier = rawTier === 'PRO' || rawTier === 'ENTERPRISE' || rawTier === 'SCALE' ? rawTier : undefined;

  if (!userId || !tier) {
    console.error('[Webhook] checkout.session.completed: missing metadata', {
      userId,
      tier,
      subscriptionId,
    });
    return;
  }

  // Idempotency: check if user already has this subscription ID
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { stripeSubscriptionId: true, subscription: true },
  });

  if (existingUser?.stripeSubscriptionId === subscriptionId) {
    // Already processed
    return;
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const periodEndUnix = firstItem?.current_period_end;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  const previousTier = existingUser?.subscription ?? 'FREE';

  await db
    .update(schema.users)
    .set({
      subscription: tier,
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${userId}`,
    metadata: {
      source: 'stripe_webhook',
      event: 'checkout.session.completed',
      previousTier,
      newTier: tier,
      stripeSubscriptionId: subscriptionId,
    },
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('[Webhook] customer.subscription.updated: no userId in metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.error('[Webhook] customer.subscription.updated: no price ID found');
    return;
  }

  const tier = priceIdToTier(priceId);
  if (!tier) {
    console.error('[Webhook] customer.subscription.updated: unknown price ID', priceId);
    return;
  }

  const updatedItem = subscription.items.data[0];
  const updatedPeriodEndUnix = updatedItem?.current_period_end;
  const currentPeriodEnd = updatedPeriodEndUnix ? new Date(updatedPeriodEndUnix * 1000) : null;

  // Fetch current state for audit logging (always update to capture period-end renewals)
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { subscription: true, stripePriceId: true },
  });

  const previousTier = existingUser?.subscription ?? 'FREE';

  await db
    .update(schema.users)
    .set({
      subscription: tier,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${userId}`,
    metadata: {
      source: 'stripe_webhook',
      event: 'customer.subscription.updated',
      previousTier,
      newTier: tier,
      stripePriceId: priceId,
    },
  });
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('[Webhook] customer.subscription.deleted: no userId in metadata');
    return;
  }

  // Idempotency: check if already downgraded
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { subscription: true, stripeSubscriptionId: true },
  });

  if (existingUser?.subscription === 'FREE' && !existingUser?.stripeSubscriptionId) {
    // Already processed
    return;
  }

  const previousTier = existingUser?.subscription ?? 'FREE';

  await db
    .update(schema.users)
    .set({
      subscription: 'FREE',
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    })
    .where(eq(schema.users.id, userId));

  await logAudit({
    userId,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${userId}`,
    metadata: {
      source: 'stripe_webhook',
      event: 'customer.subscription.deleted',
      previousTier,
      newTier: 'FREE',
    },
  });
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    console.error('[Webhook] invoice.payment_failed: no customer ID');
    return;
  }

  // Look up user by stripeCustomerId
  const user = await db.query.users.findFirst({
    where: eq(schema.users.stripeCustomerId, customerId),
    columns: { id: true, email: true, subscription: true },
  });

  if (!user) {
    console.error('[Webhook] invoice.payment_failed: no user found for customer', customerId);
    return;
  }

  await logAudit({
    userId: user.id,
    action: 'SUBSCRIPTION_CHANGE',
    resource: `user:${user.id}`,
    metadata: {
      source: 'stripe_webhook',
      event: 'invoice.payment_failed',
      tier: user.subscription,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
      attemptCount: invoice.attempt_count,
    },
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Read raw body for signature verification
  const body = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook] Signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      default:
        // Acknowledge unhandled events without processing
        break;
    }
  } catch (error) {
    console.error(`[Webhook] Error handling ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
