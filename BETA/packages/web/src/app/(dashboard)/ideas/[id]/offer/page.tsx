'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { OfferSection, type OfferTier } from '../components/offer-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function OfferPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.valueLadder as OfferTier[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Offer / Value Ladder" />;

  return <OfferSection offerTiers={data} />;
}
