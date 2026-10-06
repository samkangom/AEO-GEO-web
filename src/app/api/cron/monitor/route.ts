import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { configuredEngines } from "@/lib/engines";
import { log } from "@/lib/log";
import { dueBrands, SCHEDULE_INTERVAL_MS } from "@/lib/monitor/schedule";
import { MAX_PROMPTS_PER_RUN } from "@/lib/monitor/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase/paged";

export const dynamic = "force-dynamic";

/**
 * Daily Vercel Cron (vercel.json): finds brands due their weekly monitor run
 * and starts each one as its own request to ./brand, so every brand gets the
 * full function time limit.
 */
export async function GET(request: Request) {
  const auth = checkCronAuth(request.headers.get("authorization"));
  if (auth !== "ok") {
    return NextResponse.json({ error: auth }, { status: auth === "not_configured" ? 503 : 401 });
  }
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  }
  if (!configuredEngines().length) {
    log.warn("cron.monitor.no_engines");
    return NextResponse.json({ started: [], skipped: "no AI engines configured" });
  }

  const now = Date.now();
  try {
    const [brands, prompts, runs] = await Promise.all([
      fetchAllPages((from, to) =>
        supabase
          .from("brands")
          .select("id, auto_monitor")
          .eq("auto_monitor", true)
          .order("id")
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase.from("prompts").select("id, brand_id").eq("active", true).order("id").range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("monitor_runs")
          .select("id, brand_id, started_at, status")
          .gte("started_at", new Date(now - 2 * SCHEDULE_INTERVAL_MS).toISOString())
          .order("id")
          .range(from, to),
      ),
    ]);

    const activePrompts = new Map<string, number>();
    for (const p of prompts) activePrompts.set(p.brand_id, (activePrompts.get(p.brand_id) ?? 0) + 1);
    const due = dueBrands(brands, runs, activePrompts, now, MAX_PROMPTS_PER_RUN);

    const origin = new URL(request.url).origin;
    const results = await Promise.allSettled(
      due.map(async (brandId) => {
        const res = await fetch(`${origin}/api/cron/monitor/brand`, {
          method: "POST",
          headers: {
            authorization: request.headers.get("authorization")!,
            "content-type": "application/json",
          },
          body: JSON.stringify({ brandId }),
          signal: AbortSignal.timeout(30_000),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return brandId;
      }),
    );
    const started = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = due.filter((id) => !started.includes(id));
    if (failed.length)
      log.error("cron.monitor.dispatch_failed", new Error("Some brands didn't start"), { failed });
    log.info("cron.monitor.dispatched", { due: due.length, started: started.length, failed: failed.length });
    return NextResponse.json({ started, failed });
  } catch (e) {
    log.error("cron.monitor.failed", e);
    return NextResponse.json({ error: "Scheduled monitoring failed" }, { status: 500 });
  }
}
