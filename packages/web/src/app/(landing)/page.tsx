'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WaitlistForm } from './components/waitlist-form';
import { FlameHero } from './components/flame-hero';
import { PhoneMockup } from './components/phone-mockup';
import { ScrollingReportGrid } from './components/scrolling-report-grid';
import { ReportDashboard } from './components/report-dashboard';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ─── 1. Entrance animations (desktop, motion-ok) ───
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.from('[data-anim="subhead"]', {
          opacity: 0,
          y: 30,
          duration: 0.6,
          delay: 0.2,
        })
          .from(
            '[data-anim="headline"] > *',
            {
              opacity: 0,
              y: 40,
              duration: 0.7,
              stagger: 0.08,
            },
            '-=0.3'
          )
          .from(
            '[data-anim="body"]',
            {
              opacity: 0,
              y: 20,
              duration: 0.5,
            },
            '-=0.3'
          )
          .from(
            '[data-anim="form"]',
            {
              opacity: 0,
              y: 20,
              duration: 0.5,
            },
            '-=0.2'
          )
          .from(
            '[data-anim="subtext"]',
            {
              opacity: 0,
              duration: 0.4,
            },
            '-=0.2'
          )
          .from(
            '[data-anim="flame"]',
            {
              opacity: 0,
              x: 40,
              duration: 0.8,
              ease: 'power2.out',
            },
            '-=0.6'
          );
      });

      // ─── 2. Horizontal slide transition ───
      const panels = gsap.utils.toArray<HTMLElement>('[data-slide]');

      if (panels.length > 1) {
        const slideTl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-slides]',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            end: () => {
              const isMobile = window.innerWidth < 768;
              const base = isMobile ? window.innerHeight : window.innerWidth;
              const multiplier = isMobile ? 2.5 : 1.5;
              return `+=${base * (panels.length - 1) * multiplier}`;
            },
          },
        });

        // Timeline segments (4 slides):
        // 0.00 → 0.10 : Slide 1 → Slide 2 transition
        // 0.10 → 0.38 : Dwell on slide 2 (read content)
        // 0.38 → 0.48 : Slide 2 → Slide 3 transition
        // 0.48 → 0.68 : Dwell on slide 3
        // 0.68 → 0.78 : Slide 3 → Slide 4 transition
        // 0.78 → 1.00 : Dwell on slide 4

        // Slide 1 → 2
        slideTl.to(panels, {
          xPercent: -100,
          ease: 'none',
          duration: 0.10,
        }, 0);

        // Slide 2 → 3
        slideTl.to(panels, {
          xPercent: -200,
          ease: 'none',
          duration: 0.10,
        }, 0.38);

        // Slide 3 → 4
        slideTl.to(panels, {
          xPercent: -300,
          ease: 'none',
          duration: 0.10,
        }, 0.68);

        // Scale up the flame during the first transition
        slideTl.to('[data-anim="flame"]', {
          scale: 2.5,
          duration: 0.10,
          ease: 'power1.in',
        }, 0);

        // ─── 3. Slide 2 entrance animations ───
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.set(
            [
              '[data-anim="s2-headline"]',
              '[data-anim="s2-sub2"]',
              '[data-anim="s2-divider"]',
              '[data-anim="s2-title"]',
              '[data-anim="s2-body"]',
            ],
            { opacity: 0, y: 30 }
          );
          gsap.set('[data-anim="s2-phone"]', { opacity: 0, scale: 0.92, x: 40 });

          const s2Tl = gsap.timeline();
          s2Tl
            .to('[data-anim="s2-headline"]', { opacity: 1, y: 0, duration: 0.15 })
            .to('[data-anim="s2-phone"]', { opacity: 1, scale: 1, x: 0, duration: 0.25 }, 0.15)
            .to('[data-anim="s2-sub2"]', { opacity: 1, y: 0, duration: 0.15 }, 0.1)
            .to('[data-anim="s2-divider"]', { opacity: 1, y: 0, duration: 0.1 }, '-=0.05')
            .to('[data-anim="s2-title"]', { opacity: 1, y: 0, duration: 0.1 }, '-=0.03')
            .to('[data-anim="s2-body"]', { opacity: 1, y: 0, duration: 0.15 }, '-=0.05');

          // Animate in during the first transition (~5%)
          slideTl.add(s2Tl, 0.05);
        });

        // ─── 4. Slide 3 entrance animations ───
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.set(
            [
              '[data-anim="s3-headline"]',
              '[data-anim="s3-sub"]',
              '[data-anim="s3-divider"]',
              '[data-anim="s3-title"]',
              '[data-anim="s3-body"]',
            ],
            { opacity: 0, y: 30 }
          );
          gsap.set('[data-anim="s3-grid"]', { opacity: 0, x: 40 });

          const s3Tl = gsap.timeline();
          s3Tl
            .to('[data-anim="s3-headline"]', { opacity: 1, y: 0, duration: 0.15 })
            .to('[data-anim="s3-grid"]', { opacity: 1, x: 0, duration: 0.25 }, 0.1)
            .to('[data-anim="s3-sub"]', { opacity: 1, y: 0, duration: 0.15 }, 0.1)
            .to('[data-anim="s3-divider"]', { opacity: 1, y: 0, duration: 0.1 }, '-=0.05')
            .to('[data-anim="s3-title"]', { opacity: 1, y: 0, duration: 0.1 }, '-=0.03')
            .to('[data-anim="s3-body"]', { opacity: 1, y: 0, duration: 0.15 }, '-=0.05');

          // Animate in during the second transition (~40%)
          slideTl.add(s3Tl, 0.40);
        });

        // ─── 5. Slide 4 entrance animations ───
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.set(
            [
              '[data-anim="s4-sub"]',
              '[data-anim="s4-headline"]',
              '[data-anim="s4-divider"]',
              '[data-anim="s4-title"]',
              '[data-anim="s4-body"]',
            ],
            { opacity: 0, y: 30 }
          );
          gsap.set('[data-anim="s4-dashboard"]', { opacity: 0, scale: 0.95, x: 40 });

          const s4Tl = gsap.timeline();
          s4Tl
            .to('[data-anim="s4-sub"]', { opacity: 1, y: 0, duration: 0.15 })
            .to('[data-anim="s4-headline"]', { opacity: 1, y: 0, duration: 0.15 }, 0.05)
            .to('[data-anim="s4-dashboard"]', { opacity: 1, scale: 1, x: 0, duration: 0.25 }, 0.1)
            .to('[data-anim="s4-divider"]', { opacity: 1, y: 0, duration: 0.1 }, '-=0.05')
            .to('[data-anim="s4-title"]', { opacity: 1, y: 0, duration: 0.1 }, '-=0.03')
            .to('[data-anim="s4-body"]', { opacity: 1, y: 0, duration: 0.15 }, '-=0.05');

          // Animate in during the third transition (~70%)
          slideTl.add(s4Tl, 0.70);
        });
      }

      return () => {
        mm.revert();
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef}>
      {/* Pinned slides container */}
      <div data-slides className="relative flex overflow-hidden">
        {/* ─── Slide 1: Hero ─── */}
        <section data-slide className="slide pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-start gap-12 px-6 pt-8 md:items-center md:pt-0 lg:gap-20 lg:px-20">
            {/* Left Column: Text + Form */}
            <div className="flex-1">
              {/* Subheading */}
              <p
                data-anim="subhead"
                className="font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
              >
                stop guessing.{' '}
                <span className="text-[#e32b1a]">start building.</span>
              </p>

              {/* Headline */}
              <h1
                data-anim="headline"
                className="mt-6 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#bcbcbc] sm:text-7xl lg:text-[96px]"
              >
                <span className="block">You&apos;ve been</span>
                <span className="block">thinking about</span>
                <span className="block">
                  this idea{' '}
                  <span className="text-gradient-brand">for months.</span>
                </span>
              </h1>

              {/* Body paragraph */}
              <p
                data-anim="body"
                className="mt-10 max-w-[631px] text-sm leading-[27px] text-[#d4d4d4] sm:text-base"
              >
                It&apos;s 2 AM. You&apos;ve got 47 tabs open, a notes app full of
                half-thoughts, and zero clarity on whether this thing is real.{' '}
                <span className="text-gradient-brand font-extrabold">
                  IDEA FUEL
                </span>{' '}
                <span className="font-extrabold">replaces the chaos</span> with
                structured interviews, real research, and numerous comprehensive
                reports you can put to use immediately.
              </p>

              {/* Waitlist form */}
              <div data-anim="form" className="mt-8 max-w-[448px]">
                <WaitlistForm />
              </div>

              {/* Subtext */}
              <p
                data-anim="subtext"
                className="mt-4 text-sm text-[#928e87]"
              >
                Get early access + exclusive insights. No spam.
              </p>
            </div>

            {/* Right Column: Flame Graphic */}
            <div
              data-anim="flame"
              className="hidden flex-shrink-0 lg:block"
              style={{ width: '35%' }}
            >
              <FlameHero className="mx-auto h-auto max-h-[500px] w-full max-w-[400px]" />
            </div>
          </div>
        </section>

        {/* ─── Slide 2: Capture Your Idea ─── */}
        <section data-slide className="slide bg-[#161513] pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-center gap-12 px-6 lg:gap-20 lg:px-20">
            {/* Left Column: Text */}
            <div className="flex-1">
              {/* Headline — CAPTURE / YOUR IDEA */}
              <h2
                data-anim="s2-headline"
                className="font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#d4d4d4] sm:text-7xl lg:text-[96px]"
              >
                <span className="block">capture</span>
                <span className="block text-gradient-brand">your idea</span>
              </h2>

              {/* Sub-subheading */}
              <p
                data-anim="s2-sub2"
                className="mt-4 font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
              >
                on our mobile or web app
              </p>

              {/* Decorative divider */}
              <div data-anim="s2-divider" className="mt-8 flex max-w-[380px] items-center">
                <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
                <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
              </div>

              {/* Section title */}
              <h3
                data-anim="s2-title"
                className="mt-10 font-sans text-sm font-bold uppercase tracking-[2px] text-[#e32b1a]"
              >
                The Highway Moment
              </h3>

              {/* Body copy */}
              <div data-anim="s2-body" className="mt-4 max-w-[560px] space-y-5 text-sm leading-[27px] text-[#d4d4d4] sm:text-base">
                <p>
                  You&apos;re three hours into a family road trip. The kids are
                  finally quiet. A podcast sparks something &mdash; two problems
                  you&apos;ve been chewing on suddenly connect.
                </p>
                <p>
                  Normally, this is where the idea dies. You tell yourself
                  you&apos;ll remember it.{' '}
                  <span className="font-extrabold text-[#e32b1a]">
                    You won&apos;t.
                  </span>
                </p>
                <p>
                  Instead, you tap Idea Fuel, hit voice capture, and talk for 90
                  seconds &mdash; raw, unfiltered, half-formed. When the house is
                  quiet tonight, your idea is there. Structured, waiting, and
                  ready for what comes next.
                </p>
              </div>
            </div>

            {/* Right Column: Phone mockup */}
            <div
              data-anim="s2-phone"
              className="hidden flex-shrink-0 lg:flex lg:items-center lg:justify-start"
              style={{ width: '35%' }}
            >
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* ─── Slide 3: Research & Validate ─── */}
        <section data-slide className="slide bg-[#161513] pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-center gap-12 px-6 lg:gap-20 lg:px-20">
            {/* Left Column: Text */}
            <div className="flex-1">
              {/* Headline — RESEARCH & VALIDATE */}
              <p
                data-anim="s3-sub"
                className="font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
              >
                use idea fuel to
              </p>
              <h2
                data-anim="s3-headline"
                className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#d4d4d4] sm:text-7xl lg:text-[96px]"
              >
                <span className="block">research</span>
                <span className="block text-gradient-brand">&amp; validate</span>
              </h2>

              {/* Decorative divider */}
              <div data-anim="s3-divider" className="mt-8 flex max-w-[380px] items-center">
                <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
                <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
              </div>

              {/* Section title */}
              <h3
                data-anim="s3-title"
                className="mt-10 font-sans text-sm font-bold uppercase tracking-[2px] text-[#e32b1a]"
              >
                Deep Research
              </h3>

              {/* Body copy */}
              <div data-anim="s3-body" className="mt-4 max-w-[560px] space-y-5 text-sm leading-[27px] text-[#d4d4d4] sm:text-base">
                <p>
                  No more midnight Google rabbit holes. We built a custom research
                  pipeline that starts with a thorough interview about your idea,
                  then does the work most founders skip &mdash; competitor
                  positioning, pricing evidence, customer pain clusters, and market
                  sizing.
                </p>
                <p>
                  Everything comes back sourced, timestamped, and ready to defend.
                </p>
              </div>
            </div>

            {/* Right Column: Scrolling report cards */}
            <div
              data-anim="s3-grid"
              className="hidden flex-shrink-0 overflow-hidden lg:block"
              style={{ width: '45%', height: 'calc(100vh - 88px)' }}
            >
              <ScrollingReportGrid className="h-full" />
            </div>
          </div>
        </section>

        {/* ─── Slide 4: Your Report ─── */}
        <section data-slide className="slide bg-[#161513] pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-center gap-12 px-6 lg:gap-20 lg:px-20">
            {/* Left Column: Text */}
            <div className="flex-1">
              <p
                data-anim="s4-sub"
                className="font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
              >
                what you get
              </p>
              <h2
                data-anim="s4-headline"
                className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#d4d4d4] sm:text-7xl lg:text-[96px]"
              >
                <span className="block">your full</span>
                <span className="block text-gradient-brand">report</span>
              </h2>

              {/* Decorative divider */}
              <div data-anim="s4-divider" className="mt-8 flex max-w-[380px] items-center">
                <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
                <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
              </div>

              {/* Section title */}
              <h3
                data-anim="s4-title"
                className="mt-10 font-sans text-sm font-bold uppercase tracking-[2px] text-[#e32b1a]"
              >
                15+ Report Sections
              </h3>

              {/* Body copy */}
              <div data-anim="s4-body" className="mt-4 max-w-[560px] space-y-5 text-sm leading-[27px] text-[#d4d4d4] sm:text-base">
                <p>
                  Scores, market sizing, competitor landscapes, positioning
                  strategy, timing catalysts, and pricing tiers &mdash; all
                  generated from your interview and deep research pipeline.
                </p>
                <p>
                  Every section is backed by real data, sourced evidence,
                  and actionable next steps you can execute{' '}
                  <span className="font-extrabold text-[#e32b1a]">today.</span>
                </p>
              </div>
            </div>

            {/* Right Column: Report Dashboard */}
            <div
              data-anim="s4-dashboard"
              className="hidden flex-shrink-0 lg:block"
              style={{ width: '45%' }}
            >
              <ReportDashboard />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
