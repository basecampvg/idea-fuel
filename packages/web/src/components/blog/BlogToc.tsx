'use client';

import { useEffect, useState } from 'react';
import type { TocHeading } from '@/lib/blog-utils';

interface BlogTocProps {
  headings: TocHeading[];
  readingTime?: string | null;
}

export function BlogToc({ headings, readingTime }: BlogTocProps) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-88px 0px -70% 0px' }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-[100px] w-[220px]">
        {readingTime && (
          <>
            <p className="text-sm text-muted-foreground mb-3">{readingTime}</p>
            <hr className="border-border mb-4" />
          </>
        )}
        <nav className="space-y-1 border-l border-[hsl(var(--border))]">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={`
                block border-l-2 py-1 text-[12px] leading-snug transition-all duration-150
                ${heading.level === 3 ? 'pl-5' : 'pl-3'}
                ${activeId === heading.id
                  ? 'border-[#e32b1a] text-[#e32b1a] font-medium'
                  : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--muted-foreground)/.5)]'
                }
              `}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
