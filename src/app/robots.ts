import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Public marketing pages are open to every crawler, AI search bots included; the app itself is not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/onboarding", "/api", "/auth"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
