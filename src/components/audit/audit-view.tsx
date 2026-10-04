import { CategoryCard } from "@/components/audit/category-card";
import {
  biggestWins,
  isMeasured,
  isMockAudit,
  ScoreHeadline,
  ScoreRing,
  unmeasuredPoints,
  verdictLabel,
} from "@/components/audit/score-summary";
import { MockBadge } from "@/components/mock-badge";
import { RunAuditButton } from "@/components/run-audit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_ORDER, isSiteUnreachable, type AuditBreakdown, type CategoryKey } from "@/lib/audit/types";
import { cn, formatDate } from "@/lib/utils";

const SHORT_TITLES: Record<CategoryKey, string> = {
  live_visibility: "Live visibility",
  crawl_access: "Crawler access",
  structured_data: "Structured data",
  content_signals: "Content",
};

/** Category names as they read mid-sentence ("AI" keeps its capitals). */
const WIN_NAMES: Record<CategoryKey, string> = {
  live_visibility: "live AI visibility",
  crawl_access: "AI crawler access",
  structured_data: "structured data",
  content_signals: "content signals",
};

export type AuditRow = { id: string; overall_score: number; breakdown: unknown; created_at: string };

/** The audit page once a brand has at least one audit. `audits` is newest first. */
export function AuditView({ brandId, audits }: { brandId: string; audits: [AuditRow, ...AuditRow[]] }) {
  const latest = audits[0];
  const breakdown = latest.breakdown as unknown as AuditBreakdown;
  const unmeasured = unmeasuredPoints(breakdown);
  const measuredMax = 100 - unmeasured;
  const { wins, points: winPoints } = biggestWins(breakdown);
  const unreachable = isSiteUnreachable(breakdown);
  const reason = String(breakdown.structured_data?.detail?.reason ?? "");
  const whatHappened = reason.startsWith("HTTP")
    ? `The homepage answered our checker with an error (${reason}).`
    : `We reached the site, but ${reason || "it didn't return a web page"}.`;

  return (
    <div className="space-y-6">
      <section
        aria-label="AI-readiness score"
        className="flex flex-wrap items-center gap-7 rounded-2xl bg-navy p-6 text-white md:p-7"
      >
        {unreachable ? (
          <>
            <div
              role="img"
              aria-label="No score"
              className="grid h-[140px] w-[140px] shrink-0 place-items-center rounded-full border-[10px] border-navy-600 text-center"
            >
              <span className="font-display text-xl font-bold leading-tight">
                No
                <br />
                score
              </span>
            </div>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#9FE3D8]">
                Couldn&apos;t load the site
                {isMockAudit(breakdown) && <MockBadge />}
              </p>
              <p className="font-display text-2xl font-bold leading-tight text-white md:text-[28px]">
                We couldn&apos;t load this website, so there&apos;s no score.
              </p>
              <p className="text-navy-100">
                {whatHappened} This is often bot protection, and it may only affect automated checkers like
                ours, not AI crawlers. Try again later, or make sure the site loads for automated visitors.
              </p>
              <p className="text-xs text-navy-200">Last audited {formatDate(latest.created_at)}</p>
            </div>
          </>
        ) : (
          <>
            <ScoreRing score={latest.overall_score} toneMax={measuredMax} onDark />
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#9FE3D8]">
                {verdictLabel(latest.overall_score, measuredMax)}
                {isMockAudit(breakdown) && <MockBadge />}
              </p>
              <ScoreHeadline
                score={latest.overall_score}
                measuredMax={measuredMax}
                className="font-display text-2xl font-bold leading-tight text-white md:text-[28px]"
              />
              <p className="text-navy-100">
                {wins.length
                  ? `Your biggest win${wins.length > 1 ? "s" : ""}: ${wins.map((w) => WIN_NAMES[w.key]).join(" and ")}, worth up to ${winPoints} more points. The fixes are below.`
                  : "No site-side fixes left. Keep monitoring how AI answers mention you."}
              </p>
              {unmeasured > 0 && (
                <p className="text-sm text-navy-200">
                  {unmeasured} of 100 points weren&apos;t measured in this audit (see below), so your score is
                  out of the {measuredMax} points we could check.
                </p>
              )}
              <p className="text-xs text-navy-200">Last audited {formatDate(latest.created_at)}</p>
            </div>
          </>
        )}
        <div className="flex flex-[1_1_240px] flex-col gap-3">
          <dl className="grid grid-cols-2 gap-3">
            {CATEGORY_ORDER.map((key) => {
              const r = breakdown[key];
              return (
                <div key={key} className="rounded-lg border border-navy-600 px-3 py-2.5">
                  <dt className="text-xs text-navy-200">{SHORT_TITLES[key]}</dt>
                  <dd className="text-lg font-bold tabular-nums">
                    {isMeasured(key, r) ? r.score : "—"}
                    <span className="text-[13px] font-normal text-navy-200"> / {r.max}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <RunAuditButton brandId={brandId} onDark />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORY_ORDER.map((key) => (
          <CategoryCard key={key} category={key} result={breakdown[key]} />
        ))}
      </div>

      {audits.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit history</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-navy-400">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 text-right font-medium">Score</th>
                  <th className="pb-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a, i) => {
                  const noScore = isSiteUnreachable(a.breakdown as AuditBreakdown);
                  // Compare with the next older audit that has a score.
                  const older = audits
                    .slice(i + 1)
                    .find((o) => !isSiteUnreachable(o.breakdown as AuditBreakdown));
                  const change = !noScore && older ? a.overall_score - older.overall_score : null;
                  return (
                    <tr key={a.id} className="border-t border-navy-50">
                      <td className="py-2">{formatDate(a.created_at)}</td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {noScore ? (
                          <span className="font-normal text-navy-400">No score</span>
                        ) : (
                          `${a.overall_score} / 100`
                        )}
                      </td>
                      <td
                        className={cn(
                          "py-2 text-right tabular-nums",
                          change === null || change === 0
                            ? "text-navy-400"
                            : change > 0
                              ? "font-semibold text-accent-dark"
                              : "font-semibold text-red-700",
                        )}
                      >
                        {change === null
                          ? i === audits.length - 1 && audits.length < 10
                            ? "First audit"
                            : "—"
                          : change > 0
                            ? `+${change}`
                            : change}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
