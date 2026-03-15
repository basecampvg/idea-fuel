'use client';

/**
 * Generative blog cover art — produces a unique, deterministic abstract visual
 * for each post based on its slug. Uses SVG with the brand palette so every
 * cover feels on-brand without needing external image generation.
 */

interface BlogCoverProps {
  slug: string;
  title?: string;
  tag?: string;
  /** Hide text overlay (used when the parent layout already shows the title) */
  hideOverlay?: boolean;
  className?: string;
}

/* ---- deterministic hash from string ---- */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---- palettes: [accent1, accent2, highlight, bg-dark, bg-mid] ---- */
const PALETTES = [
  ['#E8513D', '#FF7A5C', '#FFBDAD', '#140B09', '#1F1210'],
  ['#D24421', '#FF6B5A', '#FFD4CC', '#120A08', '#1C100C'],
  ['#C4651A', '#FFB088', '#FFE0C8', '#120E09', '#1C1710'],
  ['#E8513D', '#7BA3C4', '#B8D4E8', '#0C1117', '#111A22'],
  ['#D24421', '#9B8579', '#D4C4B8', '#110E0C', '#1A1614'],
];

/* ---- shape builders ---- */
function buildShapes(rand: () => number, palette: string[]) {
  const nodes: React.ReactNode[] = [];
  const count = 5 + Math.floor(rand() * 5);

  for (let i = 0; i < count; i++) {
    const kind = rand();
    const cx = rand() * 400;
    const cy = rand() * 250;
    const color = palette[Math.floor(rand() * 3)]; // accent colors only
    const opacity = 0.2 + rand() * 0.45;
    const size = 20 + rand() * 70;

    if (kind < 0.3) {
      // Glowing orb
      nodes.push(
        <circle key={`o${i}`} cx={cx} cy={cy} r={size} fill={color} opacity={opacity}>
          <animate
            attributeName="opacity"
            values={`${opacity};${opacity * 0.6};${opacity}`}
            dur={`${4 + rand() * 4}s`}
            repeatCount="indefinite"
          />
        </circle>
      );
    } else if (kind < 0.55) {
      // Soft rectangle
      const rot = rand() * 60 - 30;
      const w = size * (1.2 + rand());
      const h = size * (0.6 + rand() * 0.6);
      nodes.push(
        <rect
          key={`r${i}`}
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          rx={h * 0.25}
          fill={color}
          opacity={opacity * 0.7}
          transform={`rotate(${rot} ${cx} ${cy})`}
        />
      );
    } else if (kind < 0.75) {
      // Ring
      nodes.push(
        <circle
          key={`rng${i}`}
          cx={cx}
          cy={cy}
          r={size * 0.6}
          fill="none"
          stroke={color}
          strokeWidth={1.5 + rand() * 2.5}
          opacity={opacity * 0.6}
        />
      );
    } else {
      // Small diamond / rotated square
      const s = 8 + rand() * 20;
      nodes.push(
        <rect
          key={`d${i}`}
          x={cx - s / 2}
          y={cy - s / 2}
          width={s}
          height={s}
          rx={2}
          fill={color}
          opacity={opacity * 0.9}
          transform={`rotate(45 ${cx} ${cy})`}
        />
      );
    }
  }

  // Accent lines — architectural feel
  const lines = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < lines; i++) {
    const horiz = rand() > 0.4;
    const pos = 30 + rand() * 190;
    const color = palette[Math.floor(rand() * 2)];
    nodes.push(
      <line
        key={`l${i}`}
        x1={horiz ? 0 : pos}
        y1={horiz ? pos : 0}
        x2={horiz ? 400 : pos}
        y2={horiz ? pos : 250}
        stroke={color}
        strokeWidth={0.5 + rand() * 0.5}
        opacity={0.08 + rand() * 0.1}
      />
    );
  }

  // Decorative dots cluster
  const dotCount = 3 + Math.floor(rand() * 5);
  const dotCx = 50 + rand() * 300;
  const dotCy = 30 + rand() * 190;
  for (let i = 0; i < dotCount; i++) {
    nodes.push(
      <circle
        key={`dot${i}`}
        cx={dotCx + (rand() - 0.5) * 60}
        cy={dotCy + (rand() - 0.5) * 40}
        r={2 + rand() * 4}
        fill={palette[2]}
        opacity={0.25 + rand() * 0.35}
      />
    );
  }

  return nodes;
}

export function BlogCover({ slug, title, tag, hideOverlay, className = '' }: BlogCoverProps) {
  const hash = hashCode(slug);
  const rand = seededRandom(hash);
  const palette = PALETTES[hash % PALETTES.length];
  const shapes = buildShapes(rand, palette);

  // Unique gradient ID to avoid SVG filter collisions
  const uid = `bc-${hash}`;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ aspectRatio: '16/10' }}>
      {/* SVG generative art */}
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id={`${uid}-blur`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
          </filter>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette[3]} />
            <stop offset="50%" stopColor={palette[4]} />
            <stop offset="100%" stopColor={palette[3]} />
          </linearGradient>
          <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </linearGradient>
          {/* Subtle noise */}
          <filter id={`${uid}-noise`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        {/* Base fill */}
        <rect width="400" height="250" fill={`url(#${uid}-bg)`} />

        {/* Blurred shape layer */}
        <g filter={`url(#${uid}-blur)`}>
          {shapes}
        </g>

        {/* Grain texture */}
        <rect width="400" height="250" filter={`url(#${uid}-noise)`} opacity="0.035" />

        {/* Bottom vignette for text legibility */}
        {!hideOverlay && <rect width="400" height="250" fill={`url(#${uid}-fade)`} />}
      </svg>

      {/* Text overlay */}
      {!hideOverlay && (
        <div className="absolute inset-0 flex flex-col justify-between p-5 z-10">
          {tag && (
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide bg-white/[0.08] backdrop-blur-sm text-white/80 border border-white/[0.08]">
                {tag}
              </span>
            </div>
          )}
          {title && (
            <h3 className="font-display text-[clamp(1rem,2vw,1.5rem)] leading-[1.15] font-extrabold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] max-w-[90%]">
              {title}
            </h3>
          )}
        </div>
      )}

      {/* Inner border */}
      <div className="absolute inset-0 rounded-xl border border-white/[0.05] pointer-events-none z-20" />
    </div>
  );
}
