'use client';

import { useProjectSection } from '../components/use-project-section';
import { ProofSignals, type ProofSignalsData } from '../components/proof-signals';
import { SectionEmptyState } from '../components/section-empty-state';

export default function ProofSignalsPage() {
  const { data } = useProjectSection(
    (project) => project.research?.proofSignals as ProofSignalsData | null | undefined
  );

  if (!data) return <SectionEmptyState section="Proof Signals" />;

  return <ProofSignals proofSignals={data} />;
}
