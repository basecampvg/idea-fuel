'use client';

import { useProjectSection } from '../components/use-project-section';
import { MarketSizing } from '../components/market-sizing';
import { SectionEmptyState } from '../components/section-empty-state';
import type { MarketSizingData } from '@forge/shared';

export default function MarketSizingPage() {
  const { data } = useProjectSection(
    (project) => project.research?.marketSizing as MarketSizingData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Market Sizing" />;

  return <MarketSizing marketSizing={data} />;
}
