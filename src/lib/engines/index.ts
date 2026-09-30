/**
 * The single entry point for querying AI answer engines. Route handlers, the
 * audit and the monitor call `queryEngine` — never a provider SDK directly —
 * so engines can be added or swapped without touching calling code.
 */
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";
import {
  notConfigured,
  type EngineAdapter,
  type EngineAnswer,
  type EngineId,
  type QueryOptions,
} from "./types";

export type { Citation, EngineAnswer, EngineId } from "./types";

/** Not built yet: always reports "not configured" so no result is ever implied. */
function stubAdapter(id: EngineId, label: string, envVar: string): EngineAdapter {
  return {
    id,
    label,
    isConfigured: () => false,
    query: async () => ({
      ...notConfigured(id, envVar),
      error: process.env[envVar]
        ? `${label} support isn't built yet (key found, but the adapter is a stub)`
        : `${envVar} is not set`,
    }),
  };
}

export const ENGINES: Record<EngineId, EngineAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: stubAdapter("gemini", "Gemini", "GEMINI_API_KEY"),
  perplexity: stubAdapter("perplexity", "Perplexity", "PERPLEXITY_API_KEY"),
};

/** Engines used for live visibility checks and monitoring (Gemini/Perplexity join once built). */
export const VISIBILITY_ENGINES: EngineId[] = ["openai", "anthropic"];

export function engineLabel(id: EngineId) {
  return ENGINES[id].label;
}

export function configuredEngines(ids: EngineId[] = VISIBILITY_ENGINES): EngineId[] {
  return ids.filter((id) => ENGINES[id].isConfigured());
}

export function queryEngine(engine: EngineId, prompt: string, opts?: QueryOptions): Promise<EngineAnswer> {
  return ENGINES[engine].query(prompt, opts);
}
