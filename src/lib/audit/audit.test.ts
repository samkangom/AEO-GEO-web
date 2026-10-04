import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeHomepage, confirmsPage, scoreContentSignals } from "./content-signals";
import { scoreCrawlAccess } from "./crawl-access";
import { extractJsonLdTypes, scoreStructuredData } from "./structured-data";
import { normaliseSiteUrl } from "../url";

const SITE = "https://acme.in";

test("crawl access: no robots.txt means full marks", () => {
  const r = scoreCrawlAccess(SITE, { kind: "missing", status: 404 });
  assert.equal(r.score, 25);
  assert.equal(r.fix, null);
});

test("crawl access: blocking only training bots costs nothing", () => {
  const body = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n";
  const r = scoreCrawlAccess(SITE, { kind: "found", body });
  assert.equal(r.score, 25);
});

test("crawl access: wildcard block blocks answer bots", () => {
  const r = scoreCrawlAccess(SITE, { kind: "found", body: "User-agent: *\nDisallow: /\n" });
  assert.equal(r.score, 0);
  assert.match(r.fix ?? "", /User-agent: OAI-SearchBot\nAllow: \//);
});

test("crawl access: specific group overrides wildcard", () => {
  const body = "User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n";
  const r = scoreCrawlAccess(SITE, { kind: "found", body });
  assert.equal(r.score, 8); // 1 of 3 answer bots
});

test("crawl access: 5xx robots is treated as blocked", () => {
  const r = scoreCrawlAccess(SITE, { kind: "unreachable", reason: "HTTP 503" });
  assert.equal(r.score, 0);
  assert.equal(r.status, "error");
});

test("structured data: finds nested and @graph types", () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
    {"@type":"WebSite","publisher":{"@type":"Organization","name":"Acme"}},
    {"@type":["Service"]}]}</script>
    <script type="application/ld+json">{ broken </script>`;
  const t = extractJsonLdTypes(html);
  assert.deepEqual(t.types, ["Organization", "Service", "WebSite"]);
  assert.equal(t.invalid, 1);
  const r = scoreStructuredData({ url: SITE, html }, null);
  assert.equal(r.score, 15);
  assert.match(r.fix ?? "", /FAQPage/);
});

test("structured data: FAQPage on FAQ page counts", () => {
  const home = `<script type="application/ld+json">{"@type":"LocalBusiness"}</script>`;
  const faq = `<script type="application/ld+json">{"@type":"FAQPage"}</script>`;
  const r = scoreStructuredData({ url: SITE, html: home }, { url: `${SITE}/faq`, html: faq });
  assert.equal(r.score, 15);
});

test("content signals: homepage analysis finds links, prices and meta", () => {
  const html = `<html><head><meta name="description" content="GST billing software for small businesses across India, trusted by 10,000 shops."></head>
    <body><nav><a href="/about-us">About</a><a href="https://other.com/faq">FAQ</a><a href="/plans/">Plans</a></nav>
    <p>Plans from ₹1,999/month</p></body></html>`;
  const a = analyzeHomepage(html, `${SITE}/`);
  assert.equal(a.pricesOnHomepage, true);
  assert.equal(a.faqOnHomepage, false);
  assert.deepEqual(a.candidates.about[0], { url: `${SITE}/about-us`, linked: true });
  // External FAQ link is ignored; fallbacks are used instead.
  assert.deepEqual(
    a.candidates.faq.map((c) => c.linked),
    [false, false],
  );

  const r = scoreContentSignals(a, {
    about: { url: `${SITE}/about-us`, html: "" },
    faq: null,
    pricing: null,
  });
  assert.equal(r.score, 4 + 4 + 3);
  assert.match(r.fix ?? "", /FAQ/);
});

test("non-business sites: pricing and product schema don't apply and cost no points", () => {
  const html = `<html><head><meta name="description" content="Official website of Example Party A, with our manifesto, programmes and state offices."></head><body></body></html>`;
  const a = analyzeHomepage(html, `${SITE}/`);
  const found = { about: { url: `${SITE}/about`, html: "" }, faq: null, pricing: null };

  const business = scoreContentSignals(a, found);
  assert.equal(business.score, 4 + 3);
  assert.match(business.fix ?? "", /prices/);

  const party = scoreContentSignals(a, found, "political_party");
  assert.equal(party.score, 4 + 4 + 3);
  const pricing = party.checks.find((c) => c.label === "Public pricing");
  assert.equal(pricing?.passed, null);
  assert.match(pricing?.note ?? "", /Not applicable for a political party/);
  assert.match(party.fix ?? "", /FAQ/);
  assert.match(party.summary, /partly \(2 of 3\)/);

  const orgOnly = `<script type="application/ld+json">{"@type":"PoliticalParty"}</script>`;
  const sd = scoreStructuredData({ url: SITE, html: orgOnly }, null, "political_party");
  assert.equal(sd.score, 10 + 5);
  assert.equal(scoreStructuredData({ url: SITE, html: orgOnly }, null).score, 10);
  // A nonprofit can still describe its services, so that check stays.
  assert.equal(scoreStructuredData({ url: SITE, html: orgOnly }, null, "nonprofit").score, 10);
});

test("content signals: unlinked SPA shell doesn't count as a page", () => {
  const shell = "<html><head><title>Acme</title></head><body><div id=root></div></body></html>";
  assert.equal(confirmsPage("about", shell, false), false);
  assert.equal(confirmsPage("about", "<title>About us | Acme</title>", false), true);
});

test("normaliseSiteUrl", () => {
  assert.equal(normaliseSiteUrl("acme.in"), "https://acme.in");
  assert.equal(normaliseSiteUrl(" https://www.acme.in/home/?utm=x#top "), "https://www.acme.in/home");
  assert.equal(normaliseSiteUrl("localhost:3000"), null);
  assert.equal(normaliseSiteUrl("ftp://acme.in"), null);
});
