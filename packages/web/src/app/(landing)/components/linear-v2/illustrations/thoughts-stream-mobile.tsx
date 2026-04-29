'use client';

/**
 * Pixel-replica of the mobile Thoughts → Stream tab.
 * Shows the segmented control (Stream | Clusters) + a list of recent
 * captured notes with type dot, title, description, time, and metadata
 * chips (cluster, connections).
 *
 * Mirrors packages/mobile/src/app/(tabs)/thoughts/index.tsx.
 */

import { m, PhoneFrame, HeaderBar, TabBar } from './mobile-shared';

type Note = {
  title: string;
  desc: string;
  time: string;
  dotColor: string;
  cluster?: { name: string; color: string };
  connections?: number;
};

const notes: Note[] = [
  {
    title: 'Voice memos for fly fishing trips',
    desc: 'What if you could narrate the flies you tied that day, what worked, what didn\'t — geo-tagged.',
    time: '2m ago',
    dotColor: '#E32B1A',
    cluster: { name: 'Outdoor SaaS', color: '#E32B1A' },
    connections: 4,
  },
  {
    title: 'Subscription bourbon barrels',
    desc: 'Aged 2 years before they ship. People love the wait. Buy the future, not the present.',
    time: '1h ago',
    dotColor: '#F59E0B',
    cluster: { name: 'Food & Drink', color: '#F59E0B' },
    connections: 2,
  },
  {
    title: 'AI for golf course superintendents',
    desc: 'Soil moisture, weather, mowing schedule — solo operator, $80k/yr, drowning in spreadsheets.',
    time: '3h ago',
    dotColor: '#0393F8',
  },
  {
    title: 'Lawn care marketplace, but route-aware',
    desc: 'Match crews to neighbors so you cut 5 lawns on one street, not one in 5 cities.',
    time: 'yesterday',
    dotColor: '#10B981',
    cluster: { name: 'Outdoor SaaS', color: '#E32B1A' },
    connections: 3,
  },
];

export function ThoughtsStreamMobileIllustration() {
  return (
    <PhoneFrame>
      <HeaderBar />

      {/* Title row */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 6, paddingBottom: 12 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: m.foreground,
            letterSpacing: '-0.6px',
            marginBottom: 2,
          }}
        >
          Thoughts
        </h1>
        <p style={{ fontSize: 13, color: m.muted }}>23 captured · 4 resurfaced today</p>
      </div>

      {/* Segmented control */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            background: '#1A1A1A',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}
        >
          <Segment label="Stream" active />
          <Segment label="Clusters" />
        </div>
      </div>

      {/* Note list */}
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {notes.map((n, i) => (
          <NoteCard key={i} note={n} />
        ))}
      </div>

      <TabBar active="thoughts" />
    </PhoneFrame>
  );
}

function Segment({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        paddingTop: 8,
        paddingBottom: 8,
        borderRadius: 8,
        background: active ? m.card : 'transparent',
        fontSize: 13,
        fontWeight: 600,
        color: active ? m.foreground : m.mutedDim,
      }}
    >
      {label}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${m.glassBorderStart}, ${m.glassBorderEnd})`,
        borderRadius: 24,
        padding: 1,
      }}
    >
      <div style={{ background: m.card, borderRadius: 23, overflow: 'hidden' }}>
        {/* Top */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: 16,
            paddingBottom: 14,
            gap: 14,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: note.dotColor,
              marginTop: 6,
              flexShrink: 0,
            }}
          />
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
              {note.title}
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
              }}
            >
              {note.desc}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: m.glassBorderStart,
            marginLeft: 16,
            marginRight: 16,
            opacity: 0.5,
          }}
        />

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
          <span style={{ fontSize: 12, color: m.mutedDim }}>{note.time}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {note.cluster && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: note.cluster.color,
                  }}
                />
                <span style={{ fontSize: 11, color: m.mutedDim }}>{note.cluster.name}</span>
              </div>
            )}
            {note.connections !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M9 6h9a3 3 0 013 3v3" />
                </svg>
                <span style={{ fontSize: 11, color: m.mutedDim }}>{note.connections}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
