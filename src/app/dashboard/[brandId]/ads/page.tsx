import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Ads" };

/**
 * Placeholder so the dashboard's shape is in place. ChatGPT Ads buying is a
 * post-MVP module; nothing here calls an ads API.
 */
export default function AdsPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-light text-accent-dark">
          <Megaphone className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Coming soon</p>
          <h2 className="text-xl font-semibold">ChatGPT Ads, from the same dashboard</h2>
          <p className="max-w-lg text-sm text-navy-400">
            Soon you&apos;ll be able to promote your brand inside AI answers for the prompts you already track
            here — with budgets in ₹, and results next to your organic mention rate.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href={`mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(`${siteConfig.name} Ads early access`)}`}
          >
            Ask about early access
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
