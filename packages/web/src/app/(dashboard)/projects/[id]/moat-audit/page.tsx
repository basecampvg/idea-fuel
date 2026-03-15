'use client';

import { useProjectSection } from '../components/use-project-section';
import { MoatAuditSection } from '../components/moat-audit-section';
import { SectionEmptyState } from '../components/section-empty-state';
import type { MoatAuditResult } from '@forge/shared';

export default function MoatAuditPage() {
  const { data } = useProjectSection(
    (project) => project.research?.expandMoatAudit as MoatAuditResult | null | undefined
  );

  if (!data) return <SectionEmptyState section="MOAT Profile" />;

  return <MoatAuditSection data={data} />;
}
