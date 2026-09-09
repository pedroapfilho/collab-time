import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { THEME_COLORS } from "@/lib/theme-colors";

const manifest = (): MetadataRoute.Manifest => ({
  background_color: THEME_COLORS.dark,
  description: APP_DESCRIPTION,
  display: "standalone",
  icons: [
    {
      sizes: "any",
      src: "/icon.svg",
      type: "image/svg+xml",
    },
    {
      purpose: "any",
      sizes: "192x192",
      src: "/icon-192.png",
      type: "image/png",
    },
    {
      purpose: "any",
      sizes: "512x512",
      src: "/icon-512.png",
      type: "image/png",
    },
    {
      purpose: "maskable",
      sizes: "512x512",
      src: "/icon-512.png",
      type: "image/png",
    },
  ],
  id: "/",
  name: APP_NAME,
  short_name: APP_NAME,
  start_url: "/",
  theme_color: THEME_COLORS.dark,
});

export default manifest;
