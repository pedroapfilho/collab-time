/**
 * Hex mirrors of `--background` in packages/ui/src/styles/globals.css, for surfaces that cannot
 * read CSS variables: the theme-color meta, the web manifest, and generated icons.
 */
const THEME_COLORS = {
  dark: "#0a0a0a",
  light: "#ffffff",
} as const;

const BRAND_INK = "#fafafa";

export { BRAND_INK, THEME_COLORS };
