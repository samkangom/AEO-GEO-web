import {
  scoreContentSignals,
  analyzeHomepage,
  confirmsPage,
  type FoundPages,
  type PageKind,
} from "./content-signals";
import { scoreCrawlAccess, type RobotsFetch } from "./crawl-access";
import { generatePromptSet } from "@/lib/engines/claude-tasks";
import type { PromptLike } from "@/lib/prompts/types";
import { checkLiveVisibility, type LiveVisibilityDeps } from "./live-visibility";
import { FetchBlockedError, safeFetch } from "./safe-fetch";
import { scoreStructuredData } from "./structured-data";
import { CATEGORY_MAX, type AuditBreakdown, type CategoryResult } from "./types";
import type { OrgKind } from "@/lib/org-kind";

export class AuditError extends Error {}

async function fetchRobots(origin: string): Promise<RobotsFetch> {
  try {
    const res = await safeFetch(`${origin}/robots.txt`, { timeoutMs: 8_000, maxBytes: 500_000 });
    if (res.ok) return { kind: "found", body: res.text };
    if (res.status >= 400 && res.status < 500) return { kind: "missing", status: res.status };
    return { kind: "unreachable", reason: `Your server returned an error (HTTP ${res.status}).` };
  } catch (e) {
    return { kind: "unreachable", reason: e instanceof Error ? e.message : "Request failed." };
  }
}

async function findPage(kind: PageKind, candidates: { url: string; linked: boolean }[]) {
  // Try at most three candidates per page type to keep the audit fast.
  for (const c of candidates.slice(0, 3)) {
    try {
      const res = await safeFetch(c.url, { timeoutMs: 8_000, maxBytes: 1_000_000 });
      if (res.ok && res.contentType.includes("html") && confirmsPage(kind, res.text, c.linked)) {
        return { url: res.finalUrl, html: res.text };
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function unreachableHomepage(max: number, reason: string, fixTarget: string): CategoryResult {
  return {
    score: 0,
    max,
    status: "error",
    summary: `We couldn't load your homepage (${reason}), so we couldn't check this.`,
    checks: [],
    fix: `Make sure ${fixTarget} loads for automated visitors. If a firewall or bot protection is blocking us, it may be blocking AI crawlers too.`,
    detail: { reason, homepage_unreachable: true },
  };
}

export type AuditBrand = {
  name: string;
  url: string;
  industry?: string | null;
  /** Defaults to "business". Decides which checks apply and how buyer questions are written. */
  kind?: OrgKind;
  /** Other names counted as mentions in AI answers. */
  aliases?: string[];
};
export type SiteInfo = { title: string | null; description: string | null };
export type AuditResult = { overallScore: number; breakdown: AuditBreakdown };

export type AuditOptions = {
  /**
   * Supplies the prompts for the live check. The app passes a DB-backed
   * version (reuse saved prompts, else generate and save); by default a fresh
   * set is generated and discarded (CLI).
   */
  preparePrompts?: (site: SiteInfo) => Promise<PromptLike[]>;
  /** Test seam for the AI engines. */
  engines?: LiveVisibilityDeps;
};

type SiteChecks = Pick<AuditBreakdown, "crawl_access" | "structured_data" | "content_signals"> & {
  site: SiteInfo;
};

/**
 * Crawl access, structured data and content signals.
 * Throws AuditError only when the site can't be reached at all (bad domain etc.);
 * HTTP-level failures are recorded in the breakdown instead.
 */
async function runSiteChecks(siteUrl: string, kind: OrgKind): Promise<SiteChecks> {
  const origin = new URL(siteUrl).origin;

  const homepagePromise = safeFetch(siteUrl, { timeoutMs: 12_000 }).catch((e: unknown) => {
    if (e instanceof FetchBlockedError) throw new AuditError(e.message);
    // DNS failures surface on the error itself (our lookup) or on `cause` (fetch).
    const err = e as { code?: string; cause?: { code?: string } };
    const code = err?.code ?? err?.cause?.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      throw new AuditError(
        `We couldn't find a website at ${new URL(siteUrl).host}. Check the address and try again.`,
      );
    }
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new AuditError(`${siteUrl} took too long to respond. Try again in a minute.`);
    }
    throw new AuditError(`We couldn't connect to ${siteUrl}. Check the address and try again.`);
  });

  const [robots, homepage] = await Promise.all([fetchRobots(origin), homepagePromise]);

  let structuredData: CategoryResult;
  let contentSignals: CategoryResult;
  let site: SiteInfo = { title: null, description: null };

  if (!homepage.ok || !homepage.contentType.includes("html")) {
    const reason = homepage.ok ? "it didn't return a web page" : `HTTP ${homepage.status}`;
    structuredData = unreachableHomepage(CATEGORY_MAX.structured_data, reason, siteUrl);
    contentSignals = unreachableHomepage(CATEGORY_MAX.content_signals, reason, siteUrl);
  } else {
    const analysis = analyzeHomepage(homepage.text, homepage.finalUrl);
    const [about, faq, pricing] = await Promise.all([
      findPage("about", analysis.candidates.about),
      findPage("faq", analysis.candidates.faq),
      findPage("pricing", analysis.pricesOnHomepage ? [] : analysis.candidates.pricing),
    ]);
    const found: FoundPages = { about, faq, pricing };
    structuredData = scoreStructuredData({ url: homepage.finalUrl, html: homepage.text }, faq, kind);
    contentSignals = scoreContentSignals(analysis, found, kind);
    site = { title: analysis.title, description: analysis.metaDescription };
  }

  return {
    crawl_access: scoreCrawlAccess(siteUrl, robots),
    structured_data: structuredData,
    content_signals: contentSignals,
    site,
  };
}

/** Runs all four audit checks for a brand. */
export async function runAudit(brand: AuditBrand, opts: AuditOptions = {}): Promise<AuditResult> {
  const kind = brand.kind ?? "business";
  const { site, ...siteChecks } = await runSiteChecks(brand.url, kind);

  const preparePrompts =
    opts.preparePrompts ??
    (async (info: SiteInfo) =>
      (await generatePromptSet({ ...brand, kind, siteTitle: info.title, siteDescription: info.description }))
        .prompts);
  const liveVisibility = await checkLiveVisibility(
    { ...brand, kind },
    () => preparePrompts(site),
    opts.engines,
  );

  const breakdown: AuditBreakdown = { ...siteChecks, live_visibility: liveVisibility };
  const overallScore = Object.values(breakdown).reduce((sum, c) => sum + c.score, 0);
  return { overallScore, breakdown };
}
