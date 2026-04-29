'use client';

/**
 * Pixel-replica of the mobile Validation Card screen — the top portion of
 * a generated validation report.
 *
 * Mirrors:
 *   packages/mobile/src/app/(tabs)/vault/[id]/card.tsx
 *   packages/mobile/src/components/ui/ValidationCard.tsx
 */

import { m, PhoneFrame } from './mobile-shared';

export function ValidationReportMobileIllustration({ width }: { width?: number }) {
  return (
    <PhoneFrame width={width}>
      {/* Header: status bar already drawn by PhoneFrame */}

      {/* IDEA FUEL wordmark + avatar (custom — bigger than the standard HeaderBar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 16,
          paddingBottom: 18,
        }}
      >
        <div style={{ width: 32 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#BCBCBC',
            }}
          >
            IDEA{' '}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: '3px',
              color: m.brand,
            }}
          >
            FUEL
          </span>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: '#161616',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          MJ
        </div>
      </div>

      {/* Sub-header: back chevron + "Validation Card" title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 18,
          paddingRight: 18,
          paddingBottom: 22,
          position: 'relative',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={m.foreground} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 600,
            color: m.foreground,
          }}
        >
          Validation Card
        </div>
      </div>

      {/* Title */}
      <div style={{ paddingLeft: 18, paddingRight: 18, marginBottom: 18 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.6px',
            color: m.foreground,
            lineHeight: 1.18,
            margin: 0,
          }}
        >
          Biological Age Health Audit: A New Revenue Stream Inspired by Chris&rsquo;s last episo&hellip;
        </h1>
      </div>

      {/* Validation Card */}
      <div style={{ paddingLeft: 18, paddingRight: 18 }}>
        <div
          style={{
            background: '#181818',
            borderRadius: 20,
            border: `1px solid ${m.glassBorderStart}`,
            padding: 16,
          }}
        >
          {/* Watchlist badge */}
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-block',
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 14,
                paddingRight: 14,
                borderRadius: 9999,
                background: 'rgba(245, 158, 11, 0.18)',
                color: m.warning,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Watchlist
            </span>
          </div>

          {/* Summary */}
          <p
            style={{
              fontSize: 14.5,
              color: m.foreground,
              lineHeight: 1.5,
              margin: 0,
              marginBottom: 14,
            }}
          >
            Growing demand for biological age testing among health-conscious professionals, but
            problem severity is moderate (3/5) and well-established competitors already offer
            comprehensive solutions at similar price points, limiting differentiation.
          </p>

          {/* Stat row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                flex: 1,
                background: m.surface,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: m.muted,
                  marginBottom: 7,
                }}
              >
                Problem Severity
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Dot color={m.warning} />
                <Dot color={m.warning} />
                <Dot color={m.warning} />
                <Dot color={m.border} />
                <Dot color={m.border} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: m.warning,
                    marginLeft: 4,
                  }}
                >
                  3/5
                </span>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: m.surface,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: m.muted,
                  marginBottom: 7,
                }}
              >
                Market Signal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: m.foreground,
                  }}
                >
                  Rising
                </span>
              </div>
            </div>
          </div>

          {/* Problem Evidence */}
          <div
            style={{
              background: m.surface,
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: m.muted,
                marginBottom: 6,
              }}
            >
              Problem Evidence
            </div>
            <p
              style={{
                fontSize: 13,
                color: m.foreground,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Health-conscious professionals in their 40s to 60s seek longevity optimization
              but rely on fragmented data from wearables and basic bloodwork. High engagement in
              biological age test reviews and consumer spending on $99 to $499 kits indicate
              active interest.
            </p>
          </div>

          {/* Market Evidence (cut off) */}
          <div
            style={{
              background: m.surface,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: m.muted,
                marginBottom: 6,
              }}
            >
              Market Evidence
            </div>
            <p
              style={{
                fontSize: 13,
                color: m.foreground,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Fresh 2025 and 2026 &lsquo;best of&rsquo; lists from Generation Lab, Longevity
              Advice, and mindbodygreen&hellip;
            </p>
          </div>
        </div>
      </div>

      <BottomTabs active="vault" />
    </PhoneFrame>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        background: color,
      }}
    />
  );
}

function BottomTabs({ active }: { active: 'thoughts' | 'capture' | 'sketch' | 'vault' }) {
  const tabs = [
    {
      key: 'thoughts',
      label: 'Thoughts',
      icon: (
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.85 0 014 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      ),
    },
    {
      key: 'vault',
      label: 'Vault',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="0.5" fill="currentColor" />
          <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
        </svg>
      ),
    },
  ] as const;

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
