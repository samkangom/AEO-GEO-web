import { log } from "@/lib/log";
import { EngineHttpError, postJson } from "./http";
import { failed, notConfigured, type Citation, type EngineAdapter, type EngineAnswer } from "./types";

/** Default Gemini model: Google's alias for its current Flash model. Override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/** GEMINI_BASE_URL is for tests (a local mock server), like the SDKs' *_BASE_URL. */
const api = () =>
  `${process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com"}/v1beta/models`;

type GroundingChunk = { web?: { uri?: string; title?: string; domain?: string } };
export type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
    groundingMetadata?: { webSearchQueries?: string[]; groundingChunks?: GroundingChunk[] };
  }[];
  promptFeedback?: { blockReason?: string };
  modelVersion?: string;
};

const HOSTNAME = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

/**
 * Grounding sources come back as short-lived Google redirect links
 * (vertexaisearch.cloud.google.com/grounding-api-redirect/…) with the
 * source's domain as the title. The domain is the stable fact, so a
 * redirect is recorded as `https://<domain>/`; a direct link is kept as is.
 */
export function geminiCitations(chunks: GroundingChunk[] = []): Citation[] {
  const out = new Map<string, Citation>();
  for (const { web } of chunks) {
    if (!web?.uri) continue;
    let url = web.uri;
    try {
      const host = new URL(web.uri).hostname;
      if (host.endsWith("vertexaisearch.cloud.google.com")) {
        const domain = (web.domain || web.title || "").trim().toLowerCase();
        if (!HOSTNAME.test(domain)) continue;
        url = `https://${domain}/`;
      }
    } catch {
      continue;
    }
    if (!out.has(url)) out.set(url, { url, title: web.title });
  }
  return [...out.values()];
}

/** Turns a raw generateContent response into an answer. Exported for tests. */
export function parseGemini(data: GeminiResponse, model: string, started: number): EngineAnswer {
  const candidate = data.candidates?.[0];
  if (!candidate) {
    const reason = data.promptFeedback?.blockReason;
    return failed(
      "gemini",
      started,
      new Error(reason ? `Gemini blocked the prompt (${reason})` : "Gemini returned no answer"),
      model,
    );
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) {
    return failed(
      "gemini",
      started,
      new Error(`Gemini returned an empty answer (${candidate.finishReason ?? "unknown"})`),
      data.modelVersion ?? model,
    );
  }
  const grounding = candidate.groundingMetadata;
  return {
    engine: "gemini",
    status: "ok",
    text,
    citations: geminiCitations(grounding?.groundingChunks),
    modelVersion: data.modelVersion ?? model,
    webSearchUsed: !!(grounding?.webSearchQueries?.length || grounding?.groundingChunks?.length),
    latencyMs: Date.now() - started,
  };
}

/** Gemini with Google Search grounding on. The API has no user-location setting for search. */
export const geminiAdapter: EngineAdapter = {
  id: "gemini",
  label: "Gemini",
  isConfigured: () => !!process.env.GEMINI_API_KEY,

  async query(prompt, opts = {}): Promise<EngineAnswer> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return notConfigured("gemini", "GEMINI_API_KEY");
    const started = Date.now();
    const model = geminiModel();

    try {
      const data = await postJson<GeminiResponse>(
        `${api()}/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": key },
        { contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] },
        opts.timeoutMs ?? 120_000,
      );
      return parseGemini(data, model, started);
    } catch (e) {
      log.error("engine.gemini.failed", e, { model });
      return failed("gemini", started, describeError(e), model);
    }
  },
};

function describeError(e: unknown): Error {
  if (e instanceof EngineHttpError) {
    if (e.status === 400 && /api key/i.test(e.message)) return new Error("Gemini API key was rejected");
    if (e.status === 401 || e.status === 403) return new Error("Gemini API key was rejected");
    if (e.status === 429) return new Error("Gemini rate limit or free-tier quota reached — try again later");
    return new Error(`Gemini API error ${e.status}: ${e.message}`);
  }
  if (e instanceof Error && e.name === "TimeoutError") return new Error("Gemini didn't answer in time");
  return e instanceof Error ? e : new Error(String(e));
}
