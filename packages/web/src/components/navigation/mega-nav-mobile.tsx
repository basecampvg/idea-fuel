'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown, ArrowRight } from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  productFeatures,
  productFeatured,
  resourcesLearn,
  resourcesCompany,
  directLinks,
  type NavSection,
} from './nav-data';

const appUrl =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_APP_URL ?? '/dashboard'
    : process.env.NEXT_PUBLIC_APP_SUBDOMAIN
      ? `https://${process.env.NEXT_PUBLIC_APP_SUBDOMAIN}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? '/dashboard');

interface MegaNavMobileProps {
  variant: 'landing' | 'public' | 'docs';
}

function MobileSection({
  section,
  open,
  onToggle,
}: {
  section: NavSection;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-[14px] font-medium text-[#e8e4df] transition-colors hover:text-white"
      >
        {section.label}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[#5a5652] transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 px-3 pb-4">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3.5 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <Icon className="h-[16px] w-[16px] shrink-0 text-[#e32b1a]" />
                  <div>
                    <div className="text-[13px] font-medium text-[#e8e4df]">{item.title}</div>
                    <div className="text-[12px] text-[#6b6560]">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MegaNavMobile({ variant }: MegaNavMobileProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isLanding = variant === 'landing';
  const isDocs = variant === 'docs';

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 text-[#928e87] transition-colors hover:text-white md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[320px] border-[#2a2825] bg-[#161513] p-0 sm:max-w-[320px]"
        showCloseButton
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>

        <div className="flex h-full flex-col pt-14">
          {/* Product section */}
          <div className="border-b border-[#2a2825]">
            <MobileSection
              section={{ label: 'Product', items: productFeatures.items }}
              open={openSections.product ?? false}
              onToggle={() => toggle('product')}
            />
          </div>

          {/* Resources section */}
          <div className="border-b border-[#2a2825]">
            <MobileSection
              section={{
                label: 'Resources',
                items: [...resourcesLearn.items, ...resourcesCompany.items],
              }}
              open={openSections.resources ?? false}
              onToggle={() => toggle('resources')}
            />
          </div>

          {/* Direct links */}
          {directLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-[#2a2825] px-5 py-4 text-[14px] font-medium text-[#e8e4df] transition-colors hover:text-white"
            >
              {link.title}
            </Link>
          ))}

          {/* Featured card */}
          <div className="px-5 pt-5">
            <Link
              href={productFeatured.href}
              className="group/card block rounded-xl border border-[#2a2825] bg-gradient-to-br from-[#1f1d1a] to-[#161513] p-4 transition-all duration-200 hover:border-[#e32b1a]/30"
            >
              <span className="inline-block rounded-full bg-[#e32b1a]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#e32b1a]">
                {productFeatured.badge}
              </span>
              <p className="mt-2 text-[13px] font-medium text-[#e8e4df]">
                {productFeatured.title}
              </p>
              <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[#6b6560] transition-colors group-hover/card:text-[#e32b1a]">
                View report
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          </div>

          {/* CTA */}
          <div className="mt-auto p-5">
            {isLanding ? (
              <a
                href="#start"
                className="block w-full rounded-full bg-[#e32b1a] py-3 text-center text-[12px] font-semibold uppercase tracking-[1.5px] text-white shadow-[0_0_20px_rgba(227,43,26,0.3)] transition-all hover:shadow-[0_0_30px_rgba(227,43,26,0.5)]"
              >
                Start for Free
              </a>
            ) : isDocs ? (
              <Link
                href="/auth/signin"
                className="block w-full rounded-full bg-[#e32b1a] py-3 text-center text-[12px] font-semibold uppercase tracking-[1.5px] text-white shadow-[0_0_20px_rgba(227,43,26,0.3)] transition-all hover:shadow-[0_0_30px_rgba(227,43,26,0.5)]"
              >
                Get Started
              </Link>
            ) : (
              <a
                href={appUrl}
                className="block w-full rounded-full bg-[#e32b1a] py-3 text-center text-[12px] font-semibold uppercase tracking-[1.5px] text-white shadow-[0_0_20px_rgba(227,43,26,0.3)] transition-all hover:shadow-[0_0_30px_rgba(227,43,26,0.5)]"
              >
                Dashboard
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
