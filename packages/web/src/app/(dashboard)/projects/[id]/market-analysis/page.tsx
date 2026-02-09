'use client';

import { useProjectSection } from '../components/use-project-section';
import { MarketAnalysis, type MarketAnalysisData } from '../components/market-analysis';
import { SectionEmptyState } from '../components/section-empty-state';

export default function MarketAnalysisPage() {
  const { data } = useProjectSection(
    (project) => project.research?.marketAnalysis as MarketAnalysisData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Market Analysis" />;

  return <MarketAnalysis marketAnalysis={data} />;
}
