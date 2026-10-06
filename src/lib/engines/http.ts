/**
 * Shared JSON POST for engines called over plain HTTPS (Gemini, Perplexity).
 * One retry on rate limits and transient server errors, like the SDK-based
 * adapters (`maxRetries: 1`).
 */
export class EngineHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "EngineHttpError";
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const deadline = AbortSignal.timeout(timeoutMs);
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: deadline,
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;

    const text = await res.text().catch(() => "");
    if (attempt === 0 && RETRYABLE.has(res.status)) {
      const wait = Math.min(Number(res.headers.get("retry-after")) * 1000 || 2_000, 10_000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new EngineHttpError(res.status, errorMessage(text) ?? res.statusText);
  }
}

/** Pulls the provider's own message out of an error body, without echoing anything long. */
function errorMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; detail?: unknown };
    const msg = typeof parsed.error === "string" ? parsed.error : parsed.error?.message;
    if (msg) return msg.slice(0, 300);
  } catch {
    // not JSON
  }
  return body ? body.slice(0, 300) : null;
}
