"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { quickCheck } from "@/app/(marketing)/quick-check-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function tone(score: number, max: number) {
  const pct = score / max;
  return pct >= 0.7 ? "bg-accent" : pct >= 0.4 ? "bg-amber-500" : "bg-red-500";
}

/** No-sign-up site check: the 60 site points now, the 40 live-AI points after sign-up. */
export function QuickCheck() {
  const [state, action, pending] = useActionState(quickCheck, undefined);
  const r = state?.result;

  return (
    <div className="space-y-5">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="quick-url" className="sr-only">
          Website to check
        </label>
        <Input
          id="quick-url"
          name="url"
          // Forms reset after each submit; keep the site that was just checked in the box.
          key={r?.checkedAt}
          defaultValue={r?.host}
          required
          inputMode="url"
          placeholder="yourbrand.in"
          disabled={pending}
          className="h-12 text-base sm:flex-1"
          aria-describedby="quick-hint"
        />
        <Button type="submit" variant="accent" size="lg" className="h-12" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
          {pending ? "Checking the site…" : "Check now"}
        </Button>
      </form>
      <p id="quick-hint" className="text-sm text-navy-400">
        No sign-up. Checks crawler access, structured data and content (60 of 100 points) in a few seconds.
      </p>

      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}
        {r && (
          <div className="space-y-5 rounded-2xl border border-navy-100 bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="text-xl font-bold">{r.host}</h3>
              {r.unreachable ? (
                <p className="font-display text-2xl font-bold text-navy">No score</p>
              ) : (
                <p className="font-display text-2xl font-bold tabular-nums text-navy">
                  {r.score}{" "}
                  <span className="font-sans text-sm font-medium text-navy-400">of 60 site points</span>
                </p>
              )}
            </div>
            {r.unreachable && (
              <p className="text-sm text-navy-600">
                We couldn&apos;t load this website&apos;s homepage, often because of bot protection, so we
                can&apos;t score it. It may load for AI crawlers even if it blocks us.
              </p>
            )}
            <ul className="space-y-4">
              {r.categories.map((c) => (
                <li key={c.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{c.title}</span>
                    <span className="text-sm tabular-nums text-navy-600">
                      {c.score === null ? "—" : Math.round(c.score)} / {c.max}
                    </span>
                  </div>
                  {c.score !== null && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-navy-50">
                      <div
                        className={cn("h-full rounded-full", tone(c.score, c.max))}
                        style={{ width: `${(c.score / c.max) * 100}%` }}
                      />
                    </div>
                  )}
                  <p className="text-sm text-navy-600">{c.summary}</p>
                  {c.fix && c.score !== null && c.score < c.max && (
                    <p className="text-sm text-navy-400">
                      <span className="font-semibold text-accent-dark">Fix: </span>
                      {c.fix}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-accent-light p-4">
              <p className="min-w-0 flex-1 text-sm text-accent-dark">
                <span className="font-semibold">The other 40 points</span> come from asking ChatGPT and Claude
                real buyer questions about your category. That needs a free account, and you can read every
                answer.
              </p>
              <Button asChild variant="accent">
                <Link href="/signup">
                  Get the full score <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <p className="text-xs text-navy-300">
              Checked{" "}
              {new Date(r.checkedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.
              Results are kept for 15 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
