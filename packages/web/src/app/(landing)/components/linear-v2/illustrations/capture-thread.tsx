'use client';

/**
 * Pixel replica of packages/mobile/src/app/(tabs)/capture.tsx in IDLE state.
 *
 * Layout (top to bottom):
 *   - HeaderBar: "IDEA FUEL" wordmark center + 32px brand avatar right
 *   - NeuralBackground (Three.js neural network — approx as SVG)
 *   - Center vertical area:
 *     - IdeaFuelLogo 120px
 *     - 24px gap
 *     - Slogan "DON'T LET YOUR IDEAS DIE" (gray with red "DIE")
 *   - Bottom inputBar (px=16, py top=14, py bottom=10):
 *     - bg=card, borderRadius=24, border=border (NOT brandGlow when idle)
 *     - Top brand-gradient stroke (h=2)
 *     - Placeholder "Capture your idea..." in mutedDim (16px geist)
 *     - Action row:
 *       - Paperclip in 34x34 surface circle (left)
 *       - Mic 18px brand in 34x34 surface circle (right, NO pulse — not listening)
 *   - TabBar: Thoughts | Capture (active) | Sketch | Vault
 *
 * No CaptureActionMenu — that's a modal, only shows when triggered.
 */

import { m, PhoneFrame, NeuralBackground, FlameLogo, Slogan, TabBar, HeaderBar } from './mobile-shared';

export function CaptureThreadIllustration() {
  return (
    <PhoneFrame>
      <NeuralBackground />

      {/* Header */}
      <div className="relative z-10">
        <HeaderBar />
      </div>

      {/* Center: logo + slogan */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: 44, paddingBottom: 180 }}
      >
        <FlameLogo size={120} />
        <div style={{ marginTop: 24 }}>
          <Slogan width={260} />
        </div>
      </div>

      {/* Bottom input bar */}
      <div
        className="absolute z-10"
        style={{
          left: 16,
          right: 16,
          bottom: 84,
        }}
      >
        <div
          className="relative"
          style={{
            background: m.card,
            borderRadius: 24,
            border: `1px solid ${m.border}`,
            paddingTop: 14,
            paddingBottom: 10,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {/* Top brand-gradient stroke */}
          <div
            className="absolute"
            style={{
              top: -1,
              left: 24,
              right: 24,
              height: 2,
              background: `linear-gradient(to right, transparent, ${m.brand}, transparent)`,
            }}
          />

          {/* Placeholder text */}
          <div
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 16,
              lineHeight: '22px',
              color: m.mutedDim,
              paddingBottom: 10,
            }}
          >
            Capture your idea...
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between">
            {/* Paperclip — 34x34 surface circle */}
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: m.surface,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={m.muted}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </div>

            {/* Mic — IDLE state (no listening, no pulse, brand icon on surface) */}
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: m.surface,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={m.brand}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <TabBar active="capture" />
    </PhoneFrame>
  );
}
