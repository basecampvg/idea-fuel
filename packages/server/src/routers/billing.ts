import { z } from 'zod';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { users } from '../db/schema';
import { getStripeClient, getStripePriceId, type StripeTier } from '../lib/stripe';

/**
 * Billing router — Stripe Checkout, Customer Portal, and subscription status
 */
export const billingRouter = router({
  /**
   * Create a Stripe Checkout session for upgrading to PRO or ENTERPRISE.
   * Returns { url } to redirect the user to Stripe Checkout.
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['PRO', 'ENTERPRISE']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
        columns: {
          id: true,
          email: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // If user already has an active subscription, they should use the portal
      if (user.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'You already have an active subscription. Use the customer portal to change your plan.',
        });
      }

      const stripe = getStripeClient();

      let priceId: string;
      try {
        priceId = getStripePriceId(input.tier as StripeTier);
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Stripe price not configured for ${input.tier} tier`,
        });
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: {
            userId: ctx.userId,
            tier: input.tier,
          },
        },
        success_url: `${baseUrl}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/plans/cancel`,
      };

      // Reuse existing Stripe customer if available, otherwise pass email
      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      } else {
        sessionParams.customer_email = user.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
        });
      }

      return { url: session.url };
    }),

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   * Returns { url } to redirect the user to the portal.
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No billing account found. Please subscribe to a plan first.',
      });
    }

    const stripe = getStripeClient();

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });

    return { url: session.url };
  }),

  /**
   * Get the current user's subscription/billing status.
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: {
        subscription: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // For Stripe subscribers, stripeSubscriptionId is set. For RevenueCat (mobile IAP)
    // subscribers, stripeSubscriptionId is null but stripeCurrentPeriodEnd is reused
    // for the RevenueCat expiration date. So we only enforce the period-end check
    // when the date is present, and don't require stripeSubscriptionId.
    const isSubscribed =
      user.subscription !== 'FREE' &&
      (user.stripeCurrentPeriodEnd ? user.stripeCurrentPeriodEnd > new Date() : true);

    return {
      tier: user.subscription,
      stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
      isSubscribed,
    };
  }),
});
