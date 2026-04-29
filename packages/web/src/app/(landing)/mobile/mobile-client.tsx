'use client';

import { Fragment } from 'react';
import { CaptureThreadIllustration } from '../components/linear-v2/illustrations/capture-thread';
import { ThoughtsStreamMobileIllustration } from '../components/linear-v2/illustrations/thoughts-stream-mobile';
import { ClusterMobileIllustration } from '../components/linear-v2/illustrations/cluster-mobile';
import { ValidationReportMobileIllustration } from '../components/linear-v2/illustrations/validation-report-mobile';
import { TalkToCustomersMobileIllustration } from '../components/linear-v2/illustrations/talk-to-customers-mobile';

const titleWords = ['Ideas', 'don’t', 'wait', 'for', 'your', 'desk.'];

export function MobilePageClient() {
  return (
    <>
      <div className="page-grain" />
      <Hero />
      <Separator />
      <WhyMobile />
      <Separator />
      <FeatureSection
        eyebrow="01 · Capture"
        title={<>Think it. Tap it.<br />It&apos;s saved.</>}
        description="Pull the phone out, tap the mic, talk it out. The transcript lands in your stream while you keep driving. No keyboard, no friction, no losing it because you didn't have a pen."
        bullets={[
          'Voice memos with on-device transcription',
          'One-tap quick notes & sketches',
          'Auto-tagging and capture streaks to build the habit',
          'Works offline. Syncs the second you reconnect.',
        ]}
        illustration={<CaptureThreadIllustration />}
      />
      <Separator />
      <FeatureSection
        eyebrow="02 · Resurface"
        title={<>Your old thoughts<br />come back to find you.</>}
        description="The Thoughts tab streams everything you've captured, sorted by what your brain seems to keep returning to. Daily resurfacing brings ideas back 24–48 hours after capture, when your subconscious has had time to chew on them."
        bullets={[
          'Stream view: every thought, sorted by recency or heat',
          'Cluster view: see what themes you keep circling',
          'Daily resurfacing notifications',
          'Decay timers flag thoughts you’ve stopped engaging with',
        ]}
        illustration={<ThoughtsStreamMobileIllustration />}
        reverse
      />
      <Separator />
      <FeatureSection
        eyebrow="03 · Cluster"
        title={<>Scattered notes,<br />grouped into themes.</>}
        description="The Cluster tab is where AI takes the chaos in your stream and groups related thoughts into themes you can name. The connections you'd never spot scrolling a notes app become visible in seconds."
        bullets={[
          'AI suggests clusters as you capture',
          'Manual grouping when you know what you’re seeing',
          'Cross-cluster collisions surface unexpected ideas',
          'Each cluster becomes a candidate for crystallization',
        ]}
        illustration={<ClusterMobileIllustration />}
      />
      <Separator />
      <FeatureSection
        eyebrow="04 · Crystallize & Validate"
        title={<>From thought<br />to validated business<br />on the same device.</>}
        description="A 10-minute Spark interview validates the strongest clusters into a full report: verdict, problem severity, market signal, and TAM. Then turn it into a customer interview anyone can fill out, gated however you want."
        bullets={[
          'Validation report with verdict, severity, market signal, TAM',
          'Talk to customers: AI-generated discovery questions in seconds',
          'Gated sharing: Public, Password, or NDA',
          'Deep research, business plan, financial model. All on mobile.',
        ]}
        illustration={<DualPhoneShowcase />}
        reverse
      />
      <Separator />
      <DoesntStopHere />
      <CtaSection />
    </>
  );
}

function DualPhoneShowcase() {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ minHeight: 720, gap: 18 }}
    >
      <div style={{ transform: 'translateY(-12px)' }}>
        <ValidationReportMobileIllustration width={235} />
      </div>
      <div style={{ transform: 'translateY(12px)' }}>
        <TalkToCustomersMobileIllustration width={235} />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-[180px]">
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
          IdeaFuel for iOS &middot; iPhone &amp; iPad
        </div>

        <h1
          className="mb-7 font-semibold leading-[1.05] tracking-[-0.045em] text-white"
          style={{ fontSize: 'clamp(2.75rem, 6.5vw, 4.75rem)' }}
        >
          {titleWords.map((word, i) => {
            const isLast = i === titleWords.length - 1;
            const isDesk = word === 'desk.';
            return (
              <Fragment key={i}>
                <span
                  className={isDesk ? 'hero-word text-gradient-brand' : 'hero-word'}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                >
                  {word}
                </span>
                {!isLast ? ' ' : null}
              </Fragment>
            );
          })}
        </h1>

        <p
          className="mx-auto mb-10 max-w-[640px] leading-[1.65]"
          style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.3rem)',
            color: '#A8A8A6',
            opacity: 0,
            filter: 'blur(8px)',
            transform: 'translateY(16%)',
            animation: 'blurIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.7s forwards',
          }}
        >
          Most great ideas show up in the car, on the trail, in the shower. We built a mobile app
          for that exact moment, and the entire pipeline that comes after it.
        </p>

        <div
          className="mb-4 flex flex-wrap items-center justify-center gap-3"
          style={{
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'blurIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1s forwards',
          }}
        >
          <a
            href="#capture"
            className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:brightness-[1.15] active:scale-[0.97]"
            style={{ background: '#E32B1A' }}
          >
            See it in action
          </a>
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-[#222222] active:scale-[0.97]"
            style={{
              background: '#1A1A1A',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            Download on iOS
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
          Free to start &middot; iPhone &amp; iPad &middot; Android coming soon
        </p>

        {/* Hero phone mockup */}
        <div className="relative mx-auto max-w-[1100px]">
          <div className="illus-container">
            <div className="illus-panel" style={{ height: 620 }}>
              <div className="grain-inner" />
              <div className="illus-glow illus-glow-tl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <CaptureThreadIllustration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyMobile() {
  return (
    <section className="px-6 py-20 text-center">
      <div className="mx-auto max-w-[760px]">
        <div
          className="mb-6 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: '#DB4D40' }}
        >
          Why mobile first
        </div>

        <h2
          className="mb-5 font-medium leading-[1.3] tracking-[-0.025em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          Ideas don&apos;t land in meeting rooms.<br />
          They land between meetings.
        </h2>

        <p className="mb-4 leading-[1.7]" style={{ fontSize: '1.0625rem', color: '#A8A8A6' }}>
          The walk to the coffee shop. The drive home. The five minutes before bed. That&apos;s
          where the connections happen, and that&apos;s exactly when desktop tools fail you.
          A keyboard takes too long. A notes app loses the context. By the time you&apos;ve typed
          it, the spark is gone.
        </p>
        <p className="mb-4 leading-[1.7]" style={{ fontSize: '1.0625rem', color: '#A8A8A6' }}>
          IdeaFuel mobile was designed for that exact moment.{' '}
          <strong className="text-white font-medium">
            Pull it out. Speak. Move on.
          </strong>{' '}
          The thought is captured, transcribed, tagged, and waiting for you when you sit down to
          think about it.
        </p>

        <blockquote
          className="my-10 border-y py-8 font-medium leading-[1.4] tracking-[-0.02em]"
          style={{
            fontSize: '1.5rem',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-gradient-brand">
            But it doesn&apos;t stop at capture.
          </span>
        </blockquote>

        <p className="leading-[1.7]" style={{ fontSize: '1.0625rem', color: '#A8A8A6' }}>
          Capture is just where the pipeline starts. Resurfacing, clustering, crystallizing,
          validating: the entire workflow runs on your phone. Catch a thought on a Tuesday
          morning, validate the business by Friday afternoon, all from the same device.
        </p>
      </div>
    </section>
  );
}

type FeatureProps = {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  bullets: string[];
  illustration: React.ReactNode;
  reverse?: boolean;
};

function FeatureSection({
  eyebrow,
  title,
  description,
  bullets,
  illustration,
  reverse,
}: FeatureProps) {
  const content = (
    <div className="pt-2">
      <div
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-gradient-brand"
      >
        {eyebrow}
      </div>

      <h2
        className="mb-5 font-medium leading-[1.1] tracking-[-0.03em] text-white"
        style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
      >
        {title}
      </h2>

      <p className="mb-6 text-base leading-[1.65]" style={{ color: '#A8A8A6' }}>
        {description}
      </p>

      <ul className="m-0 list-none space-y-2.5 p-0">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-3 text-[14.5px]" style={{ color: '#C8C8C6' }}>
            <span
              className="mt-[7px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: '#E32B1A' }}
            />
            <span className="leading-[1.55]">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const illus = (
    <div className="illus-container">
      <div className="illus-panel">
        <div className="grain-inner" />
        <div className={`illus-glow illus-glow-${reverse ? 'tr' : 'tl'}`} />
        {illustration}
      </div>
    </div>
  );

  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-12 lg:grid-cols-2">
        {reverse ? (
          <>
            <div className="order-2 lg:order-1">{illus}</div>
            <div className="order-1 lg:order-2">{content}</div>
          </>
        ) : (
          <>
            {content}
            <div>{illus}</div>
          </>
        )}
      </div>
    </section>
  );
}

function DoesntStopHere() {
  const stages = [
    { label: 'Capture', desc: 'Voice, text, sketch' },
    { label: 'Resurface', desc: 'Daily revisit' },
    { label: 'Cluster', desc: 'Group themes' },
    { label: 'Crystallize', desc: 'Concept card' },
    { label: 'Validate', desc: 'Spark + research' },
  ];
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[1100px] text-center">
        <div
          className="mb-6 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: '#DB4D40' }}
        >
          The whole pipeline, in your pocket
        </div>
        <h2
          className="mb-12 mx-auto max-w-[720px] font-medium leading-[1.2] tracking-[-0.025em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          Five stages. One device. Zero context-switching.
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {stages.map((s, i) => (
            <div
              key={s.label}
              className="rounded-2xl border p-5 text-left"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(227,43,26,0.12)', color: '#E32B1A' }}
              >
                {i + 1}
              </div>
              <div className="mb-1 text-[14px] font-semibold text-white">{s.label}</div>
              <div className="text-[12.5px]" style={{ color: '#888782' }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[800px] text-center">
        <h2
          className="mb-5 font-medium leading-[1.15] tracking-[-0.03em] text-white"
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
        >
          Stop losing the<br />
          <span className="text-gradient-brand">good ones</span>.
        </h2>
        <p
          className="mx-auto mb-8 max-w-[520px] leading-[1.65]"
          style={{ fontSize: '1.0625rem', color: '#A8A8A6' }}
        >
          The next idea worth a million dollars is the one you&apos;ll have in 20 minutes. Be
          ready for it.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[15px] font-semibold text-white transition-all hover:brightness-[1.15] active:scale-[0.97]"
            style={{ background: '#E32B1A' }}
          >
            Download on iOS
          </a>
          <a
            href="/#pricing"
            className="inline-flex items-center justify-center rounded-full border px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-[#222222] active:scale-[0.97]"
            style={{
              background: '#1A1A1A',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            See pricing
          </a>
        </div>
      </div>
    </section>
  );
}

function Separator() {
  return (
    <div className="relative flex h-24 items-center justify-center">
      <div
        className="mx-auto h-px w-full max-w-[1200px]"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
        }}
      />
    </div>
  );
}
