import { NextResponse } from "next/server";
import { anthropicModel } from "@/lib/engines/anthropic";
import { openaiModel } from "@/lib/engines/openai";
import { isMockMode } from "@/lib/mock-mode";

export const dynamic = "force-dynamic";

/**
 * Deployment sanity check for QA: which integrations are configured, and
 * whether the database answers. Reports booleans only — never key values.
 */
export async function GET() {
  const env = (name: string) => !!process.env[name];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let database: "ok" | "unreachable" | "not_configured" = "not_configured";
  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      });
      database = res.ok ? "ok" : "unreachable";
    } catch {
      database = "unreachable";
    }
  }

  const body = {
    ok: database === "ok",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    supabase: database,
    providers: {
      openai: env("OPENAI_API_KEY"),
      anthropic: env("ANTHROPIC_API_KEY"),
      gemini: env("GEMINI_API_KEY"),
      perplexity: env("PERPLEXITY_API_KEY"),
    },
    models: { openai: openaiModel(), anthropic: anthropicModel() },
    mockMode: isMockMode(),
  };
  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
