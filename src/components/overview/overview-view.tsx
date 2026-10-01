import Link from "next/link";
import { MockBadge } from "@/components/mock-badge";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Circle, Minus } from "lucide-react";
import { ScoreHeadline, ScoreRing } from "@/components/audit/score-summary";
import { MentionChart } from "@/components/monitor/mention-chart";
import { RunStatusBadge } from "@/components/monitor/run-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import type { EngineId } from "@/lib/engines/types";
import { latestDelta, mentionTrend } from "@/lib/monitor/chart";
import { formatRate } from "@/lib/monitor/stats";
import type { RunWithStats } from "@/lib/monitor/store";
import { formatDate } from "@/lib/utils";

const LABELS: Record<EngineId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export type OverviewProps = {
  brandId: string;
  brandName: string;
  audit: { score: number; measuredMax: number; createdAt: string; mock?: boolean } | null;
  activePrompts: number;
  totalPrompts: number;
  engines: EngineId[];
  /** Newest first. */
  runs: RunWithStats[];
};

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-accent-dark hover:underline"
    >
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

function Delta({ points, since }: { points: number; since: string }) {
  const Icon = points > 0 ? ArrowUpRight : points < 0 ? ArrowDownRight : Minus;
  const text = points === 0 ? "No change" : `${points > 0 ? "Up" : "Down"} ${Math.abs(points)} pts`;
  return (
    <p className="inline-flex items-center gap-1 text-sm text-navy-600">
      <Icon className="h-4 w-4" aria-hidden />
      {text} since {formatDate(since).split(",")[0]}
    </p>
  );
}

export function OverviewView({
  brandId,
  brandName,
  audit,
  activePrompts,
  totalPrompts,
  engines,
  runs,
}: OverviewProps) {
  const base = `/dashboard/${brandId}`;
  const latestRun = runs[0];
  const latestMeasured = runs.find((r) => r.stats.overall.measured > 0);
  const { engines: chartEngines, points } = mentionTrend(runs, engines);
  const delta = latestDelta(runs);

  const steps = [
    { done: !!audit, label: "Run your free AI-readiness audit", href: `${base}/audit` },
    {
      done: activePrompts > 0,
      label: totalPrompts ? "Review and activate your prompts" : "Generate the prompts to track",
      href: `${base}/prompts`,
    },
    { done: !!latestMeasured, label: "Run the monitor to track AI mentions", href: `${base}/monitor` },
  ];
  const showSteps = steps.some((s) => !s.done);

  return (
    <div className="space-y-6">
      {showSteps && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Get set up</CardTitle>
            <CardDescription>Three steps to see how AI answer engines treat {brandName}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-3 rounded-md border border-navy-100 p-3 text-sm hover:bg-navy-50"
                  >
                    {s.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" aria-label="Done" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-navy-200" aria-label="To do" />
                    )}
                    <span className={s.done ? "text-navy-400 line-through" : "text-navy"}>
                      {i + 1}. {s.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between gap-2">
              AI-readiness score {audit?.mock && <MockBadge />}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {audit ? (
              <>
                <div className="flex items-center gap-4">
                  <ScoreRing score={audit.score} toneMax={audit.measuredMax} size={96} />
                  <ScoreHeadline score={audit.score} measuredMax={audit.measuredMax} className="text-sm" />
                </div>
                {audit.measuredMax < 100 && (
                  <p className="text-xs text-navy-400">
                    {100 - audit.measuredMax} points weren&apos;t measured in this audit.
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-navy-300">{formatDate(audit.createdAt)}</span>
                  <CardLink href={`${base}/audit`}>View audit</CardLink>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-navy-400">No audit yet.</p>
                <div className="mt-auto">
                  <CardLink href={`${base}/audit`}>Run your free audit</CardLink>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between gap-2">
              AI mention rate · latest run {latestMeasured?.mock && <MockBadge />}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {latestMeasured ? (
              <>
                <p className="text-4xl font-semibold text-navy">{formatRate(latestMeasured.stats.overall)}</p>
                {delta && <Delta {...delta} />}
                <ul className="space-y-1">
                  {chartEngines.map((e) => (
                    <li key={e} className="flex items-center gap-2 text-sm text-navy-600">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: siteConfig.colors.engines[e] }}
                        aria-hidden
                      />
                      <span className="flex-1">{LABELS[e]}</span>
                      <span className="font-medium text-navy">
                        {formatRate(latestMeasured.stats.perEngine[e])}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex justify-end">
                  <CardLink href={`${base}/monitor`}>Monitor</CardLink>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-navy-400">No monitor results yet.</p>
                <div className="mt-auto">
                  <CardLink href={`${base}/monitor`}>Set up monitoring</CardLink>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between gap-2">
              Last monitor run {latestRun?.mock && <MockBadge />}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {latestRun ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-navy">{formatDate(latestRun.started_at)}</span>
                  <RunStatusBadge status={latestRun.displayStatus} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-navy-400">Answers</dt>
                  <dd className="text-right font-medium text-navy">
                    {latestRun.stats.overall.measured}
                    {latestRun.stats.failed > 0 && (
                      <span className="font-normal text-navy-300"> (+{latestRun.stats.failed} failed)</span>
                    )}
                  </dd>
                  <dt className="text-navy-400">Mentioned</dt>
                  <dd className="text-right font-medium text-navy">{latestRun.stats.overall.mentioned}</dd>
                  <dt className="text-navy-400">Linked to your site</dt>
                  <dd className="text-right font-medium text-navy">{latestRun.stats.cited}</dd>
                  <dt className="text-navy-400">Avg. position</dt>
                  <dd className="text-right font-medium text-navy">
                    {latestRun.stats.avgPosition ? `#${latestRun.stats.avgPosition.toFixed(1)}` : "—"}
                  </dd>
                </dl>
                <p className="text-sm text-navy-400">
                  Sentiment: <span className="text-navy">{latestRun.stats.sentiment.positive} positive</span>,{" "}
                  {latestRun.stats.sentiment.neutral} neutral, {latestRun.stats.sentiment.negative} negative
                </p>
                <div className="mt-auto flex justify-end">
                  <CardLink href={`${base}/monitor/${latestRun.id}`}>View run</CardLink>
                </div>
              </>
            ) : (
              <p className="text-sm text-navy-400">
                {activePrompts
                  ? "Your prompts are ready — run the monitor to see results."
                  : "Activate prompts, then run the monitor."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {points.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mention rate trend</CardTitle>
            <CardDescription>
              Share of AI answers that mention {brandName}, per engine, per run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MentionChart points={points} engines={chartEngines} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
