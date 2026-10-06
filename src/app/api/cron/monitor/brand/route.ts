import { after, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { log } from "@/lib/log";
import { isDue, lastRuns } from "@/lib/monitor/schedule";
import { defaultMonitorDeps, runMonitorForBrand } from "@/lib/monitor/store";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
// The run continues after the response (see `after`), within this limit.
export const maxDuration = 300;

/** One brand's scheduled run. Called by ../route.ts only; the secret is required. */
export async function POST(request: Request) {
  const auth = checkCronAuth(request.headers.get("authorization"));
  if (auth !== "ok") {
    return NextResponse.json({ error: auth }, { status: auth === "not_configured" ? 503 : 401 });
  }
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });

  const { brandId } = (await request.json().catch(() => ({}))) as { brandId?: unknown };
  if (typeof brandId !== "string") return NextResponse.json({ error: "brandId required" }, { status: 400 });

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, url, aliases, auto_monitor")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  if (!brand.auto_monitor) return NextResponse.json({ skipped: "schedule off" });

  // Re-check here so a repeated call can't start a second run in the same week.
  const { data: runs } = await supabase
    .from("monitor_runs")
    .select("brand_id, started_at, status")
    .eq("brand_id", brand.id)
    .order("started_at", { ascending: false })
    .limit(5);
  if (!isDue(lastRuns(runs ?? []).get(brand.id), Date.now())) {
    return NextResponse.json({ skipped: "not due" });
  }

  after(async () => {
    try {
      const result = await runMonitorForBrand(supabase, brand, defaultMonitorDeps(brand), "scheduled");
      if ("error" in result)
        log.warn("cron.monitor.brand_skipped", { brandId: brand.id, reason: result.error });
    } catch (e) {
      log.error("cron.monitor.brand_failed", e, { brandId: brand.id });
    }
  });
  return NextResponse.json({ accepted: brand.id }, { status: 202 });
}
