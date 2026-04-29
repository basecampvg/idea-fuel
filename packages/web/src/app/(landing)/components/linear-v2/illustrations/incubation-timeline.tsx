'use client';

/**
 * Pixel replica of packages/mobile/src/app/(tabs)/thoughts/index.tsx (Stream view).
 *
 * Layout:
 *   - HeaderBar: "IDEA FUEL" + avatar
 *   - Title row: "Thoughts" 28px display-bold (paddingX=20, top=8, bottom=12)
 *   - Segmented control: surface bg, borderRadius=10, padding=3, mx=20
 *     - "Stream" (active=card bg) / "Clusters" (inactive)
 *     - Segments: paddingY=8, borderRadius=8, 13px display-semiBold
 *     - Active text=foreground, inactive=mutedDim
 *   - REVISIT section (horizontal scroll):
 *     - Header: "REVISIT" 13px display-semiBold uppercase tracking 0.5, muted
 *     - Cards: 220px wide, surface bg, borderRadius=14, border 1px border, padding=12
 *       - cardMeta: maturity dot + type chip uppercase
 *       - 2-line content preview (13px regular, foreground)
 *       - "X days ago" mutedDim
 *       - actions row: Dismiss (X muted) / Engage (MessageSquarePlus brand) / Cluster (FolderPlus #14B8A6)
 *   - Thought cards (gradient glass border 24px, padding 1, inner card bg=card 23px):
 *     - cardTop: 10x10 colored thoughtType dot + title 16px display-semiBold + 2-line desc
 *     - Divider 1px glassBorderStart opacity 0.5
 *     - Footer: time 12px regular mutedDim + badge row:
 *       - type chip ("Observation") 11px regular mutedDim
 *       - cluster chip (7x7 dot + name) for clustered thoughts
 *       - connection chip (Link icon + count)
 *   - FAB bottom-right: 56x56 brand circle, Plus 24 white
 *   - TabBar: Thoughts (active) | Capture | Sketch | Vault
 */

import { m, PhoneFrame, TabBar, HeaderBar } from './mobile-shared';

const THOUGHT_TYPE_COLORS = {
  problem: '#EF4444',
  solution: '#10B981',
  what_if: '#8B5CF6',
  observation: '#3B82F6',
  question: '#F59E0B',
} as const;

type ThoughtType = keyof typeof THOUGHT_TYPE_COLORS;

const THOUGHT_TYPE_LABELS: Record<ThoughtType, string> = {
  problem: 'Problem',
  solution: 'Solution',
  what_if: 'What If',
  observation: 'Observation',
  question: 'Question',
};

const revisitCandidates = [
  {
    type: 'observation' as const,
    typeLabel: 'OBSERVATION',
    body: 'Every coffee shop has the same broken wifi setup. Captive portal, three SSIDs, beach ball...',
    daysAgo: 7,
    maturity: 'spark' as const,
  },
  {
    type: 'what_if' as const,
    typeLabel: 'WHAT IF',
    body: 'Invoice software could actually call the customer who hasn’t paid. Voice AI is good enough now.',
    daysAgo: 14,
    maturity: 'spark' as const,
  },
];

const thoughts: {
  title: string;
  body: string;
  thoughtType: ThoughtType;
  date: string;
  promoted?: boolean;
  cluster?: { name: string; color: string };
  connections?: number;
}[] = [
  {
    title: 'Pool techs use $400/mo software wri...',
    body: 'Pool techs use $400/mo software written in 2008. PE-acquired, no roadmap. Clean iOS-first build wins this.',
    thoughtType: 'observation',
    date: 'Apr 24',
    cluster: { name: 'Local services', color: '#3B82F6' },
    connections: 2,
  },
  {
    title: 'Onboarding videos for SaaS are univ...',
    body: 'Onboarding videos are universally terrible. 8-minute tours nobody watches. Voice walkthroughs that adapt to where the user is.',
    thoughtType: 'problem',
    date: 'Apr 22',
    cluster: { name: 'B2B SaaS', color: '#8B5CF6' },
    connections: 1,
  },
  {
    title: 'Concierge AI for every Shopify stor...',
    body: 'What if every Shopify store had a concierge AI that learned the brand voice and answered DMs at 3am? $99/mo, recurring.',
    thoughtType: 'what_if',
    date: 'Apr 21',
  },
];

export function IncubationTimelineIllustration() {
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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
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
          Thoughts
        </h1>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17v0.5" />
        </svg>
      </div>

      {/* Segmented control */}
      <div
        style={{
          marginLeft: 20,
          marginRight: 20,
          marginBottom: 12,
          background: m.surface,
          borderRadius: 10,
          padding: 3,
          display: 'flex',
        }}
      >
        <SegmentBtn label="Stream" active />
        <SegmentBtn label="Clusters" />
      </div>

      {/* Revisit section */}
      <div style={{ paddingLeft: 20, paddingRight: 20, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10,
            paddingLeft: 4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0015.4 6.4M21 12a9 9 0 00-15.4-6.4" />
            <path d="M3 4v5h5M21 20v-5h-5" />
          </svg>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: m.muted,
            }}
          >
            REVISIT
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflow: 'hidden',
          }}
        >
          {revisitCandidates.map((c, i) => (
            <RevisitCard key={i} {...c} />
          ))}
        </div>
      </div>

      {/* Thought cards */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {thoughts.map((t, i) => (
          <ThoughtCard key={i} {...t} />
        ))}
      </div>

      {/* FAB */}
      <div
        className="absolute z-10 flex items-center justify-center"
        style={{
          bottom: 96,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: m.brand,
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <TabBar active="thoughts" />
    </PhoneFrame>
  );
}

function SegmentBtn({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        paddingTop: 8,
        paddingBottom: 8,
        borderRadius: 8,
        background: active ? m.card : 'transparent',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: active ? m.foreground : m.mutedDim,
      }}
    >
      {label}
    </div>
  );
}

function RevisitCard({
  type,
  typeLabel,
  body,
  daysAgo,
  maturity: _maturity,
}: {
  type: ThoughtType | '';
  typeLabel: string;
  body: string;
  daysAgo: number;
  maturity: 'spark' | 'developing' | 'hypothesis' | 'conviction';
}) {
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: m.surface,
        borderRadius: 14,
        padding: 12,
        border: `1px solid ${m.border}`,
      }}
    >
      {/* Meta row: maturity dot + type chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}
      >
        {/* Maturity dot — spark = hollow */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            border: `1px solid #6B7280`,
          }}
        />
        {typeLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              color: m.muted,
            }}
          >
            {typeLabel}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: '18px',
          color: m.foreground,
          marginBottom: 6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {body}
      </div>
      <div
        style={{
          fontSize: 11,
          color: m.mutedDim,
          marginBottom: 10,
        }}
      >
        {daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <ActionBtn icon={<XIcon color={m.muted} />} label="Dismiss" color={m.muted} />
        <ActionBtn icon={<MessageSquarePlusIcon color={m.brand} />} label="Engage" color={m.brand} />
        <ActionBtn icon={<FolderPlusIcon color="#14B8A6" />} label="Cluster" color="#14B8A6" />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center" style={{ gap: 4 }}>
      {icon}
      <span style={{ fontSize: 12, color }}>{label}</span>
    </div>
  );
}

function XIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function MessageSquarePlusIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M12 8v4M10 10h4" />
    </svg>
  );
}

function FolderPlusIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}

function ThoughtCard({
  title,
  body,
  thoughtType,
  date,
  promoted,
  cluster,
  connections,
}: {
  title: string;
  body: string;
  thoughtType: ThoughtType;
  date: string;
  promoted?: boolean;
  cluster?: { name: string; color: string };
  connections?: number;
}) {
  const dotColor = promoted ? m.success : THOUGHT_TYPE_COLORS[thoughtType];
  const typeLabel = THOUGHT_TYPE_LABELS[thoughtType];

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
          background: m.card,
          borderRadius: 23,
          overflow: 'hidden',
        }}
      >
        {/* Top */}
        <div style={{ display: 'flex', padding: 16, paddingBottom: 14, gap: 14, alignItems: 'flex-start' }}>
          {/* 10x10 colored dot */}
          <div style={{ width: 10, height: 10, borderRadius: 5, background: dotColor, marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: m.foreground,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: m.muted,
                lineHeight: '18px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'pre-line',
              }}
            >
              {body}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ marginLeft: 16, marginRight: 16, height: 1, background: m.glassBorderStart, opacity: 0.5 }} />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 10,
            paddingBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, color: m.mutedDim }}>{date}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: m.mutedDim }}>{typeLabel}</span>
            {cluster && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: cluster.color }} />
                <span style={{ fontSize: 11, color: m.mutedDim }}>{cluster.name}</span>
              </div>
            )}
            {connections && connections > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5" />
                  <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" />
                </svg>
                <span style={{ fontSize: 11, color: m.mutedDim }}>{connections}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
