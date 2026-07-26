import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0B0D",
        }}
      >
        <svg width={120} height={120} viewBox="0 0 32 32" fill="none">
          <path d="M16,5 A11,11 0 0,1 26.83,17.91" stroke="#F2545B" strokeWidth={3.6} strokeLinecap="round" />
          <path d="M25.53,21.5 A11,11 0 0,1 8.93,24.43" stroke="#6C5CE7" strokeWidth={3.6} strokeLinecap="round" />
          <path d="M6.47,21.5 A11,11 0 0,1 12.24,5.66" stroke="#3B82F6" strokeWidth={3.6} strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
