'use client';

import { useProjectSection } from '../components/use-project-section';
import { DemandMiningSection } from '../components/demand-mining-section';
import { SectionEmptyState } from '../components/section-empty-state';
import type { DemandMiningResult, ExpandResearchModuleOutputs } from '@forge/shared';

export default function DemandMiningPage() {
  const { data } = useProjectSection(
    (project) => (project.research?.expandResearchData as ExpandResearchModuleOutputs | null)?.demandMining as DemandMiningResult | null | undefined
  );

  if (!data) return <SectionEmptyState section="Demand Mining" />;

  return <DemandMiningSection data={data} />;
}
