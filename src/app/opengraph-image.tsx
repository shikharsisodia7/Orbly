import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0B0B0D",
          padding: "80px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width={64} height={64} viewBox="0 0 32 32" fill="none">
            <path d="M16,5 A11,11 0 0,1 26.83,17.91" stroke="#F2545B" strokeWidth={3.2} strokeLinecap="round" />
            <path d="M25.53,21.5 A11,11 0 0,1 8.93,24.43" stroke="#6C5CE7" strokeWidth={3.2} strokeLinecap="round" />
            <path d="M6.47,21.5 A11,11 0 0,1 12.24,5.66" stroke="#3B82F6" strokeWidth={3.2} strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Orbly
          </span>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 46,
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.2,
            maxWidth: 900,
            letterSpacing: "-0.01em",
          }}
        >
          Know who&apos;s really in your circle.
        </div>
        <div style={{ marginTop: 28, fontSize: 26, color: "#9A9AA2", maxWidth: 780 }}>
          Upload your Instagram export, analyze it locally, and see the full picture — no login, no password, nothing leaves your browser.
        </div>
      </div>
    ),
    { ...size }
  );
}
