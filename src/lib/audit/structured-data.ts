import * as cheerio from "cheerio";
import { CATEGORY_MAX, type CategoryResult } from "./types";

const ORGANIZATION_TYPES = new Set([
  "Organization",
  "Corporation",
  "LocalBusiness",
  "OnlineBusiness",
  "OnlineStore",
  "ProfessionalService",
  "Store",
  "NGO",
  "EducationalOrganization",
  "MedicalOrganization",
  "GovernmentOrganization",
  "NewsMediaOrganization",
  "SportsOrganization",
  "FinancialService",
  "LegalService",
  "HomeAndConstructionBusiness",
  "AutomotiveBusiness",
  "FoodEstablishment",
  "Restaurant",
  "TravelAgency",
  "RealEstateAgent",
  "EmploymentAgency",
]);
const OFFERING_TYPES = new Set([
  "Product",
  "ProductGroup",
  "Service",
  "SoftwareApplication",
  "WebApplication",
  "MobileApplication",
]);

const POINTS = { organization: 10, offering: 5, faq: 5 } as const;

function normaliseType(t: string): string {
  // "https://schema.org/Organization" / "schema:Organization" → "Organization"
  return t.split(/[/:#]/).pop() ?? t;
}

function collectTypes(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out));
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(normaliseType(t));
  if (Array.isArray(t)) t.filter((x) => typeof x === "string").forEach((x) => out.add(normaliseType(x)));
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectTypes(value, out);
  }
}

/** Returns every schema.org @type found in JSON-LD blocks, plus a count of unparsable blocks. */
export function extractJsonLdTypes(html: string): { types: string[]; blocks: number; invalid: number } {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  let blocks = 0;
  let invalid = 0;
  $('script[type="application/ld+json"]').each((_, el) => {
    blocks++;
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      collectTypes(JSON.parse(raw), types);
    } catch {
      invalid++;
    }
  });
  return { types: [...types].sort(), blocks, invalid };
}

export type PageHtml = { url: string; html: string };

export function scoreStructuredData(homepage: PageHtml, faqPage: PageHtml | null): CategoryResult {
  const max = CATEGORY_MAX.structured_data;
  const home = extractJsonLdTypes(homepage.html);
  const faq = faqPage ? extractJsonLdTypes(faqPage.html) : null;

  const hasOrg = home.types.some((t) => ORGANIZATION_TYPES.has(t));
  const hasOffering = home.types.some((t) => OFFERING_TYPES.has(t));
  const faqOnHome = home.types.includes("FAQPage");
  const faqOnFaqPage = faq?.types.includes("FAQPage") ?? false;
  const hasFaq = faqOnHome || faqOnFaqPage;

  const score =
    (hasOrg ? POINTS.organization : 0) + (hasOffering ? POINTS.offering : 0) + (hasFaq ? POINTS.faq : 0);

  const checks = [
    {
      label: "Your site tells AI who you are (Organization details)",
      passed: hasOrg,
      note: hasOrg ? undefined : "No Organization or LocalBusiness schema found on your homepage.",
    },
    {
      label: "Your products or services are described in a machine-readable way",
      passed: hasOffering,
      note: hasOffering ? undefined : "No Product or Service schema found on your homepage.",
    },
    {
      label: "Your FAQs are marked up so AI can quote them",
      passed: hasFaq,
      note: hasFaq
        ? faqOnHome
          ? undefined
          : "Found on your FAQ page."
        : "No FAQPage schema found on your homepage or FAQ page.",
    },
  ];
  if (home.invalid > 0) {
    checks.push({
      label: "All structured data on your homepage is valid",
      passed: false,
      note: `${home.invalid} JSON-LD block${home.invalid > 1 ? "s" : ""} couldn't be read — AI tools will ignore ${home.invalid > 1 ? "them" : "it"}.`,
    });
  }

  const summary =
    score === max
      ? "AI tools can read clear, labelled facts about your business: yes."
      : score === 0
        ? "AI tools can read clear, labelled facts about your business: no."
        : "AI tools can read clear, labelled facts about your business: partly.";

  let fix: string | null = null;
  if (!hasOrg) {
    fix =
      "Add Organization schema (JSON-LD) to your homepage with your company name, logo, website, address in India and social profiles. Most website builders and SEO plugins (Yoast, Rank Math) can do this in a few clicks.";
  } else if (!hasOffering) {
    fix =
      "Add Product or Service schema describing what you sell — name, short description and, ideally, a starting price in ₹.";
  } else if (!hasFaq) {
    fix = "Add FAQPage schema to your FAQ section so AI answers can quote your answers directly.";
  }

  return {
    score,
    max,
    status: "ok",
    summary,
    checks,
    fix,
    detail: {
      homepage_url: homepage.url,
      homepage_types: home.types,
      homepage_jsonld_blocks: home.blocks,
      homepage_invalid_blocks: home.invalid,
      faq_page_url: faqPage?.url ?? null,
      faq_page_types: faq?.types ?? null,
    },
  };
}
