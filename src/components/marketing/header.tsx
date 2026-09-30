import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/70 bg-paper/90 backdrop-blur">
      <div className="container flex h-16 items-center gap-3 sm:gap-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-navy-600 md:flex" aria-label="Main">
          <Link href="/#how-it-works" className="hover:text-navy">
            How it works
          </Link>
          <Link href="/#what-we-check" className="hover:text-navy">
            What we check
          </Link>
          <Link href="/pricing" className="hover:text-navy">
            Pricing
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/pricing"
            className="hidden px-1.5 text-sm text-navy-600 hover:text-navy min-[380px]:inline md:hidden"
          >
            Pricing
          </Link>
          <Button variant="ghost" asChild className="px-1.5 sm:px-4">
            <Link href="/login">Log in</Link>
          </Button>
          <Button variant="accent" asChild className="px-3 sm:px-4">
            <Link href="/signup">
              <span className="sm:hidden">Free audit</span>
              <span className="hidden sm:inline">Start free audit</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
