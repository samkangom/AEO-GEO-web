import { type AuditBreakdown } from "@/lib/audit/types";
import { cn } from "@/lib/utils";

export function scoreTone(score: number, max: number) {
  const pct = max ? score / max : 0;
  return pct >= 0.7 ? "good" : pct >= 0.4 ? "warn" : "bad";
}

const TONE_STROKE = { good: "stroke-accent", warn: "stroke-amber-500", bad: "stroke-red-500" } as const;

/** `toneMax` sets the colour threshold — the points actually measured, which may be less than `max`. */
export function ScoreRing({
  score,
  max = 100,
  toneMax = max,
  size = 140,
}: {
  score: number;
  max?: number;
  toneMax?: number;
  size?: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Score ${score} out of ${max}`}
    >
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-navy-50" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 60 60)"
        className={TONE_STROKE[scoreTone(score, toneMax)]}
      />
      <text x="60" y="58" textAnchor="middle" className="fill-navy text-[28px] font-semibold">
        {score}
      </text>
      <text x="60" y="78" textAnchor="middle" className="fill-navy-300 text-[11px]">
        out of {max}
      </text>
    </svg>
  );
}

/** Points from categories that weren't measured (missing API keys, not run) — shown so the score isn't misread. */
export function unmeasuredPoints(breakdown: AuditBreakdown) {
  return Object.values(breakdown)
    .filter((c) => c.status === "not_configured" || c.status === "not_run")
    .reduce((sum, c) => sum + c.max, 0);
}

/** Headline judged against the points we could actually measure. */
export function ScoreHeadline({
  score,
  measuredMax,
  className,
}: {
  score: number;
  measuredMax: number;
  className?: string;
}) {
  const tone = scoreTone(score, measuredMax);
  const text =
    tone === "good"
      ? "Your site is well set up for AI answer engines to find and recommend you."
      : tone === "warn"
        ? "AI answer engines can find you, but there are gaps holding you back."
        : "AI answer engines will struggle to find and recommend you right now.";
  return <p className={cn("text-lg font-medium text-navy", className)}>{text}</p>;
}
