'use client';

import { NavigationMenu } from 'radix-ui';
import Link from 'next/link';

export type MenuItem = {
  href: string;
  label: string;
  sublabel: string;
  external?: boolean;
};

export const productItems: MenuItem[] = [
  {
    href: '/#capture',
    label: 'Capture',
    sublabel: 'Voice notes & raw thoughts',
  },
  {
    href: '/#incubate',
    label: 'Incubate',
    sublabel: 'Resurface ideas at the right time',
  },
  {
    href: '/#synthesize',
    label: 'Synthesize',
    sublabel: 'Find collisions across your thinking',
  },
  {
    href: '/#crystallize',
    label: 'Crystallize',
    sublabel: 'Cluster thoughts into business concepts',
  },
  {
    href: '/#validate',
    label: 'Validate',
    sublabel: 'Deep research, market sizing, interviews',
  },
  {
    href: '/demo-report',
    label: 'Sample report',
    sublabel: 'See what a validated idea looks like',
  },
];

export const resourceItems: MenuItem[] = [
  {
    href: '/blog',
    label: 'Blog',
    sublabel: 'Essays on validation & founder craft',
  },
  {
    href: '/docs',
    label: 'Docs',
    sublabel: 'How to use IdeaFuel',
  },
  {
    href: '/glossary',
    label: 'Glossary',
    sublabel: 'The vocabulary of validation',
  },
  {
    href: '/demo-report',
    label: 'Sample report',
    sublabel: 'A real, validated business idea',
  },
  {
    href: '/mobile',
    label: 'Mobile app',
    sublabel: 'Built for ideas on the move',
  },
  {
    href: '/auth/signin',
    label: 'Sign in',
    sublabel: 'Open the dashboard',
  },
];

export function MegaMenu() {
  return (
    <NavigationMenu.Root
      className="relative z-[60] hidden sm:block"
      delayDuration={80}
    >
      <NavigationMenu.List className="m-0 flex list-none items-center gap-1 p-0">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="mega-trigger">
            Product
            <Caret />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="mega-content">
            <ItemGrid items={productItems} />
            <MegaFooter
              note="New"
              text="The thoughts ⇄ ideas pipeline"
              ctaText="See the science"
              ctaHref="/#capture"
            />
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="mega-trigger">
            Resources
            <Caret />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="mega-content">
            <ItemGrid items={resourceItems} />
            <MegaFooter
              note="Read"
              text="What separates noise from signal"
              ctaText="Latest essay"
              ctaHref="/blog"
            />
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Link asChild className="mega-link">
            <a href="/#pricing">Pricing</a>
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Link asChild className="mega-link">
            <Link href="/blog">Blog</Link>
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        <NavigationMenu.Indicator className="mega-indicator">
          <div className="mega-indicator-arrow" />
        </NavigationMenu.Indicator>
      </NavigationMenu.List>

      {/* Floating viewport */}
      <div className="absolute left-1/2 top-full flex -translate-x-1/2 justify-center perspective-[2000px]">
        <NavigationMenu.Viewport className="mega-viewport" />
      </div>
    </NavigationMenu.Root>
  );
}

function ItemGrid({ items }: { items: MenuItem[] }) {
  return (
    <ul
      className="m-0 grid list-none grid-cols-3 gap-1 p-3"
      style={{ width: 720 }}
    >
      {items.map((item) => (
        <li key={item.href + item.label}>
          <ItemLink {...item} />
        </li>
      ))}
    </ul>
  );
}

function ItemLink({ href, label, sublabel, external }: MenuItem) {
  const inner = (
    <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.04]">
      <span className="text-[14px] font-semibold text-white">{label}</span>
      <span className="text-[12.5px] leading-snug text-[#888782]">
        {sublabel}
      </span>
    </div>
  );
  if (external) {
    return (
      <NavigationMenu.Link asChild>
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
          {inner}
        </a>
      </NavigationMenu.Link>
    );
  }
  return (
    <NavigationMenu.Link asChild>
      <Link href={href} className="block">
        {inner}
      </Link>
    </NavigationMenu.Link>
  );
}

function MegaFooter({
  note,
  text,
  ctaText,
  ctaHref,
}: {
  note: string;
  text: string;
  ctaText: string;
  ctaHref: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-full px-2 py-[2px] text-[11px] font-semibold uppercase tracking-[0.04em]"
          style={{
            background: 'rgba(227,43,26,0.12)',
            color: '#DB4D40',
          }}
        >
          {note}
        </span>
        <span className="text-[13px] text-[#A8A8A6]">{text}</span>
      </div>
      <Link
        href={ctaHref}
        className="text-[13px] font-medium text-white transition-colors hover:text-[#DB4D40]"
      >
        {ctaText} →
      </Link>
    </div>
  );
}

function Caret() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden
      className="mega-caret"
    >
      <path
        d="M2 4l3 3 3-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

