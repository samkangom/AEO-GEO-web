import Link from "next/link";
import { MockBadge } from "@/components/mock-badge";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Circle, Minus } from "lucide-react";
import { ScoreHeadline, ScoreRing } from "@/components/audit/score-summary";
import { MentionChart } from "@/components/monitor/mention-chart";
import { RunStatusBadge } from "@/components/monitor/run-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import type { EngineId } from "@/lib/engines/types";
import { latestDelta, mentionTrend } from "@/lib/monitor/chart";
import { formatRate } from "@/lib/monitor/stats";
import type { RunWithStats } from "@/lib/monitor/store";
import { formatDate, listNames } from "@/lib/utils";

const LABELS: Record<EngineId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

const ALL_ENGINES: EngineId[] = ["openai", "anthropic", "gemini", "perplexity"];

/** "ChatGPT, Claude and Gemini": the engines that answered (or failed) in this run. */
function runEngineNames(run: RunWithStats) {
  const names = (Object.keys(run.stats.perEngine) as EngineId[]).map((e) => LABELS[e]);
  return names.length ? listNames(names) : "no engines";
}

export type OverviewProps = {
  brandId: string;
  brandName: string;
  audit: {
    score: number;
    measuredMax: number;
    createdAt: string;
    mock?: boolean;
    /** The homepage couldn't be loaded, so the audit has no score. */
    noScore?: boolean;
    /** The audit before this one, for the "up N since" line. */
    previous?: { score: number; createdAt: string } | null;
  } | null;
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
            {audit?.noScore ? (
              <>
                <p className="font-display text-2xl font-bold text-navy">No score</p>
                <p className="text-sm text-navy-600">
                  We couldn&apos;t load this website in the last audit, often because of bot protection.
                  Nothing is estimated.
                </p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-navy-300">{formatDate(audit.createdAt)}</span>
                  <CardLink href={`${base}/audit`}>See what happened</CardLink>
                </div>
              </>
            ) : audit ? (
              <>
                <div className="flex items-center gap-4">
                  <ScoreRing score={audit.score} toneMax={audit.measuredMax} size={104} />
                  <div className="flex flex-col gap-1.5">
                    <ScoreHeadline score={audit.score} measuredMax={audit.measuredMax} className="text-sm" />
                    {audit.previous ? (
                      <Delta points={audit.score - audit.previous.score} since={audit.previous.createdAt} />
                    ) : (
                      <p className="text-sm text-navy-400">First audit</p>
                    )}
                  </div>
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
              Mention rate, last run {latestMeasured?.mock && <MockBadge />}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {latestMeasured ? (
              <>
                <p className="font-display text-5xl font-bold leading-none text-navy">
                  {formatRate(latestMeasured.stats.overall)}
                </p>
                {delta && <Delta {...delta} />}
                <p className="text-sm text-navy-400">
                  {latestMeasured.stats.overall.mentioned} of {latestMeasured.stats.overall.measured} answers
                  mention you
                </p>
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
                <p className="font-display text-5xl font-bold leading-none text-navy-300">—</p>
                <p className="text-sm text-navy-400">Not monitored yet.</p>
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
                  <span className="font-display text-xl font-bold text-navy">
                    {formatDate(latestRun.started_at)}
                  </span>
                  <RunStatusBadge status={latestRun.displayStatus} />
                </div>
                <p className="text-sm text-navy-600">
                  {latestRun.stats.overall.measured} answer{latestRun.stats.overall.measured === 1 ? "" : "s"}{" "}
                  from {runEngineNames(latestRun)}
                </p>
                {latestRun.stats.failed > 0 ? (
                  <p className="text-sm font-semibold text-red-700">
                    {latestRun.stats.failed} call{latestRun.stats.failed === 1 ? "" : "s"} failed, not counted
                  </p>
                ) : (
                  <p className="text-sm text-navy-400">No failed calls</p>
                )}
                <div className="mt-auto flex justify-end">
                  <CardLink href={`${base}/monitor/${latestRun.id}`}>Read the answers</CardLink>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI engines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {ALL_ENGINES.map((e) => {
                const on = engines.includes(e);
                return (
                  <li
                    key={e}
                    className="flex min-h-11 items-center gap-2.5 border-b border-navy-50 last:border-0"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: on ? siteConfig.colors.engines[e] : "#C9CCD3" }}
                      aria-hidden
                    />
                    <span className={on ? "flex-1 text-navy" : "flex-1 text-navy-400"}>{LABELS[e]}</span>
                    <Badge variant={on ? "good" : "muted"}>{on ? "Connected" : "Not configured"}</Badge>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-navy-400">
              Engines without an API key are never scored or estimated.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How you appear, last run</CardTitle>
          </CardHeader>
          <CardContent>
            {latestMeasured ? (
              <dl>
                <div className="flex min-h-11 items-center gap-3 border-b border-navy-50">
                  <dt className="flex-1 text-sm text-navy-600">Average list position when mentioned</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums">
                    {latestMeasured.stats.avgPosition
                      ? `#${latestMeasured.stats.avgPosition.toFixed(1)}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex min-h-11 items-center gap-3 border-b border-navy-50">
                  <dt className="flex-1 text-sm text-navy-600">Answers that link to your site</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums">
                    {latestMeasured.stats.cited}
                  </dd>
                </div>
                <div className="flex min-h-11 flex-wrap items-center gap-3">
                  <dt className="flex-1 text-sm text-navy-600">Sentiment when mentioned</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    <Badge variant="good">{latestMeasured.stats.sentiment.positive} positive</Badge>
                    <Badge variant="muted">{latestMeasured.stats.sentiment.neutral} neutral</Badge>
                    {latestMeasured.stats.sentiment.negative > 0 && (
                      <Badge variant="bad">{latestMeasured.stats.sentiment.negative} negative</Badge>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-navy-400">Appears after your first monitor run.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
