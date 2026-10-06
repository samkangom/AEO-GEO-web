import { log } from "@/lib/log";
import { EngineHttpError, postJson } from "./http";
import { failed, notConfigured, type Citation, type EngineAdapter, type EngineAnswer } from "./types";

/** Default Perplexity model. Override with PERPLEXITY_MODEL. */
export const DEFAULT_PERPLEXITY_MODEL = "sonar";

export function perplexityModel() {
  return process.env.PERPLEXITY_MODEL || DEFAULT_PERPLEXITY_MODEL;
}

/** PERPLEXITY_BASE_URL is for tests (a local mock server), like the SDKs' *_BASE_URL. */
const api = () => `${process.env.PERPLEXITY_BASE_URL || "https://api.perplexity.ai"}/chat/completions`;

export type PerplexityResponse = {
  model?: string;
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  citations?: string[];
  search_results?: { url?: string; title?: string }[];
};

/** Turns a raw chat-completions response into an answer. Exported for tests. */
export function parsePerplexity(data: PerplexityResponse, model: string, started: number): EngineAnswer {
  // Reasoning models prefix their answer with a <think> block; it isn't part of the answer.
  const text = (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!text)
    return failed(
      "perplexity",
      started,
      new Error("Perplexity returned an empty answer"),
      data.model ?? model,
    );

  const citations = new Map<string, Citation>();
  for (const r of data.search_results ?? []) {
    if (r.url && !citations.has(r.url)) citations.set(r.url, { url: r.url, title: r.title });
  }
  for (const url of data.citations ?? []) {
    if (!citations.has(url)) citations.set(url, { url });
  }
  return {
    engine: "perplexity",
    status: "ok",
    text,
    citations: [...citations.values()],
    modelVersion: data.model ?? model,
    // Sonar models always search the web; record what the response shows.
    webSearchUsed: citations.size > 0,
    latencyMs: Date.now() - started,
  };
}

export const perplexityAdapter: EngineAdapter = {
  id: "perplexity",
  label: "Perplexity",
  isConfigured: () => !!process.env.PERPLEXITY_API_KEY,

  async query(prompt, opts = {}): Promise<EngineAnswer> {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) return notConfigured("perplexity", "PERPLEXITY_API_KEY");
    const started = Date.now();
    const model = perplexityModel();

    try {
      const data = await postJson<PerplexityResponse>(
        api(),
        { authorization: `Bearer ${key}` },
        {
          model,
          messages: [{ role: "user", content: prompt }],
          web_search_options: { user_location: { country: "IN" } },
        },
        opts.timeoutMs ?? 120_000,
      );
      return parsePerplexity(data, model, started);
    } catch (e) {
      log.error("engine.perplexity.failed", e, { model });
      return failed("perplexity", started, describeError(e), model);
    }
  },
};

function describeError(e: unknown): Error {
  if (e instanceof EngineHttpError) {
    if (e.status === 401 || e.status === 403) return new Error("Perplexity API key was rejected");
    if (e.status === 429) return new Error("Perplexity rate limit reached — try again shortly");
    return new Error(`Perplexity API error ${e.status}: ${e.message}`);
  }
  if (e instanceof Error && e.name === "TimeoutError") return new Error("Perplexity didn't answer in time");
  return e instanceof Error ? e : new Error(String(e));
}
