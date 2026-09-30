import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  swatch,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Series colour dot, so a tile can be matched to its chart line. */
  swatch?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-navy-100 bg-white p-4", className)}>
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-navy-400">
        {swatch && <span className="h-2 w-2 rounded-full" style={{ background: swatch }} aria-hidden />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-navy-400">{sub}</p>}
    </div>
  );
}
