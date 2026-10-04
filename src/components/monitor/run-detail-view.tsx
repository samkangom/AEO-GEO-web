import Link from "next/link";
import { isMockModel } from "@/lib/mock-mode";
import { MockBadge } from "@/components/mock-badge";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { EngineId } from "@/lib/engines/types";
import type { RunResult } from "@/lib/monitor/store";
import { displayStatus, formatRate, summariseRun } from "@/lib/monitor/stats";
import { intentLabel, type OrgKind } from "@/lib/org-kind";
import { LANGUAGE_LABELS, type Intent, type Language } from "@/lib/prompts/types";
import type { MonitorRun } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { RunStatusBadge } from "./run-status-badge";

const LABELS: Record<EngineId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

/** Engines answer in Markdown; drop emphasis markers and link syntax for plain display (stored text is untouched). */
function readable(md: string) {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "");
}

const SENTIMENT_VARIANT = { positive: "good", neutral: "muted", negative: "bad" } as const;

export function RunDetailView({
  brandId,
  brandKind = "business",
  run,
  results,
}: {
  brandId: string;
  brandKind?: OrgKind;
  run: MonitorRun;
  results: RunResult[];
}) {
  const stats = summariseRun(results);
  const status = displayStatus(run);
  const engineCount = Object.keys(stats.perEngine).length;
  const seconds = run.finished_at
    ? Math.max(1, Math.round((Date.parse(run.finished_at) - Date.parse(run.started_at)) / 1000))
    : null;
  const byPrompt = new Map<string, RunResult[]>();
  for (const r of results) byPrompt.set(r.prompt_id, [...(byPrompt.get(r.prompt_id) ?? []), r]);

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/${brandId}/monitor`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-dark hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Monitor
      </Link>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold md:text-3xl">Run of {formatDate(run.started_at)}</h2>
            <RunStatusBadge status={status} />
            {run.mock && <MockBadge />}
          </div>
          <p className="text-sm text-navy-400">
            {byPrompt.size} prompt{byPrompt.size === 1 ? "" : "s"} × {engineCount} engine
            {engineCount === 1 ? "" : "s"} · {stats.overall.measured} answer
            {stats.overall.measured === 1 ? "" : "s"} · {stats.failed} failed call
            {stats.failed === 1 ? "" : "s"}
            {seconds !== null && ` · took ${seconds} s`}
            {Object.entries(stats.perEngine).map(([e, r]) => ` · ${LABELS[e as EngineId]} ${formatRate(r)}`)}
          </p>
        </div>
        <p className="ml-auto font-display text-3xl font-bold tabular-nums">
          {formatRate(stats.overall)}{" "}
          <span className="font-sans text-sm font-medium text-navy-400">mention rate</span>
        </p>
      </div>

      {run.mock && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This run used mock mode: the answers below are simulated, not real AI results.
        </p>
      )}
      {status === "interrupted" && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This run stopped before it finished. Its answers are shown here but not counted in your mention
          rate.
        </p>
      )}

      {[...byPrompt.values()].map((rows) => {
        const prompt = rows[0].prompt;
        return (
          <Card key={rows[0].prompt_id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap gap-2">
                {prompt && <Badge>{intentLabel(prompt.intent as Intent, brandKind)}</Badge>}
                {prompt && <Badge variant="muted">{LANGUAGE_LABELS[prompt.language as Language]}</Badge>}
              </div>
              <p className="text-base font-medium text-navy">“{prompt?.text ?? "Deleted prompt"}”</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="rounded-md border border-navy-50 p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: siteConfig.colors.engines[r.engine] }}
                        aria-hidden
                      />
                      {LABELS[r.engine]}
                    </span>
                    {r.error ? (
                      <>
                        <Badge variant="bad">Call failed</Badge>
                        <span className="text-navy-400">{r.error} · not counted</span>
                      </>
                    ) : r.mentioned ? (
                      <Badge variant="good">Mentioned{r.position ? ` · #${r.position}` : ""}</Badge>
                    ) : (
                      <Badge variant="muted">Not mentioned</Badge>
                    )}
                    {r.cited && <Badge variant="good">Links to your site</Badge>}
                    {r.sentiment && (
                      <Badge variant={SENTIMENT_VARIANT[r.sentiment]}>
                        {r.sentiment[0].toUpperCase() + r.sentiment.slice(1)}
                      </Badge>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-navy-300">
                      {isMockModel(r.model_version) && <MockBadge />}
                      {r.model_version}
                    </span>
                  </div>
                  {r.raw_response && (
                    <details className="mt-2 text-sm">
                      <summary className="inline-flex min-h-8 cursor-pointer select-none items-center font-semibold text-accent-dark">
                        Show answer
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3.5 leading-relaxed text-navy-700">
                        {readable(r.raw_response)}
                      </p>
                      {r.citations.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-navy-400">
                          {r.citations.map((u) => (
                            <li key={u} className="[overflow-wrap:anywhere]">
                              <a
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="hover:underline"
                              >
                                {u}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </details>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
