import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles both OAuth (Google) and email-confirmation redirects:
 *  - ?code=...                 (PKCE code exchange — OAuth and default email links)
 *  - ?token_hash=...&type=...  (custom email templates)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let error: string | null = searchParams.get("error_description");

  if (!error && code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (!error && tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    error = res.error?.message ?? null;
  } else if (!error) {
    error = "Missing sign-in code.";
  }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
