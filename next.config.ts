import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cheerio pulls in undici/parse5; keep it out of the server bundle.
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
