import assert from "node:assert/strict";
import { test } from "node:test";
import { dueBrands, isDue, lastRuns, nextScheduledRun, SCHEDULE_INTERVAL_MS } from "./schedule";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-06T03:30:00Z");
const ago = (days: number) => new Date(now - days * DAY).toISOString();

test("isDue: never run, a week ago, or a day short of a week with cron drift", () => {
  assert.equal(isDue(undefined, now), true);
  assert.equal(isDue(now - 7 * DAY, now), true);
  assert.equal(isDue(now - 7 * DAY + 60 * 60 * 1000, now), true, "an hour early still counts");
  assert.equal(isDue(now - 6 * DAY, now), false);
});

test("lastRuns ignores failed runs, so a failed week is retried next day", () => {
  const last = lastRuns([
    { brand_id: "a", started_at: ago(1), status: "failed" },
    { brand_id: "a", started_at: ago(8), status: "completed" },
  ]);
  assert.equal(last.get("a"), now - 8 * DAY);
});

test("dueBrands: schedule on, has prompts within the limit, not run this week; oldest first", () => {
  const brands = [
    { id: "off", auto_monitor: false },
    { id: "noPrompts", auto_monitor: true },
    { id: "tooMany", auto_monitor: true },
    { id: "recent", auto_monitor: true },
    { id: "old", auto_monitor: true },
    { id: "never", auto_monitor: true },
  ];
  const prompts = new Map([
    ["off", 3],
    ["tooMany", 25],
    ["recent", 3],
    ["old", 3],
    ["never", 3],
  ]);
  const runs = [
    { brand_id: "recent", started_at: ago(2), status: "completed" as const },
    { brand_id: "old", started_at: ago(9), status: "completed" as const },
  ];
  assert.deepEqual(dueBrands(brands, runs, prompts, now, 20), ["never", "old"]);
  assert.deepEqual(dueBrands(brands, runs, prompts, now, 20, 1), ["never"]);
});

test("nextScheduledRun: a week after the last run, or now when due", () => {
  assert.equal(nextScheduledRun(undefined, now).getTime(), now);
  assert.equal(nextScheduledRun(now - 2 * DAY, now).getTime(), now - 2 * DAY + SCHEDULE_INTERVAL_MS);
});
