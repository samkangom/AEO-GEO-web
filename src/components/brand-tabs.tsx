"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BrandTabs({ brandId }: { brandId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${brandId}`;
  const tabs = [
    { segment: "", label: "Overview" },
    { segment: "audit", label: "Audit" },
    { segment: "prompts", label: "Prompts" },
    { segment: "monitor", label: "Monitor" },
    { segment: "ads", label: "Ads", soon: true },
    { segment: "settings", label: "Settings" },
  ].map((t) => ({ ...t, href: t.segment ? `${base}/${t.segment}` : base }));
  // The section is the path segment right after the brand id, so sub-pages (e.g. a run) keep their tab active.
  const parts = pathname.split("/");
  const current = parts[parts.indexOf(brandId) + 1] ?? "";

  return (
    // Scrolls sideways on narrow screens instead of wrapping or overflowing the page.
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Brand sections">
      <div className="flex min-w-max gap-1 border-b border-navy-100">
        {tabs.map((t) => {
          const active = t.segment === current;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                active ? "border-accent text-navy" : "border-transparent text-navy-400 hover:text-navy",
                t.soon && !active && "text-navy-300",
              )}
            >
              {t.label}
              {t.soon && (
                <span className="rounded-full bg-navy-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-navy-400">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
