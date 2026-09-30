import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  /** Visually hide the wordmark below `sm` (tight headers); stays readable to screen readers. */
  compact?: boolean;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold text-navy", className)}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-md bg-navy text-sm font-bold text-accent-light"
      >
        {siteConfig.name.charAt(0)}
      </span>
      <span className={cn("text-lg tracking-tight", compact && "sr-only sm:not-sr-only")}>
        {siteConfig.name}
      </span>
    </Link>
  );
}
