import type { Metadata } from "next";
import { MonitorView } from "@/components/monitor/monitor-view";
import { getBrandOr404 } from "@/lib/brands";
import { configuredEngines } from "@/lib/engines";
import { citedSources } from "@/lib/monitor/sources";
import { listRunsWithStats, MAX_PROMPTS_PER_RUN } from "@/lib/monitor/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Monitor" };
// "Run monitor now" executes on this route.
export const maxDuration = 300;

export default async function MonitorPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await getBrandOr404(brandId);
  const supabase = await createClient();
  const [{ count }, runs] = await Promise.all([
    supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brand.id)
      .eq("active", true),
    listRunsWithStats(supabase, brand.id),
  ]);

  // Which websites the latest answers relied on.
  const latest = runs.find((r) => r.stats.overall.measured > 0);
  const { data: citationRows } = latest
    ? await supabase.from("engine_results").select("citations, mentioned").eq("run_id", latest.id)
    : { data: [] };

  return (
    <MonitorView
      brandId={brand.id}
      brandName={brand.name}
      activePrompts={count ?? 0}
      maxPrompts={MAX_PROMPTS_PER_RUN}
      engines={configuredEngines()}
      runs={runs}
      sources={citedSources(citationRows ?? [], brand.url)}
    />
  );
}
