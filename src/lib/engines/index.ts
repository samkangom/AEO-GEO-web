/**
 * The single entry point for querying AI answer engines. Route handlers, the
 * audit and the monitor call `queryEngine` — never a provider SDK directly —
 * so engines can be added or swapped without touching calling code.
 */
import { isMockMode } from "@/lib/mock-mode";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { mockQuery } from "./mock";
import { openaiAdapter } from "./openai";
import { perplexityAdapter } from "./perplexity";
import type { EngineAdapter, EngineAnswer, EngineId, QueryOptions } from "./types";

export type { Citation, EngineAnswer, EngineId, QueryContext } from "./types";

export const ENGINES: Record<EngineId, EngineAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  perplexity: perplexityAdapter,
};

/** Engines used for live visibility checks and monitoring; each joins when its key is set. */
export const VISIBILITY_ENGINES: EngineId[] = ["openai", "anthropic", "gemini", "perplexity"];

export function engineLabel(id: EngineId) {
  return ENGINES[id].label;
}

export function configuredEngines(ids: EngineId[] = VISIBILITY_ENGINES): EngineId[] {
  // Mock mode simulates every visibility engine (answers are labelled "Mock").
  if (isMockMode()) return ids.filter((id) => VISIBILITY_ENGINES.includes(id));
  return ids.filter((id) => ENGINES[id].isConfigured());
}

export function queryEngine(engine: EngineId, prompt: string, opts?: QueryOptions): Promise<EngineAnswer> {
  if (isMockMode() && VISIBILITY_ENGINES.includes(engine)) return mockQuery(engine, prompt, opts?.context);
  return ENGINES[engine].query(prompt, opts);
}
