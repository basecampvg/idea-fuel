'use client';

import { useProjectSection } from '../components/use-project-section';
import { PricingCeilingSection } from '../components/pricing-ceiling-section';
import { SectionEmptyState } from '../components/section-empty-state';
import type { PricingCeilingResult, ExpandResearchModuleOutputs } from '@forge/shared';

export default function PricingCeilingPage() {
  const { data } = useProjectSection(
    (project) => (project.research?.expandResearchData as ExpandResearchModuleOutputs | null)?.pricingCeiling as PricingCeilingResult | null | undefined
  );

  if (!data) return <SectionEmptyState section="Pricing Ceiling" />;

  return <PricingCeilingSection data={data} />;
}
