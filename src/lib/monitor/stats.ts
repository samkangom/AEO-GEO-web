import type { EngineId } from "@/lib/engines/types";

/** The columns of engine_results that stats need. */
export type ResultRow = {
  engine: EngineId;
  mentioned: boolean | null;
  cited: boolean | null;
  position: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
};

export type Rate = { measured: number; mentioned: number; rate: number | null };

export type RunStats = {
  overall: Rate;
  perEngine: Partial<Record<EngineId, Rate>>;
  failed: number;
  cited: number;
  /** Mean list position over mentions that had one. */
  avgPosition: number | null;
  sentiment: { positive: number; neutral: number; negative: number };
};

function rate(rows: ResultRow[]): Rate {
  const measured = rows.filter((r) => r.mentioned !== null);
  const mentioned = measured.filter((r) => r.mentioned).length;
  return {
    measured: measured.length,
    mentioned,
    rate: measured.length ? mentioned / measured.length : null,
  };
}

/** Mention rate = mentioned ÷ answers actually received. Failed calls are counted separately, never as "not mentioned". */
export function summariseRun(rows: ResultRow[]): RunStats {
  const engines = [...new Set(rows.map((r) => r.engine))];
  const positions = rows.filter((r) => r.mentioned && r.position !== null).map((r) => r.position!);
  return {
    overall: rate(rows),
    perEngine: Object.fromEntries(engines.map((e) => [e, rate(rows.filter((r) => r.engine === e))])),
    failed: rows.filter((r) => r.mentioned === null).length,
    cited: rows.filter((r) => r.cited).length,
    avgPosition: positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null,
    sentiment: {
      positive: rows.filter((r) => r.sentiment === "positive").length,
      neutral: rows.filter((r) => r.sentiment === "neutral").length,
      negative: rows.filter((r) => r.sentiment === "negative").length,
    },
  };
}

/** Runs still "running" after this long were cut off (e.g. the serverless function timed out). */
export const STALE_RUN_MS = 15 * 60 * 1000;

export function displayStatus(run: { status: string; started_at: string }, now = Date.now()) {
  if (run.status === "running" && now - new Date(run.started_at).getTime() > STALE_RUN_MS) {
    return "interrupted" as const;
  }
  return run.status as "running" | "completed" | "failed";
}

export function formatRate(r: Rate | undefined): string {
  return r && r.rate !== null ? `${Math.round(r.rate * 100)}%` : "—";
}
