'use client';

import { useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/components/subscription/use-subscription';
import { TierCard } from '@/components/subscription/tier-card';
import { FeatureComparison, FeatureComparisonMobile } from '@/components/subscription/feature-comparison';
import { LoadingScreen } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import type { SubscriptionTier } from '@forge/shared';

const tiers: SubscriptionTier[] = ['FREE', 'PRO', 'ENTERPRISE', 'SCALE'];

export default function PlansPage() {
  const { tier: currentTier, isLoading, isSubscribed } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const createCheckout = trpc.billing.createCheckoutSession.useMutation();
  const createPortal = trpc.billing.createPortalSession.useMutation();

  const isMutating = createCheckout.isPending || createPortal.isPending;

  const handleSelect = async (tier: SubscriptionTier) => {
    if (tier === currentTier || tier === 'FREE' || isMutating) return;

    setLoadingTier(tier);

    try {
      if (isSubscribed) {
        // User already has a Stripe subscription — send to portal for plan changes
        const { url } = await createPortal.mutateAsync();
        window.location.href = url;
      } else {
        // No subscription — create checkout session
        const { url } = await createCheckout.mutateAsync({
          tier: tier as 'PRO' | 'ENTERPRISE' | 'SCALE',
        });
        window.location.href = url;
      }
    } catch (error: unknown) {
      // If createCheckoutSession throws BAD_REQUEST (already subscribed), fall back to portal
      const trpcError = error as { data?: { code?: string } };
      if (trpcError?.data?.code === 'BAD_REQUEST') {
        try {
          const { url } = await createPortal.mutateAsync();
          window.location.href = url;
          return;
        } catch {
          // Portal also failed — fall through to reset
        }
      }
      setLoadingTier(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading plans..." />;
  }

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-foreground mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Unlock powerful features to validate and grow your business ideas. All plans include
            access to AI-powered interviews and market research.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tiers.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              isCurrentPlan={tier === currentTier}
              isRecommended={tier === 'PRO'}
              disabled={loadingTier !== null && loadingTier !== tier}
              isLoading={loadingTier === tier}
              onSelect={() => handleSelect(tier)}
            />
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-12">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Feature Comparison</h2>
            <p className="text-sm text-muted-foreground mt-1">
              See what&apos;s included in each plan
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <FeatureComparison currentTier={currentTier} />
          </div>

          {/* Mobile stacked view */}
          <div className="md:hidden p-4">
            <FeatureComparisonMobile currentTier={currentTier} />
          </div>
        </div>

        {/* FAQ / Help Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary/60" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Need help choosing?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Not sure which plan is right for you? Contact our team for personalized
                recommendations based on your business needs.
              </p>
              <a
                href="mailto:support@forgeautomation.com"
                className="inline-flex items-center text-sm font-medium text-primary/60 hover:text-primary/60/80 transition-colors"
              >
                Contact Support
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
