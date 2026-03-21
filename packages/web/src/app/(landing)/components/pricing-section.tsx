'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WaitlistForm } from './waitlist-form';

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
      { label: 'Expand Pipeline', value: false },
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
      { label: 'Expand Pipeline', value: false },
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
      { label: 'Expand Pipeline', value: false },
      { label: 'AI Quality', value: 'Premium' },
      { label: 'Priority Support', value: true },
      { label: 'Draft Ideas', value: 'Unlimited' },
    ],
  },
  {
    name: 'Scale',
    tagline: 'Expand what works. Find what\'s next.',
    price: '$199',
    priceSub: '/month',
    featured: false,
    features: [
      { label: 'Spark Reports', value: '10 reports', highlight: true },
      { label: 'Light Interview Reports', value: '5 reports', highlight: true },
      { label: 'In-Depth Interview Reports', value: '2 reports', highlight: true },
      { label: 'Full Report Access', value: true, highlight: true },
      { label: 'Expand Pipeline', value: true, highlight: true },
      { label: 'AI Quality', value: 'Premium' },
      { label: 'Priority Support', value: true },
      { label: 'Draft Ideas', value: 'Unlimited' },
    ],
  },
];

/* ────────────────────────────────────────────────────────
   Feature Row
   ──────────────────────────────────────────────────────── */

function FeatureValue({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
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
        <svg width="18" height="18" viewBox="0 0 18 18" className={highlight ? 'text-[#e32b1a]' : 'text-[#6b6862]'}>
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
  return (
    <div
      data-anim="pricing-card"
      className={`
        relative flex flex-col rounded-2xl border p-6 sm:p-8
        transition-all duration-300
        ${tier.featured
          ? 'border-[#e32b1a]/40 bg-gradient-to-b from-[#e32b1a]/[0.06] to-[#1c1a17] shadow-[0_0_60px_rgba(227,43,26,0.08)]'
          : 'border-[#2a2723] bg-[#1c1a17]'
        }
      `}
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
          <button
            className="w-full rounded-xl bg-[#e32b1a] px-6 py-3.5 text-sm font-bold uppercase tracking-[1.5px] text-white transition-all hover:bg-[#c82617] hover:shadow-[0_0_24px_rgba(227,43,26,0.3)]"
          >
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
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Pricing Section (exported)
   ──────────────────────────────────────────────────────── */

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !cardsRef.current || !ctaRef.current) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Header elements — staggered timeline triggered by section entering
        const headerTl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current!,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        headerTl
          .from('[data-anim="pricing-sub"]', { opacity: 0, y: 20, duration: 0.5 })
          .from('[data-anim="pricing-headline"]', { opacity: 0, y: 30, duration: 0.6 }, '-=0.3')
          .from('[data-anim="pricing-divider"]', { opacity: 0, scaleX: 0, duration: 0.5 }, '-=0.3');

        // Cards — stagger using the cards container ref as trigger
        gsap.from(
          cardsRef.current!.querySelectorAll('[data-anim="pricing-card"]'),
          {
            opacity: 0,
            y: 50,
            duration: 0.7,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current!,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );

        // Bottom CTA
        gsap.from(ctaRef.current!, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          scrollTrigger: {
            trigger: ctaRef.current!,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative overflow-hidden bg-[#161513] py-24 sm:py-32"
    >
      {/* Subtle radial glow behind cards */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '900px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(227,43,26,0.04) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <p
            data-anim="pricing-sub"
            className="font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
          >
            simple pricing
          </p>
          <h2
            data-anim="pricing-headline"
            className="mt-4 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#d4d4d4] sm:text-7xl"
          >
            <span className="block">choose your</span>
            <span className="block text-gradient-brand">level</span>
          </h2>
          <div
            data-anim="pricing-divider"
            className="mx-auto mt-8 flex max-w-[300px] items-center"
          >
            <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
            <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
          </div>
        </div>

        {/* Cards Grid */}
        <div
          ref={cardsRef}
          data-anim="pricing-cards"
          className="mt-16 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {TIERS.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div ref={ctaRef} data-anim="pricing-cta" className="mt-20 text-center">
          <p className="text-sm text-[#928e87]">
            Not ready to commit? Start capturing ideas for free.
          </p>
          <div className="mx-auto mt-6 max-w-[448px]">
            <WaitlistForm />
          </div>
          <p className="mt-3 text-xs text-[#6b6862]">
            Get early access + exclusive insights. No spam.
          </p>
        </div>
      </div>
    </section>
  );
}
