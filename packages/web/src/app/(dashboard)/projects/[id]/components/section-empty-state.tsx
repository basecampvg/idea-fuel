'use client';

import { FileQuestion } from 'lucide-react';

interface SectionEmptyStateProps {
  section: string;
  message?: string;
}

export function SectionEmptyState({ section, message }: SectionEmptyStateProps) {
  return (
    <div className="rounded-2xl bg-background border border-border p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileQuestion className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground">{section}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {message ?? 'No data available yet. Complete an interview and run research to populate this section.'}
      </p>
    </div>
  );
}
