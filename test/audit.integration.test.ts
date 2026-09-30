/**
 * End-to-end audit runs against local fixture sites (test/fixtures/sites):
 * real HTTP, real parsing, no internet. Add a case here whenever a bug is
 * found on a real website.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { runSiteAudit } from "@/lib/audit";
import { serveSite } from "./fixture-server";

process.env.AUDIT_ALLOW_PRIVATE_HOSTS = "1";
delete process.env.OPENAI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

/** Serves a fixture site for the duration of a describe block. */
function withSite(name: string, register: (siteUrl: () => string) => void) {
  describe(name, () => {
    let site: Awaited<ReturnType<typeof serveSite>>;
    before(async () => {
      site = await serveSite(name);
    });
    after(() => site.close());
    register(() => site.url);
  });
}

withSite("well-optimised", (siteUrl) => {
  test("scores full marks on every measurable category", async () => {
    const { overallScore, breakdown } = await runSiteAudit(siteUrl());
    assert.equal(breakdown.crawl_access.score, 25, "blocking only GPTBot must not cost points");
    assert.equal(breakdown.structured_data.score, 20);
    assert.equal(breakdown.content_signals.score, 15);
    assert.equal(breakdown.live_visibility.status, "not_configured");
    assert.equal(breakdown.live_visibility.score, 0);
    assert.equal(overallScore, 60);
    for (const c of [breakdown.crawl_access, breakdown.structured_data, breakdown.content_signals]) {
      assert.equal(c.fix, null);
    }
  });
});

withSite("blocked-bots", (siteUrl) => {
  test("scores zero and recommends fixes", async () => {
    const { overallScore, breakdown } = await runSiteAudit(siteUrl());
    assert.equal(breakdown.crawl_access.score, 0);
    assert.match(breakdown.crawl_access.fix ?? "", /User-agent: Claude-SearchBot/);
    assert.equal(breakdown.structured_data.score, 0);
    // JS-only shell with a 4-character meta description: nothing counts.
    assert.equal(breakdown.content_signals.score, 0);
    assert.equal(overallScore, 0);
  });
});

withSite("minimal", (siteUrl) => {
  test("missing robots.txt is allowed; homepage prices count", async () => {
    const { breakdown } = await runSiteAudit(siteUrl());
    assert.equal(breakdown.crawl_access.score, 25);
    assert.match(String(breakdown.crawl_access.detail.robots_status), /missing \(HTTP 404\)/);
    assert.equal(breakdown.structured_data.score, 10, "LocalBusiness counts as Organization");
    assert.equal(breakdown.content_signals.score, 4 + 3, "pricing + meta description only");
  });
});

withSite("server-errors", (siteUrl) => {
  test("5xx robots.txt and 403 homepage are reported, not thrown", async () => {
    const { overallScore, breakdown } = await runSiteAudit(siteUrl());
    assert.equal(breakdown.crawl_access.status, "error");
    assert.equal(breakdown.structured_data.status, "error");
    assert.match(breakdown.structured_data.summary, /HTTP 403/);
    assert.equal(overallScore, 0);
  });
});
