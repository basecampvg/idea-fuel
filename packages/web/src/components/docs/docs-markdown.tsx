'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-display text-4xl font-black uppercase tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const id = slugify(String(children));
    return (
      <h2 id={id} className="group mt-12 mb-4 scroll-mt-24 border-b border-[hsl(var(--border))] pb-3 text-xl font-semibold text-[hsl(var(--foreground))]">
        <a href={`#${id}`} className="no-underline hover:no-underline">
          {children}
          <span className="ml-2 opacity-0 transition-opacity group-hover:opacity-50">#</span>
        </a>
      </h2>
    );
  },
  h3: ({ children }) => {
    const id = slugify(String(children));
    return (
      <h3 id={id} className="mt-8 mb-3 scroll-mt-24 text-lg font-semibold text-[hsl(var(--foreground))]">
        <a href={`#${id}`} className="no-underline hover:no-underline">
          {children}
        </a>
      </h3>
    );
  },
  h4: ({ children }) => (
    <h4 className="mt-6 mb-2 text-base font-semibold text-[hsl(var(--foreground))]">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-[1.7] text-[hsl(var(--muted-foreground))]">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[#e32b1a] underline decoration-[#e32b1a]/30 underline-offset-2 transition-colors hover:decoration-[#e32b1a]"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[hsl(var(--foreground))]">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-1 space-y-1.5 text-[hsl(var(--muted-foreground))]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-1 list-decimal space-y-1.5 pl-5 text-[hsl(var(--muted-foreground))]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 leading-[1.7]">
      <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#e32b1a]/40" />
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }) => {
    // Detect callout type from content
    const text = String(children);
    const isTip = text.includes('**Tip:**') || text.includes('**Tip:');
    const isNote = text.includes('**Note:**') || text.includes('**Note:');
    const isPro = text.includes('**Pro Feature:**') || text.includes('**Pro Feature:');
    const isNutshell = text.includes('In a nutshell') || text.includes('nutshell');

    let borderColor = 'border-[hsl(var(--border))]';
    let bgColor = 'bg-[hsl(var(--muted)/.3)]';
    let icon = null;

    if (isTip) {
      borderColor = 'border-emerald-500/40';
      bgColor = 'bg-emerald-500/5';
      icon = (
        <div className="absolute -left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      );
    } else if (isNote) {
      borderColor = 'border-blue-500/40';
      bgColor = 'bg-blue-500/5';
      icon = (
        <div className="absolute -left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else if (isPro) {
      borderColor = 'border-[#e32b1a]/40';
      bgColor = 'bg-[#e32b1a]/5';
      icon = (
        <div className="absolute -left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#e32b1a]/10 text-[#e32b1a]">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      );
    } else if (isNutshell) {
      borderColor = 'border-[hsl(var(--primary)/.25)]';
      bgColor = 'bg-[hsl(var(--primary)/.04)]';
    }

    return (
      <blockquote className={`relative my-6 rounded-lg border-l-2 ${borderColor} ${bgColor} py-3 pr-4 pl-5`}>
        {icon}
        <div className="[&>p]:mb-0 [&>p]:text-sm">{children}</div>
      </blockquote>
    );
  },
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[hsl(var(--muted)/.5)]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-[hsl(var(--border))] px-4 py-2.5 text-[hsl(var(--muted-foreground))]">
      {children}
    </td>
  ),
  code: ({ className, children }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded bg-[hsl(var(--muted)/.6)] px-1.5 py-0.5 font-mono text-[0.85em] text-[#e32b1a]">
          {children}
        </code>
      );
    }
    return (
      <code className="block overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 font-mono text-[13px] leading-relaxed text-[hsl(var(--foreground))]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-hidden rounded-lg">{children}</pre>
  ),
  hr: () => (
    <hr className="my-10 border-[hsl(var(--border))]" />
  ),
};

export function DocsMarkdown({ content }: { content: string }) {
  return (
    <div className="docs-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
