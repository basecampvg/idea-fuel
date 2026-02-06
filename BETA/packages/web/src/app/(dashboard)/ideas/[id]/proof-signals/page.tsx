'use client';

import { useIdeaSection } from '../components/use-idea-section';
import { ProofSignals, type ProofSignalsData } from '../components/proof-signals';
import { SectionEmptyState } from '../components/section-empty-state';

export default function ProofSignalsPage() {
  const { data } = useIdeaSection(
    (idea) => idea.research?.proofSignals as ProofSignalsData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Proof Signals" />;

  return <ProofSignals proofSignals={data} />;
}
