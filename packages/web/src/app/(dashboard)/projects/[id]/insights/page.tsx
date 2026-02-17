'use client';

import { AgentInsightsSection } from '@/components/agent/agent-insights-section';
import { SectionEmptyState } from '../components/section-empty-state';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function InsightsPage() {
  const params = useParams<{ id: string }>();
  const { data: insights, isLoading } = trpc.agent.listInsights.useQuery(
    { projectId: params.id },
    { enabled: !!params.id }
  );

  if (!isLoading && (!insights || insights.length === 0)) {
    return (
      <SectionEmptyState
        section="AI Insights"
        message="Use the AI Agent (Ctrl+J) to ask questions about your project, then save insights to this section."
      />
    );
  }

  return <AgentInsightsSection />;
}
