import { Bricolage_Grotesque, Instrument_Sans, Noto_Sans_Devanagari } from "next/font/google";

/** Headings. */
export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

/** Body text. */
export const bodyFont = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

/** Hindi prompts and answers (Devanagari script); used as a fallback after the Latin fonts. */
export const devanagariFont = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-devanagari",
  display: "swap",
});
