'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { CompetitorsSection, type Competitor } from '../components/competitors-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function CompetitorsPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.competitors as Competitor[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Competitors" />;

  return <CompetitorsSection competitors={data} />;
}
