import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RunDetailView } from "@/components/monitor/run-detail-view";
import { getBrandOr404 } from "@/lib/brands";
import { getRunWithResults } from "@/lib/monitor/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Monitor run" };

export default async function RunPage({ params }: { params: Promise<{ brandId: string; runId: string }> }) {
  const { brandId, runId } = await params;
  const brand = await getBrandOr404(brandId);
  if (!/^[0-9a-f-]{36}$/i.test(runId)) notFound();
  const supabase = await createClient();
  const data = await getRunWithResults(supabase, brand.id, runId);
  if (!data) notFound();
  return <RunDetailView brandId={brand.id} brandKind={brand.kind} run={data.run} results={data.results} />;
}
