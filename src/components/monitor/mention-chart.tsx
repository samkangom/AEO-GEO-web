"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import type { EngineId } from "@/lib/engines/types";

export type ChartPoint = {
  date: string;
  /** Mention rate 0–1 per engine; null = no answers from that engine in this run. */
  rates: Partial<Record<EngineId, number | null>>;
  measured: Partial<Record<EngineId, number>>;
};

const LABELS: Record<EngineId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

const HEIGHT = 240;
const M = { top: 16, right: 108, bottom: 28, left: 40 };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Mention rate over time, one line per engine. Hover (or focus + arrow keys)
 * shows every engine's value for that run. The runs table below is the
 * accessible table view of the same data.
 */
export function MentionChart({ points, engines }: { points: ChartPoint[]; engines: EngineId[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => M.top + (1 - v) * innerH;

  const series = useMemo(
    () =>
      engines.map((engine) => {
        // Break the line where a run has no answers from this engine.
        const segments: { i: number; v: number }[][] = [];
        let current: { i: number; v: number }[] = [];
        points.forEach((p, i) => {
          const v = p.rates[engine];
          if (v === null || v === undefined) {
            if (current.length) segments.push(current);
            current = [];
          } else current.push({ i, v });
        });
        if (current.length) segments.push(current);
        const last = [...points.keys()].reverse().find((i) => typeof points[i].rates[engine] === "number");
        return { engine, segments, last };
      }),
    [engines, points],
  );

  const xTicks =
    points.length <= 6
      ? points.map((_, i) => i)
      : [
          0,
          Math.round((points.length - 1) / 3),
          Math.round((2 * (points.length - 1)) / 3),
          points.length - 1,
        ];

  function nearest(clientX: number) {
    const rect = wrap.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    return best;
  }

  // Keep direct labels from colliding: nudge the lower one down if too close.
  const endLabels = series
    .filter((s) => s.last !== undefined)
    .map((s) => ({
      engine: s.engine,
      v: points[s.last!].rates[s.engine] as number,
      y: y(points[s.last!].rates[s.engine] as number),
    }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < endLabels.length; k++) {
    if (endLabels[k].y - endLabels[k - 1].y < 14) endLabels[k].y = endLabels[k - 1].y + 14;
  }

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-navy-600" aria-hidden>
        {engines.map((e) => (
          <span key={e} className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 rounded" style={{ background: siteConfig.colors.engines[e] }} />
            {LABELS[e]}
          </span>
        ))}
      </div>
      <div
        ref={wrap}
        className="relative w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
        tabIndex={0}
        role="img"
        aria-label={`Mention rate over ${points.length} monitor runs for ${engines.map((e) => LABELS[e]).join(" and ")}. See the runs table for exact values.`}
        onPointerMove={(e) => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setHover((h) => Math.min(points.length - 1, (h ?? -1) + 1));
          if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? points.length) - 1));
          if (e.key === "Escape") setHover(null);
        }}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={HEIGHT} className="block">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={M.left + innerW}
                y1={y(t)}
                y2={y(t)}
                className="stroke-navy-50"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-navy-300 text-[11px]"
              >
                {t * 100}%
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor={
                points.length > 1 && i === 0
                  ? "start"
                  : points.length > 1 && i === points.length - 1
                    ? "end"
                    : "middle"
              }
              className="fill-navy-300 text-[11px]"
            >
              {shortDate(points[i].date)}
            </text>
          ))}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={M.top}
              y2={M.top + innerH}
              className="stroke-navy-200"
              strokeWidth={1}
            />
          )}

          {series.map(({ engine, segments }) =>
            segments.map((seg, k) => (
              <g key={`${engine}-${k}`}>
                {seg.length > 1 && (
                  <polyline
                    points={seg.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
                    fill="none"
                    stroke={siteConfig.colors.engines[engine]}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {seg.map((p) => (
                  <circle
                    key={p.i}
                    cx={x(p.i)}
                    cy={y(p.v)}
                    r={hover === p.i ? 5 : 4}
                    fill={siteConfig.colors.engines[engine]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )),
          )}

          {endLabels.map((l) => (
            <text
              key={l.engine}
              x={M.left + innerW + 10}
              y={l.y}
              dy="0.32em"
              className="fill-navy-600 text-[12px]"
            >
              {LABELS[l.engine]} {Math.round(l.v * 100)}%
            </text>
          ))}
        </svg>

        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[10rem] rounded-md border border-navy-100 bg-white px-3 py-2 text-xs shadow-md"
            style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
          >
            <p className="mb-1 font-medium text-navy">{shortDate(hovered.date)}</p>
            {engines.map((e) => (
              <p key={e} className="flex items-center gap-2 text-navy-600">
                <span className="h-2 w-2 rounded-full" style={{ background: siteConfig.colors.engines[e] }} />
                <span className="flex-1">{LABELS[e]}</span>
                <span className="font-medium text-navy">
                  {typeof hovered.rates[e] === "number" ? `${Math.round(hovered.rates[e]! * 100)}%` : "—"}
                </span>
                <span className="text-navy-300">of {hovered.measured[e] ?? 0}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
