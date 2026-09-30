import assert from "node:assert/strict";
import { test } from "node:test";
import type { EngineAnswer, EngineId } from "@/lib/engines/types";
import { executeMonitor, type MonitorResult } from "./execute";
import { displayStatus, formatRate, summariseRun } from "./stats";

const brand = { name: "Kiranabooks", url: "https://kiranabooks.in" };
const prompts = [
  { id: "p1", text: "best billing app for kirana shops" },
  { id: "p2", text: "billing software in Pune" },
  { id: "p3", text: "cheap GST billing software" },
];

const ok = (engine: EngineId, text: string): EngineAnswer => ({
  engine,
  status: "ok",
  text,
  citations: [],
  modelVersion: "m",
  webSearchUsed: true,
  latencyMs: 1,
});

test("executeMonitor: every prompt × engine, sentiment only for mentions, failures recorded", async () => {
  const sentimentCalls: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const saved: MonitorResult[] = [];

  const summary = await executeMonitor(
    brand,
    prompts,
    {
      configuredEngines: () => ["openai", "anthropic"],
      queryEngine: async (engine, prompt) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        if (engine === "anthropic" && prompt.includes("Pune")) {
          return { ...ok(engine, ""), status: "error", error: "timeout" };
        }
        return ok(engine, prompt.startsWith("best") ? "1. Vyapar\n2. Kiranabooks" : "Vyapar");
      },
      classifySentiment: async (_name, answer) => {
        sentimentCalls.push(answer);
        if (sentimentCalls.length === 2) throw new Error("classifier down");
        return "positive";
      },
      onError: () => {},
    },
    async (r) => {
      saved.push(r);
    },
  );

  assert.deepEqual(summary, { total: 6, measured: 5, failed: 1 });
  assert.equal(saved.length, 6);
  assert.equal(sentimentCalls.length, 2, "only the two answers that mention the brand are classified");
  const mentions = saved.filter((r) => r.analysis?.mentioned);
  assert.deepEqual(
    mentions.map((r) => r.sentiment).sort(),
    [null, "positive"],
    "a classifier failure leaves sentiment null",
  );
  const failed = saved.find((r) => !r.analysis)!;
  assert.equal(failed.answer.error, "timeout");
  assert.ok(maxInFlight <= 8);
});

test("summariseRun: rates exclude failed calls; per-engine split; averages", () => {
  const s = summariseRun([
    { engine: "openai", mentioned: true, cited: true, position: 2, sentiment: "positive" },
    { engine: "openai", mentioned: false, cited: false, position: null, sentiment: null },
    { engine: "anthropic", mentioned: true, cited: false, position: 4, sentiment: "neutral" },
    { engine: "anthropic", mentioned: null, cited: null, position: null, sentiment: null },
  ]);
  assert.deepEqual(s.overall, { measured: 3, mentioned: 2, rate: 2 / 3 });
  assert.deepEqual(s.perEngine.anthropic, { measured: 1, mentioned: 1, rate: 1 });
  assert.equal(s.failed, 1);
  assert.equal(s.cited, 1);
  assert.equal(s.avgPosition, 3);
  assert.deepEqual(s.sentiment, { positive: 1, neutral: 1, negative: 0 });
  assert.equal(formatRate(s.overall), "67%");
  assert.equal(formatRate(summariseRun([]).overall), "—", "no answers is not 0%");
});

test("displayStatus flags runs cut off mid-way", () => {
  const now = Date.parse("2026-09-30T12:00:00Z");
  assert.equal(displayStatus({ status: "running", started_at: "2026-09-30T11:50:00Z" }, now), "running");
  assert.equal(displayStatus({ status: "running", started_at: "2026-09-30T11:00:00Z" }, now), "interrupted");
  assert.equal(displayStatus({ status: "completed", started_at: "2026-09-30T11:00:00Z" }, now), "completed");
});
