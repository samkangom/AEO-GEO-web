import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePromptSet } from "@/lib/engines/claude-tasks";
import type { OrgKind } from "@/lib/org-kind";
import type { Database, Prompt } from "@/lib/supabase/types";

type DB = SupabaseClient<Database>;

type BrandRow = {
  id: string;
  name: string;
  url: string;
  industry: string | null;
  kind?: OrgKind;
  aliases?: string[];
};
export type SiteInfo = { title: string | null; description: string | null };

/** Site details from the brand's latest audit, used as context for prompt generation. */
export async function latestSiteInfo(supabase: DB, brandId: string): Promise<SiteInfo> {
  const { data } = await supabase
    .from("audits")
    .select("breakdown")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const detail = (data?.breakdown as { content_signals?: { detail?: Record<string, unknown> } } | null)
    ?.content_signals?.detail;
  return {
    title: typeof detail?.homepage_title === "string" ? detail.homepage_title : null,
    description: typeof detail?.meta_description === "string" ? detail.meta_description : null,
  };
}

export async function listPrompts(supabase: DB, brandId: string): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Generates a prompt set with Claude and saves it as drafts (inactive) for the
 * user to review. Also fills in the brand's industry if it was blank.
 */
export async function generateAndSavePrompts(
  supabase: DB,
  brand: BrandRow,
  site: SiteInfo,
): Promise<Prompt[]> {
  const { industry, prompts } = await generatePromptSet({
    name: brand.name,
    url: brand.url,
    industry: brand.industry,
    kind: brand.kind,
    aliases: brand.aliases,
    siteTitle: site.title,
    siteDescription: site.description,
  });

  const { data, error } = await supabase
    .from("prompts")
    .insert(
      prompts.map((p) => ({
        brand_id: brand.id,
        text: p.text,
        intent: p.intent,
        language: p.language,
        active: false,
      })),
    )
    .select("*");
  if (error) throw error;

  if (!brand.industry && industry) {
    await supabase.from("brands").update({ industry }).eq("id", brand.id);
  }
  return data;
}

/** The brand's saved prompts, generating a first set if it has none. */
export async function ensurePrompts(supabase: DB, brand: BrandRow, site: SiteInfo): Promise<Prompt[]> {
  const existing = await listPrompts(supabase, brand.id);
  return existing.length ? existing : generateAndSavePrompts(supabase, brand, site);
}

/**
 * Replaces draft (inactive) prompts with a freshly generated set. Active
 * prompts, and any prompt that already has monitor results, are kept.
 */
export async function regenerateDrafts(supabase: DB, brand: BrandRow, site: SiteInfo): Promise<Prompt[]> {
  const existing = await listPrompts(supabase, brand.id);
  const drafts = existing.filter((p) => !p.active).map((p) => p.id);

  let deletable = drafts;
  if (drafts.length) {
    const { data: used } = await supabase.from("engine_results").select("prompt_id").in("prompt_id", drafts);
    const usedIds = new Set((used ?? []).map((r) => r.prompt_id));
    deletable = drafts.filter((id) => !usedIds.has(id));
  }

  // Generate first, so a failed generation never leaves the brand with fewer prompts.
  const fresh = await generateAndSavePrompts(supabase, brand, site);
  if (deletable.length) {
    const { error } = await supabase.from("prompts").delete().in("id", deletable);
    if (error) throw error;
  }
  return fresh;
}
