'use client';

import { useProjectSection } from '../components/use-project-section';
import { CompetitorPortfolioSection } from '../components/competitor-portfolio-section';
import { SectionEmptyState } from '../components/section-empty-state';
import type { CompetitorPortfolioResult, ExpandResearchModuleOutputs } from '@forge/shared';

export default function CompetitorPortfolioPage() {
  const { data } = useProjectSection(
    (project) => (project.research?.expandResearchData as ExpandResearchModuleOutputs | null)?.competitorPortfolio as CompetitorPortfolioResult | null | undefined
  );

  if (!data) return <SectionEmptyState section="Competitor Portfolio" />;

  return <CompetitorPortfolioSection data={data} />;
}
