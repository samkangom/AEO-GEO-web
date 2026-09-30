import type { Citation } from "@/lib/engines/types";

export type BrandRef = { name: string; url: string };

export type AnswerAnalysis = {
  /** Brand name or domain appears in the answer text. */
  mentioned: boolean;
  /** The answer cites a page on the brand's own website. */
  cited: boolean;
  /**
   * 1-based rank of the first top-level list item that mentions the brand.
   * null when the brand isn't mentioned, or is mentioned outside a list.
   */
  position: number | null;
};

const LEGAL_SUFFIX = /[\s,]+(pvt\.?\s*ltd\.?|private\s+limited|ltd\.?|limited|llp|inc\.?|corp\.?|co\.?)\s*$/i;

function brandHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compact(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** Name variants we accept as a mention: full name, name without "Pvt Ltd" etc., and the domain. */
export function brandTerms(brand: BrandRef): string[] {
  const terms = new Set<string>();
  const name = brand.name.trim().replace(/\s+/g, " ");
  if (name) terms.add(name);
  const short = name.replace(LEGAL_SUFFIX, "").trim();
  if (short.length >= 3) terms.add(short);
  const host = brandHost(brand.url);
  if (host) terms.add(host);
  return [...terms];
}

export function mentionsBrand(text: string, brand: BrandRef): boolean {
  for (const term of brandTerms(brand)) {
    // Word-boundary match that also works for non-Latin scripts.
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "iu");
    if (re.test(text)) return true;
  }
  // "Kirana Books" vs "KiranaBooks": join 1–3 consecutive words and compare
  // whole, so word boundaries still hold. Only for distinctive names.
  const compactName = compact(brand.name.replace(LEGAL_SUFFIX, ""));
  if (compactName.length < 6) return false;
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    let joined = "";
    for (let n = 0; n < 3 && i + n < words.length; n++) {
      joined += words[i + n];
      if (joined === compactName) return true;
      if (joined.length >= compactName.length) break;
    }
  }
  return false;
}

export function citesBrand(citations: Citation[], brand: BrandRef): boolean {
  const host = brandHost(brand.url);
  if (!host) return false;
  return citations.some((c) => {
    const h = brandHost(c.url);
    return h === host || h.endsWith(`.${host}`);
  });
}

const LIST_ITEM = /^(\s*)(?:\d{1,2}[.)]|[-*•]|#{2,4}\s*\d{1,2}[.)]?)\s+(.*)$/;

/** Rank of the brand among the answer's top-level list items (bulleted, numbered or "### 1." headings). */
export function listPosition(text: string, brand: BrandRef): number | null {
  const items: { indent: number; text: string }[] = [];
  for (const line of text.split("\n")) {
    const m = LIST_ITEM.exec(line);
    if (m) items.push({ indent: m[1].replace(/\t/g, "  ").length, text: m[2] });
    else if (items.length && line.trim() && /^\s{2,}/.test(line)) {
      // Continuation line of the previous item.
      items[items.length - 1].text += ` ${line.trim()}`;
    }
  }
  if (!items.length) return null;
  const topIndent = Math.min(...items.map((i) => i.indent));
  const topLevel: string[] = [];
  for (const item of items) {
    if (item.indent === topIndent) topLevel.push(item.text);
    else if (topLevel.length) topLevel[topLevel.length - 1] += ` ${item.text}`; // fold sub-bullets into parent
  }
  const idx = topLevel.findIndex((t) => mentionsBrand(t, brand));
  return idx === -1 ? null : idx + 1;
}

export function analyzeAnswer(
  answer: { text: string; citations: Citation[] },
  brand: BrandRef,
): AnswerAnalysis {
  const cited = citesBrand(answer.citations, brand);
  const mentioned = mentionsBrand(answer.text, brand);
  return { mentioned, cited, position: mentioned ? listPosition(answer.text, brand) : null };
}
