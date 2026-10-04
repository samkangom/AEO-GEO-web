/**
 * Plans shown on the pricing page and landing page. Static: there is no
 * billing integration yet, so paid plans route to "Contact us".
 * Keep features honest — anything not built yet is marked `soon`.
 */
export type PlanFeature = { text: string; soon?: boolean };

export type Plan = {
  id: "free" | "starter" | "growth" | "agency";
  name: string;
  /** Monthly price in INR (₹), excluding GST. */
  priceInr: number;
  tagline: string;
  features: PlanFeature[];
  cta: { label: string; kind: "signup" | "contact" };
  highlighted?: boolean;
};

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free Audit",
    priceInr: 0,
    tagline: "See where you stand today.",
    features: [
      { text: "1 brand" },
      { text: "AI-readiness score out of 100" },
      { text: "AI crawler access, structured data & content checks" },
      { text: "Live check: 5 buyer questions asked to ChatGPT and Claude" },
      { text: "One plain-English fix for each weak area" },
    ],
    cta: { label: "Start free audit", kind: "signup" },
  },
  {
    id: "starter",
    name: "Starter",
    priceInr: 1999,
    tagline: "Track one brand in AI answers.",
    features: [
      { text: "1 brand" },
      { text: "Up to 20 tracked prompts in English, Hindi & Hinglish" },
      { text: "Monitoring across ChatGPT and Claude" },
      { text: "Mention rate, citations, ranking & sentiment" },
      { text: "Run history and trend charts" },
    ],
    cta: { label: "Contact us", kind: "contact" },
  },
  {
    id: "growth",
    name: "Growth",
    priceInr: 7999,
    tagline: "For growing teams and organisations.",
    features: [
      { text: "Up to 5 brands" },
      { text: "Up to 100 tracked prompts" },
      { text: "Everything in Starter" },
      { text: "Scheduled weekly monitoring", soon: true },
      { text: "Gemini and Perplexity monitoring", soon: true },
      { text: "Priority email support" },
    ],
    cta: { label: "Contact us", kind: "contact" },
    highlighted: true,
  },
  {
    id: "agency",
    name: "Agency",
    priceInr: 29999,
    tagline: "Manage AI visibility for your clients.",
    features: [
      { text: "Up to 25 brands" },
      { text: "Up to 500 tracked prompts" },
      { text: "All-brands dashboard" },
      { text: "Everything in Growth" },
      { text: "Guided onboarding for your team" },
      { text: "ChatGPT Ads from the same dashboard", soon: true },
    ],
    cta: { label: "Contact sales", kind: "contact" },
  },
];

/** "₹1,999" — Indian digit grouping (₹29,999; ₹1,00,000). */
export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}
