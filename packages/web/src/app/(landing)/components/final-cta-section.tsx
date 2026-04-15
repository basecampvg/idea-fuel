'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

export function FinalCtaSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-[#1a1a1a] py-28 sm:py-36"
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '1000px',
          height: '600px',
          background:
            'radial-gradient(ellipse, rgba(227,43,26,0.06) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[800px] px-6 text-center">
        {/* Thesis */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs font-medium uppercase tracking-[3px] text-[#e32b1a]"
        >
          Stop waiting for lightning
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 font-display text-3xl font-black leading-[1.1] tracking-[-1px] text-white sm:text-4xl lg:text-5xl"
        >
          Ideas are not born.{' '}
          <span className="text-gradient-brand">They are grown.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 text-lg text-[#a8a49e]"
        >
          Your next business starts with a single thought. Capture it before it
          disappears.
        </motion.p>

        {/* App Store Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <a
            href="#"
            className="group flex items-center gap-3 rounded-xl border border-[#333] bg-[#111] px-6 py-3.5 transition-all hover:border-[#e32b1a]/40 hover:bg-[#1a1a1a]"
          >
            <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6 flex-shrink-0">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="flex flex-col">
              <span className="text-[10px] leading-tight text-[#928e87]">
                Download on the
              </span>
              <span className="text-sm font-semibold leading-tight text-white">
                App Store
              </span>
            </div>
          </a>
          <a
            href="#"
            className="group flex items-center gap-3 rounded-xl border border-[#333] bg-[#111] px-6 py-3.5 transition-all hover:border-[#e32b1a]/40 hover:bg-[#1a1a1a]"
          >
            <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6 flex-shrink-0">
              <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.61 12 17.72 10.11l-2.27 2.27 2.27 2.27-.01-.44zm-1.08-5.32L6.05 2.66 16.64 8.88l-2.27 2.27 2.27-2.27z" />
            </svg>
            <div className="flex flex-col">
              <span className="text-[10px] leading-tight text-[#928e87]">
                Get it on
              </span>
              <span className="text-sm font-semibold leading-tight text-white">
                Google Play
              </span>
            </div>
          </a>
        </motion.div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12"
        >
          <p className="text-sm italic text-[#6b6862]">
            &ldquo;Inspiration exists, but it has to find you working.&rdquo;
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[2px] text-[#3a3835]">
            &mdash; Pablo Picasso
          </p>
        </motion.div>
      </div>
    </section>
  );
}
