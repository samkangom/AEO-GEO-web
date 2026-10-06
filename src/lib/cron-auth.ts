import { timingSafeEqual } from "node:crypto";

/**
 * Cron endpoints accept only `Authorization: Bearer <CRON_SECRET>`, which
 * Vercel Cron sends automatically when CRON_SECRET is set. With no secret
 * configured they refuse everything, so they can never run unauthenticated.
 */
export function checkCronAuth(authorization: string | null): "ok" | "not_configured" | "unauthorized" {
  const secret = process.env.CRON_SECRET;
  if (!secret) return "not_configured";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected) ? "ok" : "unauthorized";
}

/** True when this deployment can run scheduled monitoring at all. */
export function scheduleConfigured() {
  return !!process.env.CRON_SECRET && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
