/**
 * Public base URL of the app, for canonical links, robots.txt and the sitemap.
 * Set NEXT_PUBLIC_SITE_URL once the domain is final; on Vercel the production
 * domain is used automatically.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
