'use client';

import type { ReactNode } from 'react';

type SectionShellProps = {
  id: string;
  stageNum: number;
  stageLabel: string;
  title: ReactNode;
  description: ReactNode;
  phrase: string;
  scienceBody: ReactNode;
  scienceCitation: string;
  tabs: string[];
  illustration: ReactNode;
  reverse?: boolean;
};

export function SectionShell({
  id,
  stageNum,
  stageLabel,
  title,
  description,
  phrase,
  scienceBody,
  scienceCitation,
  tabs,
  illustration,
  reverse = false,
}: SectionShellProps) {
  const content = (
    <div className="pt-2">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            background: 'rgba(227,43,26,0.12)',
            color: '#E32B1A',
          }}
        >
          {stageNum}
        </span>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gradient-brand"
        >
          {stageLabel}
        </span>
      </div>

      <h2
        className="mb-5 font-medium leading-[1.1] tracking-[-0.03em] text-white"
        style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
      >
        {title}
      </h2>

      <p className="mb-5 text-base leading-[1.65]" style={{ color: '#A8A8A6' }}>
        {description}
      </p>

      <div
        className="mb-5 border-t pt-4 text-[15px] font-medium italic text-white"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        &ldquo;{phrase}&rdquo;
      </div>

      <details
        className="group mb-6 border-l pl-3 text-[12px] leading-[1.6]"
        style={{ borderColor: 'rgba(227,43,26,0.25)', color: '#6B6B69' }}
      >
        <summary
          className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-[#A8A8A6]"
          style={{ color: '#6B6B69' }}
        >
          <span className="inline-block transition-transform group-open:rotate-90">›</span>{' '}
          Why this works
        </summary>
        <div className="pt-2">
          {scienceBody}{' '}
          <span style={{ color: '#3D3D3B' }}> ({scienceCitation})</span>
        </div>
      </details>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-all ${
              i === 0 ? '' : 'hover:text-[#A8A8A6]'
            }`}
            style={
              i === 0
                ? {
                    color: 'white',
                    background: '#1A1A1A',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }
                : {
                    color: '#6B6B69',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }
            }
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section id={id} className="px-6 py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-12 lg:grid-cols-2">
        {reverse ? (
          <>
            <div className="order-2 lg:order-1">{illustration}</div>
            <div className="order-1 lg:order-2">{content}</div>
          </>
        ) : (
          <>
            {content}
            <div>{illustration}</div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Linear-style illustration container with mask, panel, glow, and grain.
 */
export function IllustrationContainer({
  glow = 'tl',
  children,
}: {
  glow?: 'tl' | 'tr' | 'center';
  children: ReactNode;
}) {
  return (
    <div className="illus-container">
      <div className="illus-panel">
        <div className="grain-inner" />
        <div className={`illus-glow illus-glow-${glow}`} />
        {children}
      </div>
    </div>
  );
}

export function Separator() {
  return (
    <div className="relative flex h-24 items-center justify-center">
      <div
        className="mx-auto h-px w-full max-w-[1200px]"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
        }}
      />
    </div>
  );
}
