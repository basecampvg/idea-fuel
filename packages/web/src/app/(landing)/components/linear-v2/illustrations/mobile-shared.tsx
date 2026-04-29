'use client';

/**
 * Shared mobile phone frame and theme tokens for illustrations.
 * Mirrors packages/mobile/src/lib/theme.ts exactly.
 */

import type { ReactNode } from 'react';

export const m = {
  // Surfaces
  background: '#0A0A0A',
  card: '#111111',
  surface: '#161616',
  // Borders
  border: '#222222',
  borderSubtle: '#181818',
  // Text
  foreground: '#E8E4DC',
  muted: '#8A8680',
  mutedDim: '#555555',
  // Brand
  brand: '#E32B1A',
  brandEnd: '#DB4D40',
  brandMuted: 'rgba(227, 43, 26, 0.15)',
  brandGlow: 'rgba(227, 43, 26, 0.4)',
  // Accent
  accent: '#0393F8',
  // Status
  success: '#0393F8',
  warning: '#F59E0B',
  destructive: '#EF4444',
  // Glass borders
  glassBorderStart: 'rgba(255, 255, 255, 0.08)',
  glassBorderEnd: 'rgba(255, 255, 255, 0.02)',
  white: '#FFFFFF',
} as const;

/**
 * Phone frame — renders at REAL iPhone 16 Pro dimensions (393x852pt) and
 * scales down visually with CSS transform. This guarantees every inner
 * element (which is already coded at real iOS pixel values like 28px titles
 * and 42x42 icons) appears at the SAME proportion to the screen as it would
 * on an actual phone — preventing the "everything looks crowded" problem.
 *
 * To resize visually, change PHONE_VISUAL_WIDTH only. Inner code never
 * needs to know the visual size.
 */
const PHONE_REAL_WIDTH = 393;
const PHONE_REAL_HEIGHT = 852;
const PHONE_VISUAL_WIDTH_DEFAULT = 300;
const STATUS_BAR_HEIGHT = 54;
const PHONE_FRAME_PADDING_Y = 40;

export function PhoneFrame({
  children,
  showNeural,
  width = PHONE_VISUAL_WIDTH_DEFAULT,
}: {
  children: ReactNode;
  showNeural?: boolean;
  width?: number;
}) {
  const PHONE_SCALE = width / PHONE_REAL_WIDTH;
  const PHONE_VISUAL_HEIGHT = PHONE_REAL_HEIGHT * PHONE_SCALE;
  return (
    <div
      className="relative z-10 flex h-full items-center justify-center"
      style={{
        minHeight: PHONE_VISUAL_HEIGHT + PHONE_FRAME_PADDING_Y * 2,
        paddingTop: PHONE_FRAME_PADDING_Y,
        paddingBottom: PHONE_FRAME_PADDING_Y,
      }}
    >
      <div
        style={{
          width,
          height: PHONE_VISUAL_HEIGHT,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: PHONE_REAL_WIDTH,
            height: PHONE_REAL_HEIGHT,
            position: 'absolute',
            top: 0,
            left: 0,
            background: m.background,
            borderRadius: 55,
            overflow: 'hidden',
            boxShadow:
              'inset 0 0 0 2px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.5)',
            transform: `scale(${PHONE_SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Neural background */}
          {showNeural && <NeuralBackground />}

          {/* Status bar — iOS-accurate proportions at 393pt width */}
          <div
            className="relative z-10 flex items-center justify-between"
            style={{
              paddingLeft: 36,
              paddingRight: 36,
              paddingTop: 20,
              paddingBottom: 8,
              height: STATUS_BAR_HEIGHT,
            }}
          >
            <span
              className="font-semibold text-white"
              style={{ fontSize: 17, letterSpacing: '-0.4px' }}
            >
              9:41
            </span>
            <div className="flex items-center" style={{ gap: 6 }}>
              {/* signal */}
              <svg width="20" height="13" viewBox="0 0 18 12" fill="white">
                <rect x="0" y="8" width="3" height="4" rx="0.5" />
                <rect x="5" y="5" width="3" height="7" rx="0.5" />
                <rect x="10" y="2" width="3" height="10" rx="0.5" />
                <rect x="15" y="0" width="3" height="12" rx="0.5" opacity="0.4" />
              </svg>
              {/* wifi */}
              <svg width="18" height="13" viewBox="0 0 14 10" fill="none">
                <path d="M7 9.5l1.5-1.5a2.1 2.1 0 00-3 0L7 9.5z" fill="white" />
                <path
                  d="M3.5 5.5a5 5 0 017 0M1.5 3.5a8 8 0 0111 0"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              {/* battery */}
              <svg width="28" height="13" viewBox="0 0 22 10" fill="none">
                <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="white" strokeOpacity="0.4" />
                <rect x="2" y="2" width="15" height="6" rx="1" fill="white" />
                <rect x="20" y="3.5" width="1.5" height="3" rx="0.5" fill="white" fillOpacity="0.4" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div
            className="relative z-10"
            style={{ height: PHONE_REAL_HEIGHT - STATUS_BAR_HEIGHT }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Neural background — recreates the real Three.js scene approximation:
 * 2000+ brand-colored particles forming a 3D node network with connecting
 * edges. Uses a deterministic point cloud + nearest-neighbor edges for
 * visual fidelity to the real WebGL scene. */
export function NeuralBackground() {
  // Generate deterministic node positions across the real iPhone canvas.
  const W = PHONE_REAL_WIDTH, H = PHONE_REAL_HEIGHT;
  const nodes: { x: number; y: number; depth: number; size: number }[] = [];
  // Use a seeded LCG for stability
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 400; i++) {
    const depth = rand(); // 0 = far, 1 = near
    nodes.push({
      x: rand() * W,
      y: rand() * H,
      depth,
      size: 0.7 + depth * depth * 2,
    });
  }
  // Build edges to nearest 2 neighbors (limited)
  const edges: { a: number; b: number; opacity: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const dists = nodes
      .map((n, j) => ({
        j,
        d: Math.hypot(n.x - a.x, n.y - a.y),
      }))
      .filter((d) => d.j !== i && d.d < 80)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const { j } of dists) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const avgDepth = (a.depth + nodes[j].depth) / 2;
      edges.push({ a: i, b: j, opacity: avgDepth * 0.35 });
    }
  }

  return (
    <>
      {/* Bottom radial glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '30%',
          left: '50%',
          width: 600,
          height: 600,
          transform: 'translate(-50%, 0)',
          background:
            'radial-gradient(circle, rgba(227,43,26,0.2) 0%, rgba(227,43,26,0.05) 35%, transparent 65%)',
          filter: 'blur(30px)',
        }}
      />
      {/* Particle network */}
      <svg
        className="pointer-events-none absolute inset-0"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        {/* Edges */}
        {edges.map((e, i) => (
          <line
            key={`e${i}`}
            x1={nodes[e.a].x}
            y1={nodes[e.a].y}
            x2={nodes[e.b].x}
            y2={nodes[e.b].y}
            stroke="#E32B1A"
            strokeWidth={0.55}
            opacity={e.opacity}
          />
        ))}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={n.size}
            fill="#E32B1A"
            opacity={0.25 + n.depth * 0.6}
          />
        ))}
      </svg>
    </>
  );
}

/** Slogan SVG — "DON'T LET YOUR IDEAS DIE" with red "DIE" */
export function Slogan({ width = 220 }: { width?: number }) {
  // Use HTML text with thin geometric styling that approximates the SVG
  return (
    <div
      style={{
        width,
        textAlign: 'center',
        fontFamily: '"Helvetica Neue", "Arial Narrow", sans-serif',
        fontWeight: 300,
        fontSize: 13,
        letterSpacing: '0.18em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#D4D4D4' }}>DON&apos;T LET YOUR IDEAS </span>
      <span style={{ color: '#E32B1A' }}>DIE</span>
    </div>
  );
}

/** IdeaFuel flame logo */
export function FlameLogo({ size = 90 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 256 379"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size * (256 / 379), height: size }}
    >
      <path
        d="M44.31 281.74L126.07 269.69L76.94 368.41C76.94 368.41 61.67 362.85 43.11 343.32C24.55 323.78 44.31 281.74 44.31 281.74Z"
        fill="url(#fl0)"
      />
      <path
        d="M135.19 231.58C135.19 231.58 189.1 156.71 165.03 92.86C165.03 92.86 187.73 110.88 219.27 150.79L229.37 203.01L213.08 220.05L135.19 231.55V231.58Z"
        fill="url(#fl1)"
      />
      <path
        d="M55.63 267.37C47.35 281.97 42.39 297.56 44.11 316.64C46.45 342.79 76.94 368.41 76.94 368.41C31.83 348.75 0 303.7 0 251.36C0 221.52 11.33 193.03 27.27 168.2C43.06 143.63 64.89 123.87 79.51 98.47C95.93 69.96 104.86 34.9 89.09 4.09C88.84 3.62 87.29 0 86.87 0C125.54 28.12 157.7 69.41 151.26 119.75C145.12 167.93 103.01 203.5 74.79 239.83C67.63 249.03 60.95 257.99 55.63 267.37Z"
        fill="url(#fl2)"
      />
      <path
        d="M86.67 372.2C94.9 375 103.53 376.97 112.44 378.02C117.38 378.62 122.42 378.92 127.53 378.92C197.96 378.92 255.07 321.81 255.07 251.38C255.07 251.38 257.04 184.14 195.72 122.97C195.72 122.97 217.35 150.09 218.74 187.41C217.85 197.84 218 211.49 198.84 235.91C179.68 260.34 86.67 372.23 86.67 372.23V372.2Z"
        fill="url(#fl3)"
      />
      <defs>
        <linearGradient id="fl0" x1="66" y1="335" x2="126" y2="335" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C82617" />
          <stop offset="0.8" stopColor="#DB4D40" />
        </linearGradient>
        <linearGradient id="fl1" x1="167" y1="185" x2="229" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0.34" stopColor="#DB4D40" />
          <stop offset="1" stopColor="#C32618" />
        </linearGradient>
        <linearGradient id="fl2" x1="52" y1="326" x2="152" y2="162" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DB4D40" />
          <stop offset="1" stopColor="#E32B1A" />
        </linearGradient>
        <linearGradient id="fl3" x1="144" y1="292" x2="255" y2="292" gradientUnits="userSpaceOnUse">
          <stop offset="0.21" stopColor="#DB4D40" />
          <stop offset="1" stopColor="#E32B1A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Bottom tab bar — Thoughts | Capture | Sketch | Vault (matches _layout.tsx) */
export function TabBar({ active }: { active: 'thoughts' | 'capture' | 'sketch' | 'vault' }) {
  const tabs: { key: typeof active; label: string; icon: ReactNode }[] = [
    {
      key: 'thoughts',
      label: 'Thoughts',
      icon: (
        // Lightbulb (lucide)
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 22h4" />
          <path d="M12 2a7 7 0 00-4 12.7c.6.6 1 1.4 1 2.3v1h6v-1c0-.9.4-1.7 1-2.3A7 7 0 0012 2z" />
        </svg>
      ),
    },
    {
      key: 'capture',
      label: 'Capture',
      icon: (
        // Mic (lucide)
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" />
        </svg>
      ),
    },
    {
      key: 'sketch',
      label: 'Sketch',
      icon: (
        // Pencil (lucide)
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.85 0 014 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      ),
    },
    {
      key: 'vault',
      label: 'Vault',
      icon: (
        // Vault (lucide) — square with X
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="0.5" fill="currentColor" />
          <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-end justify-around"
      style={{
        background: 'rgba(0,0,0,0.92)',
        paddingTop: 4,
        paddingBottom: 18,
        backdropFilter: 'blur(40px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <div
            key={tab.key}
            className="flex flex-1 flex-col items-center justify-center"
            style={{
              gap: 2,
              paddingTop: 6,
              paddingBottom: 6,
              color: isActive ? m.brand : m.white,
            }}
          >
            {tab.icon}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: isActive ? m.brand : m.white,
              }}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Header bar with "IDEA FUEL" wordmark + user avatar on right.
 * Matches _layout.tsx: 14px Outfit-black, letter-spacing 3, "IDEA " in
 * #BCBCBC, "FUEL" in brand red. Avatar is 32px brand circle. */
export function HeaderBar({ avatarInitial = 'M' }: { avatarInitial?: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        height: 44,
        paddingLeft: 16,
        paddingRight: 16,
        position: 'relative',
      }}
    >
      <div style={{ width: 32 }} />
      <div className="flex items-center" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
        <span
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 3,
            color: '#BCBCBC',
          }}
        >
          IDEA{' '}
        </span>
        <span
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 3,
            color: m.brand,
          }}
        >
          FUEL
        </span>
      </div>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          background: m.brand,
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          zIndex: 2,
        }}
      >
        {avatarInitial}
      </div>
    </div>
  );
}

/** Card with glass gradient border (matches mobile card style) */
export function GlassCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${m.glassBorderStart}, ${m.glassBorderEnd})`,
        borderRadius: 24,
        padding: 1,
        ...style,
      }}
    >
      <div
        style={{
          background: m.card,
          borderRadius: 23,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Mobile Badge — matches Badge.tsx variants */
export function MobileBadge({
  variant,
  children,
}: {
  variant: 'success' | 'primary' | 'accent' | 'warning' | 'error' | 'default';
  children: ReactNode;
}) {
  const variantStyles: Record<string, { bg: string; color: string }> = {
    default: { bg: '#1A1A1A', color: m.muted },
    success: { bg: 'rgba(3, 147, 248, 0.2)', color: m.success },
    warning: { bg: 'rgba(245, 158, 11, 0.2)', color: m.warning },
    error: { bg: 'rgba(239, 68, 68, 0.2)', color: m.destructive },
    primary: { bg: m.brandMuted, color: m.brand },
    accent: { bg: 'rgba(3, 147, 248, 0.2)', color: m.accent },
  };
  const s = variantStyles[variant];
  return (
    <span
      className="rounded-full text-[12px] font-semibold"
      style={{
        background: s.bg,
        color: s.color,
        padding: '5px 12px',
      }}
    >
      {children}
    </span>
  );
}
