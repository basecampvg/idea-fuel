'use client';

/**
 * Pixel replica of packages/mobile/src/app/(tabs)/vault/index.tsx.
 *
 * Layout:
 *   - HeaderBar: "IDEA FUEL" + avatar
 *   - Title: "Vault" 28px display-bold (paddingX=20, top=8, bottom=12)
 *   - Search row + filter button (paddingX=20, marginBottom=12)
 *     - Search: card bg, brandGlow border, 22px high, top brand-gradient stroke
 *     - Filter: 44x44 surface bg circle
 *   - Vault cards (gradient glass border 24px, padding=1, inner card bg=card 23px):
 *     - For validated cards: cardTopGlow with verdict accent (transparent → accent → transparent)
 *     - Subtle vertical glow gradient from top with verdict accent
 *     - cardTop: icon (42x42 verdict iconBg) + title + 2-line description + delete trash icon
 *     - validatePrompt: Zap brand "Tap to validate this idea" OR CheckCircle success "Validated"
 *     - statsGrid (validated only): Verdict / Problem / Market / TAM
 *     - Footer: time + verdict badge + action button
 *   - TabBar: Thoughts | Capture | Sketch | Vault (active)
 */

import { m, PhoneFrame, TabBar, HeaderBar } from './mobile-shared';

type Verdict = 'proceed' | 'watchlist' | 'drop' | 'draft';

const cards: {
  title: string;
  description: string;
  verdict: Verdict;
  problem?: string;
  market?: string;
  tam?: string;
  time: string;
}[] = [
  {
    title: 'AI Meal Planner',
    description: 'Builds backward from family budget, learns eating patterns, outputs grocery lists.',
    verdict: 'proceed',
    problem: '4/5',
    market: 'Rising',
    tam: '$2.4B',
    time: '2h ago',
  },
  {
    title: 'Pet Health Wearable',
    description: 'Continuous vitals monitoring for dogs and cats. Alerts before symptoms emerge.',
    verdict: 'watchlist',
    problem: '3/5',
    market: 'Flat',
    tam: '$890M',
    time: '1d ago',
  },
  {
    title: 'Local Service Marketplace',
    description: 'Hyperlocal contractor matching for suburbs.',
    verdict: 'drop',
    time: '3d ago',
  },
];

export function ValidateMonitorIllustration() {
  return (
    <PhoneFrame>
      <HeaderBar />

      {/* Title */}
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        <h1
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: m.foreground,
          }}
        >
          Vault
        </h1>
      </div>

      {/* Search + Filter row */}
      <div
        style={{
          marginLeft: 20,
          marginRight: 20,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: m.card,
            border: `1px solid ${m.brandGlow}`,
            borderRadius: 22,
            height: 44,
            paddingLeft: 14,
            paddingRight: 14,
            boxShadow: '0 0 12px rgba(227,43,26,0.2)',
          }}
        >
          {/* Top glow */}
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: 24,
              right: 24,
              height: 2,
              background: `linear-gradient(to right, transparent, ${m.brand}, transparent)`,
            }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.5-4.5" />
          </svg>
          <span style={{ fontSize: 14, color: m.mutedDim }}>Search ideas...</span>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: m.card,
            border: `1px solid ${m.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h13M16 6h5M3 12h5M8 12h13M3 18h13M16 18h5" />
            <circle cx="14" cy="6" r="2" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="18" r="2" />
          </svg>
        </div>
      </div>

      {/* Cards */}
      <div style={{ paddingLeft: 20, paddingRight: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cards.map((c, i) => (
          <VaultCard key={i} {...c} />
        ))}
      </div>

      <TabBar active="vault" />
    </PhoneFrame>
  );
}

function VaultCard({
  title,
  description,
  verdict,
  problem,
  market,
  tam,
  time,
}: {
  title: string;
  description: string;
  verdict: Verdict;
  problem?: string;
  market?: string;
  tam?: string;
  time: string;
}) {
  const meta = getMeta(verdict);
  const hasResult = verdict !== 'draft';

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${m.glassBorderStart}, ${m.glassBorderEnd})`,
        borderRadius: 24,
        padding: 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: m.card,
          borderRadius: 23,
          overflow: 'hidden',
        }}
      >
        {/* Verdict accent stroke at top */}
        {hasResult && meta.accentColor && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 24,
              right: 24,
              height: 2,
              background: `linear-gradient(to right, transparent, ${meta.accentColor}, transparent)`,
            }}
          />
        )}

        {/* Subtle vertical glow */}
        {hasResult && meta.accentColor && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `linear-gradient(to bottom, ${meta.accentColor}18, ${meta.accentColor}08, transparent 70%)`,
            }}
          />
        )}

        <div style={{ position: 'relative' }}>
          {/* Top: icon + text + delete */}
          <div style={{ display: 'flex', padding: 16, paddingBottom: 12, gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                flexShrink: 0,
                background: meta.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {meta.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: m.foreground,
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
                {description}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" />
            </svg>
          </div>

          {/* Validate prompt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 16, paddingBottom: 8 }}>
            {hasResult ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: m.success }}>Validated</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={m.brand} stroke={m.brand} strokeWidth="1.5" strokeLinejoin="round">
                  <path d="M13 2L3 14h7v8l10-12h-7V2z" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: m.brand }}>Tap to validate this idea</span>
              </>
            )}
          </div>

          {/* Stats grid (validated only) */}
          {hasResult && problem && market && tam && (
            <div
              style={{
                marginLeft: 16,
                marginRight: 16,
                marginBottom: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: m.background,
                borderRadius: 12,
                border: `1px solid ${m.borderSubtle}`,
                overflow: 'hidden',
              }}
            >
              <StatCell label="Verdict" value={meta.badgeLabel} divider />
              <StatCell label="Problem" value={problem} divider />
              <StatCell label="Market" value={market} divider />
              <StatCell label="TAM" value={tam} />
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: m.mutedDim }}>{time}</span>
              <span
                style={{
                  borderRadius: 9999,
                  background: meta.badgeBg,
                  color: meta.badgeColor,
                  paddingTop: 3,
                  paddingBottom: 3,
                  paddingLeft: 10,
                  paddingRight: 10,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {meta.badgeLabel}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 9999,
                paddingLeft: 12,
                paddingRight: 8,
                paddingTop: 6,
                paddingBottom: 6,
                fontSize: 12,
                fontWeight: 600,
                background: hasResult ? m.surface : m.brandMuted,
                color: hasResult ? m.muted : m.brand,
              }}
            >
              {hasResult ? 'View Report' : 'Validate Idea'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        textAlign: 'center',
        borderRight: divider ? `1px solid ${m.borderSubtle}` : 'none',
      }}
    >
      <div style={{ fontSize: 9, textTransform: 'uppercase', color: m.mutedDim, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: m.foreground, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function getMeta(verdict: Verdict) {
  if (verdict === 'proceed') {
    return {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      iconBg: 'rgba(3, 147, 248, 0.15)',
      badgeLabel: 'Proceed',
      badgeColor: m.success,
      badgeBg: 'rgba(3, 147, 248, 0.15)',
      accentColor: m.success,
    };
  }
  if (verdict === 'watchlist') {
    return {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      iconBg: 'rgba(245, 158, 11, 0.15)',
      badgeLabel: 'Watchlist',
      badgeColor: m.warning,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      accentColor: m.warning,
    };
  }
  if (verdict === 'drop') {
    return {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.destructive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      ),
      iconBg: 'rgba(239, 68, 68, 0.15)',
      badgeLabel: 'Drop',
      badgeColor: m.destructive,
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      accentColor: m.destructive,
    };
  }
  return {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.6 1 1.4 1 2.3v1h6v-1c0-.9.4-1.7 1-2.3A7 7 0 0012 2z" />
      </svg>
    ),
    iconBg: m.brandMuted,
    badgeLabel: 'Draft',
    badgeColor: m.brand,
    badgeBg: m.brandMuted,
    accentColor: null as string | null,
  };
}
