import {
  CATEGORY_TITLES,
  type AuditBreakdown,
  type CategoryKey,
  type CategoryResult,
} from "@/lib/audit/types";
import { cn } from "@/lib/utils";

export function scoreTone(score: number, max: number) {
  const pct = max ? score / max : 0;
  return pct >= 0.7 ? "good" : pct >= 0.4 ? "warn" : "bad";
}

const TONE_STROKE = { good: "stroke-accent", warn: "stroke-amber-500", bad: "stroke-red-500" } as const;
/** Brighter strokes that read on the navy audit header. */
const TONE_STROKE_DARK = {
  good: "stroke-[#2BC4B0]",
  warn: "stroke-amber-400",
  bad: "stroke-red-400",
} as const;

/** `toneMax` sets the colour threshold — the points actually measured, which may be less than `max`. */
export function ScoreRing({
  score,
  max = 100,
  toneMax = max,
  size = 140,
  onDark = false,
}: {
  score: number;
  max?: number;
  toneMax?: number;
  size?: number;
  /** Light-on-navy colours for the audit header. */
  onDark?: boolean;
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
      className="shrink-0"
    >
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="10"
        className={onDark ? "stroke-navy-600" : "stroke-navy-50"}
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 60 60)"
        className={
          onDark ? TONE_STROKE_DARK[scoreTone(score, toneMax)] : TONE_STROKE[scoreTone(score, toneMax)]
        }
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        className={cn("font-display text-[30px] font-bold", onDark ? "fill-white" : "fill-navy")}
      >
        {score}
      </text>
      <text
        x="60"
        y="78"
        textAnchor="middle"
        className={cn("text-[11px]", onDark ? "fill-navy-200" : "fill-navy-300")}
      >
        out of {max}
      </text>
    </svg>
  );
}

/** Points from categories that weren't measured (missing API keys, not run) — shown so the score isn't misread. */
export function unmeasuredPoints(breakdown: AuditBreakdown) {
  return (Object.keys(breakdown) as CategoryKey[])
    .filter((k) => !isMeasured(k, breakdown[k]))
    .reduce((sum, k) => sum + breakdown[k].max, 0);
}

/**
 * Whether a category's score is a real measurement. A site-check "error"
 * (e.g. homepage returns 403) is a genuine finding; a live-visibility "error"
 * means the AI calls failed, so nothing was measured.
 */
export function isMeasured(key: CategoryKey, result: CategoryResult) {
  if (result.status === "ok") return true;
  return result.status === "error" && key !== "live_visibility";
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

/** Short label for the audit header, judged like the headline against the points we could measure. */
export function verdictLabel(score: number, measuredMax: number) {
  const tone = scoreTone(score, measuredMax);
  return tone === "good" ? "Mostly ready" : tone === "warn" ? "Partly ready" : "Not ready yet";
}

/**
 * The site-side categories with the most points still to gain (live visibility
 * is left out: there is no single site change that guarantees mentions).
 * Every number is max − score from this audit, so "up to" is exact.
 */
export function biggestWins(breakdown: AuditBreakdown, count = 2) {
  const wins = (Object.keys(breakdown) as CategoryKey[])
    .filter((k) => k !== "live_visibility" && isMeasured(k, breakdown[k]) && breakdown[k].fix)
    .map((k) => ({ key: k, title: CATEGORY_TITLES[k], gain: breakdown[k].max - breakdown[k].score }))
    .filter((w) => w.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, count);
  return { wins, points: Math.round(wins.reduce((sum, w) => sum + w.gain, 0)) };
}

/** True when the audit's live-visibility points came from mock mode. */
export function isMockAudit(breakdown: AuditBreakdown) {
  return breakdown.live_visibility?.detail?.mock === true;
}
