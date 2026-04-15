'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export function ProblemSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-[#1a1a1a] py-28 sm:py-36"
    >
      {/* Subtle top glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: '800px',
          height: '400px',
          background:
            'radial-gradient(ellipse, rgba(227,43,26,0.04) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[900px] px-6 text-center">
        {/* The Lie */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="font-mono text-xs font-medium uppercase tracking-[3px] text-[#e32b1a]"
        >
          The myth everyone believes
        </motion.p>

        <motion.blockquote
          variants={fadeUp}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          transition={{ delay: 0.15 }}
          className="mt-8 font-display text-3xl font-black leading-[1.15] tracking-[-0.5px] text-[#d4d4d4] sm:text-4xl lg:text-5xl"
        >
          &ldquo;You&apos;ve been told to wait for the{' '}
          <span className="text-gradient-brand">perfect idea.</span>&rdquo;
        </motion.blockquote>

        {/* The Truth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
          className="mt-10"
        >
          <div className="mx-auto mb-8 flex max-w-[200px] items-center gap-2">
            <div className="h-px flex-1 bg-[#333]" />
            <div className="h-1.5 w-1.5 rounded-full bg-[#e32b1a]" />
            <div className="h-px flex-1 bg-[#333]" />
          </div>

          <p className="mx-auto max-w-[600px] text-lg leading-relaxed text-[#a8a49e]">
            The idea is{' '}
            <span className="font-bold text-white">5% of the equation.</span>{' '}
            Uber wasn&apos;t the first ride-sharing company. Google wasn&apos;t the
            first search engine. The idea was obvious.{' '}
            <span className="font-bold text-white">Execution wasn&apos;t.</span>
          </p>
        </motion.div>

        {/* The Science teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55, duration: 0.6, ease: 'easeOut' }}
          className="mt-10"
        >
          <p className="mx-auto max-w-[560px] text-base leading-relaxed text-[#6b6862]">
            100 years of creativity research proves that ideas follow a{' '}
            <span className="text-[#a8a49e]">predictable process</span> that can
            be externally supported and accelerated. IdeaFuel is that system.
          </p>
        </motion.div>

        {/* Research citation */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-8 font-mono text-[11px] uppercase tracking-[2px] text-[#3a3835]"
        >
          Based on Wallas (1926), Guilford (1950), APA (2022)
        </motion.p>
      </div>
    </section>
  );
}
