"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BrandTabs({ brandId }: { brandId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${brandId}`;
  // Monitor history and Ads tabs arrive in Sprints 5–6.
  const tabs = [
    { href: base, label: "Audit" },
    { href: `${base}/prompts`, label: "Prompts" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <nav className="flex gap-1 border-b border-navy-100">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active ? "border-accent text-navy" : "border-transparent text-navy-400 hover:text-navy",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
