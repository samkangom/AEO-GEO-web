export type EngineId = "openai" | "anthropic" | "gemini" | "perplexity";

export type Citation = { url: string; title?: string };

/**
 * What one AI answer engine said for one prompt. Every field comes from a
 * real API response; when an engine can't be queried the status says why and
 * `text` is empty — nothing is ever filled in.
 */
export type EngineAnswer = {
  engine: EngineId;
  status: "ok" | "not_configured" | "error";
  /** The answer text exactly as the engine returned it. */
  text: string;
  /** Sources the answer cited. */
  citations: Citation[];
  /** Model that actually produced the answer (may differ from the requested one on fallback). */
  modelVersion: string | null;
  webSearchUsed: boolean;
  latencyMs: number;
  error?: string;
};

/** Who the question is about. Real engines never see it; only mock mode uses it. */
export type QueryContext = { brandName: string; brandUrl?: string; salt?: string };

export type QueryOptions = {
  /** Abort the call after this long. */
  timeoutMs?: number;
  context?: QueryContext;
};

export interface EngineAdapter {
  id: EngineId;
  /** Consumer-facing product name, e.g. "ChatGPT". */
  label: string;
  isConfigured(): boolean;
  /** Ask the engine the prompt the way a buyer would, with web search on. Never throws. */
  query(prompt: string, opts?: QueryOptions): Promise<EngineAnswer>;
}

export function notConfigured(engine: EngineId, envVar: string): EngineAnswer {
  return {
    engine,
    status: "not_configured",
    text: "",
    citations: [],
    modelVersion: null,
    webSearchUsed: false,
    latencyMs: 0,
    error: `${envVar} is not set`,
  };
}

export function failed(
  engine: EngineId,
  started: number,
  err: unknown,
  model: string | null = null,
): EngineAnswer {
  return {
    engine,
    status: "error",
    text: "",
    citations: [],
    modelVersion: model,
    webSearchUsed: false,
    latencyMs: Date.now() - started,
    error: err instanceof Error ? err.message : String(err),
  };
}
