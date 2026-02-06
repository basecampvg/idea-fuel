'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { SocialProofSection, type SocialProofData } from '../components/social-proof-section';
import { SectionEmptyState } from '../components/section-empty-state';

export default function SocialProofPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.socialProof as SocialProofData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Social Proof" />;

  return <SocialProofSection socialProof={data} />;
}
