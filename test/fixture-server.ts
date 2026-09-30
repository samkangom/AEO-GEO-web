import { existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

export const FIXTURE_SITES_DIR = path.join(import.meta.dirname, "fixtures", "sites");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".js": "text/javascript",
};

type Overrides = Record<string, { status: number; body?: string }>;

function resolveFile(root: string, urlPath: string): string | null {
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(root, safe);
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = path.join(candidate, "index.html");
  return existsSync(index) ? index : null;
}

/** Serves one fixture site folder as its own origin on 127.0.0.1. */
export async function serveSite(
  name: string,
  port = 0,
): Promise<{ url: string; close: () => Promise<void> }> {
  const root = path.join(FIXTURE_SITES_DIR, name);
  if (!existsSync(root)) throw new Error(`No fixture site "${name}" in ${FIXTURE_SITES_DIR}`);
  const overridesFile = path.join(root, "_responses.json");
  const overrides: Overrides = existsSync(overridesFile)
    ? JSON.parse(readFileSync(overridesFile, "utf8"))
    : {};

  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url ?? "/", "http://x").pathname;
    const override = overrides[urlPath];
    if (override) {
      res.writeHead(override.status, { "content-type": "text/plain" }).end(override.body ?? "");
      return;
    }
    const file = urlPath.endsWith("_responses.json") ? null : resolveFile(root, urlPath);
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }
    res
      .writeHead(200, { "content-type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream" })
      .end(readFileSync(file));
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const { port: actualPort } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${actualPort}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
