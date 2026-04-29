'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { productItems, resourceItems, type MenuItem } from './mega-menu';

const SWIPE_DISMISS_THRESHOLD = 70; // px swiped up to commit close
const SWIPE_RUBBER_BAND = 0.4; // resistance when overpulling down

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<'product' | 'resources' | null>(
    'product',
  );

  // Swipe-to-close state
  const [dragOffset, setDragOffset] = useState(0); // negative when swiping up
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Lock scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Reset drag state when reopening
  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      setIsDragging(false);
      touchStartY.current = null;
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start a drag from the top of the panel — if the user is
    // scrolled inside the menu, let normal scrolling happen first.
    const scroller = scrollContainerRef.current;
    if (scroller && scroller.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) {
      // Swiping up — track 1:1
      setDragOffset(dy);
    } else {
      // Pulling down — rubber-band so the panel feels physical
      setDragOffset(dy * SWIPE_RUBBER_BAND);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const committed = dragOffset < -SWIPE_DISMISS_THRESHOLD;
    touchStartY.current = null;
    setIsDragging(false);
    if (committed) {
      setOpen(false);
    } else {
      setDragOffset(0); // spring back
    }
  };

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-[70] flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/[0.06]"
      >
        <Burger open={open} />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-200"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Panel — slides down from header. Swipe up dismisses. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="fixed left-0 right-0 top-[88px] z-[65] origin-top overflow-hidden border-b border-white/[0.06] bg-[#0A0A0A]/98 backdrop-blur-2xl"
        style={{
          transform: open
            ? `translateY(${dragOffset}px)`
            : 'translateY(-12px)',
          opacity: open ? Math.max(0.4, 1 + dragOffset / 200) : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: isDragging
            ? 'none'
            : 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1), opacity 240ms ease',
          touchAction: 'pan-y',
        }}
      >
        {/* Drag handle hint */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
        </div>
        <div
          ref={scrollContainerRef}
          className="mx-auto max-h-[calc(100vh-104px)] max-w-[1400px] overflow-y-auto px-6 pb-6 pt-1"
        >
          <Section
            title="Product"
            isOpen={section === 'product'}
            onToggle={() =>
              setSection((s) => (s === 'product' ? null : 'product'))
            }
            items={productItems}
            onNavigate={() => setOpen(false)}
          />
          <Section
            title="Resources"
            isOpen={section === 'resources'}
            onToggle={() =>
              setSection((s) => (s === 'resources' ? null : 'resources'))
            }
            items={resourceItems}
            onNavigate={() => setOpen(false)}
          />

          <div className="my-3 h-px bg-white/[0.06]" />

          <DirectLink
            href="/#pricing"
            label="Pricing"
            onNavigate={() => setOpen(false)}
          />
          <DirectLink
            href="/blog"
            label="Blog"
            onNavigate={() => setOpen(false)}
          />

          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/auth/signin"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#1A1A1A] text-[15px] font-medium text-white transition-colors hover:bg-[#222]"
            >
              Sign in
            </Link>
            <a
              href="#"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center rounded-full bg-[#E32B1A] text-[15px] font-semibold text-white transition-all hover:bg-[#C82617]"
            >
              Get the App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  isOpen,
  onToggle,
  items,
  onNavigate,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  items: MenuItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="border-b border-white/[0.04]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left text-[16px] font-medium text-white"
        aria-expanded={isOpen}
      >
        {title}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            color: '#888782',
          }}
        >
          <path
            d="M3 5l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <ul className="m-0 list-none space-y-1 pb-3 pl-1">
            {items.map((item) => (
              <li key={item.href + item.label}>
                <MobileItem item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MobileItem({
  item,
  onNavigate,
}: {
  item: MenuItem;
  onNavigate: () => void;
}) {
  const inner = (
    <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors active:bg-white/[0.05]">
      <span className="text-[15px] font-medium text-white">{item.label}</span>
      <span className="text-[13px] leading-snug text-[#888782]">
        {item.sublabel}
      </span>
    </div>
  );
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="block"
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={item.href} onClick={onNavigate} className="block">
      {inner}
    </Link>
  );
}

function DirectLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block border-b border-white/[0.04] py-4 text-[16px] font-medium text-white transition-colors active:text-[#DB4D40]"
    >
      {label}
    </Link>
  );
}

function Burger({ open }: { open: boolean }) {
  return (
    <div className="relative h-4 w-5">
      <span
        className="absolute left-0 right-0 h-[1.75px] rounded-full bg-current"
        style={{
          top: open ? '50%' : '20%',
          transform: open ? 'translateY(-50%) rotate(45deg)' : 'none',
          transition:
            'top 200ms ease, transform 200ms ease 80ms',
        }}
      />
      <span
        className="absolute left-0 right-0 top-1/2 h-[1.75px] -translate-y-1/2 rounded-full bg-current"
        style={{
          opacity: open ? 0 : 1,
          transition: 'opacity 120ms ease',
        }}
      />
      <span
        className="absolute left-0 right-0 h-[1.75px] rounded-full bg-current"
        style={{
          bottom: open ? '50%' : '20%',
          transform: open ? 'translateY(50%) rotate(-45deg)' : 'none',
          transition:
            'bottom 200ms ease, transform 200ms ease 80ms',
        }}
      />
    </div>
  );
}
