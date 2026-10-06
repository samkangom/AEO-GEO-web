import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client: bypasses row-level security. Only the scheduled
 * monitoring cron uses it, after checking CRON_SECRET; it must never be
 * reachable from a page or server action a user can call.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY isn't set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
