'use client';

import Link from 'next/link';
import { Lock, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionTier } from '@forge/shared';
import {
  type UpgradeReason,
  getUpgradePromptContent,
  SUBSCRIPTION_TIER_LABELS,
} from '@forge/shared';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: UpgradeReason | null;
  currentTier: SubscriptionTier;
}

export function UpgradeModal({ isOpen, onClose, reason, currentTier }: UpgradeModalProps) {
  if (!reason) return null;

  const content = getUpgradePromptContent(reason, currentTier);
  const recommendedTierLabel = SUBSCRIPTION_TIER_LABELS[content.recommendedTier];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" hideHeader>
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
          <Lock className="h-7 w-7 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-foreground mb-2">{content.title}</h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {content.description}
        </p>

        {/* Current Plan Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-muted-foreground">Current plan:</span>
          <Badge variant="default">{SUBSCRIPTION_TIER_LABELS[currentTier]}</Badge>
        </div>

        {/* Benefits List */}
        <div className="bg-background/50 rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              With {recommendedTierLabel}, you get:
            </span>
          </div>
          <ul className="space-y-2 text-left">
            {content.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Link href="/plans" onClick={onClose}>
            <Button variant="accent" className="w-full group">
              <span>View Plans</span>
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Not now
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Container component that connects to subscription context.
 * Place this once in your layout to enable global upgrade prompts.
 */
export function UpgradeModalContainer() {
  // Import here to avoid circular dependency
  const { useSubscriptionContext } = require('./subscription-context');
  const { isUpgradeModalOpen, hideUpgradePrompt, upgradeReason, tier } = useSubscriptionContext();

  return (
    <UpgradeModal
      isOpen={isUpgradeModalOpen}
      onClose={hideUpgradePrompt}
      reason={upgradeReason}
      currentTier={tier}
    />
  );
}
