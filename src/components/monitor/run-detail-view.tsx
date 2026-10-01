import Link from "next/link";
import { isMockModel } from "@/lib/mock-mode";
import { MockBadge } from "@/components/mock-badge";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngineId } from "@/lib/engines/types";
import type { RunResult } from "@/lib/monitor/store";
import { displayStatus, formatRate, summariseRun } from "@/lib/monitor/stats";
import { LANGUAGE_LABELS, INTENT_LABELS, type Intent, type Language } from "@/lib/prompts/types";
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
  run,
  results,
}: {
  brandId: string;
  run: MonitorRun;
  results: RunResult[];
}) {
  const stats = summariseRun(results);
  const byPrompt = new Map<string, RunResult[]>();
  for (const r of results) byPrompt.set(r.prompt_id, [...(byPrompt.get(r.prompt_id) ?? []), r]);

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/${brandId}/monitor`}
        className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> All runs
      </Link>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Run · {formatDate(run.started_at)}</CardTitle>
            <RunStatusBadge status={displayStatus(run)} />
            {run.mock && <MockBadge />}
          </div>
          {run.mock && (
            <p className="text-sm text-amber-800">
              This run used mock mode: the answers below are simulated, not real AI results.
            </p>
          )}
          <p className="text-sm text-navy-600">
            Mentioned in {stats.overall.mentioned} of {stats.overall.measured} answers (
            {formatRate(stats.overall)})
            {Object.entries(stats.perEngine).map(([e, r]) => ` · ${LABELS[e as EngineId]} ${formatRate(r)}`)}
            {stats.failed > 0 && ` · ${stats.failed} call${stats.failed === 1 ? "" : "s"} failed`}
          </p>
        </CardHeader>
      </Card>

      {[...byPrompt.values()].map((rows) => {
        const prompt = rows[0].prompt;
        return (
          <Card key={rows[0].prompt_id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap gap-2">
                {prompt && <Badge>{INTENT_LABELS[prompt.intent as Intent]}</Badge>}
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
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-4 w-4" /> Couldn&apos;t check: {r.error}
                      </span>
                    ) : r.mentioned ? (
                      <span className="inline-flex items-center gap-1 text-accent-dark">
                        <CheckCircle2 className="h-4 w-4" /> Mentioned
                        {r.position && ` · #${r.position} in its list`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" /> Not mentioned
                      </span>
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
                      <summary className="cursor-pointer select-none text-navy-400">Show answer</summary>
                      <p className="mt-2 whitespace-pre-wrap text-navy-700">{readable(r.raw_response)}</p>
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
