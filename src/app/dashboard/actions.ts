"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuditError, runSiteAudit } from "@/lib/audit";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { normaliseSiteUrl } from "@/lib/url";

export type FormState = { error?: string; ok?: boolean } | undefined;

const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter your brand name.").max(120, "That name is too long."),
  url: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const url = normaliseSiteUrl(v);
      if (!url) {
        ctx.addIssue({ code: "custom", message: "Enter a valid website, like yourbrand.in" });
        return z.NEVER;
      }
      return url;
    }),
  industry: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Runs the site audit for a brand and stores it. Ownership is enforced by RLS:
 * the brand lookup returns nothing for other users' brands.
 */
async function auditBrand(brandId: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { data: brand } = await supabase.from("brands").select("id, url").eq("id", brandId).maybeSingle();
  if (!brand) return { error: "Brand not found." };

  const started = Date.now();
  let result;
  try {
    result = await runSiteAudit(brand.url);
  } catch (e) {
    if (e instanceof AuditError) {
      log.warn("audit.site_unreachable", { brandId, url: brand.url, reason: e.message });
      return { error: e.message };
    }
    log.error("audit.failed", e, { brandId, url: brand.url });
    return { error: "The audit failed unexpectedly. Please try again." };
  }

  const { error } = await supabase.from("audits").insert({
    brand_id: brand.id,
    overall_score: result.overallScore,
    breakdown: result.breakdown as unknown as Json,
  });
  if (error) {
    log.error("audit.save_failed", error, { brandId });
    return { error: "We ran the audit but couldn't save it. Please try again." };
  }
  log.info("audit.completed", {
    brandId,
    score: result.overallScore,
    statuses: Object.fromEntries(Object.entries(result.breakdown).map(([k, v]) => [k, v.status])),
    ms: Date.now() - started,
  });
  return {};
}

/** Create a brand, then immediately run its first audit. */
export async function createBrand(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = brandSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();
  const { data: brand, error } = await supabase
    .from("brands")
    .insert({ user_id: user.id, name: parsed.data.name, url: parsed.data.url })
    .select("id")
    .single();
  if (error || !brand) {
    log.error("brand.create_failed", error, { userId: user.id });
    return { error: "We couldn't save your brand. Please try again." };
  }

  const audit = await auditBrand(brand.id);
  revalidatePath("/dashboard", "layout");
  redirect(
    audit.error
      ? `/dashboard/${brand.id}?auditError=${encodeURIComponent(audit.error)}`
      : `/dashboard/${brand.id}`,
  );
}

export async function runAudit(_prev: FormState, formData: FormData): Promise<FormState> {
  const brandId = String(formData.get("brandId"));
  const res = await auditBrand(brandId);
  if (res.error) return { error: res.error };
  revalidatePath(`/dashboard/${brandId}`);
  return { ok: true };
}

export async function updateBrand(_prev: FormState, formData: FormData): Promise<FormState> {
  const brandId = String(formData.get("brandId"));
  const parsed = brandSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    industry: formData.get("industry") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("brands").update(parsed.data).eq("id", brandId).select("id");
  if (error || !data?.length) {
    if (error) log.error("brand.update_failed", error, { brandId });
    return { error: "We couldn't save your changes." };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteBrand(formData: FormData) {
  const brandId = String(formData.get("brandId"));
  const { supabase } = await requireUser();
  const { error } = await supabase.from("brands").delete().eq("id", brandId);
  if (error) log.error("brand.delete_failed", error, { brandId });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
