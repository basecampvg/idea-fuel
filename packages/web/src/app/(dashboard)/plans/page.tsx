'use client';

import { ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/components/subscription/use-subscription';
import { TierCard } from '@/components/subscription/tier-card';
import { FeatureComparison, FeatureComparisonMobile } from '@/components/subscription/feature-comparison';
import { LoadingScreen } from '@/components/ui/spinner';
import type { SubscriptionTier } from '@forge/shared';

const tiers: SubscriptionTier[] = ['FREE', 'PRO', 'ENTERPRISE'];

export default function PlansPage() {
  const { tier: currentTier, isLoading } = useSubscription();

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              isCurrentPlan={tier === currentTier}
              isRecommended={tier === 'PRO'}
              disabled={tier !== currentTier} // All upgrades disabled for now
              onSelect={() => {
                // TODO: Implement upgrade flow with Stripe
                // For now, upgrades are disabled - button shows "Current Plan" or disabled state
              }}
            />
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-12">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Feature Comparison</h2>
            <p className="text-sm text-muted-foreground mt-1">
              See what's included in each plan
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
