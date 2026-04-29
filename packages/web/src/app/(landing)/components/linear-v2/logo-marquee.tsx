'use client';

const logos = [
  'Y Combinator',
  'Techstars',
  '500 Global',
  'Indie Hackers',
  'Product Hunt',
  'AngelList',
  'On Deck',
  'Sequoia Scout',
];

export function LogoMarquee() {
  // Duplicate for seamless infinite scroll
  const items = [...logos, ...logos];

  return (
    <section className="overflow-hidden py-12 text-center">
      <div
        className="mb-7 text-[11px] uppercase tracking-[0.1em]"
        style={{ color: '#3D3D3B' }}
      >
        Founders who stopped guessing and started validating
      </div>
      <div className="overflow-hidden">
        <div className="marquee-track">
          {items.map((logo, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-[15px] font-medium transition-colors hover:text-[#6B6B69]"
              style={{ color: '#3D3D3B' }}
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
