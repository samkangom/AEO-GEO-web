import { ORG_KIND_NOUN, pricingApplies, type OrgKind } from "@/lib/org-kind";
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

// A rupee amount, with an optional magnitude ("₹2.5 Cr", "Rs 40 lakh") that marks it as a business metric, not a price.
const RUPEE_AMOUNT =
  /(?:₹|\bRs\.?|\bINR)\s?(\d[\d,]*(?:\.\d+)?)(\s*(?:cr|crores?|l|lakhs?|lacs?|k|mn|bn|million|billion)\b)?/gi;
// Words that put an amount in a pricing context ("from ₹499/month", "Plans start at Rs 999").
const PRICE_CONTEXT =
  /\b(?:price[sd]?|pricing|plans?|per|month(?:ly)?|mo|year(?:ly)?|yr|annum|annual|starts?|starting|from|onwards|only|mrp|buy|subscribe|subscriptions?|package|fees?|cost|costs|gst)\b|\//i;

/**
 * Whether the text shows a real price: a non-zero rupee amount, not a revenue
 * or ad-spend figure ("₹ 0.0 Cr" on a dashboard mock-up), with pricing words
 * close by.
 */
export function showsPrices(text: string): boolean {
  for (const m of text.matchAll(RUPEE_AMOUNT)) {
    const amount = Number(m[1].replace(/,/g, ""));
    if (!amount || m[2]) continue;
    const start = m.index ?? 0;
    const around = text.slice(Math.max(0, start - 50), start + m[0].length + 30);
    if (PRICE_CONTEXT.test(around)) return true;
  }
  return false;
}

const HIDDEN_STYLE = /(?:^|;)(?:opacity:0(?:\.0+)?(?:;|$)|visibility:hidden)/;

function startsHidden(style: string | undefined) {
  return HIDDEN_STYLE.test((style ?? "").replace(/\s+/g, "").toLowerCase());
}

/** Words on the homepage, and how many start invisible (inline opacity:0 / visibility:hidden), e.g. scroll animations. */
function hiddenTextShare($: cheerio.CheerioAPI): { words: number; hidden: number } {
  const count = (t: string) => t.split(/\s+/).filter(Boolean).length;
  let hidden = 0;
  $("body [style]").each((_, el) => {
    if (!startsHidden($(el).attr("style"))) return;
    // Only the outermost hidden element, so nested ones aren't counted twice.
    if (
      $(el)
        .parents("[style]")
        .toArray()
        .some((p) => startsHidden($(p).attr("style")))
    )
      return;
    hidden += count($(el).text());
  });
  return { words: count($("body").text()), hidden };
}
const META_DESCRIPTION_MIN = 50;

function sameSite(a: URL, b: URL) {
  return a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
}

export type HomepageAnalysis = {
  title: string | null;
  metaDescription: string | null;
  faqOnHomepage: boolean;
  pricesOnHomepage: boolean;
  /** Words on the homepage, and how many start invisible until scripts run. */
  text: { words: number; hidden: number };
  /** Candidate URLs to verify, linked pages first, then common fallbacks. */
  candidates: Record<PageKind, { url: string; linked: boolean }[]>;
};

export function analyzeHomepage(html: string, pageUrl: string): HomepageAnalysis {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);

  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description" i]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  const headings = $("h1, h2, h3, h4").text();
  const faqOnHomepage =
    /frequently asked|\bfaqs?\b/i.test(headings) || extractJsonLdTypes(html).types.includes("FAQPage");

  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const pricesOnHomepage = showsPrices(bodyText);
  const text = hiddenTextShare($);

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

  return { title, metaDescription, faqOnHomepage, pricesOnHomepage, text, candidates };
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

export function scoreContentSignals(
  analysis: HomepageAnalysis,
  found: FoundPages,
  kind: OrgKind = "business",
): CategoryResult {
  const max = CATEGORY_MAX.content_signals;
  const hasAbout = !!found.about;
  const hasFaq = analysis.faqOnHomepage || !!found.faq;
  const hasPricing = analysis.pricesOnHomepage || !!found.pricing;
  // Public prices only signal anything for businesses; elsewhere the check is not applicable and costs no points.
  const pricingCounts = pricingApplies(kind);
  const pricingOk = hasPricing || !pricingCounts;
  const meta = analysis.metaDescription;
  const hasMeta = !!meta && meta.length >= META_DESCRIPTION_MIN;

  const score =
    (hasAbout ? POINTS.about : 0) +
    (hasFaq ? POINTS.faq : 0) +
    (pricingOk ? POINTS.pricing : 0) +
    (hasMeta ? POINTS.meta : 0);

  const checks: { label: string; passed: boolean | null; note?: string }[] = [
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
    pricingCounts
      ? {
          label: "Your pricing is clear and public",
          passed: hasPricing,
          note: analysis.pricesOnHomepage ? "Prices shown on your homepage." : found.pricing?.url,
        }
      : {
          label: "Public pricing",
          passed: null,
          note: `Not applicable for a ${ORG_KIND_NOUN[kind]}, so no points are lost.`,
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

  // Not scored: reported so owners know crawlers and AI tools that render the page may see blank space.
  const hiddenShare = analysis.text.words >= 60 ? analysis.text.hidden / analysis.text.words : 0;
  if (hiddenShare >= 0.4) {
    checks.push({
      label: "Your homepage text is visible without waiting for animations",
      passed: false,
      note: `About ${Math.round(hiddenShare * 100)}% of the words start invisible until scripts run. Tools that look at the rendered page can see blank space. Not scored.`,
    });
  }

  const counted = pricingCounts ? [hasAbout, hasFaq, hasPricing, hasMeta] : [hasAbout, hasFaq, hasMeta];
  const passed = counted.filter(Boolean).length;
  const summary =
    passed === counted.length
      ? "Your site answers the basic questions AI tools look for: yes."
      : passed === 0
        ? "Your site answers the basic questions AI tools look for: no."
        : `Your site answers the basic questions AI tools look for: partly (${passed} of ${counted.length}).`;

  let fix: string | null = null;
  if (!pricingOk) {
    fix =
      "Publish at least starting prices (for example “Plans from ₹4,999/month”) on a Pricing page. When buyers ask AI “how much does it cost”, brands without public pricing are usually left out.";
  } else if (!hasFaq) {
    fix =
      kind === "business"
        ? "Add an FAQ section answering the 5–10 questions customers ask your sales team most. AI answers often lift these word-for-word."
        : "Add an FAQ page answering the 5–10 questions people ask you most. AI answers often lift these word-for-word.";
  } else if (!hasAbout) {
    fix =
      kind === "business"
        ? "Add an About page covering who you are, where you're based, who you serve and since when. AI tools use it to decide whether you're a credible option."
        : "Add an About page covering who you are, where you're based, what you do and since when. AI tools use it to describe you accurately.";
  } else if (!hasMeta) {
    fix =
      "Write a 120–160 character meta description for your homepage that says what you do, for whom, and where (e.g. “GST billing software for small businesses across India”).";
  } else if (hiddenShare >= 0.4) {
    fix =
      "Make your homepage text visible in the HTML the server sends. Fade-in animations that start at opacity 0 leave the page blank for anything that doesn't scroll it. Start text visible and animate only position, or skip the animation.";
  }

  return {
    score,
    max,
    status: "ok",
    summary,
    checks,
    fix,
    detail: {
      homepage_title: analysis.title,
      meta_description: meta,
      about_url: found.about?.url ?? null,
      faq_url: found.faq?.url ?? null,
      pricing_url: found.pricing?.url ?? null,
      faq_on_homepage: analysis.faqOnHomepage,
      prices_on_homepage: analysis.pricesOnHomepage,
      pricing_applies: pricingCounts,
      words: analysis.text.words,
      hidden_words: analysis.text.hidden,
    },
  };
}
