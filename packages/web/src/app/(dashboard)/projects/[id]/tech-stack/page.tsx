'use client';

import { useProjectSection } from '../components/use-project-section';
import { TechStackSection } from '../components/tech-stack-section';
import { SectionEmptyState } from '../components/section-empty-state';
import type { TechStackData } from '@forge/shared';

export default function TechStackPage() {
  const { data } = useProjectSection(
    (project) => project.research?.techStack as TechStackData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Tech Stack" />;

  return <TechStackSection techStack={data} />;
}
