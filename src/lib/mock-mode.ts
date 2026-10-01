/**
 * MOCK_AI_RESPONSES=1 makes every AI call return a simulated answer, so the
 * app can be reviewed without API keys or cost. Mock results are stored and
 * shown as mock everywhere (model "mock-…", runs flagged, banner in the app).
 *
 * Never active on the production site: allowed locally/in tests and on Vercel
 * preview deployments only.
 */
export function isMockMode(): boolean {
  const flag = process.env.MOCK_AI_RESPONSES;
  if (flag !== "1" && flag !== "true") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") return false;
  return true;
}

export const MOCK_MODEL_PREFIX = "mock-";

export function isMockModel(model: string | null | undefined): boolean {
  return !!model?.startsWith(MOCK_MODEL_PREFIX);
}
