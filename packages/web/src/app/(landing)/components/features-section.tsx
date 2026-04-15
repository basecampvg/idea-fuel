'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

/* ────────────────────────────────────────────────────────
   Feature Data
   ──────────────────────────────────────────────────────── */

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: 'Market Sizing',
    description:
      'TAM, SAM, SOM analysis with real data. Know exactly how big the opportunity is before you invest a dollar.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 16l4-6 4 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Competitor Analysis',
    description:
      'Deep positioning maps of who\u2019s already in the space, where the gaps are, and how to differentiate.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Pricing Strategy',
    description:
      'Evidence-based pricing tiers, willingness-to-pay signals, and competitive price benchmarks.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Business Model',
    description:
      'Revenue model, unit economics, and financial projections grounded in real market data.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Problem-Solution Fit',
    description:
      'Score your idea against real customer pain clusters. Know if people actually need what you\u2019re building.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Next Steps',
    description:
      'Actionable execution plan: what to build first, who to talk to, and where to find your first customers.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/* ────────────────────────────────────────────────────────
   Feature Card
   ──────────────────────────────────────────────────────── */

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: 'easeOut',
      }}
      className="group rounded-2xl border border-[#1a1a1a] bg-[#111]/40 p-6 transition-all duration-300 hover:border-[#e32b1a]/20 hover:bg-[#111]/70"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#222] bg-[#0A0A0A] text-[#e32b1a] transition-colors group-hover:border-[#e32b1a]/30">
        {feature.icon}
      </div>

      {/* Title */}
      <h3 className="mt-4 text-base font-bold text-white">{feature.title}</h3>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-[#928e87]">
        {feature.description}
      </p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────
   Features Section (exported)
   ──────────────────────────────────────────────────────── */

export function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section className="relative overflow-hidden border-t border-[#1a1a1a] py-28 sm:py-36">
      {/* Header */}
      <div ref={headerRef} className="mx-auto max-w-[900px] px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs font-medium uppercase tracking-[3px] text-[#e32b1a]"
        >
          What you get
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 font-display text-3xl font-black leading-[1.1] tracking-[-1px] text-white sm:text-4xl lg:text-5xl"
        >
          From raw thought to{' '}
          <span className="text-gradient-brand">validated business</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 text-lg text-[#a8a49e]"
        >
          Every report is backed by real data, sourced evidence, and actionable next
          steps. Not ChatGPT copy-paste&nbsp;&mdash; a living business model.
        </motion.p>
      </div>

      {/* Competitive positioning */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={headerInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mx-auto mt-8 max-w-[600px] px-6 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-[#3a3835]">
          ChatGPT gives you a document. IdeaFuel gives you a living business model.
        </p>
      </motion.div>

      {/* Grid */}
      <div className="mx-auto mt-16 grid max-w-[1200px] grid-cols-1 gap-4 px-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:px-16">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
