'use client';

import { useProjectSection, useProject } from '../components/use-project-section';
import { ActionPrompts, type ActionPrompt } from '../components/action-prompts';
import { SectionEmptyState } from '../components/section-empty-state';

export default function ActionPromptsPage() {
  const { project } = useProject();
  const { data } = useProjectSection(
    (project) => project.research?.actionPrompts as ActionPrompt[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Action Prompts" />;

  return <ActionPrompts actionPrompts={data} ideaTitle={project?.title ?? ''} />;
}
