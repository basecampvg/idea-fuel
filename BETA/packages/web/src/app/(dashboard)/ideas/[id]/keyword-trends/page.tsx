'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { KeywordChart, type KeywordTrend } from '../components/keyword-chart';
import { SectionEmptyState } from '../components/section-empty-state';

export default function KeywordTrendsPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.keywordTrends as KeywordTrend[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Keyword Trends" />;

  return <KeywordChart keywordTrends={data} />;
}
