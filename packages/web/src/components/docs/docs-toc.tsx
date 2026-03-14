'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(content: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function DocsToc({ content }: { content: string }) {
  const headings = extractHeadings(content);
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
    <div className="hidden xl:block">
      <div className="sticky top-[112px] w-[200px]">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[2px] text-[hsl(var(--muted-foreground))]">
          On this page
        </p>
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
    </div>
  );
}
