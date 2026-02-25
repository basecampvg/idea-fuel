'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  FullScoresSection,
  FullBusinessFitSection,
  FullMarketSection,
  FullTimingSection,
  FullKeywordsSection,
  FullProofSignalsSection,
  FullPainPointsSection,
  FullCompetitorsSection,
  FullPositioningSection,
  FullValueLadderSection,
  FullTechStackSection,
  FullActionPromptsSection,
} from './report-sections';

/* ── SVG icon components (matching production style) ────────────── */

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 L6 7 L9 9 L14 3" />
      <path d="M10 3 H14 V7" />
    </svg>
  );
}

function IconPie() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2 V8 L12.5 11" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5 V8 L10.5 10.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 L14 14" />
    </svg>
  );
}

function IconSignal() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 12 A6 6 0 0 1 4 4" />
      <path d="M6 10 A3 3 0 0 1 6 6" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <path d="M10 6 A3 3 0 0 1 10 10" />
      <path d="M12 4 A6 6 0 0 1 12 12" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1.5 14 C1.5 11 3.5 9 6 9 C8.5 9 10.5 11 10.5 14" />
      <circle cx="11" cy="5.5" r="2" />
      <path d="M11 9 C13 9 14.5 10.5 14.5 13" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2 L14.5 13 H1.5 Z" />
      <path d="M8 6.5 V9" />
      <circle cx="8" cy="11" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconSwords() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13 L11 3" />
      <path d="M9 3 H12 V6" />
      <path d="M13 13 L5 3" />
      <path d="M4 3 H7 V6" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2 L14 5.5 L8 9 L2 5.5 Z" />
      <path d="M2 8 L8 11.5 L14 8" />
      <path d="M2 10.5 L8 14 L14 10.5" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4 L1.5 8 L5 12" />
      <path d="M11 4 L14.5 8 L11 12" />
      <path d="M9 2 L7 14" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1 L3 9 H8 L7 15 L13 7 H8 Z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M13 9.5 A5.5 5.5 0 1 1 6.5 3 A4.5 4.5 0 0 0 13 9.5 Z" />
    </svg>
  );
}

function IconLayout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M2 6 H14" />
      <path d="M6 6 V14" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3 L5 8 L10 13" />
    </svg>
  );
}

/* ── Nav structure (grouped like production) ────────────────────── */

type NavItem = { id: string; label: string; icon: React.ComponentType };

type NavGroup = { category: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    category: 'Overview',
    items: [
      { id: 'scores', label: 'Summary', icon: IconGrid },
      { id: 'business', label: 'Business Fit', icon: IconTarget },
    ],
  },
  {
    category: 'Market',
    items: [
      { id: 'market', label: 'Market Analysis', icon: IconTrendUp },
      { id: 'timing', label: 'Why Now', icon: IconClock },
      { id: 'blueprint-keywords', label: 'Keyword Trends', icon: IconSearch },
    ],
  },
  {
    category: 'Validation',
    items: [
      { id: 'blueprint-demand', label: 'Proof Signals', icon: IconSignal },
      { id: 'pain-points', label: 'Pain Points', icon: IconWarning },
      { id: 'competitors', label: 'Competitors', icon: IconSwords },
    ],
  },
  {
    category: 'Strategy',
    items: [
      { id: 'strategy', label: 'Positioning', icon: IconLayers },
      { id: 'business-value', label: 'Offer / Value Ladder', icon: IconPie },
      { id: 'blueprint-tech', label: 'Tech Stack', icon: IconCode },
      { id: 'blueprint-actions', label: 'Action Prompts', icon: IconZap },
    ],
  },
];

// Flat list of all nav item IDs for IntersectionObserver
const ALL_NAV_IDS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

export default function DemoReportPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('scores');

  // IntersectionObserver to highlight sidebar item
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const sections = ALL_NAV_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="flex h-[calc(100vh-88px)] overflow-hidden pt-[88px]">
      {/* ── Sidebar (production style) ────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#2a2a2a] bg-[#0f0f0e] lg:flex">
        {/* Back link + Project info */}
        <div className="border-b border-[#2a2a2a] px-5 py-4">
          <a href="/" className="mb-3 flex items-center gap-1.5 text-xs text-[#928e87] transition-colors hover:text-[#d4d4d4]">
            <IconArrowLeft />
            Back to Vault
          </a>
          <p className="text-sm font-bold text-[#d4d4d4]">Golf CRM</p>
          <p className="mt-0.5 text-xs font-bold text-[#e32b1a]">Ready</p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.category} className={gi > 0 ? 'mt-5' : ''}>
              <p className="mb-1.5 px-2 font-mono text-[10px] font-bold uppercase tracking-[2px] text-[#928e87]/60">
                {group.category}
              </p>
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-all ${
                      isActive
                        ? 'bg-[#e32b1a]/10 font-semibold text-[#e32b1a]'
                        : 'text-[#928e87] hover:bg-[#161513] hover:text-[#d4d4d4]'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#e32b1a]" />
                    )}
                    <span className="w-4 shrink-0 opacity-70">
                      <Icon />
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Divider */}
          <div className="mx-2 my-5 h-px bg-[#2a2a2a]" />

          {/* Reports sub-section */}
          <div>
            <p className="mb-1.5 px-2 font-mono text-[10px] font-bold uppercase tracking-[2px] text-[#928e87]/60">
              Reports
            </p>
            {[
              { label: 'Business Plan', icon: IconGrid },
              { label: 'Competitive Analysis', icon: IconSwords },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[#928e87]/50 cursor-default"
                  disabled
                >
                  <span className="w-4 shrink-0 opacity-40">
                    <Icon />
                  </span>
                  {item.label}
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-[#928e87]/30">Soon</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom utility bar */}
        <div className="flex items-center gap-1 border-t border-[#2a2a2a] px-4 py-3">
          <button className="rounded-lg p-2 text-[#928e87]/50 transition-colors hover:bg-[#161513] hover:text-[#928e87]">
            <IconMoon />
          </button>
          <button className="rounded-lg p-2 text-[#928e87]/50 transition-colors hover:bg-[#161513] hover:text-[#928e87]">
            <IconLayout />
          </button>
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#161513] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e32b1a] lg:hidden">
              <span className="text-xs font-black text-white">IF</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#d4d4d4]">Golf CRM Research Report</p>
              <p className="text-xs text-[#928e87]">Research ID: 63bf4009 &middot; Full Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs font-bold text-[#928e87] transition-colors hover:border-[#e32b1a] hover:text-[#e32b1a]">
              Download PDF
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a2a]">
              <span className="text-xs font-bold text-[#928e87]">MN</span>
            </div>
          </div>
        </header>

        {/* Mobile Nav (horizontal scrollable tabs) */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#2a2a2a] bg-[#0f0f0e] px-4 py-2 lg:hidden">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                activeSection === item.id
                  ? 'bg-[#e32b1a] text-white'
                  : 'text-[#928e87] hover:bg-[#2a2a2a] hover:text-[#d4d4d4]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl space-y-16 px-6 py-8 lg:px-10 lg:py-12">
            {/* OVERVIEW */}
            <FullScoresSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullBusinessFitSection />
            <div className="h-px bg-[#2a2a2a]" />

            {/* MARKET */}
            <FullMarketSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullTimingSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullKeywordsSection />
            <div className="h-px bg-[#2a2a2a]" />

            {/* VALIDATION */}
            <FullProofSignalsSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullPainPointsSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullCompetitorsSection />
            <div className="h-px bg-[#2a2a2a]" />

            {/* STRATEGY */}
            <FullPositioningSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullValueLadderSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullTechStackSection />
            <div className="h-px bg-[#2a2a2a]" />
            <FullActionPromptsSection />

            {/* Footer CTA */}
            <div className="rounded-lg border border-[#e32b1a]/30 bg-[#1a1210] p-8 text-center">
              <p className="font-display text-2xl font-black uppercase text-[#d4d4d4]">Get your own report</p>
              <p className="mt-2 text-sm text-[#928e87]">Sign up for early access and get a full analysis for your business idea.</p>
              <a
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#e32b1a] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c42416]"
              >
                Join the Waitlist &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
