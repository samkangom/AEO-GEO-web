import type { Metadata } from "next";
import { CategoryCard } from "@/components/audit/category-card";
import { isMockAudit, ScoreHeadline, ScoreRing, unmeasuredPoints } from "@/components/audit/score-summary";
import { MockBadge } from "@/components/mock-badge";
import { RunAuditButton } from "@/components/run-audit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandOr404 } from "@/lib/brands";
import { CATEGORY_ORDER, type AuditBreakdown } from "@/lib/audit/types";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

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

  const latest = audits?.[0];

  if (!latest) {
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

  const breakdown = latest.breakdown as unknown as AuditBreakdown;
  const unmeasured = unmeasuredPoints(breakdown);
  const measuredMax = 100 - unmeasured;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <ScoreRing score={latest.overall_score} toneMax={measuredMax} />
          <div className="flex-1 space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-navy-300">
              AI-readiness score{" "}
              {isMockAudit(breakdown) && <MockBadge className="normal-case tracking-normal" />}
            </p>
            <ScoreHeadline score={latest.overall_score} measuredMax={measuredMax} />
            {unmeasured > 0 && (
              <p className="text-sm text-navy-400">
                {unmeasured} of 100 points weren&apos;t measured in this audit (see below), so your score is
                out of the {measuredMax} points we could check.
              </p>
            )}
            <p className="text-xs text-navy-300">Last audited {formatDate(latest.created_at)}</p>
          </div>
          <RunAuditButton brandId={brand.id} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORY_ORDER.map((key) => (
          <CategoryCard key={key} category={key} result={breakdown[key]} />
        ))}
      </div>

      {audits.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit history</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-navy-400">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-t border-navy-50">
                    <td className="py-2">{formatDate(a.created_at)}</td>
                    <td className="py-2 text-right font-medium">{a.overall_score} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
