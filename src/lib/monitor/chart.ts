import type { EngineId } from "@/lib/engines/types";
import type { RunStats } from "./stats";

export type ChartPoint = {
  date: string;
  /** Mention rate 0–1 per engine; null = no answers from that engine in this run. */
  rates: Partial<Record<EngineId, number | null>>;
  measured: Partial<Record<EngineId, number>>;
};

type RunLike = { started_at: string; stats: RunStats };

/**
 * Chart series from runs (newest first, as listed). Runs with no answers are
 * skipped rather than plotted as 0%. Engines = configured ones, else whichever
 * appear in the data.
 */
export function mentionTrend(runs: RunLike[], configured: EngineId[]) {
  const measuredRuns = [...runs].reverse().filter((r) => r.stats.overall.measured > 0);
  const engines = configured.length
    ? configured
    : ([...new Set(measuredRuns.flatMap((r) => Object.keys(r.stats.perEngine)))] as EngineId[]);
  const points: ChartPoint[] = measuredRuns.map((r) => ({
    date: r.started_at,
    rates: Object.fromEntries(engines.map((e) => [e, r.stats.perEngine[e]?.rate ?? null])),
    measured: Object.fromEntries(engines.map((e) => [e, r.stats.perEngine[e]?.measured ?? 0])),
  }));
  return { engines, points };
}

/** Change in overall mention rate (percentage points) between the two latest measured runs. */
export function latestDelta(runs: RunLike[]): { points: number; since: string } | null {
  const measured = runs.filter((r) => r.stats.overall.rate !== null);
  if (measured.length < 2) return null;
  const [latest, previous] = measured;
  return {
    points: Math.round((latest.stats.overall.rate! - previous.stats.overall.rate!) * 100),
    since: previous.started_at,
  };
}
