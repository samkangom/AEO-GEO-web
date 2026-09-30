import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInr, plans, type Plan } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** "Contact us" opens an email to sales with the plan pre-filled. No payment is taken on the site. */
export function contactHref(plan: Plan) {
  const subject = `${siteConfig.name} ${plan.name} plan`;
  const body = `Hi ${siteConfig.name} team,\n\nI'd like to know more about the ${plan.name} plan (${formatInr(plan.priceInr)}/month).\n\nCompany:\nWebsite:\nNumber of brands:\nPhone:\n`;
  return `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-white p-6",
        plan.highlighted ? "border-accent shadow-lg ring-1 ring-accent" : "border-navy-100 shadow-sm",
      )}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-white">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-navy">{plan.name}</h3>
      <p className="mt-1 text-sm text-navy-400">{plan.tagline}</p>
      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight text-navy">{formatInr(plan.priceInr)}</span>
        <span className="text-sm text-navy-400">{plan.priceInr === 0 ? "forever" : "/month"}</span>
      </p>
      {plan.priceInr > 0 && <p className="mt-1 text-xs text-navy-300">+ 18% GST</p>}

      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {plan.features.map((f) => (
          <li key={f.text} className="flex gap-2">
            {f.soon ? (
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" aria-hidden />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            )}
            <span className={f.soon ? "text-navy-400" : "text-navy-700"}>
              {f.text}
              {f.soon && (
                <span className="ml-1.5 rounded-full bg-navy-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-navy-400">
                  Coming soon
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={plan.highlighted || plan.cta.kind === "signup" ? "accent" : "outline"}
        className="mt-6 w-full"
      >
        {plan.cta.kind === "signup" ? (
          <Link href="/signup">{plan.cta.label}</Link>
        ) : (
          <a href={contactHref(plan)}>{plan.cta.label}</a>
        )}
      </Button>
    </div>
  );
}

export function PlanCards() {
  return (
    <div className="grid gap-6 pt-3 sm:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}
