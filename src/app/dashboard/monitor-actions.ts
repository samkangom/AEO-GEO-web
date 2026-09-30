"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { log } from "@/lib/log";
import { runMonitorForBrand } from "@/lib/monitor/store";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "./actions";

export async function runMonitorNow(_prev: FormState, formData: FormData): Promise<FormState> {
  const brandId = String(formData.get("brandId"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: only the owner's brand is returned.
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, url")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return { error: "Brand not found." };

  let result;
  try {
    result = await runMonitorForBrand(supabase, brand);
  } catch (e) {
    log.error("monitor.action_failed", e, { brandId });
    return { error: "The monitor run failed unexpectedly. Please try again." };
  }
  if ("error" in result) return { error: result.error };

  revalidatePath(`/dashboard/${brandId}`, "layout");
  redirect(`/dashboard/${brandId}/monitor/${result.runId}`);
}
