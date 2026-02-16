'use client';

import { useProjectSection, useProject } from '../../components/use-project-section';
import { BusinessPlanSection } from '../../components/business-plan-section';
import { SectionEmptyState } from '../../components/section-empty-state';
import { DownloadCard } from '../../components/download-card';

export default function BusinessPlanReportPage() {
  const { data: businessPlan } = useProjectSection(
    (project) => project.research?.businessPlan as string | null | undefined
  );
  const { project } = useProject();

  if (!businessPlan) return <SectionEmptyState section="Business Plan" />;

  return (
    <div className="space-y-5">
      <BusinessPlanSection businessPlan={businessPlan} />

      {project && (
        <div className="max-w-md">
          <DownloadCard
            type="BUSINESS_PLAN"
            projectId={project.id}
            status={project.research?.status === 'COMPLETE' ? 'ready' : 'locked'}
          />
        </div>
      )}
    </div>
  );
}
