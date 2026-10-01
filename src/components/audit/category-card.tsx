import { CheckCircle2, Info, Lightbulb, XCircle } from "lucide-react";
import { MockBadge } from "@/components/mock-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CATEGORY_TITLES, type CategoryKey, type CategoryResult } from "@/lib/audit/types";
import { cn } from "@/lib/utils";
import { isMeasured, scoreTone } from "./score-summary";

const BAR = { good: "bg-accent", warn: "bg-amber-500", bad: "bg-red-500" } as const;

function StatusBadge({ result }: { result: CategoryResult }) {
  if (result.status === "not_configured") return <Badge variant="muted">Not configured</Badge>;
  if (result.status === "not_run") return <Badge variant="muted">Not measured</Badge>;
  if (result.status === "error") return <Badge variant="bad">Couldn&apos;t check</Badge>;
  const tone = scoreTone(result.score, result.max);
  return <Badge variant={tone}>{tone === "good" ? "Good" : tone === "warn" ? "Needs work" : "Weak"}</Badge>;
}

export function CategoryCard({ category, result }: { category: CategoryKey; result: CategoryResult }) {
  const measured = isMeasured(category, result);
  const tone = scoreTone(result.score, result.max);

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold">{CATEGORY_TITLES[category]}</h3>
          <span className="flex shrink-0 items-center gap-1.5">
            {result.detail.mock === true && <MockBadge />}
            <StatusBadge result={result} />
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold">{measured ? result.score : "—"}</span>
          <span className="text-sm text-navy-300">/ {result.max} pts</span>
        </div>
        {measured && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-50">
            <div
              className={cn("h-full rounded-full", BAR[tone])}
              style={{ width: `${(result.score / result.max) * 100}%` }}
            />
          </div>
        )}
        <p className="text-sm text-navy-600">{result.summary}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {result.checks.length > 0 && (
          <ul className="space-y-2">
            {result.checks.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                {c.passed === true ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-label="Yes" />
                ) : c.passed === false ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-label="No" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" aria-label="Info" />
                )}
                <span>
                  {c.label}
                  {c.note && (
                    <span className="block text-xs [overflow-wrap:anywhere] text-navy-400">{c.note}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {result.fix && (
          <div className="mt-auto rounded-md bg-accent-light/60 p-3 text-sm">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-accent-dark">
              <Lightbulb className="h-4 w-4" /> Recommended fix
            </p>
            <p className="whitespace-pre-wrap text-navy-700">{result.fix}</p>
          </div>
        )}

        {Object.keys(result.detail).length > 0 && (
          <details className="text-xs text-navy-400">
            <summary className="cursor-pointer select-none">Technical details</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-navy-50 p-2 text-[11px] leading-relaxed">
              {JSON.stringify(result.detail, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
