import dns from "node:dns";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { siteConfig } from "@/config/site";

export const AUDIT_USER_AGENT = `Mozilla/5.0 (compatible; ${siteConfig.name}Audit/1.0)`;

export class FetchBlockedError extends Error {}

export type FetchResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  text: string;
};

type Options = { timeoutMs?: number; maxBytes?: number; maxRedirects?: number };

/**
 * Test/QA escape hatch: lets the audit reach local fixture sites
 * (`npm run fixtures`). Never honoured in production builds.
 */
function allowPrivateHosts() {
  return process.env.AUDIT_ALLOW_PRIVATE_HOSTS === "1" && process.env.NODE_ENV !== "production";
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) || // 192.0.0.0/24 IETF protocol, 192.0.2.0/24 documentation
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  // NAT64 (64:ff9b::/96) and 6to4 (2002::/16) can wrap a private IPv4 address.
  if (v6.startsWith("64:ff9b:") || v6.startsWith("2002:")) return true;
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80") ||
    v6.startsWith("ff")
  );
}

/**
 * Rejects URLs that point at private/internal networks, so a user-supplied
 * brand URL can't be used to probe our own infrastructure.
 */
async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchBlockedError(`Unsupported protocol ${url.protocol}`);
  }
  if (allowPrivateHosts()) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new FetchBlockedError("Local addresses can't be audited");
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new FetchBlockedError("Private network addresses can't be audited");
  }
}

/**
 * Connects only to public addresses, checked at the moment of connecting. This
 * closes DNS rebinding: a name that resolved to a public address for
 * assertPublicUrl can't switch to an internal one for the real connection.
 */
export const publicOnlyAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, "", 0);
        const list = addresses as dns.LookupAddress[];
        if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
          return callback(new FetchBlockedError("Private network addresses can't be audited"), "", 0);
        }
        // undici asks for a single address unless `all` was requested.
        if ((options as dns.LookupOptions).all) return callback(null, list as never, 0);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
});

/**
 * With an outbound proxy configured (some CI and sandbox networks), the proxy
 * resolves names and connects, so the pinned agent can't be used. Production
 * on Vercel has no proxy and always uses it.
 */
function shouldPinConnections() {
  return !allowPrivateHosts() && !process.env.HTTPS_PROXY && !process.env.https_proxy;
}

/** Works with both Node's global fetch and undici's fetch responses. */
type StreamingBody = {
  getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> };
};

async function readCapped(res: { body: StreamingBody | null }, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const buf = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    const slice = c.subarray(0, Math.max(0, buf.length - offset));
    buf.set(slice, offset);
    offset += slice.length;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

/**
 * GET a public URL with a timeout, a response-size cap and manually followed
 * redirects (each hop re-checked against the private-network guard).
 * Throws on network/DNS failure; returns non-2xx responses as results.
 */
export async function safeFetch(rawUrl: string, opts: Options = {}): Promise<FetchResult> {
  const { timeoutMs = 10_000, maxBytes = 2_000_000, maxRedirects = 5 } = opts;
  let url = new URL(rawUrl);
  const signal = AbortSignal.timeout(timeoutMs);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(url);
    const init = {
      redirect: "manual" as const,
      signal,
      headers: {
        "user-agent": AUDIT_USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    };
    const res = shouldPinConnections()
      ? await undiciFetch(url, { ...init, dispatcher: publicOnlyAgent })
      : await fetch(url, { ...init, cache: "no-store" });

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      url = new URL(location, url);
      continue;
    }

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: url.toString(),
      contentType: res.headers.get("content-type") ?? "",
      text: await readCapped(res, maxBytes),
    };
  }
  throw new Error("Too many redirects");
}
