'use client';

export function FinalCtaSection() {
  return (
    <section className="relative px-6 py-24 text-center">
      {/* Glow */}
      <div
        className="pointer-events-none absolute bottom-[-40%] left-1/2 h-[400px] w-[500px] -translate-x-1/2"
        style={{
          background: '#E32B1A',
          filter: 'blur(180px)',
          opacity: 0.05,
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1200px]">
        <h2
          className="mb-4 font-medium leading-[1.15] tracking-[-0.03em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
        >
          Your ideas deserve a process,
          <br />
          not just a page.
        </h2>
        <p
          className="mx-auto mb-10 max-w-[480px] leading-[1.6]"
          style={{ fontSize: '17px', color: '#A8A8A6' }}
        >
          Capture. Incubate. Crystallize. From raw thought to validated business concept in
          days, not months.
        </p>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:brightness-[1.15] active:scale-[0.97]"
            style={{ background: '#E32B1A' }}
          >
            Start capturing ideas
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center justify-center rounded-full border px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-[#222222] active:scale-[0.97]"
            style={{ background: '#1A1A1A', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            See pricing
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full px-4 py-3.5 text-[15px] font-medium transition-colors"
            style={{ color: '#A8A8A6' }}
          >
            Read the science
          </a>
        </div>
        <p className="text-[12px]" style={{ color: '#3D3D3B' }}>
          Free to start &middot; No credit card &middot; Ideas stay yours
        </p>
      </div>
    </section>
  );
}
