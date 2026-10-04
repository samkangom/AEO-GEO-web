import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  swatch,
  subTone,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Series colour dot, so a tile can be matched to its chart line. */
  swatch?: string;
  /** Colours the sub-line as a rise or fall. */
  subTone?: "up" | "down";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-navy-100 bg-white p-4", className)}>
      <p className="flex items-center gap-2 text-sm text-navy-400">
        {swatch && <span className="h-2 w-2 rounded-full" style={{ background: swatch }} aria-hidden />}
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-navy">{value}</p>
      {sub && (
        <p
          className={cn(
            "mt-0.5 text-[13px]",
            subTone === "up"
              ? "font-semibold text-accent-dark"
              : subTone === "down"
                ? "font-semibold text-red-700"
                : "text-navy-400",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
