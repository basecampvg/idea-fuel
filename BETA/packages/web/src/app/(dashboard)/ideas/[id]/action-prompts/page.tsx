'use client';

import { useIdeaSection, useIdea } from '../components/use-idea-section';
import { ActionPrompts, type ActionPrompt } from '../components/action-prompts';
import { SectionEmptyState } from '../components/section-empty-state';

export default function ActionPromptsPage() {
  const { idea } = useIdea();
  const { data } = useIdeaSection(
    (idea) => idea.research?.actionPrompts as ActionPrompt[] | null | undefined
  );

  if (!data) return <SectionEmptyState section="Action Prompts" />;

  return <ActionPrompts actionPrompts={data} ideaTitle={idea?.title ?? ''} />;
}
