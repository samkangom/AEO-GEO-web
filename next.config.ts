import type { NextConfig } from "next";

/**
 * Baseline security headers for every response. A full Content-Security-Policy
 * is left out on purpose: Next.js inline scripts would need per-request nonces.
 * HTTPS (HSTS) is enforced by Vercel.
 */
const securityHeaders = [
  // The app must never be framed by another site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // cheerio and undici are Node-only; load them at runtime instead of bundling.
  serverExternalPackages: ["cheerio", "undici"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
