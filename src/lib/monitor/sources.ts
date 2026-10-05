/** The columns of engine_results needed to rank cited sources. */
export type CitationRow = { citations: string[]; mentioned: boolean | null };

export type CitedSource = {
  /** Domain without "www.", e.g. "g2.com". */
  domain: string;
  /** Answers that cited at least one page on this domain. */
  answers: number;
  /** Of those, answers that also mentioned the brand. */
  withBrand: number;
  /** The brand's own website. */
  own: boolean;
};

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Which websites the AI answers in a run relied on, most-cited first. Each
 * answer counts once per domain, however many of its pages it cited. Only
 * answers that came back (not failed calls) are included. These are the
 * places a brand can work on getting listed or mentioned.
 */
export function citedSources(rows: CitationRow[], brandUrl: string, limit = 8): CitedSource[] {
  const own = domainOf(brandUrl);
  const byDomain = new Map<string, CitedSource>();
  for (const row of rows) {
    if (row.mentioned === null) continue;
    const domains = new Set(row.citations.map(domainOf).filter((d): d is string => !!d));
    for (const domain of domains) {
      const isOwn = !!own && (domain === own || domain.endsWith(`.${own}`));
      const entry = byDomain.get(domain) ?? { domain, answers: 0, withBrand: 0, own: isOwn };
      entry.answers += 1;
      if (row.mentioned) entry.withBrand += 1;
      byDomain.set(domain, entry);
    }
  }
  return [...byDomain.values()]
    .sort((a, b) => b.answers - a.answers || a.domain.localeCompare(b.domain))
    .slice(0, limit);
}
