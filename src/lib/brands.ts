import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** All brands for the signed-in user (RLS scopes the query). */
export async function listBrands() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** A single brand the user owns, or a 404. */
export async function getBrandOr404(brandId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(brandId)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("*").eq("id", brandId).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}
