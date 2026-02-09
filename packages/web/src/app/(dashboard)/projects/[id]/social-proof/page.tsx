'use client';

import { useProjectSection } from '../components/use-project-section';
import { SocialProofSection, type SocialProofData } from '../components/social-proof-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function SocialProofPage() {
  const { data } = useProjectSection(
    (project) => project.research?.socialProof as SocialProofData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Social Proof" />;

  return <SocialProofSection socialProof={data} />;
}
