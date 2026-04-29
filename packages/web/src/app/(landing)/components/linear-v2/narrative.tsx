'use client';

export function NarrativeSection() {
  return (
    <section className="px-6 py-20 text-center">
      <div className="mx-auto max-w-[720px]">
        <div
          className="mb-6 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: '#DB4D40' }}
        >
          What IdeaFuel does
        </div>

        <h2
          className="mb-5 font-medium leading-[1.35] tracking-[-0.025em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          Most tools wait until you have an idea. <em>IdeaFuel helps you find one</em>
          &mdash; then validates it.
        </h2>

        <p
          className="mb-4 leading-[1.7]"
          style={{ fontSize: '1.0625rem', color: '#A8A8A6' }}
        >
          Capture raw thoughts the moment they hit. The app resurfaces them when your subconscious
          has had time to chew. AI clusters scattered notes into themes, surfaces collisions
          across them, then crystallizes the strongest into a structured business concept &mdash;
          complete with deep research, a business plan, and a financial model.
        </p>

        <blockquote
          className="my-8 border-y py-8 font-medium leading-[1.4] tracking-[-0.02em]"
          style={{
            fontSize: '1.5rem',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-gradient-brand">
            One workflow from raw thought to validated business.
          </span>
        </blockquote>

        <p
          className="mb-4 leading-[1.7]"
          style={{ fontSize: '1.0625rem', color: '#A8A8A6' }}
        >
          Every competitor treats ideation as a completed event &mdash; you show up with an idea,
          they help you plan it. IdeaFuel is the only platform that treats ideation as a{' '}
          <strong className="text-white font-medium">
            process that can be engineered, accelerated, and optimized.
          </strong>
        </p>
        <p
          className="mt-2 text-[12px] italic"
          style={{ color: '#6B6B69' }}
        >
          Grounded in 100+ years of creativity research &mdash; Wallas (1926), Guilford (1950),
          ACM SIGCHI (2022), APA Monitor (2022)
        </p>
      </div>
    </section>
  );
}
