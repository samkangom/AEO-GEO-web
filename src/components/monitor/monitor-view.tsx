import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngineId } from "@/lib/engines/types";
import type { RunWithStats } from "@/lib/monitor/store";
import { formatRate } from "@/lib/monitor/stats";
import { formatDate } from "@/lib/utils";
import { MentionChart, type ChartPoint } from "./mention-chart";
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
};

export function MonitorView({
  brandId,
  brandName,
  activePrompts,
  maxPrompts,
  engines,
  runs,
}: MonitorViewProps) {
  const latest = runs.find((r) => r.stats.overall.measured > 0);
  const chartRuns = [...runs].reverse().filter((r) => r.stats.overall.measured > 0);
  const chartEngines = engines.length
    ? engines
    : ([...new Set(chartRuns.flatMap((r) => Object.keys(r.stats.perEngine)))] as EngineId[]);
  const points: ChartPoint[] = chartRuns.map((r) => ({
    date: r.started_at,
    rates: Object.fromEntries(chartEngines.map((e) => [e, r.stats.perEngine[e]?.rate ?? null])),
    measured: Object.fromEntries(chartEngines.map((e) => [e, r.stats.perEngine[e]?.measured ?? 0])),
  }));

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
            <h2 id="latest-run" className="mb-3 text-sm font-medium text-navy-400">
              Latest run · {formatDate(latest.started_at)}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                label="Mention rate"
                value={formatRate(latest.stats.overall)}
                sub={`${latest.stats.overall.mentioned} of ${latest.stats.overall.measured} answers`}
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
              <StatTile label="Cited" value={String(latest.stats.cited)} sub="answers linking to your site" />
              <StatTile
                label="Avg. position"
                value={latest.stats.avgPosition ? `#${latest.stats.avgPosition.toFixed(1)}` : "—"}
                sub="when listed"
              />
              <StatTile
                label="Sentiment"
                value={`${latest.stats.sentiment.positive} / ${latest.stats.sentiment.neutral} / ${latest.stats.sentiment.negative}`}
                sub="positive / neutral / negative"
              />
              {latest.stats.failed > 0 && (
                <StatTile
                  label="Couldn't check"
                  value={String(latest.stats.failed)}
                  sub="engine calls failed"
                />
              )}
            </div>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mention rate over time</CardTitle>
              <CardDescription>
                Share of answers that mention {brandName}, per engine, per run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MentionChart points={points} engines={chartEngines} />
            </CardContent>
          </Card>
        </>
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
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-navy-50">
                    <td className="py-2">{formatDate(r.started_at)}</td>
                    <td className="py-2">
                      <RunStatusBadge status={r.displayStatus} />
                    </td>
                    <td className="py-2 text-right">
                      {r.stats.overall.measured}
                      {r.stats.failed > 0 && (
                        <span className="text-navy-300"> (+{r.stats.failed} failed)</span>
                      )}
                    </td>
                    {chartEngines.map((e) => (
                      <td key={e} className="py-2 text-right">
                        {formatRate(r.stats.perEngine[e])}
                      </td>
                    ))}
                    <td className="py-2 text-right font-medium">{formatRate(r.stats.overall)}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/dashboard/${brandId}/monitor/${r.id}`}
                        className="text-accent-dark hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
