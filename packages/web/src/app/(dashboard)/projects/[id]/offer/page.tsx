'use client';

import { useProjectSection } from '../components/use-project-section';
import { OfferSection, type OfferTier } from '../components/offer-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function OfferPage() {
  const { data } = useProjectSection(
    (project) => project.research?.valueLadder as OfferTier[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Offer / Value Ladder" />;

  return <OfferSection offerTiers={data} />;
}
