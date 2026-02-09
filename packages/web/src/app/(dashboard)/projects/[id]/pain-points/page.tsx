'use client';

import { useProjectSection } from '../components/use-project-section';
import { PainPointsSection, type PainPoint } from '../components/pain-points-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function PainPointsPage() {
  const { data } = useProjectSection(
    (project) => project.research?.painPoints as PainPoint[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Pain Points" />;

  return <PainPointsSection painPoints={data} />;
}
