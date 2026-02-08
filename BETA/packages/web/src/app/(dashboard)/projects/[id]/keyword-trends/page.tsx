'use client';

import { useProjectSection } from '../components/use-project-section';
import { KeywordChart, type KeywordTrend } from '../components/keyword-chart';
import { SectionEmptyState } from '../components/section-empty-state';

export default function KeywordTrendsPage() {
  const { data } = useProjectSection(
    (project) => project.research?.keywordTrends as KeywordTrend[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Keyword Trends" />;

  return <KeywordChart keywordTrends={data} />;
}
