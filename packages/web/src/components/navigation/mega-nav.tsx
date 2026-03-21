'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MegaNavMobile } from './mega-nav-mobile';
import {
  productFeatures,
  productFeatured,
  resourcesLearn,
  resourcesCompany,
  directLinks,
  type NavItem,
} from './nav-data';

const appUrl =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_APP_URL ?? '/dashboard'
    : process.env.NEXT_PUBLIC_APP_SUBDOMAIN
      ? `https://${process.env.NEXT_PUBLIC_APP_SUBDOMAIN}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? '/dashboard');

interface MegaNavProps {
  variant: 'landing' | 'public' | 'docs';
}

/* ─── Individual nav link item ─────────────────────────────────────── */
function DropdownItem({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group/item flex items-center gap-4 rounded-lg px-4 py-3.5 transition-all duration-150 hover:bg-white/[0.04]"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#e32b1a] transition-colors duration-150 group-hover/item:text-[#ff4a38]" />
      <div className="min-w-0">
        <div className="text-[14px] font-medium leading-tight text-[#e8e4df]">
          {item.title}
        </div>
        <div className="mt-0.5 text-[13px] leading-snug text-[#6b6560]">
          {item.description}
        </div>
      </div>
    </Link>
  );
}

export function MegaNav({ variant }: MegaNavProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<'product' | 'resources' | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const navRef = useRef<HTMLElement>(null);

  const isLanding = variant === 'landing';
  const isDocs = variant === 'docs';

  const open = useCallback((menu: 'product' | 'resources') => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setOpenMenu(menu);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimeout.current = setTimeout(() => setOpenMenu(null), 300);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }, []);

  const closeNow = useCallback(() => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setOpenMenu(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNow();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeNow]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeNow();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeNow]);

  // Close on route change
  useEffect(() => {
    closeNow();
  }, [pathname, closeNow]);

  return (
    <>
      <nav
        ref={navRef}
        onMouseLeave={scheduleClose}
        className={cn(
          'relative z-50',
          isLanding && 'fixed top-0 left-0 right-0',
          isDocs && 'fixed top-0 left-0 right-0',
        )}
      >
        {/* ── Header bar ─────────────────────────────────────────── */}
        <div
          className={cn(
            'border-b',
            openMenu ? 'border-transparent' : 'border-[#2a2825]',
            isLanding && 'bg-[#161513]',
            variant === 'public' && 'bg-[#161513]',
            isDocs && 'bg-[#161513]/80 backdrop-blur-xl',
          )}
        >
          <div
            className={cn(
              'mx-auto flex items-center justify-between',
              isLanding ? 'h-[88px] max-w-[1800px] px-6 lg:px-20' : 'h-[72px] px-6',
              variant === 'public' && 'max-w-6xl',
              isDocs && 'max-w-[1800px] lg:px-8',
            )}
          >
            {/* ── Left: Logo + Docs badge ────────────────────────── */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5">
                <img
                  src="/ideafuel-logo.svg"
                  alt="Idea Fuel"
                  className={cn(isLanding ? 'h-8' : 'h-7', 'w-auto')}
                />
                <span
                  className={cn(
                    'font-mono font-medium uppercase tracking-[3px]',
                    isLanding ? 'text-xl' : 'text-lg',
                  )}
                >
                  <span className="text-white">idea</span>
                  <span className="text-gradient-brand">fuel</span>
                </span>
              </Link>

              {isDocs && (
                <>
                  <div className="hidden h-5 w-px bg-[#2a2825] sm:block" />
                  <Link
                    href="/docs"
                    className="hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-[2px] text-[#928e87] transition-colors hover:text-white sm:flex"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Docs
                  </Link>
                </>
              )}
            </div>

            {/* ── Center: Navigation triggers (desktop) ──────────── */}
            <div className="hidden items-center gap-0.5 md:flex">
              {/* Product trigger */}
              <button
                onMouseEnter={() => open('product')}
                onClick={() => setOpenMenu(openMenu === 'product' ? null : 'product')}
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-md px-3.5 py-2 text-[14px] font-medium transition-colors duration-150',
                  openMenu === 'product'
                    ? 'text-white'
                    : 'text-[#928e87] hover:text-white',
                )}
              >
                Product
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  openMenu === 'product' && 'rotate-180',
                )} />
              </button>

              {/* Resources trigger */}
              <button
                onMouseEnter={() => open('resources')}
                onClick={() => setOpenMenu(openMenu === 'resources' ? null : 'resources')}
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-md px-3.5 py-2 text-[14px] font-medium transition-colors duration-150',
                  openMenu === 'resources'
                    ? 'text-white'
                    : 'text-[#928e87] hover:text-white',
                )}
              >
                Resources
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  openMenu === 'resources' && 'rotate-180',
                )} />
              </button>

              {/* Direct links */}
              {directLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={closeNow}
                  className={cn(
                    'inline-flex h-9 items-center px-3.5 py-2 text-[14px] font-medium transition-colors duration-150 hover:text-white',
                    pathname?.startsWith(link.href)
                      ? 'text-white'
                      : 'text-[#928e87]',
                  )}
                >
                  {link.title}
                </Link>
              ))}
            </div>

            {/* ── Right: CTA + Mobile toggle ─────────────────────── */}
            <div className="flex items-center gap-3">
              {isLanding ? (
                <a
                  href="#start"
                  className="hidden px-5 py-2 text-sm font-semibold uppercase tracking-[1px] text-gradient-brand transition-opacity hover:opacity-80 sm:inline-flex"
                >
                  Start for Free
                </a>
              ) : isDocs ? (
                <Link
                  href="/auth/signin"
                  className="hidden rounded-full bg-[#e32b1a] px-5 py-2 text-xs font-semibold uppercase tracking-[1px] text-white shadow-[0_0_20px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_0_30px_rgba(227,43,26,0.5)] sm:inline-flex"
                >
                  Get Started
                </Link>
              ) : (
                <a
                  href={appUrl}
                  className="hidden rounded-full bg-[#e32b1a] px-5 py-2 text-xs font-semibold uppercase tracking-[1px] text-white shadow-[0_0_20px_rgba(227,43,26,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_0_30px_rgba(227,43,26,0.5)] sm:inline-flex"
                >
                  Dashboard
                </a>
              )}
              <MegaNavMobile variant={variant} />
            </div>
          </div>
        </div>

        {/* ── Full-width dropdown panels ─────────────────────────── */}
        {openMenu && (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150">
            {/* Subtle top highlight line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#e32b1a]/20 to-transparent" />

            <div className="border-b border-[#2a2825] bg-[#1a1917] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="mx-auto max-w-5xl px-6 lg:px-8">

                {/* ── Product Panel ──────────────────────────────── */}
                {openMenu === 'product' && (
                  <div className="grid grid-cols-[1fr_1px_280px] gap-0 py-8">
                    {/* Features column */}
                    <div className="pr-10">
                      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5a5652]">
                        {productFeatures.label}
                      </div>
                      <div className="-mx-4 space-y-0.5">
                        {productFeatures.items.map((item) => (
                          <DropdownItem key={item.href} item={item} onClick={closeNow} />
                        ))}
                      </div>
                    </div>

                    {/* Vertical divider */}
                    <div className="bg-[#2a2825]" />

                    {/* Featured column */}
                    <div className="pl-10">
                      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5a5652]">
                        Featured
                      </div>
                      <Link
                        href={productFeatured.href}
                        onClick={closeNow}
                        className="group/card block rounded-xl border border-[#2a2825] bg-gradient-to-br from-[#1f1d1a] to-[#161513] p-5 transition-all duration-200 hover:border-[#e32b1a]/30 hover:shadow-[0_0_30px_-5px_rgba(227,43,26,0.1)]"
                      >
                        <span className="inline-block rounded-full bg-[#e32b1a]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#e32b1a]">
                          {productFeatured.badge}
                        </span>
                        <p className="mt-3 text-[15px] font-medium leading-snug text-[#e8e4df]">
                          {productFeatured.title}
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-[#6b6560] transition-colors duration-150 group-hover/card:text-[#e32b1a]">
                          View report
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/card:translate-x-0.5" />
                        </div>
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── Resources Panel ────────────────────────────── */}
                {openMenu === 'resources' && (
                  <div className="grid grid-cols-[1fr_1px_1fr] gap-0 py-8">
                    {/* Learn column */}
                    <div className="pr-10">
                      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5a5652]">
                        {resourcesLearn.label}
                      </div>
                      <div className="-mx-4 space-y-0.5">
                        {resourcesLearn.items.map((item) => (
                          <DropdownItem key={item.href} item={item} onClick={closeNow} />
                        ))}
                      </div>
                    </div>

                    {/* Vertical divider */}
                    <div className="bg-[#2a2825]" />

                    {/* Company column */}
                    <div className="pl-10">
                      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#5a5652]">
                        {resourcesCompany.label}
                      </div>
                      <div className="-mx-4 space-y-0.5">
                        {resourcesCompany.items.map((item) => (
                          <DropdownItem key={item.href} item={item} onClick={closeNow} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Backdrop overlay when dropdown is open ─────────────── */}
      {openMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
          onClick={closeNow}
          aria-hidden
        />
      )}
    </>
  );
}
