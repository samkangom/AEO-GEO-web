/**
 * Scheduled monitoring rules (pure, so they're unit-tested). A daily cron
 * asks which brands are due; a brand is due when its schedule is on, it has
 * prompts to ask, and nothing has run for it in the past week. Any recent
 * run counts, manual or scheduled, so "Run monitor now" also resets the clock.
 * A failed run doesn't, so the next day's cron tries again.
 */
export const SCHEDULE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
/** Cron timing drifts by up to an hour; allow a little slack so a weekly brand isn't pushed to day 8. */
const SLACK_MS = 6 * 60 * 60 * 1000;
/** Brands started per cron call; the rest stay due and go the next day. */
export const MAX_BRANDS_PER_CRON = 10;

export type ScheduleRun = {
  brand_id: string;
  started_at: string;
  status: "running" | "completed" | "failed";
};
export type ScheduleBrand = { id: string; auto_monitor: boolean };

/** Latest non-failed run start per brand. */
export function lastRuns(runs: ScheduleRun[]): Map<string, number> {
  const last = new Map<string, number>();
  for (const r of runs) {
    if (r.status === "failed") continue;
    const t = Date.parse(r.started_at);
    if (t > (last.get(r.brand_id) ?? 0)) last.set(r.brand_id, t);
  }
  return last;
}

export function isDue(lastRunAt: number | undefined, now: number): boolean {
  return lastRunAt === undefined || now - lastRunAt >= SCHEDULE_INTERVAL_MS - SLACK_MS;
}

/**
 * Brands to run now: schedule on, 1..maxPrompts active prompts, due.
 * Longest-waiting first, capped at `limit`.
 */
export function dueBrands(
  brands: ScheduleBrand[],
  runs: ScheduleRun[],
  activePrompts: Map<string, number>,
  now: number,
  maxPrompts: number,
  limit = MAX_BRANDS_PER_CRON,
): string[] {
  const last = lastRuns(runs);
  return brands
    .filter((b) => b.auto_monitor)
    .filter((b) => {
      const n = activePrompts.get(b.id) ?? 0;
      return n > 0 && n <= maxPrompts;
    })
    .filter((b) => isDue(last.get(b.id), now))
    .sort((a, b) => (last.get(a.id) ?? 0) - (last.get(b.id) ?? 0))
    .slice(0, limit)
    .map((b) => b.id);
}

/** When the schedule will next pick this brand up (the cron runs daily, so "on or after"). */
export function nextScheduledRun(lastRunAt: number | undefined, now: number): Date {
  if (lastRunAt === undefined || isDue(lastRunAt, now)) return new Date(now);
  return new Date(lastRunAt + SCHEDULE_INTERVAL_MS);
}
