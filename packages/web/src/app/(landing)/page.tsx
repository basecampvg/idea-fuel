'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WaitlistForm } from './components/waitlist-form';
import { FlameHero } from './components/flame-hero';
import { PhoneMockup } from './components/phone-mockup';
import { ScrollingReportGrid } from './components/scrolling-report-grid';
import { ReportDashboard } from './components/report-dashboard';
import { PricingSection } from './components/pricing-section';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ─── 1. Entrance animations for slide 1 (all sizes) ───
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
          )
          .from(
            '[data-anim="indicator"]',
            {
              opacity: 0,
              y: 10,
              duration: 0.5,
            },
            '-=0.3'
          );
      });

      // ─── 2. Desktop: horizontal slide transitions (4 main panels) ───
      mm.add('(min-width: 1024px)', () => {
        const panels = gsap.utils.toArray<HTMLElement>(
          '[data-slide]:not([data-mobile-only])'
        );
        if (panels.length <= 1) return;

        const slideTl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-slides]',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            end: () =>
              `+=${window.innerWidth * (panels.length - 1) * 1.5}`,
            onUpdate: (self) => {
              if (!counterRef.current || !arrowRef.current) return;
              const p = self.progress;
              const slide = p < 0.10 ? 1 : p < 0.48 ? 2 : p < 0.78 ? 3 : 4;
              counterRef.current.textContent = `${slide} / 4`;
              arrowRef.current.style.opacity = p > 0.02 ? '0' : '1';
            },
            onLeave: () => {
              if (indicatorRef.current) gsap.to(indicatorRef.current, { opacity: 0, duration: 0.3 });
            },
            onEnterBack: () => {
              if (indicatorRef.current) gsap.to(indicatorRef.current, { opacity: 1, duration: 0.3 });
            },
          },
        });

        // Desktop timeline (4 slides):
        // 0.00 → 0.10 : Slide 1 → Slide 2
        // 0.10 → 0.38 : Dwell on slide 2
        // 0.38 → 0.48 : Slide 2 → Slide 3
        // 0.48 → 0.68 : Dwell on slide 3
        // 0.68 → 0.78 : Slide 3 → Slide 4
        // 0.78 → 1.00 : Dwell on slide 4

        slideTl.to(panels, { xPercent: -100, ease: 'none', duration: 0.10 }, 0);
        slideTl.to(panels, { xPercent: -200, ease: 'none', duration: 0.10 }, 0.38);
        slideTl.to(panels, { xPercent: -300, ease: 'none', duration: 0.10 }, 0.68);

        // Scale flame during first transition
        slideTl.to('[data-anim="flame"]', {
          scale: 2.5,
          duration: 0.10,
          ease: 'power1.in',
        }, 0);

        // ── Desktop entrance animations ──
        const motionOk = window.matchMedia(
          '(prefers-reduced-motion: no-preference)'
        ).matches;

        if (motionOk) {
          // Slide 2 entrance
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
            .to('[data-anim="s2-headline"]', { opacity: 1, y: 0, duration: 0.08 }, 0)
            .to('[data-anim="s2-phone"]', { opacity: 1, scale: 1, x: 0, duration: 0.15 }, 0.02)
            .to('[data-anim="s2-sub2"]', { opacity: 1, y: 0, duration: 0.08 }, 0.02)
            .to('[data-anim="s2-divider"]', { opacity: 1, y: 0, duration: 0.05 }, 0.07)
            .to('[data-anim="s2-title"]', { opacity: 1, y: 0, duration: 0.05 }, 0.10)
            .to('[data-anim="s2-body"]', { opacity: 1, y: 0, duration: 0.08 }, 0.12);
          slideTl.add(s2Tl, 0.05);

          // Slide 3 entrance
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
            .to('[data-anim="s3-headline"]', { opacity: 1, y: 0, duration: 0.08 }, 0)
            .to('[data-anim="s3-grid"]', { opacity: 1, x: 0, duration: 0.15 }, 0.02)
            .to('[data-anim="s3-sub"]', { opacity: 1, y: 0, duration: 0.08 }, 0.02)
            .to('[data-anim="s3-divider"]', { opacity: 1, y: 0, duration: 0.05 }, 0.07)
            .to('[data-anim="s3-title"]', { opacity: 1, y: 0, duration: 0.05 }, 0.10)
            .to('[data-anim="s3-body"]', { opacity: 1, y: 0, duration: 0.08 }, 0.12);
          slideTl.add(s3Tl, 0.40);

          // Slide 4 entrance
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
            .to('[data-anim="s4-sub"]', { opacity: 1, y: 0, duration: 0.08 }, 0)
            .to('[data-anim="s4-headline"]', { opacity: 1, y: 0, duration: 0.08 }, 0.02)
            .to('[data-anim="s4-dashboard"]', { opacity: 1, scale: 1, x: 0, duration: 0.15 }, 0.02)
            .to('[data-anim="s4-divider"]', { opacity: 1, y: 0, duration: 0.05 }, 0.07)
            .to('[data-anim="s4-title"]', { opacity: 1, y: 0, duration: 0.05 }, 0.10)
            .to('[data-anim="s4-body"]', { opacity: 1, y: 0, duration: 0.08 }, 0.12);
          slideTl.add(s4Tl, 0.70);
        }
      });

      // ─── 3. Mobile/Tablet: horizontal slide transitions (7 panels) ───
      mm.add('(max-width: 1023px)', () => {
        const panels = gsap.utils.toArray<HTMLElement>('[data-slide]');
        if (panels.length <= 1) return;

        const slideTl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-slides]',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            end: () =>
              `+=${window.innerHeight * (panels.length - 1)}`,
            onUpdate: (self) => {
              if (!counterRef.current || !arrowRef.current) return;
              const p = self.progress;
              const slide = p < 0.07 ? 1 : p < 0.41 ? 2 : p < 0.75 ? 3 : 4;
              counterRef.current.textContent = `${slide} / 4`;
              arrowRef.current.style.opacity = p > 0.02 ? '0' : '1';
            },
            onLeave: () => {
              if (indicatorRef.current) gsap.to(indicatorRef.current, { opacity: 0, duration: 0.3 });
            },
            onEnterBack: () => {
              if (indicatorRef.current) gsap.to(indicatorRef.current, { opacity: 1, duration: 0.3 });
            },
          },
        });

        // Mobile timeline (7 slides):
        // Hero → Capture text → Phone → Research text → Grid → Report text → Dashboard
        //
        // 0.00 → 0.07 : Hero → Capture text
        // 0.07 → 0.17 : Dwell (read capture text)
        // 0.17 → 0.24 : Capture text → Phone
        // 0.24 → 0.34 : Dwell (view phone)
        // 0.34 → 0.41 : Phone → Research text
        // 0.41 → 0.51 : Dwell (read research text)
        // 0.51 → 0.58 : Research text → Grid
        // 0.58 → 0.68 : Dwell (view grid)
        // 0.68 → 0.75 : Grid → Report text
        // 0.75 → 0.85 : Dwell (read report text)
        // 0.85 → 0.92 : Report text → Dashboard
        // 0.92 → 1.00 : Dwell (view dashboard)

        const t = 0.07; // transition duration

        slideTl.to(panels, { xPercent: -100, ease: 'none', duration: t }, 0);
        slideTl.to(panels, { xPercent: -200, ease: 'none', duration: t }, 0.17);
        slideTl.to(panels, { xPercent: -300, ease: 'none', duration: t }, 0.34);
        slideTl.to(panels, { xPercent: -400, ease: 'none', duration: t }, 0.51);
        slideTl.to(panels, { xPercent: -500, ease: 'none', duration: t }, 0.68);
        slideTl.to(panels, { xPercent: -600, ease: 'none', duration: t }, 0.85);

        // Scale flame during first transition
        slideTl.to('[data-anim="flame"]', {
          scale: 2.5,
          duration: t,
          ease: 'power1.in',
        }, 0);

        // ── Mobile entrance animations ──
        const motionOk = window.matchMedia(
          '(prefers-reduced-motion: no-preference)'
        ).matches;

        if (motionOk) {
          // Slide 2: Capture text entrance (~0.03)
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

          const s2Tl = gsap.timeline();
          s2Tl
            .to('[data-anim="s2-headline"]', { opacity: 1, y: 0, duration: 0.04 }, 0)
            .to('[data-anim="s2-sub2"]', { opacity: 1, y: 0, duration: 0.04 }, 0.01)
            .to('[data-anim="s2-divider"]', { opacity: 1, y: 0, duration: 0.03 }, 0.03)
            .to('[data-anim="s2-title"]', { opacity: 1, y: 0, duration: 0.03 }, 0.05)
            .to('[data-anim="s2-body"]', { opacity: 1, y: 0, duration: 0.04 }, 0.06);
          slideTl.add(s2Tl, 0.03);

          // Slide 2b: Phone entrance (~0.19)
          gsap.set('[data-anim="s2b-phone"]', { opacity: 0, scale: 0.9, y: 30 });

          const s2bTl = gsap.timeline();
          s2bTl.to('[data-anim="s2b-phone"]', {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
          slideTl.add(s2bTl, 0.19);

          // Slide 3: Research text entrance (~0.36)
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

          const s3Tl = gsap.timeline();
          s3Tl
            .to('[data-anim="s3-headline"]', { opacity: 1, y: 0, duration: 0.04 }, 0)
            .to('[data-anim="s3-sub"]', { opacity: 1, y: 0, duration: 0.04 }, 0.01)
            .to('[data-anim="s3-divider"]', { opacity: 1, y: 0, duration: 0.03 }, 0.03)
            .to('[data-anim="s3-title"]', { opacity: 1, y: 0, duration: 0.03 }, 0.05)
            .to('[data-anim="s3-body"]', { opacity: 1, y: 0, duration: 0.04 }, 0.06);
          slideTl.add(s3Tl, 0.36);

          // Slide 3b: Grid entrance (~0.53)
          gsap.set('[data-anim="s3b-grid"]', { opacity: 0, y: 30 });

          const s3bTl = gsap.timeline();
          s3bTl.to('[data-anim="s3b-grid"]', {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
          slideTl.add(s3bTl, 0.53);

          // Slide 4: Report text entrance (~0.70)
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

          const s4Tl = gsap.timeline();
          s4Tl
            .to('[data-anim="s4-sub"]', { opacity: 1, y: 0, duration: 0.04 }, 0)
            .to('[data-anim="s4-headline"]', { opacity: 1, y: 0, duration: 0.04 }, 0.01)
            .to('[data-anim="s4-divider"]', { opacity: 1, y: 0, duration: 0.03 }, 0.03)
            .to('[data-anim="s4-title"]', { opacity: 1, y: 0, duration: 0.03 }, 0.05)
            .to('[data-anim="s4-body"]', { opacity: 1, y: 0, duration: 0.04 }, 0.06);
          slideTl.add(s4Tl, 0.70);

          // Slide 4b: Dashboard entrance (~0.87)
          gsap.set('[data-anim="s4b-dashboard"]', { opacity: 0, scale: 0.95, y: 30 });

          const s4bTl = gsap.timeline();
          s4bTl.to('[data-anim="s4b-dashboard"]', {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
          slideTl.add(s4bTl, 0.87);
        }
      });

      return () => {
        mm.revert();
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    },
    { scope: containerRef }
  );

  // Intercept #how-it-works clicks — native anchor scroll breaks inside pinned containers
  useEffect(() => {
    function handleHashClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a[href="#how-it-works"]');
      if (!anchor) return;
      e.preventDefault();

      const slidesTrigger = ScrollTrigger.getAll().find((st) => st.pin);
      if (slidesTrigger) {
        const { start, end } = slidesTrigger;
        // Desktop: slide 2 dwells at progress ~0.12, Mobile: ~0.09
        const isDesktop = window.innerWidth >= 1024;
        const progress = isDesktop ? 0.12 : 0.09;
        const targetScroll = start + (end - start) * progress;
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }

    document.addEventListener('click', handleHashClick);
    return () => document.removeEventListener('click', handleHashClick);
  }, []);

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

            {/* Right Column: Flame Graphic (desktop only) */}
            <div
              data-anim="flame"
              className="hidden flex-shrink-0 lg:block"
              style={{ width: '35%' }}
            >
              <FlameHero className="mx-auto h-auto max-h-[500px] w-full max-w-[400px]" />
            </div>
          </div>
        </section>

        {/* ─── Slide 2: Capture Your Idea (text) ─── */}
        <section data-slide className="slide bg-[#161513] pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-center gap-12 px-6 lg:gap-20 lg:px-20">
            {/* Left Column: Text */}
            <div className="flex-1">
              <h2
                data-anim="s2-headline"
                className="font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#d4d4d4] sm:text-7xl lg:text-[96px]"
              >
                <span className="block">capture</span>
                <span className="block text-gradient-brand">your idea</span>
              </h2>

              <p
                data-anim="s2-sub2"
                className="mt-4 font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
              >
                on our mobile or web app
              </p>

              <div data-anim="s2-divider" className="mt-8 flex max-w-[380px] items-center">
                <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
                <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
              </div>

              <h3
                data-anim="s2-title"
                className="mt-10 font-sans text-sm font-bold uppercase tracking-[2px] text-[#e32b1a]"
              >
                The Highway Moment
              </h3>

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

            {/* Right Column: Phone mockup (desktop only) */}
            <div
              data-anim="s2-phone"
              className="hidden flex-shrink-0 lg:flex lg:items-center lg:justify-start"
              style={{ width: '35%' }}
            >
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* ─── Slide 2b: Phone Mockup (mobile/tablet only) ─── */}
        <section data-slide data-mobile-only className="slide bg-[#161513] pt-[88px] lg:hidden">
          <div className="flex h-[calc(100vh-88px)] w-full items-center justify-center px-6">
            <div data-anim="s2b-phone" className="w-full max-w-[320px]">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* ─── Slide 3: Research & Validate (text) ─── */}
        <section data-slide className="slide bg-[#161513] pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-center gap-12 px-6 lg:gap-20 lg:px-20">
            {/* Left Column: Text */}
            <div className="flex-1">
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

              <div data-anim="s3-divider" className="mt-8 flex max-w-[380px] items-center">
                <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
                <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
              </div>

              <h3
                data-anim="s3-title"
                className="mt-10 font-sans text-sm font-bold uppercase tracking-[2px] text-[#e32b1a]"
              >
                Deep Research
              </h3>

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

            {/* Right Column: Scrolling report cards (desktop only) */}
            <div
              data-anim="s3-grid"
              className="hidden flex-shrink-0 overflow-hidden lg:block"
              style={{ width: '45%', height: 'calc(100vh - 88px)' }}
            >
              <ScrollingReportGrid className="h-full" />
            </div>
          </div>
        </section>

        {/* ─── Slide 3b: Scrolling Report Grid (mobile/tablet only) ─── */}
        <section data-slide data-mobile-only className="slide bg-[#161513] pt-[88px] lg:hidden">
          <div className="flex h-[calc(100vh-88px)] w-full items-center justify-center overflow-hidden px-3">
            <div data-anim="s3b-grid" className="h-[70vh] w-full">
              <ScrollingReportGrid className="h-full" />
            </div>
          </div>
        </section>

        {/* ─── Slide 4: Your Report (text) ─── */}
        <section data-slide className="slide bg-[#161513] pt-[88px]">
          <div className="mx-auto flex h-[calc(100vh-88px)] w-full max-w-[1800px] items-center px-6 lg:px-20">
            {/* Left Column: Text (narrow) */}
            <div className="w-full shrink-0 lg:w-[30%]">
              <p
                data-anim="s4-sub"
                className="font-mono text-base font-light uppercase tracking-[3px] text-[#d4d4d4] sm:text-xl"
              >
                what you get
              </p>
              <h2
                data-anim="s4-headline"
                className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-1.5px] text-[#d4d4d4] sm:text-7xl lg:text-[80px]"
              >
                <span className="block">your full</span>
                <span className="block text-gradient-brand">report</span>
              </h2>

              <div data-anim="s4-divider" className="mt-8 flex max-w-[320px] items-center">
                <div className="h-[2px] flex-1 bg-[#d4d4d4]" />
                <div className="ml-1 h-[10px] w-[10px] rounded-full bg-[#e32b1a]" />
              </div>

              <h3
                data-anim="s4-title"
                className="mt-10 font-sans text-sm font-bold uppercase tracking-[2px] text-[#e32b1a]"
              >
                15+ Report Sections
              </h3>

              <div data-anim="s4-body" className="mt-4 max-w-[420px] space-y-5 text-sm leading-[27px] text-[#d4d4d4] sm:text-base">
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

            {/* Vertical Divider (desktop only) */}
            <div className="mx-8 hidden h-[70vh] w-px bg-gradient-to-b from-transparent via-[#2a2a2a] to-transparent lg:block" />

            {/* Right Column: Report Dashboard (desktop only) */}
            <div
              data-anim="s4-dashboard"
              className="hidden min-w-0 flex-1 lg:block"
              style={{ height: 'calc(100vh - 160px)' }}
            >
              <ReportDashboard />
            </div>
          </div>
        </section>

        {/* ─── Slide 4b: Report Dashboard (mobile/tablet only) ─── */}
        <section data-slide data-mobile-only className="slide bg-[#161513] pt-[88px] lg:hidden">
          <div className="flex h-[calc(100vh-88px)] w-full items-center justify-center overflow-hidden px-3">
            <div
              data-anim="s4b-dashboard"
              className="w-full max-w-[480px] rounded-xl border border-[#2a2a2a] bg-[#0e0d0c]"
              style={{ height: 'calc(100vh - 120px)' }}
            >
              <ReportDashboard />
            </div>
          </div>
        </section>
      </div>

      {/* ─── Section 5: Pricing (hidden for now) ─── */}
      {/* <PricingSection /> */}

      {/* ─── Slide Indicator (fixed overlay) ─── */}
      <div
        ref={indicatorRef}
        data-anim="indicator"
        className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2"
        aria-hidden="true"
      >
        {/* Bounce arrow */}
        <div ref={arrowRef} className="animate-bounce-arrow transition-opacity duration-300">
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-[#928e87]">
            <path
              d="M4 7l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* Counter */}
        <span
          ref={counterRef}
          className="font-mono text-[11px] tracking-[3px] text-[#928e87]"
        >
          1 / 4
        </span>
      </div>
    </div>
  );
}
