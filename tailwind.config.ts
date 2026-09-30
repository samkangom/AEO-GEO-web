import type { Config } from "tailwindcss";
import { siteConfig } from "./src/config/site";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        navy: siteConfig.colors.navy,
        paper: siteConfig.colors.paper,
        accent: siteConfig.colors.accent,
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
