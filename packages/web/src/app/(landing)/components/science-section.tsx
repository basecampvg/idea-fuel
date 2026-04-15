'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

/* ────────────────────────────────────────────────────────
   Stage Data
   ──────────────────────────────────────────────────────── */

interface Stage {
  number: string;
  name: string;
  quote: string;
  citation: string;
  citationDetail: string;
  description: string;
  icon: React.ReactNode;
}

const STAGES: Stage[] = [
  {
    number: '01',
    name: 'Capture',
    quote: 'Don\u2019t edit. Just capture.',
    citation: 'Guilford, J.P. (1950)',
    citationDetail:
      'Premature convergence \u2014 judging and editing ideas too soon \u2014 kills your best thinking. Separate divergent from convergent.',
    description:
      'Voice memos, quick notes, zero-friction mobile capture. Your raw, unfiltered thoughts are where breakthroughs hide. Darwin kept notebooks of \u201Cfringe thoughts\u201D that led to the theory of evolution.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
        <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="21" x2="17" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '02',
    name: 'Incubate',
    quote: 'Your best ideas are already in here. Let\u2019s find them.',
    citation: 'Wallas, G. (1926)',
    citationDetail:
      'Breakthroughs come during incubation \u2014 when your conscious mind steps away and your subconscious connects the dots.',
    description:
      'Our resurfacing engine brings back your thoughts at the right time. Research shows 24\u201348 hours is the minimum effective incubation period. We make sure nothing decays.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 9v7l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    name: 'Synthesize',
    quote: 'Find the signal in your own noise.',
    citation: 'ACM SIGCHI (2022)',
    citationDetail:
      'The best ideas come from synthesizing inputs across multiple domains. Creative search is iterative, not sequential.',
    description:
      'AI collision detection surfaces connections you missed. Cross-cluster pollination finds the patterns hiding in your scattered notes. As Steve Jobs said: \u201CCreativity is just connecting things.\u201D',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
        <circle cx="10" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="22" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="22" r="4" stroke="currentColor" strokeWidth="1.5" />
        <line x1="13" y1="14" x2="14" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="19" y1="14" x2="18" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '04',
    name: 'Crystallize',
    quote: 'This is the moment your idea becomes real.',
    citation: 'Academy of Management (2021)',
    citationDetail:
      'Ideas have \u201Cwave-particle duality\u201D \u2014 they are both fluid processes and discrete artifacts. Crystallization is the phase transition.',
    description:
      'From scattered notes to a structured business concept. Your idea stops being a feeling and becomes a blueprint with a problem statement, value prop, and business model.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
        <path d="M16 4l8 6v12l-8 6-8-6V10l8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M16 4v12m0 0l8 6m-8-6l-8 6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </svg>
    ),
  },
  {
    number: '05',
    name: 'Validate',
    quote: 'Test it before you build it. Build it before you bet on it.',
    citation: 'Ness, R. (2012)',
    citationDetail:
      'Systematic approaches to creative thinking can be taught and externally supported. Creativity is not a mystical gift.',
    description:
      'The Spark interview takes 10 minutes and produces a full validation report: market sizing, competitor analysis, pricing strategy, and actionable next steps. What used to cost $20K takes days.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
        <path d="M8 17l5 5 11-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/* ────────────────────────────────────────────────────────
   Stage Card
   ──────────────────────────────────────────────────────── */

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="relative">
      {/* Timeline dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
        className="absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 lg:block"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#333] bg-[#0A0A0A]">
          <div className="h-2.5 w-2.5 rounded-full bg-[#e32b1a]" />
        </div>
      </motion.div>

      {/* Card — alternates left/right on desktop */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -40 : 40, y: 20 }}
        animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        className={`relative lg:w-[calc(50%-40px)] ${
          isEven ? 'lg:mr-auto' : 'lg:ml-auto'
        }`}
      >
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#111]/60 p-6 backdrop-blur-sm sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#222] bg-[#0A0A0A] text-[#e32b1a]">
              {stage.icon}
            </div>
            <div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[2px] text-[#e32b1a]">
                Stage {stage.number}
              </span>
              <h3 className="font-display text-2xl font-black uppercase tracking-[-0.5px] text-white sm:text-3xl">
                {stage.name}
              </h3>
            </div>
          </div>

          {/* Quote */}
          <p className="mt-5 text-lg font-semibold italic text-[#d4d4d4]">
            &ldquo;{stage.quote}&rdquo;
          </p>

          {/* Research citation */}
          <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0A0A0A]/80 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-[#e32b1a]">
              {stage.citation}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#6b6862]">
              {stage.citationDetail}
            </p>
          </div>

          {/* Description */}
          <p className="mt-5 text-sm leading-relaxed text-[#a8a49e]">
            {stage.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Timeline Line (draws on scroll)
   ──────────────────────────────────────────────────────── */

function TimelineLine() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-200px' });

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-0 hidden h-full -translate-x-1/2 lg:block"
    >
      <motion.div
        initial={{ scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="h-full w-px origin-top bg-gradient-to-b from-[#e32b1a]/60 via-[#333] to-transparent"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Science Section (exported)
   ──────────────────────────────────────────────────────── */

export function ScienceSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section className="relative overflow-hidden border-t border-[#1a1a1a] py-28 sm:py-36">
      {/* Section Header */}
      <div ref={headerRef} className="mx-auto max-w-[900px] px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs font-medium uppercase tracking-[3px] text-[#e32b1a]"
        >
          The science behind IdeaFuel
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 font-display text-3xl font-black leading-[1.1] tracking-[-1px] text-white sm:text-4xl lg:text-5xl"
        >
          Ideas follow a{' '}
          <span className="text-gradient-brand">predictable process</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 text-lg text-[#a8a49e]"
        >
          Since 1926, researchers have known that great ideas don&apos;t appear
          fully formed. We built an app that engineers each stage.
        </motion.p>
      </div>

      {/* Timeline */}
      <div className="relative mx-auto mt-20 max-w-[1200px] px-6 sm:mt-24 lg:px-16">
        <TimelineLine />

        <div className="space-y-12 lg:space-y-16">
          {STAGES.map((stage, i) => (
            <StageCard key={stage.number} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
