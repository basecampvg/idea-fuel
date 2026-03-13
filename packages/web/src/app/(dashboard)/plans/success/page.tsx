'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

export default function PlansSuccessPage() {
  const utils = trpc.useUtils();

  // Invalidate subscription caches so the UI reflects the new tier
  useEffect(() => {
    utils.user.subscription.invalidate();
    utils.billing.getSubscriptionStatus.invalidate();
  }, [utils]);

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-3">
          Welcome to your new plan!
        </h1>
        <p className="text-muted-foreground mb-8">
          Your subscription has been activated. You now have access to all the features
          included in your plan. It may take a moment for everything to update.
        </p>

        <Link href="/dashboard">
          <Button variant="accent" className="group">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
