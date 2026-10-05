import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { configuredEngines, queryEngine } from "@/lib/engines";
import { classifySentiment } from "@/lib/engines/claude-tasks";
import { log } from "@/lib/log";
import { fetchAllPages } from "@/lib/supabase/paged";
import { isMockMode } from "@/lib/mock-mode";
import type { Database, EngineResult, MonitorRun } from "@/lib/supabase/types";
import { executeMonitor, type MonitorDeps } from "./execute";
import { displayStatus, STALE_RUN_MS, summariseRun, type RunStats } from "./stats";

type DB = SupabaseClient<Database>;
type BrandRow = { id: string; name: string; url: string; aliases?: string[] };

/** Keeps one manual run inside the serverless time limit (maxDuration 300s). */
export const MAX_PROMPTS_PER_RUN = 20;

/** Real engines; `salt` only varies mock answers (e.g. the seed script's backdated runs). */
export function defaultMonitorDeps(brand: BrandRow, salt?: string): MonitorDeps {
  return {
    configuredEngines: () => configuredEngines(),
    queryEngine: (engine, prompt) =>
      queryEngine(engine, prompt, {
        timeoutMs: 90_000,
        context: { brandName: brand.name, brandUrl: brand.url, salt },
      }),
    classifySentiment,
    onError: (event, err, ctx) => log.error(event, err, ctx),
  };
}

/**
 * One monitor run: every active prompt × every configured engine.
 *
 * Triggered manually by "Run monitor now". Scheduled monitoring hooks in
 * here: add `app/api/cron/monitor/route.ts` (Vercel Cron, or Supabase
 * pg_cron calling it), authenticate the cron secret, create a service-role
 * client, and call `runMonitorForBrand` for each brand due a run. For large
 * prompt sets, fan out one job per brand via a queue instead of one request.
 */
export async function runMonitorForBrand(
  supabase: DB,
  brand: BrandRow,
  deps: MonitorDeps = defaultMonitorDeps(brand),
): Promise<{ runId: string } | { error: string }> {
  const { data: prompts, error: promptsError } = await supabase
    .from("prompts")
    .select("id, text")
    .eq("brand_id", brand.id)
    .eq("active", true);
  if (promptsError) throw promptsError;
  if (!prompts.length) return { error: "Activate at least one prompt on the Prompts tab first." };
  if (prompts.length > MAX_PROMPTS_PER_RUN) {
    return {
      error: `A run covers up to ${MAX_PROMPTS_PER_RUN} active prompts — you have ${prompts.length}. Deactivate some and try again.`,
    };
  }
  if (!deps.configuredEngines().length) {
    return { error: "No AI engines are configured. Add OPENAI_API_KEY and/or ANTHROPIC_API_KEY." };
  }

  const { data: running } = await supabase
    .from("monitor_runs")
    .select("id, started_at")
    .eq("brand_id", brand.id)
    .eq("status", "running")
    .gte("started_at", new Date(Date.now() - STALE_RUN_MS).toISOString());
  if (running?.length) return { error: "A monitor run is already in progress for this brand." };

  const { data: run, error: runError } = await supabase
    .from("monitor_runs")
    .insert({ brand_id: brand.id, status: "running", mock: isMockMode() })
    .select("id")
    .single();
  if (runError || !run) throw runError ?? new Error("Couldn't create monitor run");

  const started = Date.now();
  let status: MonitorRun["status"] = "failed";
  try {
    const summary = await executeMonitor(brand, prompts, deps, async (r) => {
      const { error } = await supabase.from("engine_results").insert({
        run_id: run.id,
        prompt_id: r.promptId,
        engine: r.engine,
        mentioned: r.analysis?.mentioned ?? null,
        cited: r.analysis?.cited ?? null,
        position: r.analysis?.position ?? null,
        sentiment: r.sentiment,
        raw_response: r.answer.status === "ok" ? r.answer.text : null,
        model_version: r.answer.modelVersion,
        web_search_used: r.answer.status === "ok" ? r.answer.webSearchUsed : null,
        citations: r.answer.citations.map((c) => c.url),
        error: r.analysis ? null : (r.answer.error ?? "Engine call failed"),
        sampled_at: r.sampledAt,
      });
      if (error) log.error("monitor.result_save_failed", error, { runId: run.id, engine: r.engine });
    });
    status = summary.measured > 0 ? "completed" : "failed";
    log.info("monitor.completed", { brandId: brand.id, runId: run.id, ...summary, ms: Date.now() - started });
  } catch (e) {
    log.error("monitor.failed", e, { brandId: brand.id, runId: run.id });
  } finally {
    await supabase
      .from("monitor_runs")
      .update({ status, finished_at: new Date().toISOString() })
      .eq("id", run.id);
  }
  return { runId: run.id };
}

export type RunWithStats = MonitorRun & { displayStatus: ReturnType<typeof displayStatus>; stats: RunStats };

/** Recent runs, newest first, each with its mention-rate stats. */
export async function listRunsWithStats(supabase: DB, brandId: string, limit = 30): Promise<RunWithStats[]> {
  const { data: runs, error } = await supabase
    .from("monitor_runs")
    .select("*")
    .eq("brand_id", brandId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!runs.length) return [];

  // Paged: the API returns at most 1,000 rows per request and silently drops the rest.
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from("engine_results")
      .select("id, run_id, engine, mentioned, cited, position, sentiment")
      .in(
        "run_id",
        runs.map((r) => r.id),
      )
      .order("id")
      .range(from, to),
  );

  return runs.map((run) => ({
    ...run,
    displayStatus: displayStatus(run),
    stats: summariseRun(rows.filter((r) => r.run_id === run.id)),
  }));
}

export type RunResult = EngineResult & { prompt: { text: string; intent: string; language: string } | null };

export async function getRunWithResults(supabase: DB, brandId: string, runId: string) {
  const { data: run } = await supabase
    .from("monitor_runs")
    .select("*")
    .eq("id", runId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!run) return null;
  const { data: results, error } = await supabase
    .from("engine_results")
    .select("*, prompt:prompts(text, intent, language)")
    .eq("run_id", run.id)
    .order("sampled_at", { ascending: true });
  if (error) throw error;
  return { run, results: results as unknown as RunResult[] };
}
