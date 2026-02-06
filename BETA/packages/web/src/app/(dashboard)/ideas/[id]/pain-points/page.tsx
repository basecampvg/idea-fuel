'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { PainPointsSection, type PainPoint } from '../components/pain-points-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function PainPointsPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.painPoints as PainPoint[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Pain Points" />;

  return <PainPointsSection painPoints={data} />;
}
