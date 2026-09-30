/**
 * Normalises user input like "acme.in" or "https://www.acme.in/home?x=1" to
 * "https://www.acme.in/home". Returns null if it isn't a usable public URL.
 */
export function normaliseSiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Require a dotted hostname (rejects "localhost", bare words, etc.).
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
  url.hash = "";
  url.search = "";
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

export function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
