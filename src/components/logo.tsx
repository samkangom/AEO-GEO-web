import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold text-navy", className)}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-md bg-navy text-sm font-bold text-accent-light"
      >
        {siteConfig.name.charAt(0)}
      </span>
      <span className="text-lg tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
