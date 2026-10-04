"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquareText,
  Settings,
} from "lucide-react";
import { BrandSwitcher } from "@/components/brand-switcher";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type NavItem = { segment: string; label: string; icon: typeof LayoutGrid; soon?: boolean };

const BRAND_NAV: NavItem[] = [
  { segment: "", label: "Overview", icon: LayoutGrid },
  { segment: "audit", label: "Audit", icon: ClipboardCheck },
  { segment: "prompts", label: "Prompts", icon: MessageSquareText },
  { segment: "monitor", label: "Monitor", icon: BarChart3 },
  { segment: "ads", label: "Ads", icon: Megaphone, soon: true },
  { segment: "settings", label: "Settings", icon: Settings },
];

const linkClass = (active: boolean) =>
  cn(
    "flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
    active
      ? "bg-accent-light font-semibold text-accent-dark"
      : "text-navy-500 hover:bg-paper hover:text-navy",
  );

/**
 * App navigation. A left column on desktop; on phones it sits above the page
 * with the section links in a sideways-scrolling row.
 */
export function DashboardSidebar({
  brands,
  email,
}: {
  brands: { id: string; name: string }[];
  email: string | null;
}) {
  const pathname = usePathname();
  const { brandId } = useParams<{ brandId?: string }>();
  // The section is the path segment right after the brand id, so sub-pages (e.g. a run) keep their link active.
  const parts = pathname.split("/");
  const current = brandId ? (parts[parts.indexOf(brandId) + 1] ?? "") : null;

  return (
    <aside className="flex flex-col gap-4 border-b border-navy-100 bg-white px-4 py-3 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:gap-6 md:overflow-y-auto md:border-b-0 md:border-r md:py-5">
      <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch">
        <Logo href="/dashboard" className="md:px-2" />
        <div className="ml-auto min-w-0 md:ml-0 md:space-y-1.5">
          <p className="hidden px-1 text-xs font-semibold uppercase tracking-wider text-navy-400 md:block">
            Brand
          </p>
          <BrandSwitcher brands={brands} />
        </div>
        {/* Phones: the account footer below is hidden, so sign-out lives in the top row. ("All brands" is in the switcher.) */}
        <form action="/auth/signout" method="post" className="md:hidden">
          <button
            type="submit"
            aria-label="Sign out"
            className="grid h-11 w-11 place-items-center rounded-md text-navy-500 hover:bg-paper hover:text-navy"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </form>
      </div>

      {brandId && (
        <nav
          aria-label="Brand sections"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0"
        >
          {BRAND_NAV.map(({ segment, label, icon: Icon, soon }) => {
            const href = segment ? `/dashboard/${brandId}/${segment}` : `/dashboard/${brandId}`;
            const active = segment === current;
            return (
              <Link
                key={segment}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(linkClass(active), soon && !active && "text-navy-300")}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {label}
                {soon && (
                  <span className="ml-auto rounded-full bg-navy-50 px-2 py-px text-[11px] font-semibold text-navy-400">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {brands.length > 1 && (
        <nav aria-label="Account" className="hidden md:block md:border-t md:border-navy-100 md:pt-4">
          <Link
            href="/dashboard"
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={linkClass(pathname === "/dashboard")}
          >
            <Briefcase className="h-[18px] w-[18px]" aria-hidden />
            All brands
          </Link>
        </nav>
      )}

      <div className="hidden flex-col gap-3 md:mt-auto md:flex">
        <div className="flex flex-col gap-1 rounded-xl border border-navy-100 bg-paper p-3.5">
          <span className="text-xs text-navy-400">Need more brands or prompts?</span>
          <Link href="/pricing" className="text-sm font-semibold text-accent-dark hover:underline">
            See plans
          </Link>
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="min-w-0 flex-1 truncate text-xs text-navy-400" title={email ?? undefined}>
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-navy-500 hover:bg-paper hover:text-navy"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
