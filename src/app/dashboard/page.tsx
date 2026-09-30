import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unmeasuredPoints } from "@/components/audit/score-summary";
import { BrandsGrid, type BrandSummary } from "@/components/overview/brands-grid";
import type { AuditBreakdown } from "@/lib/audit/types";
import { listBrands } from "@/lib/brands";
import { listRunsWithStats } from "@/lib/monitor/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "All brands" };

/** One brand → straight to it. Several (agency accounts) → the all-brands overview. */
export default async function DashboardIndex() {
  const brands = await listBrands();
  if (brands.length === 0) redirect("/onboarding");
  if (brands.length === 1) redirect(`/dashboard/${brands[0].id}`);

  const supabase = await createClient();
  const summaries: BrandSummary[] = await Promise.all(
    brands.map(async (b) => {
      const [{ data: audit }, runs] = await Promise.all([
        supabase
          .from("audits")
          .select("overall_score, breakdown")
          .eq("brand_id", b.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        listRunsWithStats(supabase, b.id, 5),
      ]);
      const measured = runs.find((r) => r.stats.overall.measured > 0);
      return {
        id: b.id,
        name: b.name,
        url: b.url,
        audit: audit
          ? {
              score: audit.overall_score,
              measuredMax: 100 - unmeasuredPoints(audit.breakdown as unknown as AuditBreakdown),
            }
          : null,
        mention: measured ? { rate: measured.stats.overall, date: measured.started_at } : null,
      };
    }),
  );

  return <BrandsGrid brands={summaries} />;
}
