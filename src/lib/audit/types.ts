export type CategoryKey =
  | "crawl_access"
  | "structured_data"
  | "content_signals"
  | "live_visibility";

export type CategoryStatus =
  /** Check ran; score is real. */
  | "ok"
  /** We couldn't complete the check (site unreachable etc.). Scores 0. */
  | "error"
  /** Required API keys are missing. Scores 0 and is shown as "not configured". */
  | "not_configured"
  /** Check was skipped for another reason. Scores 0. */
  | "not_run";

export type CheckItem = {
  /** Plain-language statement, e.g. "ChatGPT search can reach your site". */
  label: string;
  /** true = good, false = problem, null = informational only. */
  passed: boolean | null;
  note?: string;
};

export type CategoryResult = {
  score: number;
  max: number;
  status: CategoryStatus;
  /** One-line, non-technical headline for a business owner. */
  summary: string;
  checks: CheckItem[];
  /** Single most useful next step, or null when the category is at full marks. */
  fix: string | null;
  /** Raw technical findings, kept for debugging and future features. */
  detail: Record<string, unknown>;
};

export type AuditBreakdown = Record<CategoryKey, CategoryResult>;

export const CATEGORY_MAX: Record<CategoryKey, number> = {
  crawl_access: 25,
  structured_data: 20,
  content_signals: 15,
  live_visibility: 40,
};

export const CATEGORY_TITLES: Record<CategoryKey, string> = {
  crawl_access: "AI crawler access",
  structured_data: "Structured data",
  content_signals: "Content signals",
  live_visibility: "Live AI visibility",
};

export const CATEGORY_ORDER: CategoryKey[] = [
  "live_visibility",
  "crawl_access",
  "structured_data",
  "content_signals",
];
