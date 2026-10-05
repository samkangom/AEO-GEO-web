"use server";

import { headers } from "next/headers";
import { AuditError, runSiteChecks } from "@/lib/audit";
import { CATEGORY_TITLES, isSiteUnreachable } from "@/lib/audit/types";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { displayHost, normaliseSiteUrl } from "@/lib/url";

type SiteKey = "crawl_access" | "structured_data" | "content_signals";
const SITE_KEYS: SiteKey[] = ["crawl_access", "structured_data", "content_signals"];

export type QuickCheckResult = {
  url: string;
  host: string;
  checkedAt: string;
  /** The homepage didn't load, so there is no score. */
  unreachable: boolean;
  /** Out of 60: the three site checks. Live AI visibility (40) needs an account. */
  score: number;
  categories: {
    key: SiteKey;
    title: string;
    score: number | null;
    max: number;
    summary: string;
    fix: string | null;
  }[];
};

export type QuickCheckState = { error?: string; result?: QuickCheckResult } | undefined;

// Same site checked again within 15 minutes: reuse the result (protects the site and us).
const CACHE_MS = 15 * 60_000;
const cache = new Map<string, { at: number; result: QuickCheckResult }>();

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * The no-sign-up check on the landing page: crawler access, structured data
 * and content (60 of the 100 points). It makes no AI calls, so it costs
 * nothing per use; the live AI check needs an account.
 */
export async function quickCheck(_prev: QuickCheckState, formData: FormData): Promise<QuickCheckState> {
  const url = normaliseSiteUrl(String(formData.get("url") ?? ""));
  if (!url) return { error: "Enter a website, like yourbrand.in" };

  const host = displayHost(url);
  const cached = cache.get(host);
  if (cached && Date.now() - cached.at < CACHE_MS) return { result: cached.result };

  const ip = await clientIp();
  const perIp = rateLimit(`quick:${ip}`, 5, 10 * 60_000);
  const overall = rateLimit("quick:all", 200, 10 * 60_000);
  if (!perIp.ok || !overall.ok) {
    const minutes = Math.max(1, Math.ceil(Math.max(perIp.retryAfterMs, overall.retryAfterMs) / 60_000));
    return {
      error: `You've run a few checks already. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or create a free account.`,
    };
  }

  const started = Date.now();
  try {
    const checks = await runSiteChecks(url);
    const unreachable = isSiteUnreachable(checks);
    const categories = SITE_KEYS.map((key) => {
      const c = checks[key];
      const measured = !(unreachable && key !== "crawl_access");
      return {
        key,
        title: CATEGORY_TITLES[key],
        score: measured ? c.score : null,
        max: c.max,
        summary: c.summary,
        fix: c.fix,
      };
    });
    const result: QuickCheckResult = {
      url,
      host,
      checkedAt: new Date().toISOString(),
      unreachable,
      score: Math.round(categories.reduce((sum, c) => sum + (c.score ?? 0), 0)),
      categories,
    };
    cache.set(host, { at: Date.now(), result });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    log.info("quick_check.completed", { host, unreachable, score: result.score, ms: Date.now() - started });
    return { result };
  } catch (e) {
    if (e instanceof AuditError) return { error: e.message };
    log.error("quick_check.failed", e, { host });
    return { error: "The check failed unexpectedly. Please try again." };
  }
}
