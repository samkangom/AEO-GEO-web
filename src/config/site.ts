/**
 * Single source of truth for branding. The product name may change — never
 * hardcode it in components; import `siteConfig` instead.
 */
export const siteConfig = {
  name: "ClearCite",
  tagline: "See whether AI answer engines recommend your brand — and fix it when they don't.",
  description:
    "AI visibility (AEO/GEO) for Indian brands and organisations. Audit your site, monitor ChatGPT and Claude answers, and track where you're mentioned, cited or missing.",
  contactEmail: "hello@clearcite.in",
  // Also consumed by tailwind.config.ts, so colours only live here.
  colors: {
    navy: {
      DEFAULT: "#0B1F3A",
      50: "#EEF2F8",
      100: "#D5DEEC",
      200: "#A9BBD6",
      300: "#7A93BA",
      400: "#4D6A98",
      500: "#2F4C7A",
      600: "#1F3860",
      700: "#152A4B",
      800: "#0B1F3A",
      900: "#07152A",
    },
    paper: "#F7F6F2",
    accent: {
      DEFAULT: "#0E9F8E",
      light: "#D9F2EE",
      dark: "#0A7A6D",
    },
    /**
     * Chart series, one fixed colour per AI engine (colour follows the engine,
     * never its rank). Validated together for colour-blind separation and
     * contrast on white.
     */
    engines: {
      openai: "#0E9F8E",
      anthropic: "#EB6834",
      gemini: "#2A78D6",
      perplexity: "#4A3AA7",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
