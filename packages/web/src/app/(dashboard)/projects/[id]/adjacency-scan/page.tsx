'use client';

import { useProjectSection } from '../components/use-project-section';
import { AdjacencyScanSection } from '../components/adjacency-scan-section';
import { SectionEmptyState } from '../components/section-empty-state';
import type { AdjacencyScanResult, ExpandResearchModuleOutputs } from '@forge/shared';

export default function AdjacencyScanPage() {
  const { data } = useProjectSection(
    (project) => (project.research?.expandResearchData as ExpandResearchModuleOutputs | null)?.adjacencyScan as AdjacencyScanResult | null | undefined
  );

  if (!data) return <SectionEmptyState section="Adjacency Scan" />;

  return <AdjacencyScanSection data={data} />;
}
