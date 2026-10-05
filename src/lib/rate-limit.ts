/**
 * Fixed-window rate limiting in memory. Best effort: each serverless instance
 * keeps its own counts, so treat the limits as a brake on casual abuse, not a
 * guarantee. Use a shared store (e.g. Upstash Redis) if that ever matters.
 */
type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size > 5_000) {
    for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k);
  }
  const w = buckets.get(key);
  if (!w || w.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (w.count >= limit) return { ok: false, retryAfterMs: w.resetAt - now };
  w.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
