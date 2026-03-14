import Link from 'next/link';

interface DocsCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

export function DocsCard({ title, description, href, icon }: DocsCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-all duration-200 hover:border-[#e32b1a]/30 hover:bg-[hsl(var(--muted)/.3)] hover:shadow-[0_0_30px_rgba(227,43,26,0.06)]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.08)] text-[#e32b1a] transition-colors group-hover:bg-[hsl(var(--primary)/.12)]">
        {icon}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors group-hover:text-[#e32b1a]">
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <svg
        className="absolute top-5 right-5 h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

interface DocsCardGroupProps {
  title: string;
  children: React.ReactNode;
  cols?: 2 | 3;
}

export function DocsCardGroup({ title, children, cols = 3 }: DocsCardGroupProps) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[2px] text-[hsl(var(--muted-foreground))]">
        {title}
      </h2>
      <div className={`grid gap-3 ${cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {children}
      </div>
    </div>
  );
}
