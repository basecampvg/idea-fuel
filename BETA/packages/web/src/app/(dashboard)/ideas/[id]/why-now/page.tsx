'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { WhyNowSection, type WhyNowData } from '../components/why-now-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function WhyNowPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.whyNow as WhyNowData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Why Now" />;

  return <WhyNowSection whyNow={data} />;
}
