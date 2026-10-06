import type { EngineAnswer, EngineId } from "@/lib/engines/types";
import type { Sentiment } from "@/lib/engines/claude-tasks";
import { pool } from "@/lib/pool";
import { analyzeAnswer, type AnswerAnalysis, type BrandRef } from "@/lib/visibility/analyze";

export type MonitorPrompt = { id: string; text: string };

export type MonitorResult = {
  promptId: string;
  engine: EngineId;
  answer: EngineAnswer;
  /** null when the engine call failed. */
  analysis: AnswerAnalysis | null;
  /** Only classified when the brand is mentioned; null otherwise or if classification failed. */
  sentiment: Sentiment | null;
  sampledAt: string;
};

export type MonitorDeps = {
  configuredEngines: () => EngineId[];
  queryEngine: (engine: EngineId, prompt: string) => Promise<EngineAnswer>;
  classifySentiment: (brandName: string, answer: string) => Promise<Sentiment | null>;
  onError?: (event: string, err: unknown, ctx: Record<string, unknown>) => void;
};

/** Upper bound on simultaneous AI calls, to stay inside provider rate limits. */
export const MONITOR_CONCURRENCY = 20;

/**
 * Asks every configured engine every prompt (web search on), analyses each
 * answer and tags sentiment. Each result is handed to `onResult` as soon as
 * it's ready, so partial progress is saved even if the run is cut short.
 */
export async function executeMonitor(
  brand: BrandRef,
  prompts: MonitorPrompt[],
  deps: MonitorDeps,
  onResult: (r: MonitorResult) => Promise<void>,
): Promise<{ total: number; measured: number; failed: number }> {
  const engines = deps.configuredEngines();
  const pairs = prompts.flatMap((prompt) => engines.map((engine) => ({ prompt, engine })));
  let measured = 0;
  let failed = 0;

  await pool(pairs, MONITOR_CONCURRENCY, async ({ prompt, engine }) => {
    const answer = await deps.queryEngine(engine, prompt.text);
    const analysis = answer.status === "ok" ? analyzeAnswer(answer, brand) : null;

    let sentiment: Sentiment | null = null;
    if (analysis?.mentioned) {
      try {
        sentiment = await deps.classifySentiment(brand.name, answer.text);
      } catch (e) {
        deps.onError?.("monitor.sentiment_failed", e, { promptId: prompt.id, engine });
      }
    }

    if (analysis) measured++;
    else failed++;
    await onResult({
      promptId: prompt.id,
      engine,
      answer,
      analysis,
      sentiment,
      sampledAt: new Date().toISOString(),
    });
  });

  return { total: pairs.length, measured, failed };
}
