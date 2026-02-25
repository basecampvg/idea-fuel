'use client';

import { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  children,
}: CollapsibleSectionProps) {
  return (
    <div>
      <h2 className="font-display text-lg font-extrabold uppercase text-foreground mb-5">{title}</h2>
      {children}
    </div>
  );
}
