import { ImageResponse } from "next/og";

import { BRAND_INK, THEME_COLORS } from "@/lib/theme-colors";

const ICON_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, immutable";

/**
 * The hollow square from the nav logo (`size-3.5 border-2`) on the dark ground, scaled to a
 * square icon. The mark stays inside the central 50% so the same image also works as a maskable
 * PWA icon.
 */
const renderBrandMark = (size: number) => {
  const side = Math.round(size * 0.4375);
  const stroke = Math.max(2, Math.round(size * 0.0625));

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        backgroundColor: THEME_COLORS.dark,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div style={{ border: `${stroke}px solid ${BRAND_INK}`, height: side, width: side }} />
    </div>,
    { headers: { "Cache-Control": ICON_CACHE_CONTROL }, height: size, width: size },
  );
};

export { renderBrandMark };
