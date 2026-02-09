'use client';

import { useProjectSection } from '../components/use-project-section';
import { CompetitorsSection, type Competitor } from '../components/competitors-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function CompetitorsPage() {
  const { data } = useProjectSection(
    (project) => project.research?.competitors as Competitor[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Competitors" />;

  return <CompetitorsSection competitors={data} />;
}
