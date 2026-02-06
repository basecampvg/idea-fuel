'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { BusinessFit } from '../components/business-fit';
import { SectionEmptyState } from '../components/section-empty-state';

export default function BusinessFitPage() {
  const { data } = useIdeaSection((idea) => {
    const r = idea.research;
    if (!r) return null;
    return {
      revenuePotential: r.revenuePotential as any,
      executionDifficulty: r.executionDifficulty as any,
      gtmClarity: r.gtmClarity as any,
      founderFit: r.founderFit as any,
    };
  });

  if (!data || (!data.revenuePotential && !data.executionDifficulty && !data.gtmClarity && !data.founderFit)) {
    return <SectionEmptyState section="Business Fit" />;
  }

  return (
    <BusinessFit
      revenuePotential={data.revenuePotential}
      executionDifficulty={data.executionDifficulty}
      gtmClarity={data.gtmClarity}
      founderFit={data.founderFit}
    />
  );
}
