'use client';

import { motion } from 'motion/react';
import { PhoneMockup } from './phone-mockup';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const phoneReveal = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: 'easeOut' as const, delay: 0.5 },
  },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-[88px]">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute -top-[200px] left-1/2 -translate-x-1/2"
        style={{
          width: '1200px',
          height: '800px',
          background:
            'radial-gradient(ellipse, rgba(227,43,26,0.06) 0%, transparent 65%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-88px)] max-w-[1400px] items-center px-6 lg:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: Text */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-[640px]"
          >
            {/* Label */}
            <motion.p
              variants={fadeUp}
              className="font-mono text-xs font-medium uppercase tracking-[3px] text-[#928e87]"
            >
              AI-powered idea validation
            </motion.p>

            {/* H1 */}
            <motion.h1
              variants={fadeUp}
              className="mt-6 font-display text-4xl font-black leading-[1.05] tracking-[-1px] text-white sm:text-5xl lg:text-[64px] lg:leading-[1]"
            >
              Turn your ideas into{' '}
              <span className="text-gradient-brand">validated businesses</span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-[520px] text-lg leading-relaxed text-[#a8a49e]"
            >
              100 years of creativity research says ideas aren&apos;t born&nbsp;&mdash;
              they&apos;re grown. IdeaFuel is the system that grows them.
            </motion.p>

            {/* Brand process */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex items-center gap-3"
            >
              {['Capture', 'Incubate', 'Crystallize'].map((step, i) => (
                <span key={step} className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-[2px] text-white">
                    {step}
                  </span>
                  {i < 2 && (
                    <span className="h-1 w-1 rounded-full bg-[#e32b1a]" />
                  )}
                </span>
              ))}
            </motion.div>

            {/* App Store Buttons */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
              <a
                href="#"
                className="group flex items-center gap-3 rounded-xl border border-[#333] bg-[#111] px-5 py-3 transition-all hover:border-[#e32b1a]/40 hover:bg-[#1a1a1a]"
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
                className="group flex items-center gap-3 rounded-xl border border-[#333] bg-[#111] px-5 py-3 transition-all hover:border-[#e32b1a]/40 hover:bg-[#1a1a1a]"
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

            {/* Subtext */}
            <motion.p
              variants={fadeUp}
              className="mt-4 text-sm text-[#6b6862]"
            >
              Free to capture ideas. Pay only when you validate.
            </motion.p>
          </motion.div>

          {/* Right: Phone Mockup */}
          <motion.div
            variants={phoneReveal}
            initial="hidden"
            animate="show"
            className="mx-auto hidden w-full max-w-[340px] lg:block"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <PhoneMockup />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
