import { CATEGORY_MAX, type CategoryResult } from "./types";

/**
 * Live AI visibility (40 pts): will query OpenAI + Anthropic with web search
 * via the provider adapter (Sprint 4). Until that lands, this reports the
 * check as not measured — it never invents a number.
 */
export async function checkLiveVisibility(): Promise<CategoryResult> {
  const configured = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
  return {
    score: 0,
    max: CATEGORY_MAX.live_visibility,
    status: configured ? "not_run" : "not_configured",
    summary: configured
      ? "Live AI answer checks aren't switched on yet, so this part wasn't measured."
      : "Live AI answer checks are not configured (no OpenAI or Anthropic API key), so this part wasn't measured.",
    checks: [],
    fix: configured
      ? null
      : "Add OPENAI_API_KEY and/or ANTHROPIC_API_KEY to your environment to measure whether AI answers mention your brand.",
    detail: {},
  };
}
