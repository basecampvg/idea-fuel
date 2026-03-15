import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const ACCENTS = [
  { from: '#E8513D', via: '#FF7A5C' },
  { from: '#D24421', via: '#FF6B5A' },
  { from: '#C4651A', via: '#FFB088' },
  { from: '#E8513D', via: '#7BA3C4' },
  { from: '#D24421', via: '#9B8579' },
];

// SVG flame logo
const logoSvg = `<svg width="40" height="59" viewBox="0 0 256 379" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M44.3108 281.743L126.066 269.693L76.9432 368.414C76.9432 368.414 61.6748 362.85 43.1133 343.316C24.5517 323.781 44.3108 281.743 44.3108 281.743Z" fill="url(%23p0)"/><path d="M135.19 231.575C135.19 231.575 189.103 156.705 165.028 92.8618C165.028 92.8618 187.731 110.875 219.266 150.792L229.37 203.009L213.078 220.048L135.19 231.55V231.575Z" fill="url(%23p1)"/><path d="M55.6346 267.371C47.3517 281.966 42.387 297.559 44.1084 316.644C46.4536 342.79 76.9404 368.412 76.9404 368.412C31.8338 348.753 -0.000244141 303.696 -0.000244141 251.355C-0.000244141 221.516 11.3263 193.025 27.2683 168.202C43.0606 143.628 64.8904 123.869 79.5101 98.4711C95.9261 69.9552 104.858 34.9027 89.0903 4.09153C88.8408 3.61751 87.294 0 86.8699 0C125.54 28.1168 157.698 69.4063 151.262 119.752C145.124 167.927 103.011 203.504 74.7949 239.828C67.6347 249.034 60.9486 257.991 55.6346 267.371Z" fill="url(%23p2)"/><path d="M86.6675 372.204C94.9004 374.998 103.533 376.969 112.439 378.017C117.379 378.615 122.418 378.915 127.533 378.915C197.962 378.915 255.069 321.808 255.069 251.379C255.069 251.379 257.04 184.143 195.717 122.97C195.717 122.97 217.347 150.089 218.744 187.411C217.846 197.84 217.996 211.486 198.835 235.911C179.675 260.335 86.6675 372.229 86.6675 372.229V372.204Z" fill="url(%23p3)"/><defs><linearGradient id="p0" x1="66" y1="335" x2="126" y2="335" gradientUnits="userSpaceOnUse"><stop stop-color="%23C82617"/><stop offset=".81" stop-color="%23DB4D40"/></linearGradient><linearGradient id="p1" x1="167" y1="185" x2="229" y2="185" gradientUnits="userSpaceOnUse"><stop offset=".34" stop-color="%23DB4D40"/><stop offset="1" stop-color="%23C32618"/></linearGradient><linearGradient id="p2" x1="52" y1="326" x2="152" y2="162" gradientUnits="userSpaceOnUse"><stop stop-color="%23DB4D40"/><stop offset="1" stop-color="%23E32B1A"/></linearGradient><linearGradient id="p3" x1="144" y1="292" x2="255" y2="292" gradientUnits="userSpaceOnUse"><stop offset=".21" stop-color="%23DB4D40"/><stop offset="1" stop-color="%23E32B1A"/></linearGradient></defs></svg>`;

/* ---- Illustrations per category ---- */

function ValidationUI({ c }: { c: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      {/* Interview card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'flex' }} />
            <span style={{ fontSize: '12px', color: '#aaa' }}>Customer Interview</span>
          </div>
          <span style={{ fontSize: '11px', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', background: '#4ade8018' }}>Live</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ width: '85%', height: '4px', borderRadius: '2px', background: '#2a2a2a', display: 'flex' }} />
          <div style={{ width: '60%', height: '4px', borderRadius: '2px', background: '#2a2a2a', display: 'flex' }} />
          <div style={{ width: '40%', height: '4px', borderRadius: '2px', background: '#2a2a2a', display: 'flex' }} />
        </div>
      </div>
      {/* Score cards */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Problem Score</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: c, letterSpacing: '-0.5px' }}>8.4</span>
          <div style={{ width: '75%', height: '5px', borderRadius: '3px', background: c, display: 'flex' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Willingness to Pay</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>72%</span>
          <div style={{ width: '72%', height: '5px', borderRadius: '3px', background: '#4ade80', display: 'flex' }} />
        </div>
      </div>
      {/* Demand signal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Demand Validated</span>
          <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>15 / 20 confirm</span>
        </div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4ade8020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#4ade80', fontWeight: 700 }}>
          <span>OK</span>
        </div>
      </div>
    </div>
  );
}

function FinancialUI({ c, c2 }: { c: string; c2: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      {/* Chart card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Revenue Projection</span>
          <span style={{ fontSize: '11px', color: c, padding: '2px 8px', borderRadius: '20px', background: `${c}18` }}>12 months</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '80px' }}>
          {[35,42,38,55,62,70,65,80,88,78,95,100].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: i >= 9 ? c : i >= 6 ? c2 : '#333', display: 'flex' }} />
          ))}
        </div>
      </div>
      {/* Metric row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px', flex: 1 }}>
          <span style={{ fontSize: '9px', color: '#666' }}>CAC</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>$42</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px', flex: 1 }}>
          <span style={{ fontSize: '9px', color: '#666' }}>LTV</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: c }}>$380</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px', flex: 1 }}>
          <span style={{ fontSize: '9px', color: '#666' }}>LTV/CAC</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80' }}>9.0x</span>
        </div>
      </div>
      {/* Breakeven */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Breakeven</span>
          <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>Month 8</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Burn Rate</span>
          <span style={{ fontSize: '14px', color: c2, fontWeight: 700 }}>$12.4K/mo</span>
        </div>
      </div>
    </div>
  );
}

function CompetitorUI({ c }: { c: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Market Position</span>
          <span style={{ fontSize: '11px', color: c, padding: '2px 8px', borderRadius: '20px', background: `${c}18` }}>4 players</span>
        </div>
        {[
          { name: 'Competitor A', w: '80%', clr: '#444' },
          { name: 'Competitor B', w: '60%', clr: '#555' },
          { name: 'Your Product', w: '15%', clr: c },
          { name: 'Competitor C', w: '45%', clr: '#444' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: r.clr === c ? '#fff' : '#777', fontWeight: r.clr === c ? 700 : 400 }}>{r.name}</span>
            </div>
            <div style={{ width: r.w, height: '5px', borderRadius: '3px', background: r.clr, display: 'flex' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Gap Found</span>
          <span style={{ fontSize: '14px', color: c, fontWeight: 700 }}>SMB Segment</span>
          <span style={{ fontSize: '10px', color: '#555' }}>Underserved by all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Avg. Rating</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1,2,3].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'flex' }} />)}
            {[4,5].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#333', display: 'flex' }} />)}
          </div>
          <span style={{ fontSize: '10px', color: '#555' }}>3.2 / 5 average</span>
        </div>
      </div>
    </div>
  );
}

function ResearchUI({ c, c2 }: { c: string; c2: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, display: 'flex' }} />
          <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 700 }}>AI Research Pipeline</span>
        </div>
        {['Deep Research', 'Competitor Scan', 'Demand Signals', 'Report Gen'].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, background: i < 3 ? `${c}30` : '#222', color: i < 3 ? c : '#555' }}>
              <span>{i < 3 ? 'OK' : String(i + 1)}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '11px', color: i < 3 ? '#ccc' : '#555' }}>{step}</span>
              <div style={{ display: 'flex', background: '#222', borderRadius: '2px', height: '3px', overflow: 'hidden', width: '100%' }}>
                <div style={{ width: i < 3 ? '100%' : '35%', height: '100%', background: i < 3 ? c : '#444', display: 'flex' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>TAM</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: c, letterSpacing: '-0.5px' }}>$4.2B</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Sources</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: c2, letterSpacing: '-0.5px' }}>142</span>
        </div>
      </div>
    </div>
  );
}

function DefaultUI({ c, c2 }: { c: string; c2: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, display: 'flex' }} />
          <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 700 }}>Idea Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '52px', fontWeight: 700, color: '#fff', letterSpacing: '-2px' }}>84</span>
          <span style={{ fontSize: '18px', color: '#555' }}>/100</span>
        </div>
        <div style={{ display: 'flex', background: '#222', borderRadius: '4px', height: '8px', overflow: 'hidden', width: '100%' }}>
          <div style={{ width: '84%', height: '100%', background: `linear-gradient(90deg, ${c}, ${c2})`, borderRadius: '4px', display: 'flex' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Opportunity</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#4ade80', letterSpacing: '-0.5px' }}>High</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1c1b19', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', width: '50%' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Feasibility</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: c, letterSpacing: '-0.5px' }}>Strong</span>
        </div>
      </div>
    </div>
  );
}

function getIllustration(tag: string, accent: { from: string; via: string }) {
  const t = tag.toLowerCase();
  if (t.includes('validation') || t.includes('product-market')) return <ValidationUI c={accent.from} />;
  if (t.includes('financial') || t.includes('fundrais')) return <FinancialUI c={accent.from} c2={accent.via} />;
  if (t.includes('competitor') || t.includes('strateg')) return <CompetitorUI c={accent.from} />;
  if (t.includes('market research') || t.includes('ai tool')) return <ResearchUI c={accent.from} c2={accent.via} />;
  return <DefaultUI c={accent.from} c2={accent.via} />;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'Idea Fuel Blog';
  const tag = searchParams.get('tag') ?? '';
  const author = searchParams.get('author') ?? '';
  const date = searchParams.get('date') ?? '';

  const [geistBold, geistRegular] = await Promise.all([
    fetch(new URL('https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-700-normal.woff')).then(r => r.arrayBuffer()),
    fetch(new URL('https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-400-normal.woff')).then(r => r.arrayBuffer()),
  ]);

  const hash = hashCode(title);
  const accent = ACCENTS[hash % ACCENTS.length];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: 'Geist', background: '#161513', position: 'relative', overflow: 'hidden' }}>
        {/* Gradient glow */}
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '500px', height: '500px', borderRadius: '50%', background: accent.from, opacity: 0.07, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '300px', width: '400px', height: '400px', borderRadius: '50%', background: accent.via, opacity: 0.05, filter: 'blur(80px)' }} />

        {/* Left: text */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 0 52px 56px', width: '55%' }}>
          {/* Logo + tag row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={`data:image/svg+xml,${logoSvg}`} width={28} height={42} alt="" />
              <span style={{ fontSize: '18px', letterSpacing: '3px', fontFamily: 'monospace', color: '#fff' }}>IDEA</span>
              <span style={{ fontSize: '18px', letterSpacing: '3px', fontFamily: 'monospace', color: '#E32B1A', marginLeft: '-8px' }}>FUEL</span>
            </div>
            {tag && (
              <span style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '13px', color: accent.from, background: `${accent.from}15`, border: `1px solid ${accent.from}28` }}>{tag}</span>
            )}
          </div>

          {/* Title + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '20px' }}>
            <span style={{ fontSize: title.length > 55 ? '44px' : '50px', fontWeight: 700, lineHeight: 1.1, color: '#fff', letterSpacing: '-1.5px' }}>
              {title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {author && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: `${accent.from}30`, color: accent.from }}>
                    <span>{author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                  </div>
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)' }}>{author}</span>
                </div>
              )}
              {author && date && <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)' }}>·</span>}
              {date && <span style={{ fontSize: '16px', color: '#928e87' }}>{date}</span>}
            </div>
          </div>
        </div>

        {/* Right: UI mockup */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '45%', paddingRight: '40px' }}>
          {getIllustration(tag, accent)}
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: '0', left: '56px', right: '40px', height: '3px', borderRadius: '2px', background: `linear-gradient(90deg, ${accent.from}, ${accent.via}, transparent)`, opacity: 0.5 }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Geist', data: geistBold, weight: 700, style: 'normal' },
        { name: 'Geist', data: geistRegular, weight: 400, style: 'normal' },
      ],
    },
  );
}
