import { ImageResponse } from "next/og";

export const alt = "Sheffield Masjids prayer times";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #0A1128 0%, #162447 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "80px",
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ color: "#FFB380", fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>
        SHEFFIELD MASJIDS
      </div>
      <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.1, marginTop: 28 }}>
        Prayer and Iqamah Times
      </div>
      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 30, marginTop: 30 }}>
        Daily mosque timetables across Sheffield
      </div>
    </div>,
    size,
  );
}
