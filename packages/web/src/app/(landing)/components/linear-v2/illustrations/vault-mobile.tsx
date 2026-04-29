'use client';

/**
 * Pixel-replica of the mobile Vault tab — the validated business concepts.
 * Mirrors the stat-pill grid from packages/mobile/src/app/(tabs)/vault/index.tsx
 * (Verdict, Problem, Market, TAM).
 */

import { m, PhoneFrame, HeaderBar, TabBar } from './mobile-shared';

export function VaultMobileIllustration() {
  return (
    <PhoneFrame>
      <HeaderBar />

      {/* Title */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 6, paddingBottom: 16 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: m.foreground,
            letterSpacing: '-0.6px',
            marginBottom: 2,
          }}
        >
          Vault
        </h1>
        <p style={{ fontSize: 13, color: m.muted }}>Crystallized concepts &amp; validated ideas</p>
      </div>

      {/* Validated card */}
      <div style={{ paddingLeft: 20, paddingRight: 20, marginBottom: 12 }}>
        <ConceptCard
          title="Geo-tagged voice notes for fly fishing"
          desc="A capture-first journal that learns the river, fly, and conditions for every trip."
          validated
          stats={[
            { label: 'Verdict', value: 'Promising', tone: 'success' },
            { label: 'Problem', value: 'Strong', tone: 'success' },
            { label: 'Market', value: '8.4/10' },
            { label: 'TAM', value: '$420M' },
          ]}
        />
      </div>

      {/* Pending validate card */}
      <div style={{ paddingLeft: 20, paddingRight: 20, marginBottom: 12 }}>
        <ConceptCard
          title="Route-aware lawn care marketplace"
          desc="Match crews to streets, not addresses. 5 lawns per stop, not 1 per drive."
          stats={null}
        />
      </div>

      {/* Pending validate card */}
      <div style={{ paddingLeft: 20, paddingRight: 20 }}>
        <ConceptCard
          title="AI ops assistant for golf supers"
          desc="Soil moisture, weather, mowing — solo $80k/yr ops, drowning in spreadsheets."
          stats={null}
        />
      </div>

      <TabBar active="vault" />
    </PhoneFrame>
  );
}

function ConceptCard({
  title,
  desc,
  validated,
  stats,
}: {
  title: string;
  desc: string;
  validated?: boolean;
  stats:
    | null
    | { label: string; value: string; tone?: 'success' | 'default' }[];
}) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${m.glassBorderStart}, ${m.glassBorderEnd})`,
        borderRadius: 22,
        padding: 1,
      }}
    >
      <div style={{ background: m.card, borderRadius: 21, overflow: 'hidden', padding: 16 }}>
        {/* Top */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: validated ? m.brandMuted : '#1F1F1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={validated ? m.brand : m.mutedDim}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 9.5l5 5M14 9.5l-5 5" opacity="0.0" />
              <circle cx="8.5" cy="8.5" r="0.6" fill="currentColor" />
              <path d="M9.8 9.8l4.5 4.5M14.3 9.8l-4.5 4.5" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: m.foreground,
                marginBottom: 4,
                lineHeight: 1.25,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: m.muted,
                lineHeight: '17px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {desc}
            </div>
          </div>
        </div>

        {stats === null ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              background: m.brandMuted,
              borderRadius: 10,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: m.brand }}>
              Tap to validate this idea
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#181818',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 10, color: m.mutedDim, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: s.tone === 'success' ? m.success : m.foreground,
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
