import assert from "node:assert/strict";
import { test } from "node:test";
import { latestDelta, mentionTrend } from "./chart";
import { summariseRun, type ResultRow } from "./stats";

const run = (date: string, rows: ResultRow[]) => ({ started_at: date, stats: summariseRun(rows) });
const r = (engine: ResultRow["engine"], mentioned: boolean | null): ResultRow => ({
  engine,
  mentioned,
  cited: false,
  position: null,
  sentiment: null,
});

// Newest first, as listed.
const runs = [
  run("2026-09-30", [r("openai", true), r("openai", true), r("anthropic", false), r("anthropic", null)]),
  run("2026-09-23", [r("openai", null), r("anthropic", null)]), // every call failed
  run("2026-09-16", [r("openai", true), r("openai", false), r("anthropic", false), r("anthropic", false)]),
];

test("mentionTrend: oldest first, skips runs with no answers, gaps for missing engines", () => {
  const { engines, points } = mentionTrend(runs, ["openai", "anthropic"]);
  assert.deepEqual(engines, ["openai", "anthropic"]);
  assert.deepEqual(
    points.map((p) => p.date),
    ["2026-09-16", "2026-09-30"],
    "the all-failed run is not plotted as 0%",
  );
  assert.deepEqual(points[1].rates, { openai: 1, anthropic: 0 });
  assert.deepEqual(points[1].measured, { openai: 2, anthropic: 1 });
});

test("mentionTrend: without configured engines, uses engines present in the data", () => {
  assert.deepEqual(mentionTrend(runs, []).engines.sort(), ["anthropic", "openai"]);
});

test("latestDelta compares the two latest measured runs, in percentage points", () => {
  // 2/3 now vs 1/4 before → +42 pts (rounded).
  assert.deepEqual(latestDelta(runs), { points: 42, since: "2026-09-16" });
  assert.equal(latestDelta(runs.slice(0, 1)), null);
});
