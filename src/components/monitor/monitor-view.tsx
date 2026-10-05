import Link from "next/link";
import { MockBadge } from "@/components/mock-badge";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngineId } from "@/lib/engines/types";
import type { RunWithStats } from "@/lib/monitor/store";
import { formatRate } from "@/lib/monitor/stats";
import { formatDate } from "@/lib/utils";
import { latestDelta, mentionTrend } from "@/lib/monitor/chart";
import type { CitedSource } from "@/lib/monitor/sources";
import { MentionChart } from "./mention-chart";
import { RunMonitorButton } from "./run-monitor-button";
import { RunStatusBadge } from "./run-status-badge";
import { StatTile } from "./stat-tile";

const LABELS: Record<EngineId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export type MonitorViewProps = {
  brandId: string;
  brandName: string;
  activePrompts: number;
  maxPrompts: number;
  engines: EngineId[];
  /** Newest first. */
  runs: RunWithStats[];
  /** Websites cited by the latest run's answers, most-cited first. */
  sources?: CitedSource[];
};

export function MonitorView({
  brandId,
  brandName,
  activePrompts,
  maxPrompts,
  engines,
  runs,
  sources = [],
}: MonitorViewProps) {
  const latest = runs.find((r) => r.stats.overall.measured > 0);
  const { engines: chartEngines, points } = mentionTrend(runs, engines);
  const delta = latestDelta(runs);

  const calls = activePrompts * engines.length;
  const blocker = !engines.length
    ? "No AI engines are configured (add OPENAI_API_KEY and/or ANTHROPIC_API_KEY)."
    : activePrompts === 0
      ? "Activate at least one prompt on the Prompts tab to start monitoring."
      : activePrompts > maxPrompts
        ? `A run covers up to ${maxPrompts} active prompts — you have ${activePrompts}.`
        : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Monitor</CardTitle>
            <CardDescription className="max-w-2xl">
              Asks {engines.length ? engines.map((e) => LABELS[e]).join(" and ") : "each AI engine"} every
              active prompt with web search on, and records whether {brandName} is mentioned, cited, where it
              ranks, and how it&apos;s described.
            </CardDescription>
            <p className="text-sm text-navy-400">
              {activePrompts} active prompt{activePrompts === 1 ? "" : "s"}
              {engines.length > 0 &&
                ` × ${engines.length} engine${engines.length === 1 ? "" : "s"} = ${calls} answers per run`}
            </p>
            {blocker && <p className="text-sm text-amber-700">{blocker}</p>}
          </div>
          <RunMonitorButton
            brandId={brandId}
            disabled={!!blocker}
            estimate={calls > 16 ? "a few minutes" : "about a minute"}
          />
        </CardHeader>
      </Card>

      {!latest ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-navy-400">
            No monitor results yet. Your first run will show mention rates per AI engine here.
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-labelledby="latest-run">
            <h2 id="latest-run" className="mb-3 flex items-center gap-2 text-sm font-medium text-navy-400">
              Latest run · {formatDate(latest.started_at)}
              {latest.mock && <MockBadge />}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                label="Mention rate"
                value={formatRate(latest.stats.overall)}
                sub={
                  !delta
                    ? `${latest.stats.overall.mentioned} of ${latest.stats.overall.measured} answers`
                    : delta.points === 0
                      ? "No change vs previous run"
                      : `${delta.points > 0 ? "+" : "−"}${Math.abs(delta.points)} pts vs previous run`
                }
                subTone={!delta || delta.points === 0 ? undefined : delta.points > 0 ? "up" : "down"}
              />
              {chartEngines.map((e) => (
                <StatTile
                  key={e}
                  label={LABELS[e]}
                  swatch={siteConfig.colors.engines[e]}
                  value={formatRate(latest.stats.perEngine[e])}
                  sub={
                    latest.stats.perEngine[e]
                      ? `${latest.stats.perEngine[e]!.mentioned} of ${latest.stats.perEngine[e]!.measured} answers`
                      : "not in this run"
                  }
                />
              ))}
              <StatTile
                label="Cites your site"
                value={String(latest.stats.cited)}
                sub="answers link to your site"
              />
              {latest.stats.failed > 0 && (
                <StatTile
                  label="Couldn't check"
                  value={String(latest.stats.failed)}
                  sub="calls failed, not counted"
                />
              )}
            </div>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mention rate over time</CardTitle>
              <CardDescription>
                Share of answers that mention {brandName}, per engine, per run.
                {runs.some((r) => r.mock) && " Includes mock runs — see the run history."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MentionChart points={points} engines={chartEngines} />
            </CardContent>
          </Card>
        </>
      )}

      {latest && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sources AI answers cite</CardTitle>
            <CardDescription>
              The websites the answers in the latest run relied on. Being listed, reviewed or mentioned on
              these is how brands get into the answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-navy-400">The answers in this run didn&apos;t cite any websites.</p>
            ) : (
              <ul>
                {sources.map((s) => (
                  <li
                    key={s.domain}
                    className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-navy-50 py-2 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-navy [overflow-wrap:anywhere]">
                      {s.domain}
                    </span>
                    {s.own && <Badge variant="good">Your site</Badge>}
                    <span className="text-sm tabular-nums text-navy-600">
                      cited in {s.answers} answer{s.answers === 1 ? "" : "s"}
                    </span>
                    {!s.own && (
                      <span className="w-full text-xs text-navy-400 sm:w-auto">
                        {s.withBrand === 0
                          ? "you weren't mentioned in any of them"
                          : `you were mentioned in ${s.withBrand}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {runs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Run history</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-navy-400">
                <tr>
                  <th className="pb-2 font-medium">Started</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Answers</th>
                  {chartEngines.map((e) => (
                    <th key={e} className="pb-2 text-right font-medium">
                      {LABELS[e]}
                    </th>
                  ))}
                  <th className="pb-2 text-right font-medium">Overall</th>
                  <th className="pb-2 text-right font-medium">Failed calls</th>
                  <th className="pb-2">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-navy-50">
                    <td className="py-2">{formatDate(r.started_at)}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <RunStatusBadge status={r.displayStatus} />
                        {r.mock && <MockBadge />}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.stats.overall.measured}</td>
                    {chartEngines.map((e) => (
                      <td key={e} className="py-2 text-right">
                        {formatRate(r.stats.perEngine[e])}
                      </td>
                    ))}
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {formatRate(r.stats.overall)}
                    </td>
                    <td
                      className={
                        r.stats.failed
                          ? "py-2 text-right text-red-700 tabular-nums"
                          : "py-2 text-right text-navy-300"
                      }
                    >
                      {r.stats.failed}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/dashboard/${brandId}/monitor/${r.id}`}
                        className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-accent-dark hover:underline"
                      >
                        View answers
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-navy-400">
              Mention rate = answers that mention you ÷ answers received. Failed calls are never counted as
              &ldquo;not mentioned&rdquo;. Interrupted runs are kept but not counted.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-navy-100 bg-white px-5 py-4">
        <span className="font-semibold">Scheduled weekly monitoring</span>
        <Badge variant="warn">Coming soon</Badge>
        <span className="text-sm text-navy-400">
          For now, run the monitor whenever you want fresh answers.
        </span>
      </div>
    </div>
  );
}
