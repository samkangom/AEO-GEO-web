"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/log";
import { generateAndSavePrompts, latestSiteInfo, listPrompts, regenerateDrafts } from "@/lib/prompts/store";
import { PromptsUnavailableError } from "@/lib/prompts/types";
import { createClient } from "@/lib/supabase/server";
import { mentionsBrand } from "@/lib/visibility/analyze";
import type { FormState } from "./actions";

async function requireBrand(brandId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // RLS: returns nothing for another user's brand.
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, url, industry, kind, aliases")
    .eq("id", brandId)
    .maybeSingle();
  return { supabase, brand };
}

/** First set: generate. Later: replace drafts, keeping active prompts. */
export async function generatePrompts(_prev: FormState, formData: FormData): Promise<FormState> {
  const brandId = String(formData.get("brandId"));
  const { supabase, brand } = await requireBrand(brandId);
  if (!brand) return { error: "Brand not found." };

  try {
    const site = await latestSiteInfo(supabase, brand.id);
    const existing = await listPrompts(supabase, brand.id);
    if (existing.length) await regenerateDrafts(supabase, brand, site);
    else await generateAndSavePrompts(supabase, brand, site);
  } catch (e) {
    if (e instanceof PromptsUnavailableError) return { error: e.message };
    log.error("prompts.generate_failed", e, { brandId });
    return { error: "We couldn't generate prompts right now. Please try again." };
  }
  revalidatePath(`/dashboard/${brandId}/prompts`);
  return { ok: true };
}

const textSchema = z
  .string()
  .trim()
  .min(8, "Write the question as a buyer would — at least a few words.")
  .max(300, "Keep prompts under 300 characters.");

export async function updatePromptText(_prev: FormState, formData: FormData): Promise<FormState> {
  const promptId = String(formData.get("promptId"));
  const brandId = String(formData.get("brandId"));
  const parsed = textSchema.safeParse(formData.get("text"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, brand } = await requireBrand(brandId);
  if (!brand) return { error: "Brand not found." };
  if (mentionsBrand(parsed.data, brand)) {
    return {
      error: `Leave “${brand.name}”${brand.aliases?.length ? " and its other names" : ""} out of the prompt — we're measuring whether AI brings you up on its own.`,
    };
  }

  const { data, error } = await supabase
    .from("prompts")
    .update({ text: parsed.data })
    .eq("id", promptId)
    .eq("brand_id", brand.id)
    .select("id");
  if (error || !data?.length) {
    if (error) log.error("prompts.update_failed", error, { promptId });
    return { error: "We couldn't save that prompt." };
  }
  revalidatePath(`/dashboard/${brandId}/prompts`);
  return { ok: true };
}

export async function setPromptActive(formData: FormData) {
  const promptId = String(formData.get("promptId"));
  const brandId = String(formData.get("brandId"));
  const active = formData.get("active") === "true";
  const { supabase, brand } = await requireBrand(brandId);
  if (!brand) return;
  const { error } = await supabase
    .from("prompts")
    .update({ active })
    .eq("id", promptId)
    .eq("brand_id", brand.id);
  if (error) log.error("prompts.toggle_failed", error, { promptId });
  revalidatePath(`/dashboard/${brandId}/prompts`);
}

export async function setAllPromptsActive(formData: FormData) {
  const brandId = String(formData.get("brandId"));
  const active = formData.get("active") === "true";
  const { supabase, brand } = await requireBrand(brandId);
  if (!brand) return;
  const { error } = await supabase.from("prompts").update({ active }).eq("brand_id", brand.id);
  if (error) log.error("prompts.toggle_all_failed", error, { brandId });
  revalidatePath(`/dashboard/${brandId}/prompts`);
}
