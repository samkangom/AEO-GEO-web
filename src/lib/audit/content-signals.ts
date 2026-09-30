import * as cheerio from "cheerio";
import { extractJsonLdTypes } from "./structured-data";
import { CATEGORY_MAX, type CategoryResult } from "./types";

export type PageKind = "about" | "faq" | "pricing";

const PATH_PATTERNS: Record<PageKind, RegExp> = {
  about: /\/(about|about-us|aboutus|company|who-we-are|our-story)(\/|\.html?|$)/i,
  faq: /\/(faq|faqs|help|support\/faq|frequently-asked-questions)(\/|\.html?|$)/i,
  pricing: /\/(pricing|plans|prices|price|rates|packages)(\/|\.html?|$)/i,
};
const LINK_TEXT_PATTERNS: Record<PageKind, RegExp> = {
  about: /^\s*(about|about us|our story|who we are|company)\s*$/i,
  faq: /^\s*(faqs?|frequently asked questions|help)\s*$/i,
  pricing: /^\s*(pricing|plans|plans & pricing|prices)\s*$/i,
};
/** Title/heading keywords that confirm a fetched page really is that page (not an SPA shell). */
const PAGE_KEYWORDS: Record<PageKind, RegExp> = {
  about: /about|our story|who we are/i,
  faq: /faq|frequently asked|questions/i,
  pricing: /pricing|plans|price|₹/i,
};
const FALLBACK_PATHS: Record<PageKind, string[]> = {
  about: ["/about", "/about-us"],
  faq: ["/faq", "/faqs"],
  pricing: ["/pricing", "/plans"],
};

const PRICE_PATTERN = /(?:₹|\bRs\.?|\bINR)\s?\d[\d,]*/i;
const META_DESCRIPTION_MIN = 50;

function sameSite(a: URL, b: URL) {
  return a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
}

export type HomepageAnalysis = {
  metaDescription: string | null;
  faqOnHomepage: boolean;
  pricesOnHomepage: boolean;
  /** Candidate URLs to verify, linked pages first, then common fallbacks. */
  candidates: Record<PageKind, { url: string; linked: boolean }[]>;
};

export function analyzeHomepage(html: string, pageUrl: string): HomepageAnalysis {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);

  const metaDescription =
    $('meta[name="description" i]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  const headings = $("h1, h2, h3, h4").text();
  const faqOnHomepage =
    /frequently asked|\bfaqs?\b/i.test(headings) || extractJsonLdTypes(html).types.includes("FAQPage");

  $("script, style, noscript").remove();
  const bodyText = $("body").text();
  const pricesOnHomepage = PRICE_PATTERN.test(bodyText);

  const candidates: HomepageAnalysis["candidates"] = { about: [], faq: [], pricing: [] };
  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (!sameSite(url, base)) return;
    url.hash = "";
    const text = $(el).text();
    for (const kind of Object.keys(PATH_PATTERNS) as PageKind[]) {
      if (PATH_PATTERNS[kind].test(url.pathname) || LINK_TEXT_PATTERNS[kind].test(text)) {
        const key = `${kind}:${url.toString()}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates[kind].push({ url: url.toString(), linked: true });
        }
      }
    }
  });
  for (const kind of Object.keys(FALLBACK_PATHS) as PageKind[]) {
    for (const path of FALLBACK_PATHS[kind]) {
      const url = new URL(path, base.origin).toString();
      if (!candidates[kind].some((c) => c.url.replace(/\/$/, "") === url)) {
        candidates[kind].push({ url, linked: false });
      }
    }
  }

  return { metaDescription, faqOnHomepage, pricesOnHomepage, candidates };
}

/**
 * Decides whether a fetched page is genuinely an About/FAQ/Pricing page as a
 * non-JavaScript crawler sees it — which is how most AI crawlers read sites.
 */
export function confirmsPage(kind: PageKind, html: string, linked: boolean): boolean {
  const $ = cheerio.load(html);
  const titleAndHeadings = `${$("title").text()} ${$("h1, h2, h3").text()}`;
  if (PAGE_KEYWORDS[kind].test(titleAndHeadings)) return true;
  if (!linked) return false;
  $("script, style, noscript").remove();
  const words = $("body").text().split(/\s+/).filter(Boolean).length;
  return words >= 150;
}

export type FoundPages = Record<PageKind, { url: string; html: string } | null>;

const POINTS = { about: 4, faq: 4, pricing: 4, meta: 3 } as const;

export function scoreContentSignals(analysis: HomepageAnalysis, found: FoundPages): CategoryResult {
  const max = CATEGORY_MAX.content_signals;
  const hasAbout = !!found.about;
  const hasFaq = analysis.faqOnHomepage || !!found.faq;
  const hasPricing = analysis.pricesOnHomepage || !!found.pricing;
  const meta = analysis.metaDescription;
  const hasMeta = !!meta && meta.length >= META_DESCRIPTION_MIN;

  const score =
    (hasAbout ? POINTS.about : 0) +
    (hasFaq ? POINTS.faq : 0) +
    (hasPricing ? POINTS.pricing : 0) +
    (hasMeta ? POINTS.meta : 0);

  const checks = [
    {
      label: "There's an About page explaining who you are",
      passed: hasAbout,
      note: found.about?.url,
    },
    {
      label: "You answer common customer questions (FAQ)",
      passed: hasFaq,
      note: analysis.faqOnHomepage ? "Found on your homepage." : found.faq?.url,
    },
    {
      label: "Your pricing is clear and public",
      passed: hasPricing,
      note: analysis.pricesOnHomepage ? "Prices shown on your homepage." : found.pricing?.url,
    },
    {
      label: "Your homepage has a clear search description",
      passed: hasMeta,
      note: !meta
        ? "No meta description found."
        : hasMeta
          ? undefined
          : `Your description is only ${meta.length} characters — aim for 120–160.`,
    },
  ];

  const passed = [hasAbout, hasFaq, hasPricing, hasMeta].filter(Boolean).length;
  const summary =
    passed === 4
      ? "Your site answers the basic questions AI tools look for: yes."
      : passed === 0
        ? "Your site answers the basic questions AI tools look for: no."
        : `Your site answers the basic questions AI tools look for: partly (${passed} of 4).`;

  let fix: string | null = null;
  if (!hasPricing) {
    fix =
      "Publish at least starting prices (for example “Plans from ₹4,999/month”) on a Pricing page. When buyers ask AI “how much does it cost”, brands without public pricing are usually left out.";
  } else if (!hasFaq) {
    fix =
      "Add an FAQ section answering the 5–10 questions customers ask your sales team most. AI answers often lift these word-for-word.";
  } else if (!hasAbout) {
    fix =
      "Add an About page covering who you are, where you're based, who you serve and since when. AI tools use it to decide whether you're a credible option.";
  } else if (!hasMeta) {
    fix =
      "Write a 120–160 character meta description for your homepage that says what you do, for whom, and where (e.g. “GST billing software for small businesses across India”).";
  }

  return {
    score,
    max,
    status: "ok",
    summary,
    checks,
    fix,
    detail: {
      meta_description: meta,
      about_url: found.about?.url ?? null,
      faq_url: found.faq?.url ?? null,
      pricing_url: found.pricing?.url ?? null,
      faq_on_homepage: analysis.faqOnHomepage,
      prices_on_homepage: analysis.pricesOnHomepage,
    },
  };
}
