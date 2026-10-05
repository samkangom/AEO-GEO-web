import type { Metadata } from "next";
import { Faq } from "@/components/marketing/faq";
import { PlanCards } from "@/components/marketing/plan-cards";
import { CopyEmailButton } from "@/components/marketing/copy-email-button";
import { formatInr, plans } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${siteConfig.name} plans in INR: a free AI-readiness audit, then monitoring from ₹1,999/month for Indian brands, organisations and agencies.`,
  alternates: { canonical: "/pricing" },
  openGraph: { url: "/pricing", title: `Pricing · ${siteConfig.name}` },
};

/** Plans and FAQ as JSON-LD, so AI answers about our pricing quote the real figures. */
function PricingStructuredData() {
  const base = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${base}/pricing`,
        offers: plans.map((p) => ({
          "@type": "Offer",
          name: p.name,
          description: p.tagline,
          price: p.priceInr,
          priceCurrency: "INR",
          ...(p.priceInr > 0 && {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: p.priceInr,
              priceCurrency: "INR",
              unitCode: "MON",
              valueAddedTaxIncluded: false,
            },
          }),
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const starter = plans.find((p) => p.id === "starter")!;
const starterGst = Math.round(starter.priceInr * 0.18);

const FAQ = [
  {
    q: "Is the free audit really free?",
    a: "Yes. One brand, one full audit, no card. You see the same score and fixes a paid customer sees.",
  },
  {
    q: "Can I pay online?",
    a: "Not yet. While we’re early, we set up paid plans personally. Write to us and we’ll set up your plan and send a GST invoice in INR.",
  },
  {
    q: "Do prices include GST?",
    a: `No. Prices are shown before 18% GST, and every invoice carries your GSTIN. For example, ${starter.name} is ${formatInr(starter.priceInr)} + ${formatInr(starterGst)} GST = ${formatInr(starter.priceInr + starterGst)} a month.`,
  },
  {
    q: "Which AI engines do you check?",
    a: "ChatGPT and Claude, with web search on. Gemini and Perplexity are coming soon. Until then they show “Not configured”, never an estimate.",
  },
  {
    q: "What counts as a “prompt”?",
    a: "One buyer question, like “best GST billing software for kirana stores”. Each monitor run asks every active prompt to every connected AI engine. We write them for you in English, Hindi and Hinglish, and you can edit them or add your own.",
  },
  {
    q: "I run an agency. Can I manage clients’ brands?",
    a: "Yes. The Agency plan covers up to 25 brands, businesses or other organisations, with an all-brands dashboard.",
  },
];

export default function PricingPage() {
  return (
    <div className="container space-y-16 py-16">
      <PricingStructuredData />
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-accent-dark">Pricing</p>
        <h1 className="text-4xl font-semibold tracking-tight text-navy">Simple plans, in rupees</h1>
        <p className="text-lg text-navy-500">
          Start with a free AI-readiness audit. Upgrade when you want to track how ChatGPT and Claude talk
          about your brand, week after week.
        </p>
      </div>

      <PlanCards />

      <p className="text-center text-sm text-navy-400">
        All prices are per month, in INR, excluding 18% GST. No card needed for the free audit.
      </p>

      <section className="mx-auto max-w-3xl space-y-6" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-2xl font-semibold text-navy">
          Questions about plans
        </h2>
        <Faq items={FAQ} />
      </section>

      <section
        id="contact"
        aria-labelledby="pricing-contact"
        className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-accent-light p-7 md:p-11"
      >
        <div className="max-w-xl space-y-2">
          <h2 id="pricing-contact" className="text-3xl font-bold text-navy">
            Talk to us about a paid plan
          </h2>
          <p className="text-accent-dark">
            Write to <span className="select-all font-semibold">{siteConfig.contactEmail}</span> with your
            brand and the plan you want. We set it up for you and send a GST invoice.
          </p>
        </div>
        <CopyEmailButton email={siteConfig.contactEmail} />
      </section>
    </div>
  );
}
