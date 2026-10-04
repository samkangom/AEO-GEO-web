import type { Metadata } from "next";
import { isMockAudit, unmeasuredPoints } from "@/components/audit/score-summary";
import { OverviewView } from "@/components/overview/overview-view";
import { getBrandOr404 } from "@/lib/brands";
import type { AuditBreakdown } from "@/lib/audit/types";
import { configuredEngines } from "@/lib/engines";
import { listRunsWithStats } from "@/lib/monitor/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await getBrandOr404(brandId);
  const supabase = await createClient();

  const [{ data: audits }, { data: prompts }, runs] = await Promise.all([
    supabase
      .from("audits")
      .select("overall_score, breakdown, created_at")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase.from("prompts").select("active").eq("brand_id", brand.id),
    listRunsWithStats(supabase, brand.id),
  ]);

  const [audit, previous] = audits ?? [];

  return (
    <OverviewView
      brandId={brand.id}
      brandName={brand.name}
      audit={
        audit
          ? {
              score: audit.overall_score,
              measuredMax: 100 - unmeasuredPoints(audit.breakdown as unknown as AuditBreakdown),
              mock: isMockAudit(audit.breakdown as unknown as AuditBreakdown),
              createdAt: audit.created_at,
              previous: previous ? { score: previous.overall_score, createdAt: previous.created_at } : null,
            }
          : null
      }
      activePrompts={(prompts ?? []).filter((p) => p.active).length}
      totalPrompts={(prompts ?? []).length}
      engines={configuredEngines()}
      runs={runs}
    />
  );
}
