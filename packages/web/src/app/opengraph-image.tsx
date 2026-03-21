import { ImageResponse } from "next/og";

export const alt = "IDEA FUEL - Stop Guessing. Start Building.";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#161513",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: "#e32b1a",
          }}
        />

        {/* Subtle gradient glow behind the title */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(227,43,26,0.08) 0%, rgba(22,21,19,0) 70%)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0px",
          }}
        >
          {/* Brand name */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontSize: "96px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "8px",
                lineHeight: 1,
              }}
            >
              IDEA
            </span>
            <span
              style={{
                fontSize: "96px",
                fontWeight: 700,
                color: "#e32b1a",
                letterSpacing: "8px",
                lineHeight: 1,
              }}
            >
              FUEL
            </span>
          </div>

          {/* Divider line */}
          <div
            style={{
              width: "80px",
              height: "3px",
              backgroundColor: "#e32b1a",
              marginTop: "32px",
              marginBottom: "32px",
              borderRadius: "2px",
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: "#f0ece6",
              letterSpacing: "2px",
              lineHeight: 1,
            }}
          >
            Stop Guessing. Start Building.
          </div>

          {/* Subtext */}
          <div
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: "rgba(240,236,230,0.45)",
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginTop: "24px",
              lineHeight: 1,
            }}
          >
            AI-Powered Business Validation
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: "#e32b1a",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
