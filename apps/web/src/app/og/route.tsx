import { ImageResponse } from "next/og";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { log } from "@/lib/observability";

const loadFont = async (): Promise<ArrayBuffer | null> => {
  try {
    const text = encodeURIComponent(`${APP_NAME}${APP_TAGLINE}`);
    const signal = AbortSignal.timeout(3000);
    const cssResponse = await fetch(
      `https://fonts.googleapis.com/css2?family=Manrope:wght@600&text=${text}`,
      { next: { revalidate: 86_400 }, signal },
    );
    if (!cssResponse.ok) {
      throw new Error("Font stylesheet unavailable");
    }
    const css = await cssResponse.text();
    const url = /src: url\((?<url>.+)\) format\('(?:opentype|truetype)'\)/v.exec(css)?.groups?.url;
    if (url === undefined || url === "") {
      throw new Error("Font URL unavailable");
    }
    const response = await fetch(url, { next: { revalidate: 86_400 }, signal });
    if (!response.ok) {
      throw new Error("Font data unavailable");
    }
    return await response.arrayBuffer();
  } catch (error) {
    log.warn({ error, message: "Using default OG font", route: "/og" });
    return null;
  }
};

const ROWS = [
  { label: "Los Angeles", start: 220, width: 420 },
  { label: "New York", start: 160, width: 420 },
  { label: "Lisbon", start: 80, width: 420 },
  { label: "Berlin", start: 40, width: 420 },
];

const GET = async () => {
  const font = await loadFont();
  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 64,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: font ? "Manrope" : "sans-serif",
          fontSize: 64,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          maxWidth: 900,
        }}
      >
        {APP_TAGLINE}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 44 }}>
        {ROWS.map(({ label, start, width }) => (
          <div key={label} style={{ alignItems: "center", display: "flex", gap: 24 }}>
            <span style={{ color: "#a3a3a3", fontSize: 20, width: 160 }}>{label}</span>
            <div
              style={{
                backgroundColor: "#171717",
                display: "flex",
                height: 28,
                position: "relative",
                width: 850,
              }}
            >
              <div
                style={{
                  backgroundColor: "#737373",
                  height: 28,
                  left: start,
                  position: "absolute",
                  width,
                }}
              />
              <div
                style={{
                  backgroundColor: "#fafafa",
                  height: 28,
                  left: 220,
                  position: "absolute",
                  width: 240,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
        }}
      >
        <span
          style={{ fontFamily: font ? "Manrope" : "sans-serif", fontSize: 30, fontWeight: 600 }}
        >
          {APP_NAME}
        </span>
        <span style={{ color: "#a3a3a3", fontSize: 20 }}>Free and open source · collabtime.io</span>
      </div>
    </div>,
    {
      fonts: font ? [{ data: font, name: "Manrope", style: "normal", weight: 600 }] : undefined,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
      height: 630,
      width: 1200,
    },
  );
};

export { GET };
