'use client';

import { useProjectSection } from '../components/use-project-section';
import { WhyNowSection, type WhyNowData } from '../components/why-now-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function WhyNowPage() {
  const { data } = useProjectSection(
    (project) => project.research?.whyNow as WhyNowData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Why Now" />;

  return <WhyNowSection whyNow={data} />;
}
