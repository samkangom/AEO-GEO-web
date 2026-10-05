import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileCode2,
  Languages,
  MapPin,
  MessageSquareText,
  Radar,
  ScrollText,
  Search,
} from "lucide-react";
import { Faq } from "@/components/marketing/faq";
import { PlanCards } from "@/components/marketing/plan-cards";
import { QuickCheck } from "@/components/marketing/quick-check";
import { Button } from "@/components/ui/button";
import { plans } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { CATEGORY_MAX } from "@/lib/audit/types";
import { siteUrl } from "@/lib/site-url";

// The no-sign-up site check (a server action) runs on this route.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — Is AI recommending your brand?` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

/** The real scoring model — shown instead of invented example results. */
const CHECKS = [
  {
    icon: MessageSquareText,
    title: "Live AI visibility",
    points: CATEGORY_MAX.live_visibility,
    body: "We ask ChatGPT and Claude, with web search on, the questions your buyers ask, and check whether you show up.",
  },
  {
    icon: Bot,
    title: "AI crawler access",
    points: CATEGORY_MAX.crawl_access,
    body: "Can the bots behind ChatGPT search, Claude and Perplexity read your site? Blocking model-training bots is your call and never costs points.",
  },
  {
    icon: FileCode2,
    title: "Structured data",
    points: CATEGORY_MAX.structured_data,
    body: "Machine-readable facts about who you are and what you offer, so AI tools describe you correctly.",
  },
  {
    icon: ScrollText,
    title: "Content signals",
    points: CATEGORY_MAX.content_signals,
    body: "An About page, answers to common questions, public pricing (for businesses) and a clear description. Checks that don’t apply cost no points.",
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Add your website",
    body: "Just your brand name and URL. No code, no integrations.",
  },
  {
    icon: Radar,
    title: "Get your free score",
    body: "An AI-readiness score out of 100 with a plain-English fix for every weak spot, in about a minute.",
  },
  {
    icon: MessageSquareText,
    title: "Track AI answers",
    body: "Monitor the prompts that matter and see your mention rate, citations, ranking and sentiment over time.",
  },
];

const FAQ = [
  {
    q: "What is AEO or GEO?",
    a: "Answer engine optimisation (AEO), also called generative engine optimisation (GEO), is making sure AI assistants like ChatGPT and Claude can find you, understand you, and recommend you when people ask.",
  },
  {
    q: "How is this different from SEO?",
    a: "SEO tracks where you rank in a list of links. AI assistants write one answer and mention a few names, or none. We measure whether you're one of them and what's stopping you.",
  },
  {
    q: "Are the results real?",
    a: "Yes. Every visibility number comes from a real question asked to a real AI engine, and you can read the full answer behind it. Engines without an API key show “Not configured”, never an estimate.",
  },
  {
    q: "Do you support Hindi?",
    a: "Yes. Questions can be written in English, Hindi or Hinglish, and we check local questions for Indian cities.",
  },
  {
    q: "Is it only for businesses?",
    a: "No. Any website works, including political parties, nonprofits and government bodies. Checks that don’t apply, like public pricing, are “not applicable” and cost no points. Questions for parties stay neutral and never ask an AI who to vote for.",
  },
  {
    q: "Is the audit really free?",
    a: "Yes. One brand, one full audit, no card needed. You get the same score and fixes a paid customer sees.",
  },
];

function StructuredData() {
  const base = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteConfig.name,
        url: base,
        email: siteConfig.contactEmail,
        description: siteConfig.description,
        areaServed: "IN",
      },
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: base,
        offers: plans.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: p.priceInr,
          priceCurrency: "INR",
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function HomePage() {
  const total = Object.values(CATEGORY_MAX).reduce((a, b) => a + b, 0);

  return (
    <>
      <StructuredData />

      {/* Hero */}
      <section className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent-dark">
            AI visibility for Indian brands and organisations
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
            Is ChatGPT recommending your brand — or your competitor?
          </h1>
          <p className="max-w-xl text-lg text-navy-500">
            Buyers now ask AI assistants for shortlists. {siteConfig.name} shows whether ChatGPT and Claude
            mention you, where you rank, and exactly what to fix when they don&apos;t.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="accent" size="lg" asChild>
              <Link href="/signup">
                Get your free AI-readiness score <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="text-sm text-navy-400">
            Free audit · No card needed · Results in about a minute ·{" "}
            <a href="#check" className="font-medium text-accent-dark underline-offset-2 hover:underline">
              or check a website now, no sign-up
            </a>
          </p>
        </div>

        <div className="rounded-2xl bg-navy p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-medium text-accent-light">How your AI-readiness score is built</p>
          <p className="mt-1 text-xs text-navy-200">{total} points across four checks</p>
          <ul className="mt-6 space-y-5">
            {CHECKS.map((c) => (
              <li key={c.title}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <c.icon className="h-4 w-4 text-accent-light" aria-hidden /> {c.title}
                  </span>
                  <span className="font-medium">{c.points} pts</span>
                </div>
                <div className="h-2 rounded-full bg-navy-700">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${(c.points / 40) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-navy-700 pt-4 text-xs text-navy-200">
            Every live-visibility point comes from a real question asked to a real AI engine — you can read
            each answer.
          </p>
        </div>
      </section>

      {/* Instant check, no sign-up */}
      <section
        id="check"
        aria-labelledby="check-title"
        className="scroll-mt-20 border-t border-navy-100 py-16 md:py-20"
      >
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-3">
            <h2 id="check-title" className="text-3xl font-semibold text-navy">
              Check any website now
            </h2>
            <p className="text-lg text-navy-500">
              See in seconds whether AI crawlers can read a site, and whether it tells AI clearly who it is.
              No sign-up and no sales call.
            </p>
          </div>
          <QuickCheck />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-navy-100 bg-white py-16 md:py-20">
        <div className="container space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-navy">How it works</h2>
            <p className="text-navy-500">Think Google Search Console — but for AI answers.</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-navy-100 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-light text-accent-dark">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-navy-300">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-navy-500">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What we check */}
      <section id="what-we-check" className="container scroll-mt-20 space-y-10 py-16 md:py-20">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-navy">What we check</h2>
          <p className="text-navy-500">
            Four checks, explained in plain language — with one clear fix for anything that needs work.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {CHECKS.map((c) => (
            <div key={c.title} className="rounded-xl border border-navy-100 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy text-accent-light">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-navy-400">{c.points} points</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy">{c.title}</h3>
              <p className="mt-2 text-sm text-navy-500">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built for India */}
      <section className="bg-navy py-16 text-white md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">Built for how India asks</h2>
            <p className="text-navy-200">
              Your buyers and citizens don&apos;t all search in English. Neither do we.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Languages,
                title: "English, Hindi & Hinglish",
                body: "Questions written the way people type them: “kirana dukaan ke liye best billing app”, or “सबसे अच्छा बिलिंग ऐप”.",
              },
              {
                icon: MapPin,
                title: "City-level questions",
                body: "“Best supplier in Pune”, “top CRM in Bengaluru”. The local questions that drive leads.",
              },
              {
                icon: ScrollText,
                title: "Priced in rupees",
                body: "Simple monthly plans in ₹ with GST invoices. Start free.",
              },
            ].map((f) => (
              <div key={f.title}>
                <f.icon className="h-6 w-6 text-accent-light" aria-hidden />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-navy-200">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container space-y-10 py-16 md:py-20" aria-labelledby="home-pricing">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <h2 id="home-pricing" className="text-3xl font-semibold tracking-tight text-navy">
              Plans in rupees
            </h2>
            <p className="text-navy-500">Start free. Prices per month, excluding GST.</p>
          </div>
          <Link href="/pricing" className="text-sm font-medium text-accent-dark hover:underline">
            Compare plans →
          </Link>
        </div>
        <PlanCards />
      </section>

      {/* FAQ */}
      <section className="border-t border-navy-100 bg-white py-16 md:py-20" aria-labelledby="home-faq">
        <div className="container max-w-3xl space-y-6">
          <h2 id="home-faq" className="text-3xl font-semibold tracking-tight text-navy">
            Frequently asked questions
          </h2>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="container py-16 md:py-20">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-accent-light p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-navy">
              Find out what AI says about you
            </h2>
            <p className="text-navy-600">Your free AI-readiness score is about a minute away.</p>
          </div>
          <Button variant="accent" size="lg" asChild>
            <Link href="/signup">Start free audit</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
