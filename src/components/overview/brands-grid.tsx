import Link from "next/link";
import { MockBadge } from "@/components/mock-badge";
import { Plus } from "lucide-react";
import { ScoreRing } from "@/components/audit/score-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRate, type Rate } from "@/lib/monitor/stats";
import { displayHost } from "@/lib/url";
import { formatDate } from "@/lib/utils";

export type BrandSummary = {
  id: string;
  name: string;
  url: string;
  audit: { score: number; measuredMax: number; mock?: boolean; noScore?: boolean } | null;
  mention: { rate: Rate; date: string; mock?: boolean } | null;
};

/** Agency view: every brand on the account at a glance. */
export function BrandsGrid({ brands }: { brands: BrandSummary[] }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All brands</h1>
          <p className="text-sm text-navy-400">
            {brands.length} brand{brands.length === 1 ? "" : "s"} on this account
          </p>
        </div>
        <Button variant="accent" asChild>
          <Link href="/dashboard/brands/new">
            <Plus className="h-4 w-4" /> Add brand
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/dashboard/${b.id}`}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                {b.audit?.noScore ? (
                  <div
                    className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-[6px] border-navy-50 text-center text-[11px] font-semibold leading-tight text-navy-400"
                    title="We couldn't load this website, so there's no score"
                  >
                    No
                    <br />
                    score
                  </div>
                ) : b.audit ? (
                  <ScoreRing score={b.audit.score} toneMax={b.audit.measuredMax} size={72} />
                ) : (
                  <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-2 border-dashed border-navy-100 text-xs text-navy-300">
                    No audit
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-semibold text-navy">
                    <span className="truncate">{b.name}</span>
                    {(b.audit?.mock || b.mention?.mock) && <MockBadge />}
                  </p>
                  <p className="truncate text-xs text-navy-400">{displayHost(b.url)}</p>
                  <p className="text-sm text-navy-600">
                    {b.mention ? (
                      <>
                        <span className="font-medium text-navy">{formatRate(b.mention.rate)}</span> AI mention
                        rate
                        <span className="block text-xs text-navy-300">
                          {formatDate(b.mention.date).split(",")[0]}
                        </span>
                      </>
                    ) : (
                      <span className="text-navy-400">Not monitored yet</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
