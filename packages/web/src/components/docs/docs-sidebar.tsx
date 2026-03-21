'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { NAV_ITEMS, type NavItem } from '@/lib/docs-nav';

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const isParentActive = pathname.startsWith(item.href + '/');
  const [isOpen, setIsOpen] = useState(isActive || isParentActive);

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={`
            group flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200
            ${depth > 0 ? 'ml-3 border-l border-[hsl(var(--border))]' : ''}
            ${isActive
              ? 'bg-[hsl(var(--primary)/.08)] text-[#e32b1a] font-medium'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)]'
            }
          `}
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
          {item.title}
          {hasChildren && (
            <svg
              className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </Link>
      </div>

      {hasChildren && isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {item.children!.map((child) => (
            <NavLink key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#e32b1a] text-white shadow-[0_0_30px_rgba(227,43,26,0.4)] lg:hidden"
        aria-label="Toggle docs navigation"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          }
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-[280px] overflow-y-auto
          border-r border-[#333] bg-[#161513]
          pt-[72px] pb-8 transition-transform duration-300 ease-out
          lg:sticky lg:top-[72px] lg:z-auto lg:h-[calc(100vh-72px)] lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        onClick={() => setMobileOpen(false)}
      >
        <div className="px-4 pb-3 pt-6">
          <Link
            href="/docs"
            className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[2px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Documentation
          </Link>
        </div>

        <nav className="space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Bottom glow accent */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[hsl(var(--primary)/.03)] to-transparent" />
      </aside>
    </>
  );
}
