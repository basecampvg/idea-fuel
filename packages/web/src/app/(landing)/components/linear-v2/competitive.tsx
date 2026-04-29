'use client';

const cards = [
  {
    label: 'Note-Taking Apps',
    title: 'Notion, Apple Notes, etc.',
    description:
      'Store your thoughts. But storage isn\'t incubation. Your best ideas rot in folders you never reopen.',
    features: [
      { has: true, text: 'Capture text' },
      { has: false, text: 'Resurface forgotten thoughts' },
      { has: false, text: 'Detect idea collisions' },
      { has: false, text: 'Validate business viability' },
      { has: false, text: 'Generate business plans' },
    ],
  },
  {
    label: 'ChatGPT & AI Assistants',
    title: 'One-shot documents',
    description:
      'Gives you a document. A polished, generic, unvalidated document that sounds impressive and means nothing.',
    features: [
      { has: true, text: 'Generate text' },
      { has: true, text: 'Quick business plans' },
      { has: false, text: 'Track idea evolution' },
      { has: false, text: 'Structured interviews' },
      { has: false, text: 'Living business model' },
    ],
  },
  {
    label: 'IdeaFuel',
    title: 'A living business model',
    description:
      'Engineers the entire pipeline from raw thought to validated concept. Every assumption tracked, sourced, and auditable.',
    features: [
      { has: true, text: 'Capture + voice + type-tagging' },
      { has: true, text: 'AI-powered incubation' },
      { has: true, text: 'Collision detection & synthesis' },
      { has: true, text: 'Structured validation interviews' },
      { has: true, text: 'Living, versioned business models' },
    ],
    highlighted: true,
  },
];

export function CompetitiveSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <h2
          className="mb-12 text-center font-medium leading-[1.15] tracking-[-0.03em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
        >
          Other tools start at the plan.
          <br />
          We start at <span className="text-gradient-brand">the thought.</span>
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border p-8"
              style={
                card.highlighted
                  ? {
                      borderColor: 'rgba(227,43,26,0.2)',
                      background:
                        'linear-gradient(135deg, rgba(227,43,26,0.04), rgba(219,77,64,0.02))',
                    }
                  : {
                      background: '#141414',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }
              }
            >
              <div
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: card.highlighted ? '#DB4D40' : '#6B6B69' }}
              >
                {card.label}
              </div>
              <h3 className="mb-3 text-lg font-semibold tracking-[-0.01em] text-white">
                {card.title}
              </h3>
              <p
                className="mb-4 text-[14px] leading-[1.6]"
                style={{ color: '#A8A8A6' }}
              >
                {card.description}
              </p>
              <div className="flex flex-col gap-2">
                {card.features.map((f) => (
                  <div key={f.text} className="flex items-center gap-2 text-[13px]">
                    {f.has ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ color: '#27a644' }}
                      >
                        <path
                          d="M3 8l3.5 3.5L13 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ color: '#3D3D3B' }}
                      >
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                    <span
                      style={{
                        color: f.has ? '#A8A8A6' : '#3D3D3B',
                      }}
                    >
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
