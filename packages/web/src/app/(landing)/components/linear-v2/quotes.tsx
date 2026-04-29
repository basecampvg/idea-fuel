'use client';

const quotes = [
  {
    text: "Creativity is just connecting things. When you ask creative people how they did something, they feel a little guilty because they didn't really do it, they just saw something.",
    author: 'Steve Jobs',
    use: 'Cluster feature · Collision detection · Synthesis',
  },
  {
    text: "The way to get startup ideas is not to try to think of startup ideas. It's to look for problems, preferably problems you have yourself.",
    author: 'Paul Graham',
    use: 'Core philosophy · Problem-first capture · Type tagging',
  },
  {
    text: "If you're not embarrassed by the first version of your product, you've launched too late.",
    author: 'Reid Hoffman',
    use: 'Validation pipeline · Anti-perfectionism · Spark interviews',
  },
  {
    text: 'Invention, it must be humbly admitted, does not consist in creating out of void but out of chaos.',
    author: 'Mary Shelley',
    use: 'Cluster · From chaos to structure · Synthesis narrative',
  },
  {
    text: 'Plans are worthless, but planning is everything.',
    author: 'Dwight D. Eisenhower',
    use: 'Business plan feature · The value is the thinking, not the document',
  },
  {
    text: 'Inspiration exists, but it has to find you working.',
    author: 'Pablo Picasso',
    use: 'Capture habit · Onboarding · Capture streaks',
  },
];

export function QuotesSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <h2
          className="mb-12 text-center font-medium tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}
        >
          On the shoulders of giants.
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q) => (
            <div
              key={q.author}
              className="flex flex-col gap-5 rounded-2xl border p-8 transition-colors hover:border-white/[0.12]"
              style={{
                background: '#141414',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="flex-1 italic leading-[1.6]"
                style={{ fontSize: '17px', color: '#A8A8A6' }}
              >
                &ldquo;{q.text}&rdquo;
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white">{q.author}</div>
                <div
                  className="mt-3 border-t pt-3 text-[11px]"
                  style={{
                    borderColor: 'rgba(255,255,255,0.04)',
                    color: '#3D3D3B',
                  }}
                >
                  {q.use}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
