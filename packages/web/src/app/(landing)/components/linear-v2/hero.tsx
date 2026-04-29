'use client';

import { Fragment } from 'react';
import { HeroDashboard } from './hero-dashboard';
import { WaitlistFormHero } from './waitlist-form-hero';

const titleWords = ['Stop', 'waiting', 'for', 'lightning.', 'Start', 'building', 'the', 'storm.'];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-[180px]">
      {/* Background glows */}
      <div
        className="pointer-events-none fixed left-[-12%] top-[15%] h-[600px] w-[600px] rounded-full opacity-[0.06] blur-[150px]"
        style={{ background: '#E32B1A' }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed right-[-12%] top-[50%] h-[600px] w-[600px] rounded-full opacity-[0.06] blur-[150px]"
        style={{ background: '#DB4D40' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1200px] px-6 text-center">
        {/* Badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 pl-2 text-[13px]"
          style={{
            borderColor: 'rgba(227,43,26,0.2)',
            background: 'rgba(227,43,26,0.06)',
            color: '#DB4D40',
          }}
        >
          <span
            className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: '#E32B1A' }}
          />
          Capture → Validate in one workflow
        </div>

        {/* Headline */}
        <h1
          className="mb-7 font-semibold leading-[1.05] tracking-[-0.045em] text-white"
          style={{ fontSize: 'clamp(2.75rem, 6.5vw, 4.75rem)' }}
        >
          {titleWords.map((word, i) => {
            const isStorm = word === 'storm.';
            const isLightning = word === 'lightning.';
            const isLast = i === titleWords.length - 1;
            return (
              <Fragment key={i}>
                <span
                  className={isStorm ? 'hero-word text-gradient-brand' : 'hero-word'}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                >
                  {word}
                </span>
                {isLightning ? <br /> : !isLast ? ' ' : null}
              </Fragment>
            );
          })}
        </h1>

        {/* Subtitle */}
        <p
          className="mx-auto mb-5 max-w-[620px] leading-[1.65]"
          style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.3rem)',
            color: '#A8A8A6',
            opacity: 0,
            filter: 'blur(8px)',
            transform: 'translateY(16%)',
            animation: 'blurIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.7s forwards',
          }}
        >
          Capture raw thoughts by voice or text, let AI cluster and connect them, then crystallize
          the best ones into validated business concepts &mdash; deep research, business plan, and
          financial model included.
        </p>

        <p
          className="mb-10 text-[13px]"
          style={{
            color: '#6B6B69',
            opacity: 0,
            filter: 'blur(8px)',
            transform: 'translateY(16%)',
            animation: 'blurIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.85s forwards',
          }}
        >
          One workflow: <span style={{ color: '#A8A8A6' }}>Capture · Incubate · Synthesize · Crystallize · Validate</span>
        </p>

        {/* CTAs */}
        <div
          className="mb-4 flex flex-wrap items-center justify-center gap-3"
          style={{
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'blurIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1s forwards',
          }}
        >
          <WaitlistFormHero />
          <a
            href="#capture"
            className="inline-flex h-[52px] items-center justify-center rounded-full border px-7 text-[15px] font-medium text-white transition-all hover:bg-[#222222] active:scale-[0.97]"
            style={{
              background: '#1A1A1A',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            See how it works
          </a>
        </div>
        <p
          className="mb-20 text-[12px]"
          style={{
            color: '#3D3D3B',
            opacity: 0,
            animation: 'blurIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1.15s forwards',
          }}
        >
          Free to start &middot; No credit card required
        </p>

        {/* Dashboard mockup */}
        <div className="relative mx-auto max-w-[1100px]">
          <div className="illus-container">
            <div className="illus-panel" style={{ height: '620px' }}>
              <div className="grain-inner" />
              <div className="illus-glow illus-glow-tl" />
              <HeroDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
