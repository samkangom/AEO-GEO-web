import Link from "next/link";
import { siteConfig } from "@/config/site";

export function MarketingFooter() {
  return (
    <footer className="bg-navy text-navy-100">
      <div className="container grid gap-8 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="text-lg font-semibold text-white">{siteConfig.name}</p>
          <p className="max-w-sm text-sm text-navy-200">{siteConfig.description}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-white">Product</p>
          <ul className="space-y-1.5">
            <li>
              <Link href="/#what-we-check" className="hover:text-white">
                What we check
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-white">
                Free audit
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Log in
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-white">Contact</p>
          <ul className="space-y-1.5">
            <li>
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-white">
                {siteConfig.contactEmail}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(`${siteConfig.name} partner programme`)}`}
                className="hover:text-white"
              >
                Become a partner
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-700">
        <p className="container py-4 text-xs text-navy-200">
          © {new Date().getFullYear()} {siteConfig.name}. Prices in INR. Built by {siteConfig.company}
        </p>
      </div>
    </footer>
  );
}
