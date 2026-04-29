'use client';

/**
 * Pixel-replica of the mobile Talk to Customers screen — generated
 * customer interview with three gated access modes (Public · Password · NDA).
 *
 * Mirrors packages/mobile/src/app/(tabs)/vault/[id]/customer-interview.tsx.
 */

import { m, PhoneFrame } from './mobile-shared';

export function TalkToCustomersMobileIllustration({ width }: { width?: number }) {
  return (
    <PhoneFrame width={width}>
      {/* IDEA FUEL wordmark + avatar */}
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
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '3px', color: '#BCBCBC' }}>
            IDEA{' '}
          </span>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '3px', color: m.brand }}>
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
            color: 'white',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          MJ
        </div>
      </div>

      {/* Sub-header */}
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
          Talk to Customers
        </div>
      </div>

      {/* Status */}
      <div
        style={{
          paddingLeft: 18,
          paddingRight: 18,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 9999,
            background: m.surface,
            color: m.muted,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Draft
        </span>
        <span style={{ fontSize: 13, color: m.muted }}>Generated · ready to publish</span>
      </div>

      {/* Interview title */}
      <div style={{ paddingLeft: 18, paddingRight: 18, marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.4px',
            color: m.foreground,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Biological Age Health Audit &mdash; Customer Discovery
        </h1>
      </div>

      {/* Question card */}
      <div style={{ paddingLeft: 18, paddingRight: 18, marginBottom: 18 }}>
        <div
          style={{
            background: m.card,
            borderRadius: 16,
            border: `1px solid ${m.glassBorderStart}`,
            padding: 14,
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: m.muted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              7 Questions
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: m.accent, fontWeight: 600 }}>
              View all
            </span>
          </div>

          {/* Question previews */}
          {[
            'What does your current longevity routine look like &mdash; what do you actually do every week?',
            'When you got your last bloodwork or wearable insight, what did you do with the results?',
            'How much have you spent in the last year trying to understand your biological age?',
          ].map((q, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                paddingTop: 9,
                paddingBottom: 9,
                borderTop: i === 0 ? 'none' : `1px solid ${m.borderSubtle}`,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: m.brand, flexShrink: 0 }}>
                {i + 1}.
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: m.foreground,
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: q }}
              />
            </div>
          ))}
          <div style={{ paddingTop: 8 }}>
            <span style={{ fontSize: 12, color: m.mutedDim }}>+4 more questions &mdash; tap to expand</span>
          </div>
        </div>
      </div>

      {/* Access Control — the gated UI focal point */}
      <div style={{ paddingLeft: 18, paddingRight: 18, marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: m.muted,
            marginBottom: 10,
          }}
        >
          Access Control
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <GatingChip icon="globe" label="Public" />
          <GatingChip icon="lock" label="Password" selected />
          <GatingChip icon="file" label="NDA" />
        </div>

        {/* Password input — visible because Password is selected */}
        <div
          style={{
            background: m.card,
            border: `1px solid ${m.accent}50`,
            borderRadius: 12,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 12,
            paddingBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span style={{ fontSize: 14, color: m.foreground, letterSpacing: 4, lineHeight: 1 }}>
            ••••••••
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: m.mutedDim }}>
            Required
          </span>
        </div>
      </div>

      {/* Publish CTA */}
      <div style={{ paddingLeft: 18, paddingRight: 18 }}>
        <div
          style={{
            background: m.brand,
            borderRadius: 9999,
            paddingTop: 14,
            paddingBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Publish &amp; Share</span>
        </div>
      </div>

      <BottomTabs active="vault" />
    </PhoneFrame>
  );
}

function GatingChip({
  icon,
  label,
  selected,
}: {
  icon: 'globe' | 'lock' | 'file';
  label: string;
  selected?: boolean;
}) {
  const stroke = selected ? m.accent : m.muted;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 12,
        paddingBottom: 12,
        background: selected ? 'rgba(3, 147, 248, 0.08)' : m.card,
        border: `1px solid ${selected ? `${m.accent}60` : m.glassBorderStart}`,
        borderRadius: 12,
      }}
    >
      {icon === 'globe' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
      )}
      {icon === 'lock' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )}
      {icon === 'file' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: selected ? m.accent : m.muted,
        }}
      >
        {label}
      </span>
    </div>
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
