'use client';

/**
 * Pixel-replica of the mobile Cluster (formerly Sandbox) tab.
 * Shows clusters that group related thoughts, with a count of notes
 * in each cluster and a most-recent timestamp.
 */

import { m, PhoneFrame, HeaderBar, TabBar } from './mobile-shared';

type Cluster = {
  name: string;
  noteCount: number;
  recent: string;
  color: string;
  active?: boolean;
};

const clusters: Cluster[] = [
  { name: 'Outdoor SaaS', noteCount: 7, recent: '2m ago', color: '#E32B1A', active: true },
  { name: 'Subscription products', noteCount: 4, recent: '1h ago', color: '#F59E0B' },
  { name: 'Marketplaces', noteCount: 3, recent: 'today', color: '#0393F8' },
  { name: 'Vertical AI tools', noteCount: 5, recent: 'yesterday', color: '#10B981' },
  { name: 'Local services', noteCount: 2, recent: '3d ago', color: '#A855F7' },
];

export function ClusterMobileIllustration() {
  return (
    <PhoneFrame>
      <HeaderBar />

      {/* Title row */}
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
          Cluster
        </h1>
        <p style={{ fontSize: 13, color: m.muted }}>
          Group related thoughts. Find unexpected connections.
        </p>
      </div>

      {/* AI suggestion pill */}
      <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            background: m.brandMuted,
            border: `1px solid ${m.brand}40`,
            borderRadius: 14,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: m.brand,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: m.foreground }}>
              3 new connections found
            </div>
            <div style={{ fontSize: 11, color: m.muted, marginTop: 1 }}>
              Across &ldquo;Outdoor SaaS&rdquo; &amp; &ldquo;Local services&rdquo;
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={m.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      {/* Cluster list */}
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {clusters.map((c, i) => (
          <ClusterCard key={i} cluster={c} />
        ))}
      </div>

      <TabBar active="vault" />
    </PhoneFrame>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <div
      style={{
        background: cluster.active
          ? `linear-gradient(135deg, ${cluster.color}30, ${cluster.color}10)`
          : `linear-gradient(135deg, ${m.glassBorderStart}, ${m.glassBorderEnd})`,
        borderRadius: 20,
        padding: 1,
      }}
    >
      <div
        style={{
          background: m.card,
          borderRadius: 19,
          overflow: 'hidden',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: cluster.color,
            flexShrink: 0,
            boxShadow: `0 0 12px ${cluster.color}60`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: m.foreground,
              marginBottom: 2,
            }}
          >
            {cluster.name}
          </div>
          <div style={{ fontSize: 12, color: m.mutedDim }}>
            {cluster.noteCount} thoughts · last added {cluster.recent}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.mutedDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}
