import type { Metadata } from "next";
import { AuditView } from "@/components/audit/audit-view";
import { RunAuditButton } from "@/components/run-audit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandOr404 } from "@/lib/brands";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit" };
// The run-audit server action executes on this route.
export const maxDuration = 300;

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ auditError?: string }>;
}) {
  const { brandId } = await params;
  const { auditError } = await searchParams;
  const brand = await getBrandOr404(brandId);

  const supabase = await createClient();
  const { data: audits } = await supabase
    .from("audits")
    .select("id, overall_score, breakdown, created_at")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!audits?.length) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Get your AI-readiness score</CardTitle>
          <p className="text-sm text-navy-400">
            We&apos;ll check whether AI crawlers can reach {brand.name}&apos;s site, whether it describes your
            business in a way AI understands, and whether it answers the questions buyers ask.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {auditError && <p className="text-sm text-red-600">{auditError}</p>}
          <RunAuditButton brandId={brand.id} label="Run free audit" />
        </CardContent>
      </Card>
    );
  }

  return <AuditView brandId={brand.id} audits={audits as [(typeof audits)[0], ...typeof audits]} />;
}
