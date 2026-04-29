'use client';

const research = [
  {
    year: '1926',
    author: 'Graham Wallas',
    title: 'The Art of Thought',
    finding:
      'Creative process follows four predictable stages: preparation, incubation, illumination, verification. Incubation requires stepping away.',
    application:
      "Foundation for IdeaFuel's five-stage flow. Powers the Resurfacing Engine.",
  },
  {
    year: '1950',
    author: 'J.P. Guilford',
    title: 'APA Presidential Address on Creativity',
    finding:
      'Creativity requires both divergent thinking (expanding) and convergent thinking (selecting). Premature convergence kills ideation.',
    application:
      'Why Capture is separated from Cluster. AI refinement is on-demand, not automatic.',
  },
  {
    year: '2018',
    author: 'Vandenbroucke & Pearce',
    title: 'PMC: From Ideas to Studies',
    finding:
      'Systematic thought recording dramatically improves idea quality. "Fringe thoughts," the offhand observations, produce breakthroughs.',
    application:
      'Justifies voice capture, type-tagging, and resurfacing of half-forgotten thoughts.',
  },
  {
    year: '2022',
    author: 'ACM SIGCHI',
    title: 'Creative Search Processes Study',
    finding:
      'Creative work has four interconnected, non-linear stages. Process is iterative: thoughts flow backward between stages, not just forward.',
    application:
      'Validates non-linear UX. Thoughts can move backward between stages in Cluster.',
  },
];

export function ResearchSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[900px]">
        <h2
          className="mb-12 text-center font-medium tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}
        >
          Built on 100 years of creativity research.
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {research.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border p-6"
              style={{
                background: '#141414',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="mb-2 font-mono text-[10px]"
                style={{ color: '#3D3D3B' }}
              >
                {r.year}
              </div>
              <div className="mb-1 text-[14px] font-semibold text-white">
                {r.author}
              </div>
              <div
                className="mb-3 text-[13px] italic"
                style={{ color: '#6B6B69' }}
              >
                {r.title}
              </div>
              <div
                className="mb-3 text-[13px] leading-[1.6]"
                style={{ color: '#A8A8A6' }}
              >
                {r.finding}
              </div>
              <div
                className="rounded-md px-3 py-2 text-[12px]"
                style={{
                  background: 'rgba(227,43,26,0.05)',
                  color: '#DB4D40',
                }}
              >
                → {r.application}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
