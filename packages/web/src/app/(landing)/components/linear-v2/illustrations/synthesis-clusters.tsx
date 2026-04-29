'use client';

/**
 * Pixel replica of packages/mobile/src/app/(tabs)/thoughts/index.tsx
 * (Clusters view).
 *
 * Same outer shell as Stream view, but:
 *   - "Clusters" segment is active
 *   - Shows SwipeableClusterCard list (no Revisit, no thought cards)
 *   - Each cluster card:
 *     - Glass gradient border
 *     - Inner: padding=16, gap=14, alignItems=center
 *       - 14x14 colorDot (cluster.color)
 *       - title 16px display-semiBold + meta "X thoughts" 12px regular mutedDim
 *       - time 12px regular mutedDim
 *   - Brand FAB (Plus → CreateClusterModal)
 *
 * For marketing demo, also showing the CreateClusterModal peeking with the
 * 8 CLUSTER_COLORS swatches.
 */

import { m, PhoneFrame, TabBar, HeaderBar } from './mobile-shared';

const CLUSTER_COLORS = [
  '#6C5CE7',
  '#00B894',
  '#FDCB6E',
  '#E17055',
  '#0984E3',
  '#D63031',
  '#A29BFE',
  '#55EFC4',
];

const clusters = [
  { name: 'Idea fuel', color: '#8B5CF6', count: 9, time: '2h ago' },
  { name: 'Mobile bugs', color: '#EF4444', count: 5, time: '1d ago' },
  { name: 'Marketing channels', color: '#10B981', count: 7, time: '3d ago' },
  { name: 'Pricing experiments', color: '#F59E0B', count: 4, time: '5d ago' },
];

export function SynthesisClustersIllustration() {
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
      </div>

      {/* Segmented control — Clusters active */}
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
        <SegmentBtn label="Stream" />
        <SegmentBtn label="Clusters" active />
      </div>

      {/* Cluster cards */}
      <div style={{ paddingLeft: 20, paddingRight: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clusters.map((c, i) => (
          <ClusterCard key={i} {...c} />
        ))}
      </div>

      {/* CreateClusterModal — peeking */}
      <div
        className="absolute z-30 inset-0 flex items-center justify-center"
        style={{
          background: 'rgba(0,0,0,0.6)',
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <div
          style={{
            background: m.card,
            borderRadius: 20,
            padding: 24,
            width: '100%',
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: m.foreground,
              marginBottom: 20,
            }}
          >
            New Cluster
          </div>

          {/* Input */}
          <div
            style={{
              background: m.background,
              borderRadius: 12,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 16,
              color: m.foreground,
              border: `1px solid ${m.border}`,
              marginBottom: 16,
            }}
          >
            Healthcare AI tools
          </div>

          {/* Color label */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: m.muted,
              marginBottom: 12,
            }}
          >
            COLOR
          </div>

          {/* Color swatches */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {CLUSTER_COLORS.map((c, i) => (
              <div
                key={c}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: c,
                  border: i === 4 ? `3px solid ${m.foreground}` : 'none',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              style={{
                flex: 1,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 12,
                background: m.background,
                border: `1px solid ${m.border}`,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 600,
                color: m.muted,
              }}
            >
              Cancel
            </div>
            <div
              style={{
                flex: 1,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 12,
                background: m.brand,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 600,
                color: 'white',
              }}
            >
              Create
            </div>
          </div>
        </div>
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

function ClusterCard({
  name,
  color,
  count,
  time,
}: {
  name: string;
  color: string;
  count: number;
  time: string;
}) {
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
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: 7, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: m.foreground,
              marginBottom: 2,
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 12, color: m.mutedDim }}>
            {count === 1 ? '1 thought' : `${count} thoughts`}
          </div>
        </div>
        <div style={{ fontSize: 12, color: m.mutedDim, flexShrink: 0 }}>{time}</div>
      </div>
    </div>
  );
}
