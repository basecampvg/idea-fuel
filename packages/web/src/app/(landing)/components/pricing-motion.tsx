'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

/* ────────────────────────────────────────────────────────
   Tier Data
   ──────────────────────────────────────────────────────── */

interface TierData {
  name: string;
  tagline: string;
  price: string;
  priceSub: string;
  featured: boolean;
  features: { label: string; value: string | boolean; highlight?: boolean }[];
}

const TIERS: TierData[] = [
  {
    name: 'Free',
    tagline: 'Capture ideas. Explore later.',
    price: '$0',
    priceSub: 'forever',
    featured: false,
    features: [
      { label: 'Spark Reports', value: false },
      { label: 'Light Interview Reports', value: false },
      { label: 'In-Depth Interview Reports', value: false },
      { label: 'Full Report Access', value: false },
      { label: 'AI Quality', value: 'Standard' },
      { label: 'Priority Support', value: false },
      { label: 'Draft Ideas', value: 'Unlimited' },
    ],
  },
  {
    name: 'Pro',
    tagline: 'Validate fast. Move with confidence.',
    price: '$29',
    priceSub: '/month',
    featured: true,
    features: [
      { label: 'Spark Reports', value: '5 reports', highlight: true },
      { label: 'Light Interview Reports', value: '3 reports', highlight: true },
      { label: 'In-Depth Interview Reports', value: '1 report', highlight: true },
      { label: 'Full Report Access', value: false },
      { label: 'AI Quality', value: 'Enhanced' },
      { label: 'Priority Support', value: true },
      { label: 'Draft Ideas', value: 'Unlimited' },
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Full power. No limits on insight.',
    price: '$79',
    priceSub: '/month',
    featured: false,
    features: [
      { label: 'Spark Reports', value: '10 reports', highlight: true },
      { label: 'Light Interview Reports', value: '5 reports', highlight: true },
      { label: 'In-Depth Interview Reports', value: '2 reports', highlight: true },
      { label: 'Full Report Access', value: true, highlight: true },
      { label: 'AI Quality', value: 'Premium' },
      { label: 'Priority Support', value: true },
      { label: 'Draft Ideas', value: 'Unlimited' },
    ],
  },
];

/* ────────────────────────────────────────────────────────
   Feature Value
   ──────────────────────────────────────────────────────── */

function FeatureValue({
  value,
  highlight,
}: {
  value: string | boolean;
  highlight?: boolean;
}) {
  if (value === false) {
    return (
      <span className="flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-[#3a3835]">
          <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (value === true) {
    return (
      <span className="flex items-center justify-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          className={highlight ? 'text-[#e32b1a]' : 'text-[#6b6862]'}
        >
          <path d="M4 9l3.5 3.5L14 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`text-sm font-medium ${highlight ? 'text-white' : 'text-[#a8a49e]'}`}>
      {value}
    </span>
  );
}

/* ────────────────────────────────────────────────────────
   Tier Card
   ──────────────────────────────────────────────────────── */

function TierCard({ tier, index }: { tier: TierData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: 'easeOut',
      }}
      className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 sm:p-8 ${
        tier.featured
          ? 'border-[#e32b1a]/40 bg-gradient-to-b from-[#e32b1a]/[0.06] to-[#1c1a17] shadow-[0_0_60px_rgba(227,43,26,0.08)]'
          : 'border-[#2a2723] bg-[#1c1a17]'
      }`}
    >
      {/* Most Popular badge */}
      {tier.featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-[#e32b1a] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[2px] text-white">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h3
          className={`font-display text-2xl font-black uppercase tracking-[-0.5px] sm:text-3xl ${
            tier.featured ? 'text-gradient-brand' : 'text-[#d4d4d4]'
          }`}
        >
          {tier.name}
        </h3>
        <p className="mt-1.5 text-sm text-[#928e87]">{tier.tagline}</p>
      </div>

      {/* Price */}
      <div className="mt-6 text-center">
        <span className="font-display text-5xl font-black tracking-[-2px] text-white sm:text-6xl">
          {tier.price}
        </span>
        <span className="ml-1 text-base text-[#928e87]">{tier.priceSub}</span>
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-2">
        <div className={`h-px flex-1 ${tier.featured ? 'bg-[#e32b1a]/30' : 'bg-[#2a2723]'}`} />
        {tier.featured && <div className="h-1.5 w-1.5 rounded-full bg-[#e32b1a]" />}
        <div className={`h-px flex-1 ${tier.featured ? 'bg-[#e32b1a]/30' : 'bg-[#2a2723]'}`} />
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3.5">
        {tier.features.map((f) => (
          <li key={f.label} className="flex items-center justify-between">
            <span className="text-sm text-[#928e87]">{f.label}</span>
            <FeatureValue value={f.value} highlight={f.highlight} />
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-8">
        {tier.featured ? (
          <button className="w-full rounded-xl bg-[#e32b1a] px-6 py-3.5 text-sm font-bold uppercase tracking-[1.5px] text-white transition-all hover:bg-[#c82617] hover:shadow-[0_0_24px_rgba(227,43,26,0.3)]">
            Get Started
          </button>
        ) : (
          <button
            className={`w-full rounded-xl border px-6 py-3.5 text-sm font-bold uppercase tracking-[1.5px] transition-all ${
              index === 0
                ? 'border-[#2a2723] text-[#928e87] hover:border-[#3a3835] hover:text-[#d4d4d4]'
                : 'border-[#2a2723] text-[#d4d4d4] hover:border-[#e32b1a]/40 hover:text-white'
            }`}
          >
            {index === 0 ? 'Start Free' : 'Contact Us'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────
   Pricing Section (exported)
   ──────────────────────────────────────────────────────── */

export function PricingSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-t border-[#1a1a1a] py-28 sm:py-36"
    >
      {/* Subtle radial glow behind cards */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '900px',
          height: '600px',
          background:
            'radial-gradient(ellipse, rgba(227,43,26,0.04) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-mono text-xs font-medium uppercase tracking-[3px] text-[#e32b1a]"
          >
            Simple pricing
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 font-display text-3xl font-black leading-[1.1] tracking-[-1px] text-white sm:text-4xl lg:text-5xl"
          >
            Choose your{' '}
            <span className="text-gradient-brand">level</span>
          </motion.h2>
        </div>

        {/* Cards Grid */}
        <div className="mt-16 grid gap-6 sm:gap-8 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
