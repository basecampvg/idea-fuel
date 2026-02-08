'use client';

import { useProject } from './use-project-section';
import { DownloadCard } from './download-card';

interface ReportPageProps {
  reportType: string;
  title: string;
}

export function ReportPage({ reportType, title }: ReportPageProps) {
  const { project } = useProject();

  if (!project) return null;

  const hasResearch = project.research?.status === 'COMPLETE';
  const status = hasResearch ? 'ready' : 'locked';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasResearch
            ? 'Generate and download your report as a PDF.'
            : 'Complete research to unlock this report.'}
        </p>
      </div>

      <div className="max-w-md">
        <DownloadCard
          type={reportType}
          projectId={project.id}
          status={status as 'ready' | 'generating' | 'locked'}
        />
      </div>
    </div>
  );
}
